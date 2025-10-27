import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface DoorSensorEvent {
  sensorId: string;
  doorId: string;
  eventType: 'opened' | 'closed' | 'forced' | 'alarm';
  timestamp: Date;
  userId?: string;
}

@Injectable()
export class DoorSensorService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async recordDoorEvent(
    sensorId: string,
    doorId: string,
    eventType: DoorSensorEvent['eventType'],
    userId?: string,
    tenantId?: string,
  ): Promise<DoorSensorEvent> {
    const event: DoorSensorEvent = {
      sensorId,
      doorId,
      eventType,
      timestamp: new Date(),
      userId,
    };

    await this.eventBus.emit('door.event.detected', {
      sensorId,
      doorId,
      eventType,
      userId,
      tenantId,
    });

    if (eventType === 'forced' || eventType === 'alarm') {
      await this.eventBus.emit('security.alert', {
        type: 'door_breach',
        doorId,
        sensorId,
        tenantId,
      });
    }

    return event;
  }

  async getDoorStatus(doorId: string, tenantId: string): Promise<{
    isOpen: boolean;
    lastEvent: Date;
    accessCount: number;
  }> {
    return {
      isOpen: false,
      lastEvent: new Date(),
      accessCount: 45,
    };
  }
}

