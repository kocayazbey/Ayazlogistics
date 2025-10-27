import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface GTPStation {
  id: string;
  stationNumber: number;
  operatorId?: string;
  status: 'idle' | 'active' | 'waiting' | 'error';
  currentTaskId?: string;
}

interface GTPTask {
  id: string;
  orderId: string;
  items: Array<{
    itemId: string;
    binLocation: string;
    quantity: number;
  }>;
  assignedStationId?: string;
  status: 'pending' | 'retrieving' | 'picking' | 'completed';
}

@Injectable()
export class GoodsToPersonService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createPickTask(
    orderId: string,
    items: Array<{ itemId: string; binLocation: string; quantity: number }>,
    tenantId: string,
  ): Promise<GTPTask> {
    const taskId = `GTP-${Date.now()}`;
    const station = await this.findAvailableStation(tenantId);

    const task: GTPTask = {
      id: taskId,
      orderId,
      items,
      assignedStationId: station?.id,
      status: 'pending',
    };

    await this.eventBus.emit('gtp.task.created', {
      taskId,
      orderId,
      stationId: station?.id,
      itemCount: items.length,
      tenantId,
    });

    return task;
  }

  async retrieveBinToStation(
    binLocation: string,
    stationId: string,
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('gtp.bin.retrieving', {
      binLocation,
      stationId,
      timestamp: new Date(),
      tenantId,
    });
  }

  private async findAvailableStation(tenantId: string): Promise<GTPStation | null> {
    return {
      id: 'GTP-STATION-01',
      stationNumber: 1,
      status: 'idle',
    };
  }
}

