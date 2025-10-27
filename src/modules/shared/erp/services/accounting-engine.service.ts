// =====================================================================================
// AYAZLOGISTICS - ERP ACCOUNTING ENGINE SERVICE
// =====================================================================================
// Description: Advanced accounting engine with Turkish accounting standards (MSUGT)
// Features: GL accounting, journal entries, financial reports, tax calculations
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, between, sql, desc, inArray, or } from 'drizzle-orm';
import * as schema from '@/database/schema';
import { erpGlAccounts, erpTransactions } from '@/database/schema/shared/erp.schema';

// =====================================================================================
// INTERFACES & TYPES
// =====================================================================================

interface JournalEntry {
  transactionNumber: string;
  transactionDate: Date;
  description: string;
  reference?: string;
  lines: JournalLine[];
  status: 'draft' | 'posted' | 'void';
  createdBy: string;
  approvedBy?: string;
  metadata?: Record<string, any>;
}

interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  costCenter?: string;
  project?: string;
  currency?: string;
  exchangeRate?: number;
  description?: string;
}

interface TrialBalance {
  periodStart: Date;
  periodEnd: Date;
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  balanced: boolean;
  variance: number;
}

interface TrialBalanceAccount {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  debitMovements: number;
  creditMovements: number;
  closingBalance: number;
  isBalanceSheet: boolean;
}

interface IncomeStatement {
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  revenue: {
    total: number;
    breakdown: AccountBreakdown[];
  };
  costOfGoodsSold: {
    total: number;
    breakdown: AccountBreakdown[];
  };
  grossProfit: number;
  grossProfitMargin: number;
  operatingExpenses: {
    total: number;
    breakdown: AccountBreakdown[];
  };
  operatingIncome: number;
  operatingMargin: number;
  otherIncome: {
    total: number;
    breakdown: AccountBreakdown[];
  };
  otherExpenses: {
    total: number;
    breakdown: AccountBreakdown[];
  };
  ebitda: number;
  depreciation: number;
  ebit: number;
  interestExpense: number;
  profitBeforeTax: number;
  taxExpense: number;
  netIncome: number;
  netProfitMargin: number;
}

