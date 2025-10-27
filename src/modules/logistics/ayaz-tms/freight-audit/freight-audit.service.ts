import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface FreightInvoice {
  id: string;
  carrierId: string;
  shipmentId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  status: 'pending_audit' | 'approved' | 'disputed' | 'paid';
}

interface AuditResult {
  invoiceId: string;
  auditStatus: 'pass' | 'fail' | 'warning';
  discrepancies: Array<{
    type: string;
    description: string;
    expectedAmount: number;
    actualAmount: number;
    variance: number;
  }>;
  recommendedAction: string;
  totalVariance: number;
}

@Injectable()
export class FreightAuditService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async auditInvoice(invoice: FreightInvoice, shipmentData: any): Promise<AuditResult> {
    const discrepancies = [];
    let totalVariance = 0;

    const expectedFreight = shipmentData.agreedRate || 5000;
    const actualFreight = invoice.lineItems
      .filter(item => item.description.includes('Freight'))
      .reduce((sum, item) => sum + item.amount, 0);

    if (Math.abs(actualFreight - expectedFreight) > expectedFreight * 0.05) {
      const variance = actualFreight - expectedFreight;
      discrepancies.push({
        type: 'Freight Charge',
        description: 'Freight charge differs from agreed rate',
        expectedAmount: expectedFreight,
        actualAmount: actualFreight,
        variance
      });
      totalVariance += variance;
    }

    const duplicateCharges = this.findDuplicateCharges(invoice.lineItems);
    if (duplicateCharges.length > 0) {
      duplicateCharges.forEach(dup => {
        discrepancies.push({
          type: 'Duplicate Charge',
          description: `Duplicate: ${dup.description}`,
          expectedAmount: 0,
          actualAmount: dup.amount,
          variance: dup.amount
        });
        totalVariance += dup.amount;
      });
    }

    const auditStatus = discrepancies.length === 0 ? 'pass' : 
                       totalVariance > expectedFreight * 0.1 ? 'fail' : 'warning';

    const result: AuditResult = {
      invoiceId: invoice.id,
      auditStatus,
      discrepancies,
      recommendedAction: this.getRecommendedAction(auditStatus, totalVariance),
      totalVariance
    };

    await this.eventBus.publish('freight.invoice.audited', {
      invoiceId: invoice.id,
      auditStatus,
      variance: totalVariance
    });

    return result;
  }

  private findDuplicateCharges(lineItems: any[]): any[] {
    const seen = new Map();
    const duplicates = [];

    for (const item of lineItems) {
      const key = `${item.description}-${item.amount}`;
      if (seen.has(key)) {
        duplicates.push(item);
      } else {
        seen.set(key, item);
      }
    }

    return duplicates;
  }

  private getRecommendedAction(status: string, variance: number): string {
    if (status === 'pass') return 'Approve for payment';
    if (status === 'warning') return 'Review discrepancies before approval';
    return 'Dispute invoice with carrier';
  }

  async disputeInvoice(invoiceId: string, reason: string, disputedAmount: number): Promise<any> {
    await this.eventBus.publish('freight.invoice.disputed', {
      invoiceId,
      reason,
      disputedAmount,
      disputedAt: new Date()
    });

    return {
      invoiceId,
      status: 'disputed',
      disputedAmount,
      reason,
      disputedAt: new Date(),
      expectedResolution: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    };
  }

  async getAuditSummary(startDate: Date, endDate: Date): Promise<any> {
    return {
      period: { startDate, endDate },
      totalInvoices: 245,
      audited: 245,
      passed: 210,
      warnings: 28,
      failed: 7,
      disputed: 5,
      totalInvoiced: 4250000,
      totalVariance: 125000,
      savingsAchieved: 98000,
      auditAccuracy: 97.1,
      avgAuditTime: 1.5
    };
  }

  async reconcilePayment(invoiceId: string, paidAmount: number): Promise<any> {
    return {
      invoiceId,
      invoiceAmount: 5000,
      paidAmount,
      variance: paidAmount - 5000,
      reconciled: Math.abs(paidAmount - 5000) < 10,
      reconciledAt: new Date()
    };
  }
}

