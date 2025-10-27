import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between, gte, lte } from 'drizzle-orm';
import { invoices, billingContracts, usageTracking } from '../../../../database/schema/logistics/billing.schema';
import { customers } from '../../../../database/schema/shared/crm.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

@Injectable()
export class InvoiceGeneratorService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async generateInvoice(data: {
    contractId: string;
    customerId: string;
    periodStart: Date;
    periodEnd: Date;
    tenantId: string;
  }, userId: string) {
    const [contract] = await this.db
      .select()
      .from(billingContracts)
      .where(eq(billingContracts.id, data.contractId))
      .limit(1);

    if (!contract) {
      throw new Error('Contract not found');
    }

    const [customer] = await this.db
      .select()
      .from(customers)
      .where(eq(customers.id, data.customerId))
      .limit(1);

    const usage = await this.db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.contractId, data.contractId),
          eq(usageTracking.invoiced, false),
          gte(usageTracking.usageDate, data.periodStart),
          lte(usageTracking.usageDate, data.periodEnd),
        ),
      );

    const lineItems = this.aggregateUsageByType(usage);

    let subtotal = 0;
    for (const line of lineItems) {
      subtotal += line.totalAmount;
    }

    const taxRate = 0.20;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const invoiceNumber = `INV-${Date.now()}`;
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + parseInt(contract.paymentTerms || '30'));

    const [invoice] = await this.db
      .insert(invoices)
      .values({
        tenantId: data.tenantId,
        invoiceNumber,
        contractId: data.contractId,
        customerId: data.customerId,
        invoiceDate,
        dueDate,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        paidAmount: '0',
        currency: contract.currency,
        status: 'draft',
        createdBy: userId,
      })
      .returning();

    for (const usageRecord of usage) {
      await this.db
        .update(usageTracking)
        .set({ invoiced: true, invoiceId: invoice.id })
        .where(eq(usageTracking.id, usageRecord.id));
    }

    const pdfBuffer = await this.generateInvoicePDF(invoice, customer, contract, lineItems);

    await this.eventBus.emit('invoice.generated', {
      invoiceId: invoice.id,
      invoiceNumber,
      customerId: data.customerId,
      totalAmount,
    });

    return {
      invoice,
      lineItems,
      pdfBuffer,
    };
  }

  private aggregateUsageByType(usage: any[]) {
    const aggregated: Record<string, any> = {};

    for (const record of usage) {
      const key = record.usageType;
      if (!aggregated[key]) {
        aggregated[key] = {
          usageType: record.usageType,
          quantity: 0,
          unitOfMeasure: record.unitOfMeasure,
          rateAmount: parseFloat(record.rateAmount || '0'),
          totalAmount: 0,
        };
      }

      aggregated[key].quantity += parseFloat(record.quantity || '0');
      aggregated[key].totalAmount += parseFloat(record.totalAmount || '0');
    }

    return Object.values(aggregated);
  }

  private async generateInvoicePDF(invoice: any, customer: any, contract: any, lineItems: any[]) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = height - 50;

    page.drawText('INVOICE', {
      x: 50,
      y: yPosition,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 30;
    page.drawText(`Invoice Number: ${invoice.invoiceNumber}`, { x: 50, y: yPosition, size: 12, font });
    yPosition -= 20;
    page.drawText(`Invoice Date: ${invoice.invoiceDate.toLocaleDateString()}`, { x: 50, y: yPosition, size: 12, font });
    yPosition -= 20;
    page.drawText(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, { x: 50, y: yPosition, size: 12, font });

    yPosition -= 40;
    page.drawText('Bill To:', { x: 50, y: yPosition, size: 14, font: boldFont });
    yPosition -= 20;
    page.drawText(customer.companyName, { x: 50, y: yPosition, size: 12, font });
    yPosition -= 15;
    page.drawText(customer.billingAddress || '', { x: 50, y: yPosition, size: 10, font });

    yPosition -= 40;
    page.drawText('Line Items:', { x: 50, y: yPosition, size: 14, font: boldFont });
    yPosition -= 25;

    for (const line of lineItems) {
      page.drawText(`${line.usageType}: ${line.quantity} ${line.unitOfMeasure} x ${line.rateAmount} = ${line.totalAmount}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font,
      });
      yPosition -= 20;
    }

    yPosition -= 20;
    page.drawText(`Subtotal: ${invoice.subtotal} ${invoice.currency}`, { x: 350, y: yPosition, size: 12, font });
    yPosition -= 20;
    page.drawText(`Tax (20%): ${invoice.taxAmount} ${invoice.currency}`, { x: 350, y: yPosition, size: 12, font });
    yPosition -= 20;
    page.drawText(`Total: ${invoice.totalAmount} ${invoice.currency}`, { x: 350, y: yPosition, size: 14, font: boldFont });

    return await pdfDoc.save();
  }

  async sendInvoice(invoiceId: string, tenantId: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    await this.db
      .update(invoices)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    await this.eventBus.emit('invoice.sent', {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
    });

    return {
      status: 'sent',
      sentAt: new Date(),
    };
  }

  async recordPayment(invoiceId: string, amount: number, paymentMethod: string, tenantId: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tenantId, tenantId)))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const currentPaid = parseFloat(invoice.paidAmount || '0');
    const newPaidAmount = currentPaid + amount;
    const total = parseFloat(invoice.totalAmount);

    let newStatus = invoice.status;
    if (newPaidAmount >= total) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    const [updated] = await this.db
      .update(invoices)
      .set({
        paidAmount: newPaidAmount.toString(),
        status: newStatus,
        paidAt: newPaidAmount >= total ? new Date() : null,
        updatedAt: new Date(),
        metadata: {
          ...invoice.metadata,
          payments: [
            ...(invoice.metadata?.payments || []),
            {
              amount,
              paymentMethod,
              paidAt: new Date(),
            },
          ],
        },
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    await this.eventBus.emit('invoice.payment.recorded', {
      invoiceId,
      amount,
      paidAmount: newPaidAmount,
      status: newStatus,
    });

    return updated;
  }

  async getOverdueInvoices(tenantId: string) {
    const today = new Date();

    return await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          lte(invoices.dueDate, today),
          eq(invoices.status, 'sent'),
        ),
      );
  }

  async calculateAgingReport(tenantId: string) {
    const unpaidInvoices = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tenantId, tenantId),
          eq(invoices.status, 'sent'),
        ),
      );

    const aging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      days90Plus: 0,
    };

    const today = new Date();

    for (const invoice of unpaidInvoices) {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const amount = parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || '0');

      if (daysOverdue <= 0) aging.current += amount;
      else if (daysOverdue <= 30) aging.days30 += amount;
      else if (daysOverdue <= 60) aging.days60 += amount;
      else if (daysOverdue <= 90) aging.days90 += amount;
      else aging.days90Plus += amount;
    }

    return {
      aging,
      totalOutstanding: Object.values(aging).reduce((sum, val) => sum + val, 0),
      invoiceCount: unpaidInvoices.length,
    };
  }
}
