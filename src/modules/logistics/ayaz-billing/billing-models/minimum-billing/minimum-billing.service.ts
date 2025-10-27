import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../../core/events/event-bus.service';
import { minimumBillingGuarantees, minimumBillingAdjustments } from '../../../../../database/schema/shared/minimum-billing.schema';
import { invoices } from '../../../../../database/schema/logistics/billing.schema';
import { eq, and, gte, lte, sql, sum } from 'drizzle-orm';

interface MinimumBillingGuarantee {
  id: string;
  customerId: string;
  minimumAmount: number;
  currency: string;
  period: 'monthly' | 'quarterly' | 'annually';
  effectiveFrom: Date;
  effectiveTo?: Date;
  adjustmentMethod: 'invoice_credit' | 'next_period_rollover' | 'refund';
  isActive: boolean;
}

interface PeriodBillingCheck {
  customerId: string;
  period: { start: Date; end: Date };
  actualBilling: number;
  minimumRequired: number;
  shortfall: number;
  needsAdjustment: boolean;
}

@Injectable()
export class MinimumBillingService {
  private readonly logger = new Logger(MinimumBillingService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async checkMinimumBilling(
    customerId: string,
    periodStart: Date,
    periodEnd: Date,
    tenantId: string,
  ): Promise<PeriodBillingCheck> {
    const guarantee = await this.getActiveGuarantee(customerId, tenantId);

    if (!guarantee) {
      return {
        customerId,
        period: { start: periodStart, end: periodEnd },
        actualBilling: 0,
        minimumRequired: 0,
        shortfall: 0,
        needsAdjustment: false,
      };
    }

    const actualBilling = await this.calculateActualBilling(customerId, periodStart, periodEnd);
    const shortfall = Math.max(0, guarantee.minimumAmount - actualBilling);

    if (shortfall > 0) {
      await this.eventBus.emit('billing.minimum.shortfall', {
        customerId,
        period: { periodStart, periodEnd },
        actualBilling,
        minimumRequired: guarantee.minimumAmount,
        shortfall,
        tenantId,
      });
    }

    return {
      customerId,
      period: { start: periodStart, end: periodEnd },
      actualBilling,
      minimumRequired: guarantee.minimumAmount,
      shortfall,
      needsAdjustment: shortfall > 0,
    };
  }

  async applyMinimumBillingAdjustment(
    customerId: string,
    shortfall: number,
    method: MinimumBillingGuarantee['adjustmentMethod'],
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('billing.minimum.adjustment.applied', {
      customerId,
      shortfall,
      method,
      appliedAt: new Date(),
      tenantId,
    });
  }

  private async getActiveGuarantee(
    customerId: string,
    tenantId: string,
  ): Promise<MinimumBillingGuarantee | null> {
    try {
      const now = new Date().toISOString().split('T')[0];
      
      const [guarantee] = await this.db
        .select()
        .from(minimumBillingGuarantees)
        .where(
          and(
            eq(minimumBillingGuarantees.customerId, customerId),
            eq(minimumBillingGuarantees.tenantId, tenantId),
            eq(minimumBillingGuarantees.isActive, true),
            sql`${minimumBillingGuarantees.effectiveFrom} <= ${now}`,
            sql`(${minimumBillingGuarantees.effectiveTo} IS NULL OR ${minimumBillingGuarantees.effectiveTo} >= ${now})`,
          ),
        )
        .orderBy(sql`${minimumBillingGuarantees.effectiveFrom} DESC`)
        .limit(1);

      if (!guarantee) return null;

      return {
        id: guarantee.id,
        customerId: guarantee.customerId,
        minimumAmount: Number(guarantee.minimumAmount),
        currency: guarantee.currency || 'TRY',
        period: guarantee.period as any,
        effectiveFrom: guarantee.effectiveFrom,
        effectiveTo: guarantee.effectiveTo || undefined,
        adjustmentMethod: guarantee.adjustmentMethod as any,
        isActive: guarantee.isActive,
      };
    } catch (error) {
      this.logger.error(`Failed to get active guarantee for customer: ${customerId}`, error);
      return null;
    }
  }

  private async calculateActualBilling(
    customerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    try {
      const [result] = await this.db
        .select({
          total: sql<number>`COALESCE(SUM(${invoices.totalAmount}::numeric), 0)`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.customerId, customerId),
            sql`${invoices.invoiceDate} >= ${startDate.toISOString().split('T')[0]}`,
            sql`${invoices.invoiceDate} <= ${endDate.toISOString().split('T')[0]}`,
            sql`${invoices.status} IN ('paid', 'sent', 'confirmed')`,
          ),
        );

      return Number(result?.total || 0);
    } catch (error) {
      this.logger.error(`Failed to calculate actual billing for customer: ${customerId}`, error);
      return 0;
    }
  }
}

