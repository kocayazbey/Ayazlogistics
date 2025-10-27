import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ScaleReading {
  scaleId: string;
  weight: number;
  unit: 'kg' | 'ton' | 'lb';
  timestamp: Date;
  vehicleId?: string;
  stableReading: boolean;
}

@Injectable()
export class ScaleIntegrationService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async getWeightReading(
    scaleId: string,
    tenantId: string,
  ): Promise<ScaleReading> {
    // Mock: Would integrate with actual scale hardware via serial/TCP
    const reading: ScaleReading = {
      scaleId,
      weight: 15250.5,
      unit: 'kg',
      timestamp: new Date(),
      stableReading: true,
    };

    await this.eventBus.emit('scale.reading.captured', {
      scaleId,
      weight: reading.weight,
      unit: reading.unit,
      tenantId,
    });

    return reading;
  }

  async tareScale(scaleId: string, tenantId: string): Promise<void> {
    await this.eventBus.emit('scale.tared', {
      scaleId,
      timestamp: new Date(),
      tenantId,
    });
  }

  async recordVehicleWeigh(
    scaleId: string,
    vehicleId: string,
    weighType: 'gross' | 'tare',
    tenantId: string,
  ): Promise<ScaleReading> {
    const reading = await this.getWeightReading(scaleId, tenantId);

    await this.eventBus.emit('vehicle.weighed', {
      vehicleId,
      weighType,
      weight: reading.weight,
      scaleId,
      tenantId,
    });

    return { ...reading, vehicleId };
  }
}

