import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { invoices, billingContracts } from '../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { UsageTrackerService } from './usage-tracker.service';

interface InvoiceLineItem {
  usageType: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  lineTotal: number;
}

interface GenerateInvoiceParams {
  tenantId: string;
  contractId: string;
  periodStart: Date;
  periodEnd: Date;
  invoiceDate?: Date;
  dueInDays?: number;
}

@Injectable()
export class UsageBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly usageTracker: UsageTrackerService,
  ) {}

  async generateInvoice(params: GenerateInvoiceParams): Promise<any> {
    const {
      tenantId,
      contractId,
      periodStart,
      periodEnd,
      invoiceDate = new Date(),
      dueInDays = 30,
    } = params;

    const [contract] = await this.db
      .select()
      .from(billingContracts)
      .where(eq(billingContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    const aggregatedUsage = await this.usageTracker.getAggregatedUsageByPeriod(
      contractId,
      periodStart,
      periodEnd,
    );

    if (aggregatedUsage.length === 0) {
      throw new Error('No uninvoiced usage found for the period');
    }

    const lineItems: InvoiceLineItem[] = aggregatedUsage.map((usage) => ({
      usageType: usage.usageType,
      description: this.getUsageDescription(usage.usageType),
      quantity: usage.totalQuantity,
      unitOfMeasure: usage.unitOfMeasure,
      unitPrice: usage.rateAmount,
      lineTotal: usage.totalAmount,
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxRate = 0.20; // KDV %20
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + dueInDays);

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    const [invoice] = await this.db
      .insert(invoices)
      .values({
        tenantId,
        invoiceNumber,
        contractId,
        customerId: contract.customerId,
        invoiceDate,
        dueDate,
        periodStart,
        periodEnd,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        paidAmount: '0',
        currency: contract.currency,
        status: 'draft',
        metadata: {
          lineItems,
          generatedFrom: 'usage-based-billing',
        },
      })
      .returning();

    const usageRecords = await this.usageTracker.getUsageByPeriod(
      contractId,
      periodStart,
      periodEnd,
    );
    const usageIds = usageRecords
      .filter((u) => !u.invoiced)
      .map((u) => u.id);

    await this.usageTracker.markAsInvoiced(usageIds, invoice.id);

    await this.eventBus.publish('billing.invoice.generated', {
      invoiceId: invoice.id,
      invoiceNumber,
      contractId,
      customerId: contract.customerId,
      totalAmount,
      lineItemCount: lineItems.length,
    });

    return {
      invoice,
      lineItems,
    };
  }

  async finalizeInvoice(invoiceId: string): Promise<any> {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'draft') {
      throw new Error(`Invoice is already ${invoice.status}`);
    }

    const [updated] = await this.db
      .update(invoices)
      .set({
        status: 'finalized',
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    await this.eventBus.publish('billing.invoice.finalized', {
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
    });

    return updated;
  }

  async sendInvoice(invoiceId: string): Promise<any> {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status !== 'finalized') {
      throw new Error('Only finalized invoices can be sent');
    }

    const [updated] = await this.db
      .update(invoices)
      .set({
        status: 'sent',
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    await this.eventBus.publish('billing.invoice.sent', {
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      customerId: updated.customerId,
    });

    return updated;
  }

  async recordPayment(
    invoiceId: string,
    amount: number,
    paymentDate: Date = new Date(),
  ): Promise<any> {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const currentPaid = parseFloat(invoice.paidAmount);
    const newPaidAmount = currentPaid + amount;
    const totalAmount = parseFloat(invoice.totalAmount);

    const newStatus =
      newPaidAmount >= totalAmount
        ? 'paid'
        : newPaidAmount > 0
          ? 'partially_paid'
          : invoice.status;

    const updateData: any = {
      paidAmount: newPaidAmount.toString(),
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'paid') {
      updateData.paidAt = paymentDate;
    }

    const [updated] = await this.db
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, invoiceId))
      .returning();

    await this.eventBus.publish('billing.payment.recorded', {
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      amount,
      newStatus,
      paidAmount: newPaidAmount,
      totalAmount,
    });

    return updated;
  }

  async voidInvoice(invoiceId: string, reason: string): Promise<any> {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot void a paid invoice');
    }

    const [updated] = await this.db
      .update(invoices)
      .set({
        status: 'void',
        metadata: {
          ...invoice.metadata,
          voidReason: reason,
          voidedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))
      .returning();

    await this.eventBus.publish('billing.invoice.voided', {
      invoiceId: updated.id,
      invoiceNumber: updated.invoiceNumber,
      reason,
    });

    return updated;
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    const lastInvoice = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId))
      .orderBy(invoices.createdAt)
      .limit(1);

    let sequence = 1;

    if (lastInvoice.length > 0) {
      const lastNumber = lastInvoice[0].invoiceNumber;
      const lastSequence = parseInt(lastNumber.split('-').pop() || '0');
      sequence = lastSequence + 1;
    }

    return `INV-${year}${month}-${String(sequence).padStart(6, '0')}`;
  }

  private getUsageDescription(usageType: string): string {
    const descriptions: Record<string, string> = {
      forklift_operator: 'Forklift Operatör Hizmeti',
      rack_storage: 'Raflı Depolama',
      handling: 'Elleçleme Hizmeti',
      waiting_time: 'Bekleme Ücreti',
      order_line: 'Sipariş Satırı İşleme',
      sku: 'SKU Yönetim Hizmeti',
      vas: 'Katma Değerli Hizmet',
      storage_zone: 'Bölgesel Depolama',
    };

    return descriptions[usageType] || usageType;
  }

  async getInvoiceDetails(invoiceId: string): Promise<any> {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const [contract] = await this.db
      .select()
      .from(billingContracts)
      .where(eq(billingContracts.id, invoice.contractId))
      .limit(1);

    return {
      ...invoice,
      contract,
      lineItems: invoice.metadata?.lineItems || [],
    };
  }
}

