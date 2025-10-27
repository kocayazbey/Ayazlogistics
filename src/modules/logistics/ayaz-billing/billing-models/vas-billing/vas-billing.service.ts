import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { usageTracking, billingRates } from '../../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

type VASType = 
  | 'kitting' 
  | 'labeling' 
  | 'quality_control' 
  | 'shrink_wrapping' 
  | 'gift_wrapping'
  | 'product_assembly'
  | 'customization'
  | 'bundling'
  | 'unbundling'
  | 'poly_bagging'
  | 'bubble_wrapping'
  | 'sorting'
  | 'price_ticketing'
  | 'rfid_tagging'
  | 'compliance_labeling'
  | 'photo_documentation'
  | 'barcode_generation'
  | 'serialization';

interface VASActivity {
  contractId: string;
  vasType: VASType;
  quantity: number;
  unit: 'piece' | 'carton' | 'pallet' | 'hour' | 'kg';
  complexity?: 'simple' | 'medium' | 'complex';
  customRate?: number;
  metadata?: any;
  timestamp: Date;
}

@Injectable()
export class VASBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async recordVASActivity(activity: VASActivity, tenantId: string) {
    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(
        and(
          eq(billingRates.contractId, activity.contractId),
          eq(billingRates.rateType, `vas_${activity.vasType}`)
        )
      )
      .limit(1);

    let rateAmount = activity.customRate || 0;
    
    if (!activity.customRate && rate) {
      rateAmount = parseFloat(rate.rateAmount || '0');
    } else if (!activity.customRate) {
      rateAmount = this.getStandardVASRate(activity.vasType, activity.unit, activity.complexity);
    }

    const totalAmount = activity.quantity * rateAmount;

    const [usage] = await this.db
      .insert(usageTracking)
      .values({
        tenantId,
        contractId: activity.contractId,
        usageType: `vas_${activity.vasType}`,
        quantity: activity.quantity.toString(),
        unitOfMeasure: activity.unit,
        rateAmount: rateAmount.toString(),
        totalAmount: totalAmount.toString(),
        usageDate: activity.timestamp,
        invoiced: false,
        metadata: {
          vasType: activity.vasType,
          complexity: activity.complexity,
          ...activity.metadata,
        },
      })
      .returning();

    await this.eventBus.emit('vas.activity.recorded', {
      usageId: usage.id,
      contractId: activity.contractId,
      vasType: activity.vasType,
      totalAmount,
      tenantId,
    });

    return usage;
  }

  private getStandardVASRate(vasType: VASType, unit: string, complexity?: string): number {
    const complexityMultiplier = {
      'simple': 1.0,
      'medium': 1.5,
      'complex': 2.0,
    }[complexity || 'simple'] || 1.0;

    const baseRates: Record<VASType, Record<string, number>> = {
      'kitting': { piece: 2.5, carton: 15, pallet: 75 },
      'labeling': { piece: 0.5, carton: 3, pallet: 15 },
      'quality_control': { piece: 1.5, carton: 8, pallet: 40 },
      'shrink_wrapping': { piece: 1.0, carton: 5, pallet: 25 },
      'gift_wrapping': { piece: 3.0, carton: 18, pallet: 90 },
      'product_assembly': { piece: 5.0, carton: 30, pallet: 150, hour: 50 },
      'customization': { piece: 4.0, carton: 24, pallet: 120 },
      'bundling': { piece: 2.0, carton: 12, pallet: 60 },
      'unbundling': { piece: 1.5, carton: 9, pallet: 45 },
      'poly_bagging': { piece: 0.8, carton: 4.5, pallet: 22 },
      'bubble_wrapping': { piece: 1.2, carton: 6, pallet: 30 },
      'sorting': { piece: 0.6, carton: 3.5, pallet: 18 },
      'price_ticketing': { piece: 0.4, carton: 2.5, pallet: 12 },
      'rfid_tagging': { piece: 2.0, carton: 12, pallet: 60 },
      'compliance_labeling': { piece: 1.0, carton: 6, pallet: 30 },
      'photo_documentation': { piece: 0.75, carton: 4.5, pallet: 22 },
      'barcode_generation': { piece: 0.3, carton: 1.8, pallet: 9 },
      'serialization': { piece: 0.5, carton: 3, pallet: 15 },
    };

    const baseRate = baseRates[vasType]?.[unit] || 1;
    return baseRate * complexityMultiplier;
  }

  async calculateVASCost(data: {
    contractId: string;
    activities: Array<{
      vasType: VASType;
      quantity: number;
      unit: string;
      complexity?: string;
    }>;
  }): Promise<any> {
    let totalCost = 0;
    const breakdown = [];

    for (const activity of data.activities) {
      const rate = this.getStandardVASRate(
        activity.vasType, 
        activity.unit, 
        activity.complexity as 'simple' | 'medium' | 'complex'
      );
      const cost = activity.quantity * rate;
      totalCost += cost;

      breakdown.push({
        vasType: activity.vasType,
        quantity: activity.quantity,
        unit: activity.unit,
        complexity: activity.complexity,
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

  async getVASUsageReport(
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
          between(usageTracking.usageDate, startDate, endDate)
        )
      );

    const vasRecords = usage.filter(u => u.usageType?.startsWith('vas_'));

    const byVASType: Record<string, any> = {};

    for (const record of vasRecords) {
      const vasType = record.usageType?.replace('vas_', '') || 'unknown';

      if (!byVASType[vasType]) {
        byVASType[vasType] = {
          vasType,
          totalQuantity: 0,
          totalAmount: 0,
          count: 0,
        };
      }

      byVASType[vasType].totalQuantity += parseFloat(record.quantity || '0');
      byVASType[vasType].totalAmount += parseFloat(record.totalAmount || '0');
      byVASType[vasType].count++;
    }

    const totalAmount = Object.values(byVASType).reduce(
      (sum: number, item: any) => sum + item.totalAmount, 
      0
    );

    return {
      contractId,
      period: { startDate, endDate },
      byVASType: Object.values(byVASType),
      totalAmount,
      currency: 'TRY',
    };
  }

  async getVASRateCard(): Promise<Array<{ vasType: VASType; rates: any }>> {
    const rateCard: Array<{ vasType: VASType; rates: any }> = [];

    const vasTypes: VASType[] = [
      'kitting',
      'labeling',
      'quality_control',
      'shrink_wrapping',
      'gift_wrapping',
      'product_assembly',
      'customization',
      'bundling',
      'unbundling',
      'poly_bagging',
      'bubble_wrapping',
      'sorting',
      'price_ticketing',
      'rfid_tagging',
      'compliance_labeling',
      'photo_documentation',
      'barcode_generation',
      'serialization',
    ];

    for (const vasType of vasTypes) {
      rateCard.push({
        vasType,
        rates: {
          simple: {
            piece: this.getStandardVASRate(vasType, 'piece', 'simple'),
            carton: this.getStandardVASRate(vasType, 'carton', 'simple'),
            pallet: this.getStandardVASRate(vasType, 'pallet', 'simple'),
          },
          medium: {
            piece: this.getStandardVASRate(vasType, 'piece', 'medium'),
            carton: this.getStandardVASRate(vasType, 'carton', 'medium'),
            pallet: this.getStandardVASRate(vasType, 'pallet', 'medium'),
          },
          complex: {
            piece: this.getStandardVASRate(vasType, 'piece', 'complex'),
            carton: this.getStandardVASRate(vasType, 'carton', 'complex'),
            pallet: this.getStandardVASRate(vasType, 'pallet', 'complex'),
          },
        },
      });
    }

    return rateCard;
  }
}

