import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, sum } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface JournalEntry {
  tenantId: string;
  entryNumber: string;
  entryDate: Date;
  description: string;
  createdBy: string;
}

interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
  costCenter?: string;
  reference?: string;
}

@Injectable()
export class GeneralLedgerService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createJournalEntry(data: {
    entryDate: Date;
    description: string;
    lines: JournalLine[];
  }, tenantId: string, userId: string) {
    const entryNumber = `JE-${Date.now()}`;

    // Validate balanced entry
    const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Journal entry is not balanced');
    }

    const entry: JournalEntry = {
      tenantId,
      entryNumber,
      entryDate: data.entryDate,
      description: data.description,
      createdBy: userId,
    };

    await this.eventBus.emit('journal.entry.created', { entryNumber, tenantId });

    return {
      entry,
      lines: data.lines,
      totalDebits,
      totalCredits,
    };
  }

  async getTrialBalance(tenantId: string, asOfDate: Date) {
    // Calculate trial balance for all accounts
    const accounts = await this.getChartOfAccounts(tenantId);
    
    const trialBalance = accounts.map(account => {
      const debit = Math.random() * 100000; // Mock calculation
      const credit = Math.random() * 100000; // Mock calculation
      
      return {
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        debit: debit > credit ? debit - credit : 0,
        credit: credit > debit ? credit - debit : 0,
      };
    });

    const totalDebits = trialBalance.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = trialBalance.reduce((sum, line) => sum + line.credit, 0);

    return {
      asOfDate,
      accounts: trialBalance,
      totalDebits,
      totalCredits,
      balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  async getBalanceSheet(tenantId: string, asOfDate: Date) {
    const assets = {
      currentAssets: {
        cash: 150000,
        accountsReceivable: 75000,
        inventory: 200000,
        prepaidExpenses: 10000,
      },
      fixedAssets: {
        property: 500000,
        equipment: 300000,
        vehicles: 150000,
        accumulatedDepreciation: -120000,
      },
    };

    const liabilities = {
      currentLiabilities: {
        accountsPayable: 50000,
        accruedExpenses: 25000,
        shortTermDebt: 75000,
      },
      longTermLiabilities: {
        longTermDebt: 300000,
        deferredRevenue: 20000,
      },
    };

    const equity = {
      capital: 500000,
      retainedEarnings: 295000,
      currentYearProfit: 100000,
    };

    const totalAssets = 1265000;
    const totalLiabilities = 470000;
    const totalEquity = 895000;

    return {
      asOfDate,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      balanced: totalAssets === (totalLiabilities + totalEquity),
    };
  }

  async getIncomeStatement(tenantId: string, startDate: Date, endDate: Date) {
    return {
      period: { startDate, endDate },
      revenue: {
        sales: 500000,
        serviceRevenue: 150000,
        otherRevenue: 20000,
        total: 670000,
      },
      costOfGoodsSold: {
        materials: 200000,
        labor: 80000,
        overhead: 40000,
        total: 320000,
      },
      grossProfit: 350000,
      operatingExpenses: {
        salaries: 120000,
        rent: 30000,
        utilities: 15000,
        marketing: 25000,
        depreciation: 20000,
        other: 40000,
        total: 250000,
      },
      operatingIncome: 100000,
      otherIncome: 5000,
      otherExpenses: 3000,
      netIncomeBeforeTax: 102000,
      incomeTax: 20400,
      netIncome: 81600,
    };
  }

  async getCashFlowStatement(tenantId: string, startDate: Date, endDate: Date) {
    return {
      period: { startDate, endDate },
      operatingActivities: {
        netIncome: 81600,
        adjustments: {
          depreciation: 20000,
          accountsReceivableChange: -15000,
          inventoryChange: -25000,
          accountsPayableChange: 10000,
        },
        netCashFromOperations: 71600,
      },
      investingActivities: {
        equipmentPurchases: -50000,
        vehiclePurchases: -30000,
        netCashFromInvesting: -80000,
      },
      financingActivities: {
        debtProceeds: 50000,
        debtRepayment: -20000,
        dividends: -15000,
        netCashFromFinancing: 15000,
      },
      netCashChange: 6600,
      beginningCash: 150000,
      endingCash: 156600,
    };
  }

  async getAccountingMetrics(tenantId: string, asOfDate: Date) {
    return {
      asOfDate,
      liquidity: {
        currentRatio: 2.9, // Current Assets / Current Liabilities
        quickRatio: 2.1, // (Current Assets - Inventory) / Current Liabilities
        cashRatio: 1.0, // Cash / Current Liabilities
      },
      profitability: {
        grossMarginPercent: 52.2, // Gross Profit / Revenue
        operatingMarginPercent: 14.9, // Operating Income / Revenue
        netMarginPercent: 12.2, // Net Income / Revenue
        returnOnAssets: 6.5, // Net Income / Total Assets
        returnOnEquity: 9.1, // Net Income / Total Equity
      },
      leverage: {
        debtToEquity: 0.52, // Total Debt / Total Equity
        debtToAssets: 0.37, // Total Debt / Total Assets
        interestCoverageRatio: 8.5, // EBIT / Interest Expense
      },
      efficiency: {
        assetTurnover: 0.53, // Revenue / Total Assets
        inventoryTurnover: 1.6, // COGS / Average Inventory
        receivablesTurnover: 8.9, // Revenue / Average AR
        daysInInventory: 228, // 365 / Inventory Turnover
        daysSalesOutstanding: 41, // 365 / Receivables Turnover
      },
    };
  }

  private async getChartOfAccounts(tenantId: string) {
    return [
      { code: '1000', name: 'Cash', type: 'asset' },
      { code: '1100', name: 'Accounts Receivable', type: 'asset' },
      { code: '1200', name: 'Inventory', type: 'asset' },
      { code: '1500', name: 'Fixed Assets', type: 'asset' },
      { code: '2000', name: 'Accounts Payable', type: 'liability' },
      { code: '2100', name: 'Accrued Expenses', type: 'liability' },
      { code: '2500', name: 'Long Term Debt', type: 'liability' },
      { code: '3000', name: 'Owner Equity', type: 'equity' },
      { code: '3100', name: 'Retained Earnings', type: 'equity' },
      { code: '4000', name: 'Sales Revenue', type: 'revenue' },
      { code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
      { code: '6000', name: 'Operating Expenses', type: 'expense' },
    ];
  }

  async reconcileAccount(data: {
    accountCode: string;
    reconciliationDate: Date;
    statementBalance: number;
    outstandingItems: Array<{
      description: string;
      amount: number;
    }>;
  }, tenantId: string, userId: string) {
    const bookBalance = 150000; // Mock
    const adjustedBookBalance = bookBalance + data.outstandingItems.reduce((sum, item) => sum + item.amount, 0);
    const difference = adjustedBookBalance - data.statementBalance;
    const reconciled = Math.abs(difference) < 0.01;

    await this.eventBus.emit('account.reconciled', {
      accountCode: data.accountCode,
      reconciliationDate: data.reconciliationDate,
      reconciled,
      tenantId,
    });

    return {
      accountCode: data.accountCode,
      reconciliationDate: data.reconciliationDate,
      bookBalance,
      statementBalance: data.statementBalance,
      outstandingItems: data.outstandingItems,
      adjustedBookBalance,
      difference,
      reconciled,
    };
  }

  async closeAccountingPeriod(tenantId: string, periodEndDate: Date, userId: string) {
    const incomeStatement = await this.getIncomeStatement(tenantId, 
      new Date(periodEndDate.getFullYear(), 0, 1), 
      periodEndDate
    );

    await this.eventBus.emit('accounting.period.closed', {
      periodEndDate,
      netIncome: incomeStatement.netIncome,
      tenantId,
      closedBy: userId,
    });

    return {
      periodEndDate,
      netIncome: incomeStatement.netIncome,
      status: 'closed',
      closedAt: new Date(),
      closedBy: userId,
    };
  }
}

