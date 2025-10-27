import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/drizzle-orm.provider';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { invoices, payments, customers, billingMetrics } from '../../../core/database/schema';
import { eq, and, desc, gte, lte, like, sum, count } from 'drizzle-orm';

export interface Invoice {
  id: string;
  customerId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  issuedDate: Date;
  paidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'online';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  processedAt?: Date;
  createdAt: Date;
}

export interface BillingMetrics {
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  paidAmount: number;
  invoiceCount: number;
  paymentCount: number;
  averagePaymentTime: number;
}

@Injectable()
export class MobileBillingService {
  private readonly logger = new Logger(MobileBillingService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {}

  async getInvoices(
    tenantId: string,
    filters?: {
      customerId?: string;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    },
  ) {
    try {
      let query = this.db
        .select()
        .from(invoices)
        .where(eq(invoices.tenantId, tenantId))
        .orderBy(desc(invoices.createdAt));

      if (filters?.customerId) {
        query = query.where(eq(invoices.customerId, filters.customerId));
      }

      if (filters?.status) {
        query = query.where(eq(invoices.status, filters.status));
      }

      if (filters?.dateFrom) {
        query = query.where(gte(invoices.issuedDate, filters.dateFrom));
      }

      if (filters?.dateTo) {
        query = query.where(lte(invoices.issuedDate, filters.dateTo));
      }

      if (filters?.search) {
        query = query.where(like(invoices.invoiceNumber, `%${filters.search}%`));
      }

      const invoicesData = await query;

      return {
        success: true,
        data: invoicesData,
        count: invoicesData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get invoices: ${error.message}`);
      throw new Error('Failed to retrieve invoices');
    }
  }

  async getInvoiceById(invoiceId: string, tenantId: string) {
    try {
      const invoice = await this.db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!invoice.length) {
        throw new NotFoundException('Invoice not found');
      }

      // Get related payments
      const payments = await this.db
        .select()
        .from(payments)
        .where(eq(payments.invoiceId, invoiceId))
        .orderBy(desc(payments.createdAt));

      return {
        success: true,
        data: {
          ...invoice[0],
          payments,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get invoice: ${error.message}`);
      throw new Error('Failed to retrieve invoice');
    }
  }

  async createInvoice(
    tenantId: string,
    userId: string,
    data: {
      customerId: string;
      amount: number;
      tax: number;
      dueDate: Date;
      notes?: string;
    },
  ) {
    try {
      const invoiceId = `inv_${Date.now()}`;
      const invoiceNumber = `INV-${Date.now()}`;
      const now = new Date();
      const total = data.amount + data.tax;

      const newInvoice = {
        id: invoiceId,
        tenantId,
        customerId: data.customerId,
        invoiceNumber,
        amount: data.amount,
        tax: data.tax,
        total,
        status: 'draft' as const,
        dueDate: data.dueDate,
        issuedDate: now,
        notes: data.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };

      await this.db.insert(invoices).values(newInvoice);

      this.logger.log(`Invoice created: ${invoiceId}`);

      return {
        success: true,
        message: 'Invoice created successfully',
        data: newInvoice,
      };
    } catch (error) {
      this.logger.error(`Failed to create invoice: ${error.message}`);
      throw new Error('Failed to create invoice');
    }
  }

  async updateInvoice(
    invoiceId: string,
    tenantId: string,
    data: Partial<Invoice>,
  ) {
    try {
      const existingInvoice = await this.getInvoiceById(invoiceId, tenantId);

      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await this.db
        .update(invoices)
        .set(updateData)
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.tenantId, tenantId),
          ),
        );

      this.logger.log(`Invoice updated: ${invoiceId}`);

