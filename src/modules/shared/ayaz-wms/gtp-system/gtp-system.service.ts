import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface PickingStation {
  stationId: string;
  operatorId?: string;
  currentBatchId?: string;
  status: 'ready' | 'picking' | 'waiting_for_tote' | 'offline';
}

@Injectable()
export class GTPSystemService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async initiatePickingBatch(
    orderId: string,
    items: Array<{ sku: string; location: string; quantity: number }>,
    tenantId: string,
  ): Promise<{ batchId: string; stationId: string }> {
    const batchId = `BATCH-${Date.now()}`;
    const station = await this.assignStation();

    for (const item of items) {
      await this.requestTote(item.location, station.stationId);
    }

    await this.eventBus.emit('gtp.batch.initiated', {
      batchId,
      orderId,
      stationId: station.stationId,
      itemCount: items.length,
      tenantId,
    });

    return { batchId, stationId: station.stationId };
  }

  private async requestTote(location: string, stationId: string): Promise<void> {
    // Send command to automated shuttle/robot
  }

  private async assignStation(): Promise<PickingStation> {
    return {
      stationId: 'GTP-01',
      status: 'ready',
    };
  }
}

