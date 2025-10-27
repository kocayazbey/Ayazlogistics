import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface LoadPlan {
  id: string;
  orderId: string;
  vehicleType: string;
  loadSequence: Array<{
    itemId: string;
    position: number;
    zone: string;
    weight: number;
  }>;
  totalWeight: number;
  totalVolume: number;
  utilization: number;
  estimatedLoadTime: number;
}

@Injectable()
export class LoadPlanningService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async createLoadPlan(
    orderId: string,
    items: Array<{ id: string; weight: number; volume: number; stackable: boolean }>,
    vehicleCapacity: { maxWeight: number; maxVolume: number },
    tenantId: string,
  ): Promise<LoadPlan> {
    const sortedItems = this.sortItemsForLoading(items);
    const loadSequence = sortedItems.map((item, index) => ({
      itemId: item.id,
      position: index + 1,
      zone: this.determineZone(item),
      weight: item.weight,
    }));

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const totalVolume = items.reduce((sum, item) => sum + item.volume, 0);
    const utilization = Math.min(
      (totalWeight / vehicleCapacity.maxWeight) * 100,
      (totalVolume / vehicleCapacity.maxVolume) * 100,
    );

    return {
      id: `LP-${Date.now()}`,
      orderId,
      vehicleType: 'truck',
      loadSequence,
      totalWeight,
      totalVolume,
      utilization,
      estimatedLoadTime: items.length * 2,
    };
  }

  private sortItemsForLoading(items: any[]): any[] {
    return items.sort((a, b) => {
      if (!a.stackable && b.stackable) return -1;
      if (a.stackable && !b.stackable) return 1;
      return b.weight - a.weight;
    });
  }

  private determineZone(item: any): string {
    return item.stackable ? 'bottom' : 'top';
  }
}