      return {
        success: true,
        message: 'Invoice updated successfully',
        data: { ...existingInvoice.data, ...updateData },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update invoice: ${error.message}`);
      throw new Error('Failed to update invoice');
    }
  }

  async sendInvoice(invoiceId: string, tenantId: string) {
    try {
      await this.updateInvoice(invoiceId, tenantId, {
        status: 'sent',
      });

      return {
        success: true,
        message: 'Invoice sent successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to send invoice: ${error.message}`);
      throw new Error('Failed to send invoice');
    }
  }

  async getPayments(
    tenantId: string,
    filters?: {
      invoiceId?: string;
      status?: string;
      method?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {
    try {
      let query = this.db
        .select()
        .from(payments)
        .where(eq(payments.tenantId, tenantId))
        .orderBy(desc(payments.createdAt));

      if (filters?.invoiceId) {
        query = query.where(eq(payments.invoiceId, filters.invoiceId));
      }

      if (filters?.status) {
        query = query.where(eq(payments.status, filters.status));
      }

      if (filters?.method) {
        query = query.where(eq(payments.method, filters.method));
      }

      if (filters?.dateFrom) {
        query = query.where(gte(payments.createdAt, filters.dateFrom));
      }

      if (filters?.dateTo) {
        query = query.where(lte(payments.createdAt, filters.dateTo));
      }

      const paymentsData = await query;

      return {
          success: true,
          data: paymentsData,
          count: paymentsData.length,
        };
    } catch (error) {
      this.logger.error(`Failed to get payments: ${error.message}`);
      throw new Error('Failed to retrieve payments');
    }
  }

  async createPayment(
    tenantId: string,
    userId: string,
    data: {
      invoiceId: string;
      amount: number;
      method: string;
      transactionId?: string;
    },
  ) {
    try {
      const paymentId = `pay_${Date.now()}`;
      const now = new Date();

      const newPayment = {
        id: paymentId,
        tenantId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        status: 'pending' as const,
        transactionId: data.transactionId,
        createdBy: userId,
        createdAt: now,
      };

      await this.db.insert(payments).values(newPayment);

      this.logger.log(`Payment created: ${paymentId}`);

      return {
        success: true,
        message: 'Payment created successfully',
        data: newPayment,
      };
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`);
      throw new Error('Failed to create payment');
    }
  }

  async processPayment(paymentId: string, tenantId: string, status: 'completed' | 'failed') {
    try {
      const now = new Date();

      await this.db
        .update(payments)
        .set({
          status,
          processedAt: status === 'completed' ? now : undefined,
        })
        .where(
          and(
            eq(payments.id, paymentId),
            eq(payments.tenantId, tenantId),
          ),
        );

      // If payment completed, update invoice status
      if (status === 'completed') {
        const payment = await this.db
          .select()
          .from(payments)
          .where(eq(payments.id, paymentId))
          .limit(1);

        if (payment.length > 0) {
          const invoice = await this.db
            .select()
            .from(invoices)
            .where(eq(invoices.id, payment[0].invoiceId))
            .limit(1);

          if (invoice.length > 0) {
            // Check if invoice is fully paid
            const totalPaid = await this.db
              .select({ total: sum(payments.amount) })
              .from(payments)
              .where(
                and(
                  eq(payments.invoiceId, payment[0].invoiceId),
                  eq(payments.status, 'completed'),
                ),
              );

            const totalPaidAmount = totalPaid[0]?.total || 0;
            const invoiceTotal = invoice[0].total;

            if (totalPaidAmount >= invoiceTotal) {
              await this.db
                .update(invoices)
                .set({
                  status: 'paid',
                  paidDate: now,
                  updatedAt: now,
                })
                .where(eq(invoices.id, payment[0].invoiceId));
            }
          }
        }
      }

      this.logger.log(`Payment ${status}: ${paymentId}`);

      return {
        success: true,
        message: `Payment ${status} successfully`,
      };
    } catch (error) {
      this.logger.error(`Failed to process payment: ${error.message}`);
      throw new Error('Failed to process payment');
    }
  }

  async getBillingMetrics(tenantId: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get total revenue
      const totalRevenueResult = await this.db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.issuedDate, startDate),
            eq(invoices.status, 'paid'),
          ),
        );

      // Get pending amount
      const pendingAmountResult = await this.db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            eq(invoices.status, 'sent'),
          ),
        );

      // Get overdue amount
      const overdueAmountResult = await this.db
        .select({ total: sum(invoices.total) })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            eq(invoices.status, 'overdue'),
          ),
        );

      // Get invoice count
      const invoiceCountResult = await this.db
        .select({ count: count(invoices.id) })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.issuedDate, startDate),
          ),
        );

      // Get payment count
      const paymentCountResult = await this.db
        .select({ count: count(payments.id) })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            gte(payments.createdAt, startDate),
            eq(payments.status, 'completed'),
          ),
        );

      return {
        success: true,
        data: {
          totalRevenue: totalRevenueResult[0]?.total || 0,
          pendingAmount: pendingAmountResult[0]?.total || 0,
          overdueAmount: overdueAmountResult[0]?.total || 0,
          paidAmount: totalRevenueResult[0]?.total || 0,
          invoiceCount: invoiceCountResult[0]?.count || 0,
          paymentCount: paymentCountResult[0]?.count || 0,
          averagePaymentTime: 0, // Calculate based on business logic
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get billing metrics: ${error.message}`);
      throw new Error('Failed to retrieve billing metrics');
    }
  }

  async getCustomers(tenantId: string, search?: string) {
    try {
      let query = this.db
        .select()
        .from(customers)
        .where(eq(customers.tenantId, tenantId))
        .orderBy(desc(customers.createdAt));

      if (search) {
        query = query.where(like(customers.name, `%${search}%`));
      }

      const customersData = await query;

      return {
        success: true,
        data: customersData,
        count: customersData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get customers: ${error.message}`);
      throw new Error('Failed to retrieve customers');
    }
  }
}
