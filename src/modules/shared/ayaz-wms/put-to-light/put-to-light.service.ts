import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface PutToLightWall {
  id: string;
  wallNumber: number;
  totalSlots: number;
  activeSlots: number;
  zoneId: string;
}

interface PutTask {
  id: string;
  waveId: string;
  slotNumber: number;
  orderId: string;
  itemId: string;
  quantityToPut: number;
  quantityPut: number;
  status: 'pending' | 'in_progress' | 'completed';
}

@Injectable()
export class PutToLightService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async initiateWavePutting(
    waveId: string,
    orders: Array<{ orderId: string; items: Array<{ itemId: string; quantity: number }> }>,
    tenantId: string,
  ): Promise<{ wallId: string; tasks: PutTask[] }> {
    const wall = await this.allocatePutWall(orders.length);
    const tasks: PutTask[] = [];

    orders.forEach((order, index) => {
      order.items.forEach(item => {
        tasks.push({
          id: `PUT-${Date.now()}-${order.orderId}`,
          waveId,
          slotNumber: index + 1,
          orderId: order.orderId,
          itemId: item.itemId,
          quantityToPut: item.quantity,
          quantityPut: 0,
          status: 'pending',
        });
      });
    });

    await this.eventBus.emit('put.to.light.wave.started', {
      waveId,
      wallId: wall.id,
      orderCount: orders.length,
      tenantId,
    });

    return { wallId: wall.id, tasks };
  }

  private async allocatePutWall(orderCount: number): Promise<PutToLightWall> {
    return {
      id: 'WALL-01',
      wallNumber: 1,
      totalSlots: 50,
      activeSlots: orderCount,
      zoneId: 'ZONE-01',
    };
  }

  async confirmPut(taskId: string, quantity: number, tenantId: string): Promise<void> {
    await this.eventBus.emit('put.confirmed', {
      taskId,
      quantity,
      tenantId,
    });
  }
}

