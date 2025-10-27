import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { invoices } from '../../../../database/schema/logistics/billing.schema';
import { journalEntries, glAccounts, transactions } from '../../../../database/schema/shared/erp-finance.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class BillingErpIntegrationService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async syncInvoiceToERP(invoiceId: string, tenantId: string, userId: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const receivableAccount = await this.findOrCreateGLAccount(
      tenantId,
      'RECV',
      'Accounts Receivable',
      'asset',
    );

    const revenueAccount = await this.findOrCreateGLAccount(
      tenantId,
      'REV',
      'Revenue',
      'revenue',
    );

    const taxAccount = await this.findOrCreateGLAccount(
      tenantId,
      'TAX',
      'Tax Payable',
      'liability',
    );

    const entryNumber = `JE-${Date.now()}`;

    await this.db.insert(journalEntries).values({
      tenantId,
      entryNumber: `${entryNumber}-1`,
      entryDate: invoice.invoiceDate,
      accountId: receivableAccount.id,
      debit: invoice.totalAmount,
      credit: '0',
      description: `Invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      createdBy: userId,
    });

    await this.db.insert(journalEntries).values({
      tenantId,
      entryNumber: `${entryNumber}-2`,
      entryDate: invoice.invoiceDate,
      accountId: revenueAccount.id,
      debit: '0',
      credit: invoice.subtotal,
      description: `Invoice ${invoice.invoiceNumber} - Revenue`,
      reference: invoice.invoiceNumber,
      createdBy: userId,
    });

    await this.db.insert(journalEntries).values({
      tenantId,
      entryNumber: `${entryNumber}-3`,
      entryDate: invoice.invoiceDate,
      accountId: taxAccount.id,
      debit: '0',
      credit: invoice.taxAmount,
      description: `Invoice ${invoice.invoiceNumber} - Tax`,
      reference: invoice.invoiceNumber,
      createdBy: userId,
    });

    await this.db.insert(transactions).values({
      tenantId,
      transactionNumber: `TXN-${Date.now()}`,
      transactionDate: invoice.invoiceDate,
      transactionType: 'income',
      category: 'invoice',
      amount: invoice.totalAmount,
      description: `Invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      status: 'pending',
      createdBy: userId,
    });

    await this.eventBus.emit('invoice.synced.to.erp', {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      entryNumber,
      tenantId,
    });

    return {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      syncedToERP: true,
      journalEntries: [entryNumber],
      syncedAt: new Date(),
    };
  }

  async syncPaymentToERP(invoiceId: string, paymentAmount: number, paymentMethod: string, tenantId: string, userId: string) {
    const [invoice] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const cashAccount = await this.findOrCreateGLAccount(
      tenantId,
      'CASH',
      'Cash',
      'asset',
    );

    const receivableAccount = await this.findOrCreateGLAccount(
      tenantId,
      'RECV',
      'Accounts Receivable',
      'asset',
    );

    const entryNumber = `JE-PAY-${Date.now()}`;

    await this.db.insert(journalEntries).values({
      tenantId,
      entryNumber: `${entryNumber}-1`,
      entryDate: new Date(),
      accountId: cashAccount.id,
      debit: paymentAmount.toString(),
      credit: '0',
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      createdBy: userId,
    });

    await this.db.insert(journalEntries).values({
      tenantId,
      entryNumber: `${entryNumber}-2`,
      entryDate: new Date(),
      accountId: receivableAccount.id,
      debit: '0',
      credit: paymentAmount.toString(),
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      createdBy: userId,
    });

    await this.db.insert(transactions).values({
      tenantId,
      transactionNumber: `TXN-PAY-${Date.now()}`,
      transactionDate: new Date(),
      transactionType: 'income',
      category: 'payment',
      amount: paymentAmount.toString(),
      description: `Payment for Invoice ${invoice.invoiceNumber} via ${paymentMethod}`,
      reference: invoice.invoiceNumber,
      status: 'completed',
      createdBy: userId,
    });

    await this.eventBus.emit('payment.synced.to.erp', {
      invoiceId,
      paymentAmount,
      entryNumber,
      tenantId,
    });

    return {
      invoiceId,
      paymentAmount,
      syncedToERP: true,
      journalEntries: [entryNumber],
      syncedAt: new Date(),
    };
  }

  private async findOrCreateGLAccount(tenantId: string, code: string, name: string, type: string) {
    const existing = await this.db
      .select()
      .from(glAccounts)
      .where(eq(glAccounts.accountCode, code))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [created] = await this.db
      .insert(glAccounts)
      .values({
        tenantId,
        accountCode: code,
        accountName: name,
        accountType: type,
        balance: '0',
      })
      .returning();

    return created;
  }

  async reconcileBillingWithERP(tenantId: string, periodStart: Date, periodEnd: Date) {
    const allInvoices = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));

    const allTransactions = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId));

    const invoiceTotal = allInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0);
    const transactionTotal = allTransactions
      .filter((t: any) => t.category === 'invoice')
      .reduce((sum, t: any) => sum + parseFloat(t.amount || '0'), 0);

    const difference = invoiceTotal - transactionTotal;

    return {
      period: { periodStart, periodEnd },
      invoiceTotal,
      erpTransactionTotal: transactionTotal,
      difference,
      reconciled: Math.abs(difference) < 0.01,
      discrepancies: Math.abs(difference) >= 0.01 ? [
        {
          type: 'total_mismatch',
          invoiceTotal,
          erpTotal: transactionTotal,
          difference,
        },
      ] : [],
    };
  }

  async exportToAccounting(tenantId: string, format: 'quickbooks' | 'xero' | 'sage', periodStart: Date, periodEnd: Date) {
    const invoices = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));

    const exportData = invoices.map((inv: any) => ({
      invoiceNumber: inv.invoiceNumber,
      customerName: 'Customer',
      invoiceDate: inv.invoiceDate,
      dueDate: inv.dueDate,
      subtotal: inv.subtotal,
      tax: inv.taxAmount,
      total: inv.totalAmount,
      status: inv.status,
    }));

    return {
      format,
      period: { periodStart, periodEnd },
      recordCount: exportData.length,
      exportData,
      exportedAt: new Date(),
      downloadUrl: `https://exports.ayazlogistics.com/${tenantId}/${format}/${Date.now()}.csv`,
    };
  }
}
