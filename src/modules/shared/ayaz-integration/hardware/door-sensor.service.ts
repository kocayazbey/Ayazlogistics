import { Injectable } from '@nestjs/common';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface DoorSensor {
  id: string;
  location: string;
  type: 'dock_door' | 'warehouse_door' | 'cooler_door' | 'security_gate';
  status: 'open' | 'closed';
  lastStateChange: Date;
}

interface DoorEvent {
  sensorId: string;
  eventType: 'opened' | 'closed' | 'forced' | 'alarm';
  timestamp: Date;
  duration?: number;
  userId?: string;
  authorized: boolean;
}

@Injectable()
export class DoorSensorService {
  private sensors: Map<string, DoorSensor> = new Map();

  constructor(private readonly eventBus: EventBusService) {}

  async registerSensor(sensor: Omit<DoorSensor, 'status' | 'lastStateChange'>): Promise<DoorSensor> {
    const newSensor: DoorSensor = {
      ...sensor,
      status: 'closed',
      lastStateChange: new Date(),
    };

    this.sensors.set(sensor.id, newSensor);

    await this.eventBus.publish('door_sensor.registered', {
      sensorId: sensor.id,
      location: sensor.location,
    });

    return newSensor;
  }

  async updateDoorState(sensorId: string, newState: 'open' | 'closed', userId?: string): Promise<DoorEvent> {
    const sensor = this.sensors.get(sensorId);
    
    if (!sensor) {
      throw new Error('Sensor not found');
    }

    const previousState = sensor.status;
    const now = new Date();
    const duration = now.getTime() - sensor.lastStateChange.getTime();

    sensor.status = newState;
    sensor.lastStateChange = now;

    const event: DoorEvent = {
      sensorId,
      eventType: newState === 'open' ? 'opened' : 'closed',
      timestamp: now,
      duration: previousState === 'open' ? duration : undefined,
      userId,
      authorized: !!userId,
    };

    await this.eventBus.publish('door.state.changed', event);

    if (newState === 'open' && sensor.type === 'cooler_door') {
      this.startCoolerDoorTimer(sensorId);
    }

    return event;
  }

  private startCoolerDoorTimer(sensorId: string): void {
    setTimeout(async () => {
      const sensor = this.sensors.get(sensorId);
      if (sensor && sensor.status === 'open') {
        await this.eventBus.publish('door.alarm.cooler_open_too_long', {
          sensorId,
          openDuration: (new Date().getTime() - sensor.lastStateChange.getTime()) / 1000,
        });
      }
    }, 120000);
  }

  async getDoorHistory(sensorId: string, hours: number = 24): Promise<DoorEvent[]> {
    return [
      {
        sensorId,
        eventType: 'opened',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        userId: 'user-1',
        authorized: true,
      },
      {
        sensorId,
        eventType: 'closed',
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
        duration: 1800000,
        userId: 'user-1',
        authorized: true,
      },
    ];
  }

  async getAccessAnalytics(location: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      location,
      period: { startDate, endDate },
      totalAccesses: 245,
      authorizedAccesses: 240,
      unauthorizedAttempts: 5,
      avgDoorOpenDuration: 15.5,
      peakAccessTimes: ['08:00-09:00', '17:00-18:00'],
      securityIncidents: 2,
    };
  }
}

