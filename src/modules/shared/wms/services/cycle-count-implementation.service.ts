import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { inventory } from '../../../../database/schema/shared/wms.schema';

@Injectable()
export class CycleCountImplementationService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createCycleCount(data: {
    tenantId: string;
    warehouseId: string;
    countType: 'full' | 'partial' | 'spot';
    locations?: string[];
    createdBy: string;
  }): Promise<any> {
    const countNumber = `COUNT-${Date.now()}`;

    const cycleCount = {
      id: crypto.randomUUID(),
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      countNumber,
      countType: data.countType,
      status: 'pending',
      locations: data.locations || [],
      createdBy: data.createdBy,
      createdAt: new Date(),
    };

    await this.eventBus.emit('cycle.count.created', { countId: cycleCount.id });
    return cycleCount;
  }

  async recordCount(data: {
    countId: string;
    productId: string;
    location: string;
    systemQuantity: number;
    countedQuantity: number;
    countedBy: string;
  }): Promise<any> {
    const variance = data.countedQuantity - data.systemQuantity;
    const variancePercentage = data.systemQuantity > 0 
      ? (variance / data.systemQuantity) * 100 
      : 0;

    if (variance !== 0) {
      await this.db
        .update(inventory)
        .set({
          quantityOnHand: data.countedQuantity,
          quantityAvailable: sql`${inventory.quantityAvailable} + ${variance}`,
        })
        .where(
          and(
            eq(inventory.productId, data.productId),
            eq(inventory.location, data.location),
          ),
        );
    }

    await this.eventBus.emit('cycle.count.recorded', {
      countId: data.countId,
      variance,
    });

    return {
      productId: data.productId,
      location: data.location,
      systemQuantity: data.systemQuantity,
      countedQuantity: data.countedQuantity,
      variance,
      variancePercentage: parseFloat(variancePercentage.toFixed(2)),
    };
  }
}

