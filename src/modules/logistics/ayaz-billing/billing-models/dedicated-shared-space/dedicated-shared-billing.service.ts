import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface SpaceAllocation {
  id: string;
  customerId: string;
  warehouseId: string;
  spaceType: 'dedicated' | 'shared';
  allocatedSquareMeters?: number;
  sharedPoolId?: string;
  ratePerSqM: number;
  minimumSqM?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

@Injectable()
export class DedicatedSharedSpaceBillingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async calculateSpaceBilling(
    customerId: string,
    periodStart: Date,
    periodEnd: Date,
    tenantId: string,
  ): Promise<{
    dedicatedSpaceCost: number;
    sharedSpaceCost: number;
    totalCost: number;
    breakdown: Array<{
      spaceType: string;
      sqm: number;
      rate: number;
      cost: number;
    }>;
  }> {
    const allocations = await this.getSpaceAllocations(customerId, tenantId);
    
    const breakdown = [];
    let dedicatedSpaceCost = 0;
    let sharedSpaceCost = 0;

    for (const allocation of allocations) {
      const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
      const cost = (allocation.allocatedSquareMeters || 0) * allocation.ratePerSqM * (daysInPeriod / 30);

      if (allocation.spaceType === 'dedicated') {
        dedicatedSpaceCost += cost;
      } else {
        sharedSpaceCost += cost;
      }

      breakdown.push({
        spaceType: allocation.spaceType,
        sqm: allocation.allocatedSquareMeters || 0,
        rate: allocation.ratePerSqM,
        cost,
      });
    }

    return {
      dedicatedSpaceCost,
      sharedSpaceCost,
      totalCost: dedicatedSpaceCost + sharedSpaceCost,
      breakdown,
    };
  }

  private async getSpaceAllocations(customerId: string, tenantId: string): Promise<SpaceAllocation[]> {
    // Mock: Would query space_allocations table
    return [];
  }
}

