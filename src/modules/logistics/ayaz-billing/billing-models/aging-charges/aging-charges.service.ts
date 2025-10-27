import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import { EventBusService } from '../../../../../core/events/event-bus.service';

interface AgingTier {
  tierName: string;
  minDays: number;
  maxDays: number;
  rateMultiplier: number;
  baseRate: number;
}

@Injectable()
export class AgingChargesService {
  private readonly agingTiers: AgingTier[] = [
    { tierName: '0-30 days', minDays: 0, maxDays: 30, rateMultiplier: 1.0, baseRate: 15 },
    { tierName: '31-60 days', minDays: 31, maxDays: 60, rateMultiplier: 1.2, baseRate: 18 },
    { tierName: '61-90 days', minDays: 61, maxDays: 90, rateMultiplier: 1.5, baseRate: 22.5 },
    { tierName: '91-180 days', minDays: 91, maxDays: 180, rateMultiplier: 1.8, baseRate: 27 },
    { tierName: '180+ days', minDays: 181, maxDays: 999999, rateMultiplier: 2.5, baseRate: 37.5 },
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async calculateAgingCharge(
    inventoryReceiptDate: Date,
    currentDate: Date,
    baseDailyRate: number,
    palletCount: number,
  ): Promise<{
    daysInStorage: number;
    tier: AgingTier;
    dailyRate: number;
    totalCharge: number;
  }> {
    const daysInStorage = Math.floor(
      (currentDate.getTime() - inventoryReceiptDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const tier = this.getTierForDays(daysInStorage);
    const dailyRate = baseDailyRate * tier.rateMultiplier;
    const totalCharge = dailyRate * palletCount * daysInStorage;

    return {
      daysInStorage,
      tier,
      dailyRate: Math.round(dailyRate * 100) / 100,
      totalCharge: Math.round(totalCharge * 100) / 100,
    };
  }

  private getTierForDays(days: number): AgingTier {
    return this.agingTiers.find(tier => days >= tier.minDays && days <= tier.maxDays) || this.agingTiers[0];
  }

  async getAgingReport(
    warehouseId: string,
    customerId: string,
    date: Date,
    tenantId: string,
  ): Promise<any> {
    const byTier: Record<string, { palletCount: number; totalCharge: number; items: number }> = {};

    for (const tier of this.agingTiers) {
      byTier[tier.tierName] = {
        palletCount: 0,
        totalCharge: 0,
        items: 0,
      };
    }

    return {
      warehouseId,
      customerId,
      reportDate: date,
      byTier,
      totalPallets: 0,
      totalCharge: 0,
      avgAgeDays: 0,
    };
  }
}

