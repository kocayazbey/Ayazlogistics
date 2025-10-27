import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { eq, and, desc, asc, like, gte, lte, count, sum } from 'drizzle-orm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class BillingService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {}

  async getInvoices(params: {
    page: number;
    limit: number;
    status?: string;
    customer?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { page, limit, status, customer, dateFrom, dateTo } = params;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    
    if (status) {
      whereConditions.push(eq('status', status));
    }
    if (customer) {
      whereConditions.push(like('customer', `%${customer}%`));
    }
    if (dateFrom) {
      whereConditions.push(gte('createdAt', new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte('createdAt', new Date(dateTo)));
    }

    const [invoices, totalCount] = await Promise.all([
      this.db
        .select()
        .from('invoices')
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc('createdAt'))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from('invoices')
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    return {
      items: invoices,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        pages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }

  async createInvoice(createInvoiceDto: CreateInvoiceDto) {
    const [invoice] = await this.db
      .insert('invoices')
      .values({
        ...createInvoiceDto,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return invoice;
  }

  async updateInvoice(id: string, updateInvoiceDto: UpdateInvoiceDto) {
    const [invoice] = await this.db
      .update('invoices')
      .set({
        ...updateInvoiceDto,
        updatedAt: new Date()
      })
      .where(eq('id', id))
      .returning();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async sendInvoice(id: string) {
    const [invoice] = await this.db
      .update('invoices')
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq('id', id))
      .returning();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async approveInvoice(id: string) {
    const [invoice] = await this.db
      .update('invoices')
      .set({
        status: 'approved',
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq('id', id))
      .returning();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async getContracts(params: {
    page: number;
    limit: number;
    status?: string;
    customer?: string;
    type?: string;
  }) {
    const { page, limit, status, customer, type } = params;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    
    if (status) {
      whereConditions.push(eq('status', status));
    }
    if (customer) {
      whereConditions.push(like('customer', `%${customer}%`));
    }
    if (type) {
      whereConditions.push(eq('type', type));
    }

    const [contracts, totalCount] = await Promise.all([
      this.db
        .select()
        .from('contracts')
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc('createdAt'))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from('contracts')
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    return {
      items: contracts,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        pages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }

  async createContract(createContractDto: CreateContractDto) {
    const [contract] = await this.db
      .insert('contracts')
      .values({
        ...createContractDto,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return contract;
  }

  async updateContract(id: string, updateContractDto: UpdateContractDto) {
    const [contract] = await this.db
      .update('contracts')
      .set({
        ...updateContractDto,
        updatedAt: new Date()
      })
      .where(eq('id', id))
      .returning();

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async activateContract(id: string) {
    const [contract] = await this.db
      .update('contracts')
      .set({
        status: 'active',
        activatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq('id', id))
      .returning();

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async terminateContract(id: string) {
    const [contract] = await this.db
      .update('contracts')
      .set({
        status: 'terminated',
        terminatedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq('id', id))
      .returning();

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async getPayments(params: {
    page: number;
    limit: number;
    status?: string;
    method?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const { page, limit, status, method, dateFrom, dateTo } = params;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    
    if (status) {
      whereConditions.push(eq('status', status));
    }
    if (method) {
      whereConditions.push(eq('method', method));
    }
    if (dateFrom) {
      whereConditions.push(gte('createdAt', new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte('createdAt', new Date(dateTo)));
    }

    const [payments, totalCount] = await Promise.all([
      this.db
        .select()
        .from('payments')
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc('createdAt'))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from('payments')
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    return {
      items: payments,
      pagination: {
        page,
        limit,
        total: totalCount[0].count,
        pages: Math.ceil(totalCount[0].count / limit)
      }
    };
  }

  async createPayment(createPaymentDto: CreatePaymentDto) {
    const [payment] = await this.db
      .insert('payments')
      .values({
        ...createPaymentDto,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return payment;
  }

  async updatePayment(id: string, updatePaymentDto: UpdatePaymentDto) {
    const [payment] = await this.db
      .update('payments')
      .set({
        ...updatePaymentDto,
        updatedAt: new Date()
      })
      .where(eq('id', id))
      .returning();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async processPayment(id: string) {
    const [payment] = await this.db
      .update('payments')
      .set({
        status: 'processed',
        processedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq('id', id))
      .returning();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async getRevenueAnalytics(dateFrom?: string, dateTo?: string) {
    let whereConditions = [];
    
    if (dateFrom) {
      whereConditions.push(gte('createdAt', new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte('createdAt', new Date(dateTo)));
    }

    const [analytics] = await this.db
      .select({
        totalRevenue: sum('amount'),
        totalInvoices: count(),
        paidInvoices: count(),
        outstandingAmount: sum('amount')
      })
      .from('invoices')
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return analytics;
  }

  async getOutstandingAnalytics() {
    const [analytics] = await this.db
      .select({
        totalOutstanding: sum('amount'),
        overdueInvoices: count(),
        averageDaysOverdue: count(),
        topCustomers: count()
      })
      .from('invoices')
      .where(eq('status', 'outstanding'));

    return analytics;
  }

  async getCustomerAnalytics(dateFrom?: string, dateTo?: string) {
    let whereConditions = [];
    
    if (dateFrom) {
      whereConditions.push(gte('createdAt', new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte('createdAt', new Date(dateTo)));
    }

    const [analytics] = await this.db
      .select({
        totalCustomers: count(),
        activeCustomers: count(),
        newCustomers: count(),
        averageRevenuePerCustomer: sum('amount')
      })
      .from('invoices')
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return analytics;
  }
}
