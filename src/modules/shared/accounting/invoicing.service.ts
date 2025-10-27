import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, desc, count, gte, lte } from 'drizzle-orm';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { invoices, payments, invoiceItems } from '../../../database/schema/shared/billing.schema';

@Injectable()
export class InvoicingService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getInvoices(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
    customerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(invoices.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(invoices.status, filters.status));
    }

    if (filters?.dateFrom) {
      conditions.push(gte(invoices.invoiceDate, new Date(filters.dateFrom)));
    }

    if (filters?.dateTo) {
      conditions.push(lte(invoices.invoiceDate, new Date(filters.dateTo)));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(invoices)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(invoices.createdAt)),
        this.db
          .select({ count: count() })
          .from(invoices)
          .where(whereClause)
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
      console.error('Database error in getInvoices:', error);
      throw new BadRequestException(`Faturalar alınamadı: ${error.message}`);
    }
  }

  async getInvoiceById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Fatura bulunamadı');
      }

      const items = await this.db
        .select()
        .from(invoiceItems)
        .where(and(eq(invoiceItems.invoiceId, id), eq(invoiceItems.tenantId, tenantId)));

      return {
        ...result[0],
        items,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Fatura bulunamadı');
    }
  }

  async createInvoice(createInvoiceDto: CreateInvoiceDto, tenantId: string, userId: string) {
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const totalAmount = createInvoiceDto.items?.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0) || 0;

      const invoice = await this.db
        .insert(invoices)
        .values({
          invoiceNumber,
          customer: createInvoiceDto.customer,
          totalAmount: totalAmount.toString(),
          balance: totalAmount.toString(),
          invoiceDate: new Date(),
          dueDate: createInvoiceDto.dueDate ? new Date(createInvoiceDto.dueDate) : null,
          status: 'draft',
          tenantId,
        })
        .returning();

      if (createInvoiceDto.items && createInvoiceDto.items.length > 0) {
        await this.db.insert(invoiceItems).values(
          createInvoiceDto.items.map(item => ({
            invoiceId: invoice[0].id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice?.toString(),
            totalPrice: item.totalPrice?.toString(),
            tenantId,
          }))
        );
      }

      return await this.getInvoiceById(invoice[0].id, tenantId);
    } catch (error) {
      console.error('Database error in createInvoice:', error);
      throw new BadRequestException(`Fatura oluşturulamadı: ${error.message}`);
    }
  }

  async updateInvoice(id: string, updateInvoiceDto: UpdateInvoiceDto, tenantId: string) {
    try {
      const result = await this.db
        .update(invoices)
        .set({ ...updateInvoiceDto, updatedAt: new Date() })
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Fatura bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updateInvoice:', error);
      throw error;
    }
  }

  async deleteInvoice(id: string, tenantId: string) {
    try {
      await this.db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Database error in deleteInvoice:', error);
      throw error;
    }
  }

  async getPayments(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    invoiceId?: string;
    status?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(payments.tenantId, tenantId)];

    if (filters?.invoiceId) {
      conditions.push(eq(payments.invoiceId, filters.invoiceId));
    }

    if (filters?.status) {
      conditions.push(eq(payments.status, filters.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(payments)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(payments.createdAt)),
        this.db
          .select({ count: count() })
          .from(payments)
          .where(whereClause)
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
      console.error('Database error in getPayments:', error);
      throw new BadRequestException(`Ödemeler alınamadı: ${error.message}`);
    }
  }

  async createPayment(createPaymentDto: CreatePaymentDto, tenantId: string, userId: string) {
    try {
      const paymentNumber = `PAY-${Date.now()}`;
      
      const payment = await this.db
        .insert(payments)
        .values({
          paymentNumber,
          invoiceId: createPaymentDto.invoiceId,
          customer: createPaymentDto.customer,
          amount: createPaymentDto.amount?.toString(),
          method: createPaymentDto.method,
          status: 'pending',
          paymentDate: new Date(),
          tenantId,
        })
        .returning();

      return payment[0];
    } catch (error) {
      console.error('Database error in createPayment:', error);
      throw new BadRequestException(`Ödeme oluşturulamadı: ${error.message}`);
    }
  }
}

