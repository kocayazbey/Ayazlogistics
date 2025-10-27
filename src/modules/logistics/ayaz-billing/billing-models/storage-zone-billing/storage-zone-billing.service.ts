import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { usageTracking, billingRates } from '../../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

type StorageZoneType = 
  | 'ambient' 
  | 'climate_controlled'
  | 'refrigerated' 
  | 'frozen'
  | 'deep_freeze'
  | 'hazmat'
  | 'bonded'
  | 'high_value'
  | 'outdoor'
  | 'bulk';

interface StorageZoneActivity {
  contractId: string;
  locationId: string;
  zoneType: StorageZoneType;
  palletPositions: number;
  storageDate: Date;
  customRate?: number;
  metadata?: any;
}

@Injectable()
export class StorageZoneBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async recordDailyStorageUsage(activity: StorageZoneActivity, tenantId: string) {
    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(
        and(
          eq(billingRates.contractId, activity.contractId),
          eq(billingRates.rateType, `storage_${activity.zoneType}`)
        )
      )
      .limit(1);

    let dailyRate = activity.customRate || 0;
    
    if (!activity.customRate && rate) {
      dailyRate = parseFloat(rate.rateAmount || '0');
    } else if (!activity.customRate) {
      dailyRate = this.getStandardZoneRate(activity.zoneType);
    }

    const totalAmount = activity.palletPositions * dailyRate;

    const [usage] = await this.db
      .insert(usageTracking)
      .values({
        tenantId,
        contractId: activity.contractId,
        usageType: `storage_${activity.zoneType}`,
        resourceId: activity.locationId,
        quantity: activity.palletPositions.toString(),
        unitOfMeasure: 'pallet_position_day',
        rateAmount: dailyRate.toString(),
        totalAmount: totalAmount.toString(),
        usageDate: activity.storageDate,
        invoiced: false,
        metadata: {
          locationId: activity.locationId,
          zoneType: activity.zoneType,
          palletPositions: activity.palletPositions,
          ...activity.metadata,
        },
      })
      .returning();

    await this.eventBus.emit('storage_zone.usage.recorded', {
      usageId: usage.id,
      contractId: activity.contractId,
      zoneType: activity.zoneType,
      palletPositions: activity.palletPositions,
      totalAmount,
      tenantId,
    });

    return usage;
  }

  private getStandardZoneRate(zoneType: StorageZoneType): number {
    const dailyRatesPerPallet: Record<StorageZoneType, number> = {
      'ambient': 15.0,
      'climate_controlled': 25.0,
      'refrigerated': 35.0,
      'frozen': 45.0,
      'deep_freeze': 60.0,
      'hazmat': 75.0,
      'bonded': 30.0,
      'high_value': 40.0,
      'outdoor': 8.0,
      'bulk': 5.0,
    };

    return dailyRatesPerPallet[zoneType] || 15.0;
  }

  async calculateMonthlyStorageCost(data: {
    contractId: string;
    zones: Array<{
      zoneType: StorageZoneType;
      avgPalletPositions: number;
      days: number;
    }>;
  }): Promise<any> {
    let totalCost = 0;
    const breakdown = [];

    for (const zone of data.zones) {
      const dailyRate = this.getStandardZoneRate(zone.zoneType);
      const cost = zone.avgPalletPositions * zone.days * dailyRate;
      totalCost += cost;

      breakdown.push({
        zoneType: zone.zoneType,
        avgPalletPositions: zone.avgPalletPositions,
        days: zone.days,
        dailyRate,
        monthlyCost: cost,
      });
    }

    return {
      contractId: data.contractId,
      totalCost,
      breakdown,
      currency: 'TRY',
    };
  }

  async getStorageUsageReport(
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

    const storageRecords = usage.filter(u => u.usageType?.startsWith('storage_'));

    const byZoneType: Record<string, any> = {};

    for (const record of storageRecords) {
      const zoneType = record.usageType?.replace('storage_', '') || 'unknown';

      if (!byZoneType[zoneType]) {
        byZoneType[zoneType] = {
          zoneType,
          totalPalletDays: 0,
          totalAmount: 0,
          recordCount: 0,
        };
      }

      byZoneType[zoneType].totalPalletDays += parseFloat(record.quantity || '0');
      byZoneType[zoneType].totalAmount += parseFloat(record.totalAmount || '0');
      byZoneType[zoneType].recordCount++;
    }

    const totalAmount = Object.values(byZoneType).reduce(
      (sum: number, item: any) => sum + item.totalAmount, 
      0
    );

    const totalPalletDays = Object.values(byZoneType).reduce(
      (sum: number, item: any) => sum + item.totalPalletDays, 
      0
    );

    return {
      contractId,
      period: { startDate, endDate },
      byZoneType: Object.values(byZoneType),
      totalPalletDays,
      totalAmount,
      currency: 'TRY',
    };
  }

  async getZoneUtilization(
    warehouseId: string,
    zoneType: StorageZoneType,
    date: Date,
  ): Promise<any> {
    // This would query actual warehouse locations
    // Mock data for now
    return {
      zoneType,
      totalCapacity: 1000,
      occupiedPositions: 750,
      utilizationPercentage: 75,
      availablePositions: 250,
      date,
    };
  }

  async getZoneRateCard(): Promise<Array<{ zoneType: StorageZoneType; dailyRate: number; monthlyRate: number }>> {
    const zoneTypes: StorageZoneType[] = [
      'ambient',
      'climate_controlled',
      'refrigerated',
      'frozen',
      'deep_freeze',
      'hazmat',
      'bonded',
      'high_value',
      'outdoor',
      'bulk',
    ];

    return zoneTypes.map(zoneType => {
      const dailyRate = this.getStandardZoneRate(zoneType);
      return {
        zoneType,
        dailyRate,
        monthlyRate: dailyRate * 30,
      };
    });
  }

  async applyLongTermStorageDiscount(days: number, baseAmount: number): Promise<any> {
    let discountPercentage = 0;

    if (days > 365) {
      discountPercentage = 15;
    } else if (days > 180) {
      discountPercentage = 10;
    } else if (days > 90) {
      discountPercentage = 5;
    }

    const discountAmount = (baseAmount * discountPercentage) / 100;
    const finalAmount = baseAmount - discountAmount;

    return {
      days,
      baseAmount,
      discountPercentage,
      discountAmount,
      finalAmount,
      currency: 'TRY',
    };
  }
}

