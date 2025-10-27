import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { Account } from './entities/account.entity';
import { Invoice } from './entities/invoice.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>
  ) {}

  async getTransactions(filters: {
    tenantId: string;
    type?: string;
    account?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.tenantId = :tenantId', { tenantId: filters.tenantId })
      .leftJoinAndSelect('transaction.account', 'account')
      .orderBy('transaction.date', 'DESC');

    if (filters.type) {
      query.andWhere('transaction.type = :type', { type: filters.type });
    }

    if (filters.account) {
      query.andWhere('transaction.accountId = :accountId', { accountId: filters.account });
    }

    if (filters.startDate) {
      query.andWhere('transaction.date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('transaction.date <= :endDate', { endDate: filters.endDate });
    }

    const [transactions, total] = await query
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return {
      transactions,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    };
  }

  async getAccounts(tenantId: string, type?: string) {
    const query = this.accountRepository
      .createQueryBuilder('account')
      .where('account.tenantId = :tenantId', { tenantId })
      .orderBy('account.code', 'ASC');

    if (type) {
      query.andWhere('account.type = :type', { type });
    }

    return query.getMany();
  }

  async getBalanceSheet(tenantId: string, asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();

    const assets = await this.accountRepository
      .createQueryBuilder('account')
      .leftJoin('account.transactions', 'transaction')
      .where('account.tenantId = :tenantId', { tenantId })
      .andWhere('account.type = :type', { type: 'asset' })
      .andWhere('transaction.date <= :date', { date })
      .select([
        'account.id',
        'account.name',
        'account.code',
        'SUM(transaction.amount) as balance'
      ])
      .groupBy('account.id, account.name, account.code')
      .getRawMany();

    const liabilities = await this.accountRepository
      .createQueryBuilder('account')
      .leftJoin('account.transactions', 'transaction')
      .where('account.tenantId = :tenantId', { tenantId })
      .andWhere('account.type = :type', { type: 'liability' })
      .andWhere('transaction.date <= :date', { date })
      .select([
        'account.id',
        'account.name',
        'account.code',
        'SUM(transaction.amount) as balance'
      ])
      .groupBy('account.id, account.name, account.code')
      .getRawMany();

    const equity = await this.accountRepository
      .createQueryBuilder('account')
      .leftJoin('account.transactions', 'transaction')
      .where('account.tenantId = :tenantId', { tenantId })
      .andWhere('account.type = :type', { type: 'equity' })
      .andWhere('transaction.date <= :date', { date })
      .select([
        'account.id',
        'account.name',
        'account.code',
        'SUM(transaction.amount) as balance'
      ])
      .groupBy('account.id, account.name, account.code')
      .getRawMany();

    const totalAssets = assets.reduce((sum, asset) => sum + parseFloat(asset.balance || 0), 0);
    const totalLiabilities = liabilities.reduce((sum, liability) => sum + parseFloat(liability.balance || 0), 0);
    const totalEquity = equity.reduce((sum, eq) => sum + parseFloat(eq.balance || 0), 0);

    return {
      asOfDate: date.toISOString(),
      assets: {
        items: assets.map(asset => ({
          id: asset.account_id,
          name: asset.account_name,
          code: asset.account_code,
          balance: parseFloat(asset.balance || 0)
        })),
        total: totalAssets
      },
      liabilities: {
        items: liabilities.map(liability => ({
          id: liability.account_id,
          name: liability.account_name,
          code: liability.account_code,
          balance: parseFloat(liability.balance || 0)
        })),
        total: totalLiabilities
      },
      equity: {
        items: equity.map(eq => ({
          id: eq.account_id,
          name: eq.account_name,
          code: eq.account_code,
          balance: parseFloat(eq.balance || 0)
        })),
        total: totalEquity
      },
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
    };
  }

  async getIncomeStatement(tenantId: string, filters: { startDate?: string; endDate?: string }) {
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const revenues = await this.accountRepository
      .createQueryBuilder('account')
      .leftJoin('account.transactions', 'transaction')
      .where('account.tenantId = :tenantId', { tenantId })
      .andWhere('account.type = :type', { type: 'revenue' })
      .andWhere('transaction.date >= :startDate', { startDate })
      .andWhere('transaction.date <= :endDate', { endDate })
      .select([
        'account.id',
        'account.name',
        'account.code',
        'SUM(transaction.amount) as balance'
      ])
      .groupBy('account.id, account.name, account.code')
      .getRawMany();

    const expenses = await this.accountRepository
      .createQueryBuilder('account')
      .leftJoin('account.transactions', 'transaction')
      .where('account.tenantId = :tenantId', { tenantId })
      .andWhere('account.type = :type', { type: 'expense' })
      .andWhere('transaction.date >= :startDate', { startDate })
      .andWhere('transaction.date <= :endDate', { endDate })
      .select([
        'account.id',
        'account.name',
        'account.code',
        'SUM(transaction.amount) as balance'
      ])
      .groupBy('account.id, account.name, account.code')
      .getRawMany();

    const totalRevenue = revenues.reduce((sum, revenue) => sum + parseFloat(revenue.balance || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.balance || 0), 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      revenues: {
        items: revenues.map(revenue => ({
          id: revenue.account_id,
          name: revenue.account_name,
          code: revenue.account_code,
          amount: parseFloat(revenue.balance || 0)
        })),
        total: totalRevenue
      },
      expenses: {
        items: expenses.map(expense => ({
          id: expense.account_id,
          name: expense.account_name,
          code: expense.account_code,
          amount: parseFloat(expense.balance || 0)
        })),
        total: totalExpenses
      },
      netIncome
    };
  }

  async getCashFlowStatement(tenantId: string, filters: { startDate?: string; endDate?: string }) {
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const operatingActivities = await this.getCashFlowByCategory(tenantId, 'operating', startDate, endDate);
    const investingActivities = await this.getCashFlowByCategory(tenantId, 'investing', startDate, endDate);
    const financingActivities = await this.getCashFlowByCategory(tenantId, 'financing', startDate, endDate);

    const netCashFlow = operatingActivities + investingActivities + financingActivities;

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      operatingActivities,
      investingActivities,
      financingActivities,
      netCashFlow
    };
  }

  async getInvoices(filters: {
    tenantId: string;
    status?: string;
    customer?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.tenantId = :tenantId', { tenantId: filters.tenantId })
      .leftJoinAndSelect('invoice.customer', 'customer')
      .orderBy('invoice.date', 'DESC');

    if (filters.status) {
      query.andWhere('invoice.status = :status', { status: filters.status });
    }

    if (filters.customer) {
      query.andWhere('invoice.customerId = :customerId', { customerId: filters.customer });
    }

    if (filters.startDate) {
      query.andWhere('invoice.date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('invoice.date <= :endDate', { endDate: filters.endDate });
    }

    const [invoices, total] = await query
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return {
      invoices,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    };
  }

  async getInvoice(id: string, tenantId: string) {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, tenantId },
      relations: ['customer', 'items']
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async createTransaction(createTransactionDto: CreateTransactionDto, userId: string, tenantId: string) {
    const transaction = this.transactionRepository.create({
      ...createTransactionDto,
      tenantId,
      createdBy: userId
    });

    return this.transactionRepository.save(transaction);
  }

  async updateTransaction(id: string, updateTransactionDto: UpdateTransactionDto, userId: string, tenantId: string) {
    const transaction = await this.transactionRepository.findOne({
      where: { id, tenantId }
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    Object.assign(transaction, updateTransactionDto);
    transaction.updatedBy = userId;
    transaction.updatedAt = new Date();

    return this.transactionRepository.save(transaction);
  }

  async createInvoice(createInvoiceDto: CreateInvoiceDto, userId: string, tenantId: string) {
    const invoice = this.invoiceRepository.create({
      ...createInvoiceDto,
      tenantId,
      createdBy: userId,
      status: 'draft'
    });

    return this.invoiceRepository.save(invoice);
  }

  async sendInvoice(id: string, userId: string, tenantId: string) {
    const invoice = await this.getInvoice(id, tenantId);

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be sent');
    }

    invoice.status = 'sent';
    invoice.sentAt = new Date();
    invoice.sentBy = userId;

    return this.invoiceRepository.save(invoice);
  }

  async payInvoice(id: string, userId: string, tenantId: string) {
    const invoice = await this.getInvoice(id, tenantId);

    if (invoice.status === 'paid') {
      throw new BadRequestException('Invoice is already paid');
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.paidBy = userId;

    return this.invoiceRepository.save(invoice);
  }

  async getProfitLossReport(tenantId: string, filters: { startDate?: string; endDate?: string }) {
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const revenues = await this.getAccountBalances(tenantId, 'revenue', startDate, endDate);
    const expenses = await this.getAccountBalances(tenantId, 'expense', startDate, endDate);

    const totalRevenue = revenues.reduce((sum, account) => sum + account.balance, 0);
    const totalExpenses = expenses.reduce((sum, account) => sum + account.balance, 0);
    const grossProfit = totalRevenue - totalExpenses;

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      revenues,
      expenses,
      totalRevenue,
      totalExpenses,
      grossProfit,
      netIncome: grossProfit
    };
  }

  async getAgedReceivablesReport(tenantId: string, asOfDate?: string) {
    const date = asOfDate ? new Date(asOfDate) : new Date();

    const receivables = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.customer', 'customer')
      .where('invoice.tenantId = :tenantId', { tenantId })
      .andWhere('invoice.status != :status', { status: 'paid' })
      .andWhere('invoice.date <= :date', { date })
      .orderBy('invoice.date', 'ASC')
      .getMany();

    const agedReceivables = receivables.map(invoice => {
      const daysPastDue = Math.floor((date.getTime() - invoice.date.getTime()) / (1000 * 60 * 60 * 24));
      let ageCategory = 'current';
      
      if (daysPastDue > 90) ageCategory = 'over90';
      else if (daysPastDue > 60) ageCategory = 'over60';
      else if (daysPastDue > 30) ageCategory = 'over30';
      else if (daysPastDue > 0) ageCategory = 'over0';

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer?.name,
        amount: invoice.totalAmount,
        date: invoice.date,
        daysPastDue,
        ageCategory
      };
    });

    const summary = agedReceivables.reduce((acc, receivable) => {
      acc[receivable.ageCategory] = (acc[receivable.ageCategory] || 0) + receivable.amount;
      return acc;
    }, {});

    return {
      asOfDate: date.toISOString(),
      agedReceivables,
      summary,
      total: agedReceivables.reduce((sum, rec) => sum + rec.amount, 0)
    };
  }

  async getAgedPayablesReport(tenantId: string, asOfDate?: string) {
    // Similar implementation for payables
    // This would require a payables/bills entity
    return {
      asOfDate: asOfDate || new Date().toISOString(),
      agedPayables: [],
      summary: {},
      total: 0
    };
  }

  private async getCashFlowByCategory(tenantId: string, category: string, startDate: Date, endDate: Date) {
    const accounts = await this.accountRepository.find({
      where: { tenantId, cashFlowCategory: category }
    });

    let totalCashFlow = 0;
    for (const account of accounts) {
      const balance = await this.getAccountBalance(account.id, startDate, endDate);
      totalCashFlow += balance;
    }

    return totalCashFlow;
  }

  private async getAccountBalance(accountId: string, startDate: Date, endDate: Date) {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.accountId = :accountId', { accountId })
      .andWhere('transaction.date >= :startDate', { startDate })
      .andWhere('transaction.date <= :endDate', { endDate })
      .select('SUM(transaction.amount)', 'balance')
      .getRawOne();

    return parseFloat(result.balance || 0);
  }

  private async getAccountBalances(tenantId: string, type: string, startDate: Date, endDate: Date) {
    const accounts = await this.accountRepository.find({
      where: { tenantId, type }
    });

    const balances = [];
    for (const account of accounts) {
      const balance = await this.getAccountBalance(account.id, startDate, endDate);
      if (balance !== 0) {
        balances.push({
          id: account.id,
          name: account.name,
          code: account.code,
          balance
        });
      }
    }

    return balances;
  }
}