interface BalanceSheet {
  asOfDate: Date;
  currency: string;
  assets: {
    current: { total: number; breakdown: AccountBreakdown[] };
    fixed: { total: number; breakdown: AccountBreakdown[] };
    intangible: { total: number; breakdown: AccountBreakdown[] };
    other: { total: number; breakdown: AccountBreakdown[] };
    total: number;
  };
  liabilities: {
    current: { total: number; breakdown: AccountBreakdown[] };
    longTerm: { total: number; breakdown: AccountBreakdown[] };
    other: { total: number; breakdown: AccountBreakdown[] };
    total: number;
  };
  equity: {
    capital: { total: number; breakdown: AccountBreakdown[] };
    retained: { total: number; breakdown: AccountBreakdown[] };
    current: { total: number; breakdown: AccountBreakdown[] };
    total: number;
  };
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

interface AccountBreakdown {
  accountCode: string;
  accountName: string;
  amount: number;
  percentage: number;
}

interface CashFlowStatement {
  periodStart: Date;
  periodEnd: Date;
  currency: string;
  operating: {
    netIncome: number;
    adjustments: CashFlowItem[];
    changeInWorkingCapital: CashFlowItem[];
    total: number;
  };
  investing: {
    activities: CashFlowItem[];
    total: number;
  };
  financing: {
    activities: CashFlowItem[];
    total: number;
  };
  netCashFlow: number;
  openingCash: number;
  closingCash: number;
}

interface CashFlowItem {
  description: string;
  amount: number;
}

interface TaxCalculation {
  periodStart: Date;
  periodEnd: Date;
  taxableIncome: number;
  taxRate: number;
  taxAmount: number;
  deductions: TaxDeduction[];
  totalDeductions: number;
  netTaxableIncome: number;
  prepaidTax: number;
  taxDue: number;
  kdv: {
    input: number;
    output: number;
    payable: number;
  };
  stopaj: {
    total: number;
    breakdown: StopajItem[];
  };
}

interface TaxDeduction {
  type: string;
  description: string;
  amount: number;
}

interface StopajItem {
  type: string;
  baseAmount: number;
  rate: number;
  amount: number;
}

interface AccountReconciliation {
  accountCode: string;
  accountName: string;
  periodStart: Date;
  periodEnd: Date;
  openingBalance: number;
  transactions: ReconciliationTransaction[];
  closingBalance: number;
  reconciledBalance: number;
  variance: number;
  reconciled: boolean;
  notes: string;
}

interface ReconciliationTransaction {
  transactionDate: Date;
  transactionNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reconciled: boolean;
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class AccountingEngineService {
  private readonly logger = new Logger(AccountingEngineService.name);

  // Turkish Tax Rates
  private readonly CORPORATE_TAX_RATE = 0.25; // %25
  private readonly KDV_STANDARD_RATE = 0.18; // %18
  private readonly KDV_REDUCED_RATE = 0.08; // %8
  private readonly KDV_SPECIAL_RATE = 0.01; // %1

  // Chart of Accounts prefixes (MSUGT - Turkish Uniform Chart of Accounts)
  private readonly MSUGT = {
    CURRENT_ASSETS: '1',
    FIXED_ASSETS: '2',
    SHORT_TERM_LIABILITIES: '3',
    LONG_TERM_LIABILITIES: '4',
    EQUITY: '5',
    REVENUE: '6',
    COST_OF_SALES: '7',
    OPERATING_EXPENSES: '8',
    OTHER_INCOME_EXPENSE: '9',
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // =====================================================================================
  // JOURNAL ENTRY POSTING
  // =====================================================================================

  async postJournalEntry(entry: JournalEntry): Promise<string> {
    this.logger.log(`Posting journal entry: ${entry.transactionNumber}`);

    // Validate entry
    await this.validateJournalEntry(entry);

    // Check if balanced
    const totalDebits = entry.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = entry.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }

    // Insert transaction
    const [transaction] = await this.db
      .insert(erpTransactions)
      .values({
        transactionNumber: entry.transactionNumber,
        transactionDate: entry.transactionDate,
        description: entry.description,
        lines: entry.lines as any,
        currency: 'TRY',
        referenceNumber: entry.reference,
        status: 'posted',
        postedAt: new Date(),
        createdBy: entry.createdBy,
        metadata: entry.metadata || {},
      })
      .returning();

    this.logger.log(`Journal entry posted successfully: ${transaction.id}`);

    return transaction.id;
  }

  private async validateJournalEntry(entry: JournalEntry): Promise<void> {
    // Check for duplicate transaction number
    const existing = await this.db
      .select()
      .from(erpTransactions)
      .where(eq(erpTransactions.transactionNumber, entry.transactionNumber))
      .limit(1);

    if (existing.length > 0) {
      throw new BadRequestException(`Transaction number ${entry.transactionNumber} already exists`);
    }

    // Validate all accounts exist
    const accountCodes = [...new Set(entry.lines.map(line => line.accountCode))];
    const accounts = await this.db
      .select()
      .from(erpGlAccounts)
      .where(inArray(erpGlAccounts.accountCode, accountCodes));

    if (accounts.length !== accountCodes.length) {
      const foundCodes = accounts.map(a => a.accountCode);
      const missingCodes = accountCodes.filter(code => !foundCodes.includes(code));
      throw new BadRequestException(`Invalid account codes: ${missingCodes.join(', ')}`);
    }

    // Check if accounts allow posting
    const nonPostingAccounts = accounts.filter(a => !a.allowPosting);
    if (nonPostingAccounts.length > 0) {
      throw new BadRequestException(
        `Accounts do not allow posting: ${nonPostingAccounts.map(a => a.accountCode).join(', ')}`,
      );
    }

    // Validate amounts
    entry.lines.forEach((line, idx) => {
      if (line.debit < 0 || line.credit < 0) {
        throw new BadRequestException(`Line ${idx + 1}: Amounts cannot be negative`);
      }
      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException(`Line ${idx + 1}: Cannot have both debit and credit`);
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new BadRequestException(`Line ${idx + 1}: Must have either debit or credit`);
      }
    });
  }

  // =====================================================================================
  // TRIAL BALANCE
  // =====================================================================================

