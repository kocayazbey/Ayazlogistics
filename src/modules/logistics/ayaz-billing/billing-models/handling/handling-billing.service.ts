import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { usageTracking, billingRates } from '../../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

interface HandlingActivity {
  contractId: string;
  activityType: 'receiving' | 'putaway' | 'picking' | 'packing' | 'shipping' | 'returns';
  quantity: number;
  unit: 'pallet' | 'carton' | 'piece' | 'kg';
  productCategory?: string;
  specialHandling?: boolean;
  timestamp: Date;
}

@Injectable()
export class HandlingBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async recordHandlingActivity(activity: HandlingActivity, tenantId: string) {
    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(eq(billingRates.contractId, activity.contractId))
      .limit(1);

    let rateAmount = 0;
    
    if (rate) {
      rateAmount = parseFloat(rate.rateAmount || '0');
    } else {
      rateAmount = this.getStandardRate(activity.activityType, activity.unit, activity.specialHandling);
    }

    const totalAmount = activity.quantity * rateAmount;

    const [usage] = await this.db
      .insert(usageTracking)
      .values({
        tenantId,
        contractId: activity.contractId,
        usageType: `handling_${activity.activityType}`,
        quantity: activity.quantity.toString(),
        unitOfMeasure: activity.unit,
        rateAmount: rateAmount.toString(),
        totalAmount: totalAmount.toString(),
        usageDate: activity.timestamp,
        invoiced: false,
        metadata: {
          activityType: activity.activityType,
          productCategory: activity.productCategory,
          specialHandling: activity.specialHandling,
        },
      })
      .returning();

    await this.eventBus.emit('handling.activity.recorded', {
      usageId: usage.id,
      contractId: activity.contractId,
      activityType: activity.activityType,
      totalAmount,
      tenantId,
    });

    return usage;
  }

  private getStandardRate(activityType: string, unit: string, specialHandling?: boolean): number {
    const baseRates = {
      receiving: { pallet: 10, carton: 2, piece: 0.5, kg: 0.1 },
      putaway: { pallet: 8, carton: 1.5, piece: 0.3, kg: 0.08 },
      picking: { pallet: 12, carton: 2.5, piece: 0.6, kg: 0.12 },
      packing: { pallet: 5, carton: 1, piece: 0.25, kg: 0.05 },
      shipping: { pallet: 15, carton: 3, piece: 0.75, kg: 0.15 },
      returns: { pallet: 20, carton: 4, piece: 1, kg: 0.2 },
    };

    const baseRate = baseRates[activityType]?.[unit] || 1;
    return specialHandling ? baseRate * 1.5 : baseRate;
  }

  async calculateHandlingCost(data: {
    contractId: string;
    activities: Array<{
      type: string;
      quantity: number;
      unit: string;
    }>;
  }) {
    let totalCost = 0;
    const breakdown = [];

    for (const activity of data.activities) {
      const rate = this.getStandardRate(activity.type, activity.unit);
      const cost = activity.quantity * rate;
      totalCost += cost;

      breakdown.push({
        activityType: activity.type,
        quantity: activity.quantity,
        unit: activity.unit,
        rate,
        cost,
      });
    }

    return {
      contractId: data.contractId,
      totalCost,
      breakdown,
      currency: 'TRY',
    };
  }

  async getHandlingUsageReport(contractId: string, startDate: Date, endDate: Date, tenantId: string) {
    const usage = await this.db
      .select()
      .from(usageTracking)
      .where(eq(usageTracking.contractId, contractId));

    const byActivityType: Record<string, any> = {};

    for (const record of usage) {
      const activityType = record.metadata?.activityType || record.usageType;

      if (!byActivityType[activityType]) {
        byActivityType[activityType] = {
          activityType,
          totalQuantity: 0,
          totalAmount: 0,
          count: 0,
        };
      }

      byActivityType[activityType].totalQuantity += parseFloat(record.quantity || '0');
      byActivityType[activityType].totalAmount += parseFloat(record.totalAmount || '0');
      byActivityType[activityType].count++;
    }

    const totalAmount = Object.values(byActivityType).reduce((sum: number, item: any) => sum + item.totalAmount, 0);

    return {
      contractId,
      period: { startDate, endDate },
      byActivityType: Object.values(byActivityType),
      totalAmount,
      currency: 'TRY',
    };
  }

  async applyVolumeDiscount(contractId: string, totalAmount: number) {
    let discount = 0;

    if (totalAmount > 100000) {
      discount = 0.15;
    } else if (totalAmount > 50000) {
      discount = 0.10;
    } else if (totalAmount > 20000) {
      discount = 0.05;
    }

    const discountAmount = totalAmount * discount;
    const finalAmount = totalAmount - discountAmount;

    return {
      originalAmount: totalAmount,
      discountPercentage: discount * 100,
      discountAmount,
      finalAmount,
    };
  }
}
