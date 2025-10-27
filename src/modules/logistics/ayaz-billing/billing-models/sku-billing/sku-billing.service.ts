import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between, sql } from 'drizzle-orm';
import { usageTracking, billingRates } from '../../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

interface SKUActivity {
  contractId: string;
  customerId: string;
  skuCount: number;
  billingPeriod: Date;
  metadata?: any;
}

@Injectable()
export class SKUBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async recordMonthlySKUCount(activity: SKUActivity, tenantId: string) {
    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(
        and(
          eq(billingRates.contractId, activity.contractId),
          eq(billingRates.rateType, 'sku_monthly')
        )
      )
      .limit(1);

    const baseRate = rate ? parseFloat(rate.rateAmount || '0') : 10.0;

    const { finalRate, tier } = this.calculateTieredSKURate(activity.skuCount, baseRate);
    const totalAmount = activity.skuCount * finalRate;

    const [usage] = await this.db
      .insert(usageTracking)
      .values({
        tenantId,
        contractId: activity.contractId,
        usageType: 'sku_monthly',
        quantity: activity.skuCount.toString(),
        unitOfMeasure: 'sku',
        rateAmount: finalRate.toString(),
        totalAmount: totalAmount.toString(),
        usageDate: activity.billingPeriod,
        invoiced: false,
        metadata: {
          customerId: activity.customerId,
          skuCount: activity.skuCount,
          tier,
          baseRate,
          finalRate,
          ...activity.metadata,
        },
      })
      .returning();

    await this.eventBus.emit('sku.monthly.recorded', {
      usageId: usage.id,
      contractId: activity.contractId,
      skuCount: activity.skuCount,
      tier,
      totalAmount,
      tenantId,
    });

    return usage;
  }

  private calculateTieredSKURate(skuCount: number, baseRate: number): { finalRate: number; tier: string } {
    let multiplier = 1.0;
    let tier = 'base';

    if (skuCount > 1000) {
      multiplier = 1.3;
      tier = 'premium_1000+';
    } else if (skuCount > 500) {
      multiplier = 1.2;
      tier = 'high_500-1000';
    } else if (skuCount > 250) {
      multiplier = 1.1;
      tier = 'medium_250-500';
    } else if (skuCount > 100) {
      multiplier = 1.0;
      tier = 'standard_100-250';
    } else if (skuCount > 50) {
      multiplier = 0.9;
      tier = 'small_50-100';
    } else {
      multiplier = 0.8;
      tier = 'micro_0-50';
    }

    return {
      finalRate: baseRate * multiplier,
      tier,
    };
  }

  async calculateSKUCost(data: {
    contractId: string;
    skuCount: number;
    baseRate?: number;
  }): Promise<any> {
    const baseRate = data.baseRate || 10.0;
    const { finalRate, tier } = this.calculateTieredSKURate(data.skuCount, baseRate);
    const totalCost = data.skuCount * finalRate;

    return {
      contractId: data.contractId,
      skuCount: data.skuCount,
      tier,
      baseRate,
      finalRate,
      totalCost,
      currency: 'TRY',
    };
  }

  async getSKUUsageReport(
    contractId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<any> {
    const usage = await this.db
      .select()
      .from(usageTracking)
      .where(
        and(
          eq(usageTracking.contractId, contractId),
          eq(usageTracking.tenantId, tenantId),
          eq(usageTracking.usageType, 'sku_monthly'),
          between(usageTracking.usageDate, startDate, endDate)
        )
      );

    const totalAmount = usage.reduce(
      (sum, record) => sum + parseFloat(record.totalAmount || '0'),
      0
    );

    const avgSKUCount = usage.length > 0
      ? usage.reduce((sum, record) => sum + parseFloat(record.quantity || '0'), 0) / usage.length
      : 0;

    return {
      contractId,
      period: { startDate, endDate },
      monthCount: usage.length,
      avgSKUCount: Math.round(avgSKUCount),
      totalAmount,
      currency: 'TRY',
      breakdown: usage.map(u => ({
        month: u.usageDate,
        skuCount: parseFloat(u.quantity || '0'),
        amount: parseFloat(u.totalAmount || '0'),
        tier: u.metadata?.tier,
      })),
    };
  }

  async getActiveSKUCount(customerId: string, warehouseId: string, date: Date): Promise<number> {
    // This would query actual inventory with distinct SKUs
    // Mock implementation
    return 150;
  }
}

