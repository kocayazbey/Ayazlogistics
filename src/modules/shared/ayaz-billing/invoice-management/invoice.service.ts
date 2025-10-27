import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../../database/schema/shared/billing.schema';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Invoice[]> {
    const query = this.invoiceRepository.createQueryBuilder('invoice')
      .where('invoice.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('invoice.status = :status', { status: filters.status });
    }

    if (filters?.customer) {
      query.andWhere('invoice.customer = :customer', { customer: filters.customer });
    }

    if (filters?.dateRange) {
      query.andWhere('invoice.invoiceDate BETWEEN :startDate AND :endDate', {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Invoice> {
    return this.invoiceRepository.findOne({
      where: { id, tenantId },
      relations: ['customer', 'items'],
    });
  }

  async create(invoiceData: Partial<Invoice>, tenantId: string): Promise<Invoice> {
    const invoice = this.invoiceRepository.create({
      ...invoiceData,
      tenantId,
      invoiceNumber: this.generateInvoiceNumber(),
      status: 'draft',
    });
    return this.invoiceRepository.save(invoice);
  }

  async update(id: string, invoiceData: Partial<Invoice>, tenantId: string): Promise<Invoice> {
    await this.invoiceRepository.update({ id, tenantId }, invoiceData);
    return this.findOne(id, tenantId);
  }

  async sendInvoice(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.status = 'sent';
    invoice.sentAt = new Date();
    return this.invoiceRepository.save(invoice);
  }

  async markAsPaid(id: string, tenantId: string): Promise<Invoice> {
    const invoice = await this.findOne(id, tenantId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    return this.invoiceRepository.save(invoice);
  }

  async getInvoiceMetrics(tenantId: string): Promise<any> {
    const invoices = await this.findAll(tenantId);
    
    const total = invoices.length;
    const draft = invoices.filter(i => i.status === 'draft').length;
    const sent = invoices.filter(i => i.status === 'sent').length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;

    return {
      total,
      draft,
      sent,
      paid,
      overdue,
      paymentRate: total > 0 ? (paid / total) * 100 : 0,
    };
  }

  async getRevenueMetrics(tenantId: string): Promise<any> {
    const invoices = await this.findAll(tenantId);
    
    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
    
    const pendingRevenue = invoices
      .filter(i => i.status === 'sent')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);

    return {
      totalRevenue,
      pendingRevenue,
      averageInvoiceValue: invoices.length > 0 ? totalRevenue / invoices.length : 0,
    };
  }

  async getOverdueInvoices(tenantId: string): Promise<Invoice[]> {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - 30); // 30 days overdue

    return this.invoiceRepository.find({
      where: {
        tenantId,
        status: 'sent',
        dueDate: { $lt: overdueDate },
      },
      order: { dueDate: 'ASC' },
    });
  }

  async generateInvoiceReport(tenantId: string, reportType: string, dateRange?: any): Promise<any> {
    const invoices = await this.findAll(tenantId, dateRange);
    
    const report = {
      reportType,
      dateRange,
      generatedAt: new Date(),
      summary: {
        totalInvoices: invoices.length,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      },
      details: invoices,
    };

    return report;
  }

  private generateInvoiceNumber(): string {
    const timestamp = Date.now();
    return `INV-${timestamp}`;
  }
}
