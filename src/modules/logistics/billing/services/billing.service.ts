import { Injectable } from '@nestjs/common';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { DatabaseService } from '../../../../core/database/database.service';
import { billingContracts, invoices, usageTracking, billingRates } from '../../../../database/schema/logistics/billing.schema';

@Injectable()
export class BillingService {
  constructor(private readonly db: DatabaseService) {}

  async getContracts(tenantId: string, filters?: {
    status?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [eq(billingContracts.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(billingContracts.status, filters.status));
    }
    
    if (filters?.customerId) {
      conditions.push(eq(billingContracts.customerId, filters.customerId));
    }

    const contracts = await this.db.client
      .select()
      .from(billingContracts)
      .where(and(...conditions))
      .orderBy(desc(billingContracts.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    const total = await this.db.client
      .select({ count: billingContracts.id })
      .from(billingContracts)
      .where(and(...conditions));

    return {
      data: contracts,
      total: total.length,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  async getContractById(contractId: string, tenantId: string) {
    const contract = await this.db.client
      .select()
      .from(billingContracts)
      .where(
        and(
          eq(billingContracts.id, contractId),
          eq(billingContracts.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!contract.length) {
      throw new Error('Contract not found');
    }

    const rates = await this.db.client
      .select()
      .from(billingRates)
      .where(eq(billingRates.contractId, contractId));

    return {
      ...contract[0],
      rates,
    };
  }

  async getInvoices(tenantId: string, filters?: {
    status?: string;
    customerId?: string;
    contractId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [eq(invoices.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(invoices.status, filters.status));
    }
    
    if (filters?.customerId) {
      conditions.push(eq(invoices.customerId, filters.customerId));
    }
    
    if (filters?.contractId) {
      conditions.push(eq(invoices.contractId, filters.contractId));
    }
    
    if (filters?.startDate) {
      conditions.push(gte(invoices.invoiceDate, filters.startDate.toISOString().split('T')[0]));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(invoices.invoiceDate, filters.endDate.toISOString().split('T')[0]));
    }

    const invoiceList = await this.db.client
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.invoiceDate))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    const total = await this.db.client
      .select({ count: invoices.id })
      .from(invoices)
      .where(and(...conditions));

    return {
      data: invoiceList,
      total: total.length,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  async getInvoiceById(invoiceId: string, tenantId: string) {
    const invoice = await this.db.client
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!invoice.length) {
      throw new Error('Invoice not found');
    }

    const usageDetails = await this.db.client
      .select()
      .from(usageTracking)
      .where(eq(usageTracking.invoiceId, invoiceId));

    return {
      ...invoice[0],
      usageDetails,
    };
  }

  async getInvoicesByContract(contractId: string, tenantId: string) {
    return await this.db.client
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.contractId, contractId),
          eq(invoices.tenantId, tenantId)
        )
      )
      .orderBy(desc(invoices.invoiceDate));
  }

  async getUsageByContract(
    contractId: string, 
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const conditions = [
      eq(usageTracking.contractId, contractId),
      eq(usageTracking.tenantId, tenantId)
    ];
    
    if (startDate) {
      conditions.push(gte(usageTracking.usageDate, startDate.toISOString().split('T')[0]));
    }
    
    if (endDate) {
      conditions.push(lte(usageTracking.usageDate, endDate.toISOString().split('T')[0]));
    }

    return await this.db.client
      .select()
      .from(usageTracking)
      .where(and(...conditions))
      .orderBy(desc(usageTracking.usageDate));
  }

  async getInvoiceStats(tenantId: string) {
    const allInvoices = await this.db.client
      .select()
      .from(invoices)
      .where(eq(invoices.tenantId, tenantId));

    const stats = {
      total: allInvoices.length,
      draft: allInvoices.filter(inv => inv.status === 'draft').length,
      sent: allInvoices.filter(inv => inv.status === 'sent').length,
      paid: allInvoices.filter(inv => inv.status === 'paid').length,
      overdue: allInvoices.filter(inv => {
        const dueDate = new Date(inv.dueDate);
        return inv.status !== 'paid' && dueDate < new Date();
      }).length,
      totalAmount: allInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || '0'), 0),
      paidAmount: allInvoices.reduce((sum, inv) => sum + parseFloat(inv.paidAmount || '0'), 0),
      outstandingAmount: allInvoices.reduce((sum, inv) => {
        const total = parseFloat(inv.totalAmount || '0');
        const paid = parseFloat(inv.paidAmount || '0');
        return sum + (total - paid);
      }, 0),
    };

    return stats;
  }
}