  async generateTrialBalance(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TrialBalance> {
    this.logger.log(`Generating trial balance from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    // Get all accounts
    const accounts = await this.db
      .select()
      .from(erpGlAccounts)
      .where(and(
        eq(erpGlAccounts.tenantId, tenantId),
        eq(erpGlAccounts.status, 'active'),
      ));

    const trialBalanceAccounts: TrialBalanceAccount[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    for (const account of accounts) {
      // Get opening balance (balance before period start)
      const openingBalance = await this.getAccountBalance(
        tenantId,
        account.accountCode,
        new Date(0),
        new Date(periodStart.getTime() - 1),
      );

      // Get movements during period
      const movements = await this.getAccountMovements(
        tenantId,
        account.accountCode,
        periodStart,
        periodEnd,
      );

      const debitMovements = movements.filter(m => m.amount > 0).reduce((sum, m) => sum + m.amount, 0);
      const creditMovements = movements.filter(m => m.amount < 0).reduce((sum, m) => sum + Math.abs(m.amount), 0);

      // Calculate closing balance
      const closingBalance = openingBalance + debitMovements - creditMovements;

      // Determine if it's a balance sheet account
      const firstDigit = account.accountCode.charAt(0);
      const isBalanceSheet = ['1', '2', '3', '4', '5'].includes(firstDigit);

      trialBalanceAccounts.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.type,
        openingBalance,
        debitMovements,
        creditMovements,
        closingBalance,
        isBalanceSheet,
      });

      // For income statement accounts (6-9), closing balance goes to debits/credits
      if (!isBalanceSheet) {
        if (closingBalance > 0) {
          totalDebits += closingBalance;
        } else if (closingBalance < 0) {
          totalCredits += Math.abs(closingBalance);
        }
      } else {
        // For balance sheet accounts
        if (closingBalance > 0) {
          totalDebits += closingBalance;
        } else if (closingBalance < 0) {
          totalCredits += Math.abs(closingBalance);
        }
      }
    }

    const variance = Math.abs(totalDebits - totalCredits);
    const balanced = variance < 0.01;

    return {
      periodStart,
      periodEnd,
      accounts: trialBalanceAccounts,
      totalDebits,
      totalCredits,
      balanced,
      variance,
    };
  }

  private async getAccountBalance(
    tenantId: string,
    accountCode: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.db
      .select({
        balance: sql<number>`
          COALESCE(
            SUM(
              CASE 
                WHEN (jsonb_array_elements(${erpTransactions.lines})::jsonb->>'accountCode')::text = ${accountCode}
                THEN 
                  ((jsonb_array_elements(${erpTransactions.lines})::jsonb->>'debit')::numeric - 
                   (jsonb_array_elements(${erpTransactions.lines})::jsonb->>'credit')::numeric)
                ELSE 0
              END
            ),
            0
          )
        `,
      })
      .from(erpTransactions)
      .where(and(
        eq(erpTransactions.tenantId, tenantId),
        eq(erpTransactions.status, 'posted'),
        gte(erpTransactions.transactionDate, startDate),
        lte(erpTransactions.transactionDate, endDate),
      ));

    return result[0]?.balance || 0;
  }

  private async getAccountMovements(
    tenantId: string,
    accountCode: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: Date; amount: number; description: string }>> {
    // Simplified - would need to extract from JSONB lines
    const transactions = await this.db
      .select()
      .from(erpTransactions)
      .where(and(
        eq(erpTransactions.tenantId, tenantId),
        eq(erpTransactions.status, 'posted'),
        gte(erpTransactions.transactionDate, startDate),
        lte(erpTransactions.transactionDate, endDate),
      ));

    const movements: Array<{ date: Date; amount: number; description: string }> = [];

    transactions.forEach(trans => {
      const lines = trans.lines as any[];
      lines.forEach(line => {
        if (line.accountCode === accountCode) {
          const amount = (line.debit || 0) - (line.credit || 0);
          movements.push({
            date: new Date(trans.transactionDate),
            amount,
            description: trans.description,
          });
        }
      });
    });

    return movements;
  }

  // =====================================================================================
  // INCOME STATEMENT
  // =====================================================================================

  async generateIncomeStatement(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<IncomeStatement> {
    this.logger.log(`Generating income statement for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    // Revenue (600-699)
    const revenueAccounts = await this.getAccountsByRange(tenantId, '600', '699');
    const revenue = await this.calculateCategoryTotal(tenantId, revenueAccounts, periodStart, periodEnd);

    // Cost of Goods Sold (700-799)
    const cogsAccounts = await this.getAccountsByRange(tenantId, '700', '799');
    const cogs = await this.calculateCategoryTotal(tenantId, cogsAccounts, periodStart, periodEnd);

    const grossProfit = revenue.total - cogs.total;
    const grossProfitMargin = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;

    // Operating Expenses (800-899)
    const opexAccounts = await this.getAccountsByRange(tenantId, '800', '899');
    const opex = await this.calculateCategoryTotal(tenantId, opexAccounts, periodStart, periodEnd);

    const operatingIncome = grossProfit - opex.total;
    const operatingMargin = revenue.total > 0 ? (operatingIncome / revenue.total) * 100 : 0;

    // Other Income/Expenses (900-999)
    const otherIncomeAccounts = await this.getAccountsByRange(tenantId, '900', '959');
    const otherIncome = await this.calculateCategoryTotal(tenantId, otherIncomeAccounts, periodStart, periodEnd);

    const otherExpenseAccounts = await this.getAccountsByRange(tenantId, '960', '999');
    const otherExpenses = await this.calculateCategoryTotal(tenantId, otherExpenseAccounts, periodStart, periodEnd);

    // Calculate EBITDA, EBIT, etc.
    const ebitda = operatingIncome + otherIncome.total - otherExpenses.total;
    const depreciation = 0; // Would calculate from specific accounts
    const ebit = ebitda - depreciation;
    const interestExpense = 0; // Would calculate from specific accounts
    const profitBeforeTax = ebit - interestExpense;
    const taxExpense = profitBeforeTax * this.CORPORATE_TAX_RATE;
    const netIncome = profitBeforeTax - taxExpense;
    const netProfitMargin = revenue.total > 0 ? (netIncome / revenue.total) * 100 : 0;

    return {
      periodStart,
      periodEnd,
      currency: 'TRY',
      revenue,
      costOfGoodsSold: cogs,
      grossProfit,
      grossProfitMargin,
      operatingExpenses: opex,
      operatingIncome,
      operatingMargin,
      otherIncome,
      otherExpenses,
      ebitda,
      depreciation,
      ebit,
      interestExpense,
      profitBeforeTax,
      taxExpense,
      netIncome,
      netProfitMargin,
    };
  }

  private async getAccountsByRange(tenantId: string, startCode: string, endCode: string): Promise<any[]> {
    return this.db
      .select()
      .from(erpGlAccounts)
      .where(and(
        eq(erpGlAccounts.tenantId, tenantId),
        gte(erpGlAccounts.accountCode, startCode),
        lte(erpGlAccounts.accountCode, endCode),
        eq(erpGlAccounts.status, 'active'),
      ));
  }

  private async calculateCategoryTotal(
    tenantId: string,
    accounts: any[],
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ total: number; breakdown: AccountBreakdown[] }> {
    const breakdown: AccountBreakdown[] = [];
    let total = 0;

    for (const account of accounts) {
      const balance = await this.getAccountBalance(
        tenantId,
        account.accountCode,
        periodStart,
        periodEnd,
      );

      if (Math.abs(balance) > 0.01) {
        breakdown.push({
          accountCode: account.accountCode,
          accountName: account.accountName,
          amount: Math.abs(balance),
          percentage: 0, // Will calculate after total is known
        });
        total += Math.abs(balance);
      }
    }

    // Calculate percentages
    if (total > 0) {
      breakdown.forEach(item => {
        item.percentage = (item.amount / total) * 100;
      });
    }

    return { total, breakdown };
  }

  // =====================================================================================
  // BALANCE SHEET
  // =====================================================================================

  async generateBalanceSheet(tenantId: string, asOfDate: Date): Promise<BalanceSheet> {
    this.logger.log(`Generating balance sheet as of ${asOfDate.toISOString()}`);

    const startDate = new Date(0);
    const endDate = asOfDate;

    // Assets
    const currentAssetAccounts = await this.getAccountsByRange(tenantId, '100', '199');
    const currentAssets = await this.calculateCategoryTotal(tenantId, currentAssetAccounts, startDate, endDate);

    const fixedAssetAccounts = await this.getAccountsByRange(tenantId, '200', '299');
    const fixedAssets = await this.calculateCategoryTotal(tenantId, fixedAssetAccounts, startDate, endDate);

    const totalAssets = currentAssets.total + fixedAssets.total;

    // Liabilities
    const currentLiabilityAccounts = await this.getAccountsByRange(tenantId, '300', '399');
    const currentLiabilities = await this.calculateCategoryTotal(tenantId, currentLiabilityAccounts, startDate, endDate);

    const longTermLiabilityAccounts = await this.getAccountsByRange(tenantId, '400', '499');
    const longTermLiabilities = await this.calculateCategoryTotal(tenantId, longTermLiabilityAccounts, startDate, endDate);

    const totalLiabilities = currentLiabilities.total + longTermLiabilities.total;

    // Equity
    const equityAccounts = await this.getAccountsByRange(tenantId, '500', '599');
    const equity = await this.calculateCategoryTotal(tenantId, equityAccounts, startDate, endDate);

    // Calculate current period profit
    const incomeStatement = await this.generateIncomeStatement(
      tenantId,
      new Date(asOfDate.getFullYear(), 0, 1), // Year start
      asOfDate,
    );

    const totalEquity = equity.total + incomeStatement.netIncome;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const balanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

    return {
      asOfDate,
      currency: 'TRY',
      assets: {
        current: currentAssets,
        fixed: fixedAssets,
        intangible: { total: 0, breakdown: [] },
        other: { total: 0, breakdown: [] },
        total: totalAssets,
      },
      liabilities: {
        current: currentLiabilities,
        longTerm: longTermLiabilities,
        other: { total: 0, breakdown: [] },
        total: totalLiabilities,
      },
      equity: {
        capital: equity,
        retained: { total: 0, breakdown: [] },
        current: { total: incomeStatement.netIncome, breakdown: [] },
        total: totalEquity,
      },
      totalLiabilitiesAndEquity,
      balanced,
    };
  }

  // =====================================================================================
  // TAX CALCULATIONS
  // =====================================================================================

  async calculateTax(tenantId: string, periodStart: Date, periodEnd: Date): Promise<TaxCalculation> {
    this.logger.log(`Calculating tax for period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    // Get income statement
    const incomeStatement = await this.generateIncomeStatement(tenantId, periodStart, periodEnd);
    const taxableIncome = incomeStatement.profitBeforeTax;

    // Calculate deductions
    const deductions: TaxDeduction[] = [
      {
        type: 'depreciation',
        description: 'Depreciation allowance',
        amount: incomeStatement.depreciation,
      },
      // Add more deductions as needed
    ];

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
    const netTaxableIncome = Math.max(0, taxableIncome - totalDeductions);
    const taxAmount = netTaxableIncome * this.CORPORATE_TAX_RATE;

    // KDV (VAT) calculations
    const kdv = {
      input: 0, // Would calculate from purchase invoices
      output: 0, // Would calculate from sales invoices
      payable: 0,
    };
    kdv.payable = kdv.output - kdv.input;

    // Stopaj (Withholding tax) calculations
    const stopaj = {
      total: 0,
      breakdown: [] as StopajItem[],
    };

    return {
      periodStart,
      periodEnd,
      taxableIncome,
      taxRate: this.CORPORATE_TAX_RATE,
      taxAmount,
      deductions,
      totalDeductions,
      netTaxableIncome,
      prepaidTax: 0,
      taxDue: taxAmount,
      kdv,
      stopaj,
    };
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  async generateTransactionNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const [result] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(erpTransactions)
      .where(and(
        eq(erpTransactions.tenantId, tenantId),
        sql`EXTRACT(YEAR FROM ${erpTransactions.transactionDate}) = ${year}`,
        sql`EXTRACT(MONTH FROM ${erpTransactions.transactionDate}) = ${parseInt(month)}`,
      ));

    const sequence = (result?.count || 0) + 1;
    return `JE-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }

  async voidTransaction(transactionId: string, reason: string, voidedBy: string): Promise<void> {
    await this.db
      .update(erpTransactions)
      .set({
        status: 'void',
        reversedAt: new Date(),
        reversedBy: voidedBy,
        metadata: sql`COALESCE(${erpTransactions.metadata}, '{}'::jsonb) || ${JSON.stringify({ voidReason: reason })}::jsonb`,
      })
      .where(eq(erpTransactions.id, transactionId));

    this.logger.log(`Transaction ${transactionId} voided by ${voidedBy}: ${reason}`);
  }
}

// =====================================================================================
// END OF SERVICE
// =====================================================================================

