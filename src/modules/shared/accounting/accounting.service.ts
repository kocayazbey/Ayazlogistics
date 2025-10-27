import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, desc, count, gte, lte } from 'drizzle-orm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { invoices, payments, contracts } from '../../../database/schema/shared/billing.schema';
import { purchaseOrders } from '../../../database/schema/shared/erp-procurement.schema';
import { receivingOrders } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class AccountingService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getDashboard(tenantId: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const conditions = [eq(invoices.tenantId, tenantId)];
      
      if (filters?.dateFrom) {
        conditions.push(gte(invoices.invoiceDate, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(invoices.invoiceDate, new Date(filters.dateTo)));
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      const [totalRevenue, pendingInvoices, overdueInvoices, paidInvoices] = await Promise.all([
        this.db
          .select({ total: invoices.totalAmount })
          .from(invoices)
          .where(and(whereClause, eq(invoices.status, 'paid'))),
        this.db.select({ count: count() }).from(invoices).where(
          and(whereClause, eq(invoices.status, 'pending'))
        ),
        this.db.select({ count: count() }).from(invoices).where(
          and(whereClause, eq(invoices.status, 'overdue'))
        ),
        this.db.select({ count: count() }).from(invoices).where(
          and(whereClause, eq(invoices.status, 'paid'))
        ),
      ]);

      const [totalExpenses] = await Promise.all([
        this.db
          .select({ total: purchaseOrders.totalAmount })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.tenantId, tenantId),
              eq(purchaseOrders.status, 'completed'),
              filters?.dateFrom ? gte(purchaseOrders.orderDate, new Date(filters.dateFrom)) : undefined,
              filters?.dateTo ? lte(purchaseOrders.orderDate, new Date(filters.dateTo)) : undefined
            )
          ),
      ]);

      const revenue = totalRevenue.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const expenses = totalExpenses.reduce((sum, item) => sum + Number(item.total || 0), 0);

      return {
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: revenue - expenses,
        pendingInvoices: Number(pendingInvoices[0].count),
        overdueInvoices: Number(overdueInvoices[0].count),
        paidInvoices: Number(paidInvoices[0].count),
      };
    } catch (error) {
      console.error('Database error in getDashboard:', error);
      throw new BadRequestException(`Dashboard verileri alınamadı: ${error.message}`);
    }
  }

  async getRevenueAnalytics(tenantId: string, filters?: {
    period?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const conditions = [
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, 'paid'),
      ];

      if (filters?.dateFrom) {
        conditions.push(gte(invoices.invoiceDate, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(invoices.invoiceDate, new Date(filters.dateTo)));
      }

      const invoicesList = await this.db
        .select()
        .from(invoices)
        .where(and(...conditions))
        .orderBy(desc(invoices.invoiceDate));

      const revenue = invoicesList.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

      return {
        period: filters?.period,
        totalRevenue: revenue,
        invoiceCount: invoicesList.length,
        averageInvoiceValue: invoicesList.length > 0 ? revenue / invoicesList.length : 0,
        invoices: invoicesList,
      };
    } catch (error) {
      console.error('Database error in getRevenueAnalytics:', error);
      throw new BadRequestException(`Gelir analizi alınamadı: ${error.message}`);
    }
  }

  async getExpensesAnalytics(tenantId: string, filters?: {
    period?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const conditions = [
        eq(purchaseOrders.tenantId, tenantId),
        eq(purchaseOrders.status, 'completed'),
      ];

      if (filters?.dateFrom) {
        conditions.push(gte(purchaseOrders.orderDate, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(purchaseOrders.orderDate, new Date(filters.dateTo)));
      }

      const expensesList = await this.db
        .select()
        .from(purchaseOrders)
        .where(and(...conditions))
        .orderBy(desc(purchaseOrders.orderDate));

      const totalExpenses = expensesList.reduce((sum, po) => sum + Number(po.totalAmount || 0), 0);

      return {
        period: filters?.period,
        totalExpenses,
        orderCount: expensesList.length,
        averageOrderValue: expensesList.length > 0 ? totalExpenses / expensesList.length : 0,
        expenses: expensesList,
      };
    } catch (error) {
      console.error('Database error in getExpensesAnalytics:', error);
      throw new BadRequestException(`Gider analizi alınamadı: ${error.message}`);
    }
  }

  async getProfitLossStatement(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const [revenue, expenses] = await Promise.all([
        this.getRevenueAnalytics(tenantId, { dateFrom, dateTo }),
        this.getExpensesAnalytics(tenantId, { dateFrom, dateTo }),
      ]);

      return {
        period: { from: dateFrom, to: dateTo },
        revenue: {
          total: revenue.totalRevenue,
          items: revenue.invoices,
        },
        expenses: {
          total: expenses.totalExpenses,
          items: expenses.expenses,
        },
        netProfit: revenue.totalRevenue - expenses.totalExpenses,
      };
    } catch (error) {
      console.error('Database error in getProfitLossStatement:', error);
      throw new BadRequestException(`Gelir-Gider tablosu alınamadı: ${error.message}`);
    }
  }

  async getBalanceSheet(tenantId: string, asOf: string) {
    try {
      const [assets, liabilities, equity] = await Promise.all([
        this.db
          .select({ total: invoices.totalAmount })
          .from(invoices)
          .where(
            and(
              eq(invoices.tenantId, tenantId),
              lte(invoices.invoiceDate, new Date(asOf)),
              eq(invoices.status, 'paid')
            )
          ),
        this.db
          .select({ total: purchaseOrders.totalAmount })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.tenantId, tenantId),
              lte(purchaseOrders.orderDate, new Date(asOf)),
              eq(purchaseOrders.status, 'completed')
            )
          ),
        this.db
          .select({ total: contracts.totalValue })
          .from(contracts)
          .where(
            and(
              eq(contracts.tenantId, tenantId),
              eq(contracts.status, 'active')
            )
          ),
      ]);

      const totalAssets = assets.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const totalLiabilities = liabilities.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const totalEquity = equity.reduce((sum, item) => sum + Number(item.total || 0), 0);

      return {
        asOf,
        assets: {
          total: totalAssets,
          items: assets,
        },
        liabilities: {
          total: totalLiabilities,
          items: liabilities,
        },
        equity: {
          total: totalEquity,
        },
      };
    } catch (error) {
      console.error('Database error in getBalanceSheet:', error);
      throw new BadRequestException(`Bilanço alınamadı: ${error.message}`);
    }
  }

  async getCashFlowStatement(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const [operating, investing, financing] = await Promise.all([
        this.db
          .select({ total: payments.amount })
          .from(payments)
          .where(
            and(
              eq(payments.tenantId, tenantId),
              gte(payments.paymentDate, new Date(dateFrom)),
              lte(payments.paymentDate, new Date(dateTo)),
              eq(payments.status, 'processed')
            )
          ),
        this.db
          .select({ total: purchaseOrders.totalAmount })
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.tenantId, tenantId),
              gte(purchaseOrders.orderDate, new Date(dateFrom)),
              lte(purchaseOrders.orderDate, new Date(dateTo)),
              eq(purchaseOrders.status, 'completed')
            )
          ),
        this.db
          .select({ total: contracts.totalValue })
          .from(contracts)
          .where(
            and(
              eq(contracts.tenantId, tenantId),
              gte(contracts.startDate, new Date(dateFrom)),
              lte(contracts.startDate, new Date(dateTo))
            )
          ),
      ]);

      const operatingCash = operating.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const investingCash = -investing.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const financingCash = financing.reduce((sum, item) => sum + Number(item.total || 0), 0);

      return {
        period: { from: dateFrom, to: dateTo },
        operating: operatingCash,
        investing: investingCash,
        financing: financingCash,
        netCashFlow: operatingCash + investingCash + financingCash,
      };
    } catch (error) {
      console.error('Database error in getCashFlowStatement:', error);
      throw new BadRequestException(`Nakit akış tablosu alınamadı: ${error.message}`);
    }
  }

  async getChartOfAccounts(tenantId: string) {
    try {
      return {
        accounts: [
          { code: '1000', name: 'Varlıklar', type: 'asset' },
          { code: '2000', name: 'Yükümlülükler', type: 'liability' },
          { code: '3000', name: 'Özsermaye', type: 'equity' },
          { code: '4000', name: 'Gelirler', type: 'revenue' },
          { code: '5000', name: 'Giderler', type: 'expense' },
        ],
      };
    } catch (error) {
      console.error('Database error in getChartOfAccounts:', error);
      throw new BadRequestException(`Hesap planı alınamadı: ${error.message}`);
    }
  }

  async getTransactions(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const [invoicesList, paymentsList] = await Promise.all([
        this.db.select().from(invoices).where(eq(invoices.tenantId, tenantId)),
        this.db.select().from(payments).where(eq(payments.tenantId, tenantId)),
      ]);

      const transactions = [
        ...invoicesList.map(inv => ({ ...inv, type: 'invoice', date: inv.invoiceDate })),
        ...paymentsList.map(pay => ({ ...pay, type: 'payment', date: pay.paymentDate })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      return {
        data: transactions.slice(offset, offset + limit),
        meta: {
          page,
          limit,
          total: transactions.length,
          totalPages: Math.ceil(transactions.length / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getTransactions:', error);
      throw new BadRequestException(`İşlemler alınamadı: ${error.message}`);
    }
  }

  async createTransaction(transaction: any, tenantId: string, userId: string) {
    try {
      if (transaction.type === 'invoice') {
        // Invoice oluşturma
        return { ...transaction, id: Date.now().toString(), tenantId, createdBy: userId, createdAt: new Date() };
      } else if (transaction.type === 'payment') {
        // Payment oluşturma
        return { ...transaction, id: Date.now().toString(), tenantId, createdAt: new Date() };
      }
      throw new BadRequestException('Geçersiz işlem tipi');
    } catch (error) {
      console.error('Database error in createTransaction:', error);
      throw error;
    }
  }

  async getExpenses(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const conditions = [
        eq(purchaseOrders.tenantId, tenantId),
        eq(purchaseOrders.status, 'completed'),
      ];

      if (filters?.dateFrom) {
        conditions.push(gte(purchaseOrders.orderDate, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(purchaseOrders.orderDate, new Date(filters.dateTo)));
      }

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(purchaseOrders)
          .where(and(...conditions))
          .limit(limit)
          .offset(offset)
          .orderBy(desc(purchaseOrders.orderDate)),
        this.db
          .select({ count: count() })
          .from(purchaseOrders)
          .where(and(...conditions))
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getExpenses:', error);
      throw new BadRequestException(`Giderler alınamadı: ${error.message}`);
    }
  }

  async createExpense(createExpenseDto: CreateExpenseDto, tenantId: string, userId: string) {
    try {
      // Purchase order olarak kaydedilebilir
      const po = await this.db
        .insert(purchaseOrders)
        .values({
          poNumber: `EXP-${Date.now()}`,
          supplierId: createExpenseDto.supplierId || null,
          orderDate: new Date(),
          status: 'completed',
          subtotal: createExpenseDto.amount?.toString() || '0',
          taxAmount: '0',
          shippingCost: '0',
          totalAmount: createExpenseDto.amount?.toString() || '0',
          notes: createExpenseDto.description,
          createdBy: userId,
          tenantId,
        })
        .returning();

      return po[0];
    } catch (error) {
      console.error('Database error in createExpense:', error);
      throw new BadRequestException(`Gider oluşturulamadı: ${error.message}`);
    }
  }

  async getExpenseById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(purchaseOrders)
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Gider bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Gider bulunamadı');
    }
  }

  async updateExpense(id: string, updateExpenseDto: any, tenantId: string) {
    try {
      const result = await this.db
        .update(purchaseOrders)
        .set({ ...updateExpenseDto, updatedAt: new Date() })
        .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Gider bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updateExpense:', error);
      throw error;
    }
  }

  async getFinancialSummary(tenantId: string, dateFrom: string, dateTo: string) {
    try {
      const [revenue, expenses, profitLoss] = await Promise.all([
        this.getRevenueAnalytics(tenantId, { dateFrom, dateTo }),
        this.getExpensesAnalytics(tenantId, { dateFrom, dateTo }),
        this.getProfitLossStatement(tenantId, dateFrom, dateTo),
      ]);

      return {
        period: { from: dateFrom, to: dateTo },
        summary: {
          revenue: revenue.totalRevenue,
          expenses: expenses.totalExpenses,
          netProfit: profitLoss.netProfit,
          invoiceCount: revenue.invoiceCount,
          expenseCount: expenses.orderCount,
        },
      };
    } catch (error) {
      console.error('Database error in getFinancialSummary:', error);
      throw new BadRequestException(`Finansal özet alınamadı: ${error.message}`);
    }
  }

  async getAgingReport(tenantId: string) {
    try {
      const invoicesList = await this.db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            or(
              eq(invoices.status, 'pending'),
              eq(invoices.status, 'overdue')
            )
          )
        );

      const now = new Date();
      const aging = {
        current: invoicesList.filter(inv => {
          const days = Math.floor((now.getTime() - new Date(inv.dueDate || inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
          return days <= 30;
        }),
        '31-60': invoicesList.filter(inv => {
          const days = Math.floor((now.getTime() - new Date(inv.dueDate || inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
          return days > 30 && days <= 60;
        }),
        '61-90': invoicesList.filter(inv => {
          const days = Math.floor((now.getTime() - new Date(inv.dueDate || inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
          return days > 60 && days <= 90;
        }),
        '90+': invoicesList.filter(inv => {
          const days = Math.floor((now.getTime() - new Date(inv.dueDate || inv.invoiceDate).getTime()) / (1000 * 60 * 60 * 24));
          return days > 90;
        }),
      };

      return {
        aging,
        totals: {
          current: aging.current.reduce((sum, inv) => sum + Number(inv.balance || 0), 0),
          '31-60': aging['31-60'].reduce((sum, inv) => sum + Number(inv.balance || 0), 0),
          '61-90': aging['61-90'].reduce((sum, inv) => sum + Number(inv.balance || 0), 0),
          '90+': aging['90+'].reduce((sum, inv) => sum + Number(inv.balance || 0), 0),
        },
      };
    } catch (error) {
      console.error('Database error in getAgingReport:', error);
      throw new BadRequestException(`Yaşlandırma raporu alınamadı: ${error.message}`);
    }
  }

  async getTaxReport(tenantId: string, period: string) {
    try {
      const [year, month] = period.split('-');
      const dateFrom = new Date(parseInt(year), parseInt(month) - 1, 1);
      const dateTo = new Date(parseInt(year), parseInt(month), 0);

      const [invoicesList, expensesList] = await Promise.all([
        this.db
          .select()
          .from(invoices)
          .where(
            and(
              eq(invoices.tenantId, tenantId),
              gte(invoices.invoiceDate, dateFrom),
              lte(invoices.invoiceDate, dateTo),
              eq(invoices.status, 'paid')
            )
          ),
        this.db
          .select()
          .from(purchaseOrders)
          .where(
            and(
              eq(purchaseOrders.tenantId, tenantId),
              gte(purchaseOrders.orderDate, dateFrom),
              lte(purchaseOrders.orderDate, dateTo),
              eq(purchaseOrders.status, 'completed')
            )
          ),
      ]);

      const revenue = invoicesList.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
      const expenses = expensesList.reduce((sum, exp) => sum + Number(exp.totalAmount || 0), 0);
      const taxBase = revenue - expenses;
      const taxAmount = taxBase * 0.20; // %20 KDV

      return {
        period,
        revenue,
        expenses,
        taxBase,
        taxAmount,
        netProfit: taxBase - taxAmount,
      };
    } catch (error) {
      console.error('Database error in getTaxReport:', error);
      throw new BadRequestException(`Vergi raporu alınamadı: ${error.message}`);
    }
  }

  async exportReport(exportRequest: any, tenantId: string) {
    try {
      const reportType = exportRequest.type || 'financial';

      if (reportType === 'financial') {
        return await this.getFinancialSummary(tenantId, exportRequest.dateFrom, exportRequest.dateTo);
      } else if (reportType === 'profit-loss') {
        return await this.getProfitLossStatement(tenantId, exportRequest.dateFrom, exportRequest.dateTo);
      } else if (reportType === 'aging') {
        return await this.getAgingReport(tenantId);
      } else if (reportType === 'tax') {
        return await this.getTaxReport(tenantId, exportRequest.period);
      }

      throw new BadRequestException('Geçersiz rapor tipi');
    } catch (error) {
      console.error('Database error in exportReport:', error);
      throw error;
    }
  }
}
