import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { ComprehensiveLoggerService } from '../../../common/services/comprehensive-logger.service';
import { eq, and, desc, asc, like, gte, lte, count, or } from 'drizzle-orm';
import { invoices, contracts, invoiceItems, contractTerms } from '../../../database/schema/shared/billing.schema';
import { tenants } from '../../../database/schema/core/tenants.schema';

export interface InvoiceFilters {
  customer_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SortOptions {
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  status: string;
  totalAmount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Contract {
  id: string;
  contractNumber: string;
  customerId: string;
  customerName: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  terms: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class BillingService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly logger: ComprehensiveLoggerService,
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getInvoices(
    filters: InvoiceFilters = {},
    pagination: PaginationOptions,
    sorting: SortOptions,
  ): Promise<{ items: Invoice[]; pagination: any }> {
    try {
      this.logger.log('Getting invoices', 'BillingService', {
        filters,
        pagination,
        sorting
      });

      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;

      let whereConditions = [];

      if (filters.status) {
        whereConditions.push(eq(invoices.status, filters.status));
      }

      if (filters.customer_id) {
        whereConditions.push(eq(invoices.tenantId, filters.customer_id));
      }

      if (filters.start_date) {
        whereConditions.push(gte(invoices.createdAt, new Date(filters.start_date)));
      }

      if (filters.end_date) {
        whereConditions.push(lte(invoices.createdAt, new Date(filters.end_date)));
      }

      if (filters.search) {
        whereConditions.push(
          or(
            like(invoices.invoiceNumber, `%${filters.search}%`),
            like(invoices.customer, `%${filters.search}%`)
          )
        );
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [invoiceData, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(invoices)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(sorting.sort_order === 'desc' ? desc(invoices.createdAt) : asc(invoices.createdAt)),
        this.db
          .select({ count: count() })
          .from(invoices)
          .where(whereClause)
      ]);

      // Transform database results to API format
      const items: Invoice[] = invoiceData.map(invoice => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.tenantId,
        customerName: invoice.customer || 'Unknown Customer',
        status: invoice.status,
        totalAmount: Number(invoice.totalAmount || 0),
        currency: 'TRY',
        issueDate: invoice.invoiceDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        paidDate: invoice.paidAt?.toISOString().split('T')[0],
        items: [], // Would need to join with invoiceItems table
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      }));

      return {
        items,
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      this.logger.logError(error, 'BillingService.getInvoices', {
        filters,
        pagination,
        sorting
      });
      throw error;
    }
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    try {
      this.logger.log('Getting invoice by ID', 'BillingService', { id });

      const [invoice] = await this.db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .limit(1);

      if (!invoice) {
        return null;
      }

      // Get invoice items
      const items = await this.db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id));

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.tenantId,
        customerName: invoice.customer || 'Unknown Customer',
        status: invoice.status,
        totalAmount: Number(invoice.totalAmount || 0),
        currency: 'TRY',
        issueDate: invoice.invoiceDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        paidDate: invoice.paidAt?.toISOString().split('T')[0],
        items: items.map(item => ({
          id: item.id,
          description: item.description || '',
          quantity: item.quantity || 0,
          unitPrice: Number(item.unitPrice || 0),
          total: Number(item.totalPrice || 0),
        })),
        createdAt: invoice.createdAt.toISOString(),
        updatedAt: invoice.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.logError(error, 'BillingService.getInvoiceById', { id });
      throw error;
    }
  }

  async getContracts(
    filters: any = {},
    pagination: PaginationOptions,
    sorting: SortOptions,
  ): Promise<{ items: Contract[]; pagination: any }> {
    try {
      this.logger.log('Getting contracts', 'BillingService', {
        filters,
        pagination,
        sorting
      });

      const page = pagination.page || 1;
      const limit = pagination.limit || 20;
      const offset = (page - 1) * limit;

      let whereConditions = [];

      if (filters.status) {
        whereConditions.push(eq(contracts.status, filters.status));
      }

      if (filters.type) {
        whereConditions.push(eq(contracts.type, filters.type));
      }

      if (filters.customer_id) {
        whereConditions.push(eq(contracts.tenantId, filters.customer_id));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [contractData, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(contracts)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(sorting.sort_order === 'desc' ? desc(contracts.createdAt) : asc(contracts.createdAt)),
        this.db
          .select({ count: count() })
          .from(contracts)
          .where(whereClause)
      ]);

      // Transform database results to API format
      const items: Contract[] = contractData.map(contract => ({
        id: contract.id,
        contractNumber: contract.contractNumber,
        customerId: contract.tenantId,
        customerName: contract.customer || 'Unknown Customer',
        type: contract.type || 'Service Agreement',
        status: contract.status,
        startDate: contract.startDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        endDate: contract.endDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        terms: 'Standard service agreement terms', // Would need to join with contractTerms table
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
      }));

      return {
        items,
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      this.logger.logError(error, 'BillingService.getContracts', {
        filters,
        pagination,
        sorting
      });
      throw error;
    }
  }

  async generateInvoice(data: any): Promise<Invoice> {
    try {
      this.logger.log('Generating invoice', 'BillingService', { data });

      // Validate required fields
      if (!data.customerId) {
        throw new BadRequestException('Customer ID is required');
      }

      if (!data.items || data.items.length === 0) {
        throw new BadRequestException('Invoice items are required');
      }

      // Calculate totals
      const totalAmount = data.items.reduce((sum: number, item: InvoiceItem) =>
        sum + (item.quantity * item.unitPrice), 0
      );

      // Generate invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Create invoice
      const [newInvoice] = await this.db
        .insert(invoices)
        .values({
          tenantId: data.customerId,
          invoiceNumber,
          customer: data.customerName,
          status: 'draft',
          totalAmount: totalAmount.toString(),
          currency: data.currency || 'TRY',
          invoiceDate: new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .returning();

      // Create invoice items
      const invoiceItemInserts = data.items.map((item: InvoiceItem) => ({
        tenantId: data.customerId,
        invoiceId: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: (item.quantity * item.unitPrice).toString(),
      }));

      await this.db
        .insert(invoiceItems)
        .values(invoiceItemInserts);

      return {
        id: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        customerId: newInvoice.tenantId,
        customerName: newInvoice.customer || 'Customer',
        status: newInvoice.status,
        totalAmount,
        currency: 'TRY',
        issueDate: newInvoice.invoiceDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: newInvoice.dueDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        items: data.items,
        createdAt: newInvoice.createdAt.toISOString(),
        updatedAt: newInvoice.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.logError(error, 'BillingService.generateInvoice', { data });
      throw error;
    }
  }

  async calculatePrice(data: any): Promise<any> {
    try {
      this.logger.log('Calculating price', 'BillingService', { data });

      // Validate input data
      if (!data || typeof data !== 'object') {
        throw new BadRequestException('Invalid pricing data provided');
      }

      // Base pricing logic - replace with actual pricing engine
      const basePrice = 1000;
      const serviceFees = data.services?.length * 200 || 0;
      const volumeDiscount = data.volume && data.volume > 100 ? 0.1 : 0;
      const urgencySurcharge = data.isUrgent ? 1.5 : 1;

      const subtotal = (basePrice + serviceFees) * urgencySurcharge;
      const discount = subtotal * volumeDiscount;
      const tax = (subtotal - discount) * 0.18; // 18% VAT
      const total = subtotal - discount + tax;

      return {
        basePrice,
        serviceFees,
        urgencySurcharge: urgencySurcharge > 1 ? 'Applied' : 'None',
        volumeDiscount: volumeDiscount > 0 ? `${(volumeDiscount * 100)}%` : 'None',
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(discount * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        total: Math.round(total * 100) / 100,
        currency: 'TRY',
      };
    } catch (error) {
      this.logger.logError(error, 'BillingService.calculatePrice', { data });
      throw error;
    }
  }
}
