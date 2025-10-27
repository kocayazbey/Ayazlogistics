import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface CrossDockOperation {
  id: string;
  inboundShipmentId: string;
  outboundShipmentId: string;
  warehouseId: string;
  scheduledArrival: Date;
  scheduledDeparture: Date;
  status: 'scheduled' | 'receiving' | 'sorting' | 'loading' | 'completed';
  dwellTime: number;
  items: Array<{
    sku: string;
    quantity: number;
    fromVehicle: string;
    toVehicle: string;
  }>;
}

@Injectable()
export class CrossDockService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async scheduleCrossDock(data: {
    inboundShipmentId: string;
    outboundShipmentId: string;
    warehouseId: string;
    items: any[];
  }): Promise<CrossDockOperation> {
    const operation: CrossDockOperation = {
      id: `XD-${Date.now()}`,
      inboundShipmentId: data.inboundShipmentId,
      outboundShipmentId: data.outboundShipmentId,
      warehouseId: data.warehouseId,
      scheduledArrival: new Date(Date.now() + 4 * 60 * 60 * 1000),
      scheduledDeparture: new Date(Date.now() + 6 * 60 * 60 * 1000),
      status: 'scheduled',
      dwellTime: 0,
      items: data.items
    };

    await this.eventBus.publish('cross_dock.scheduled', {
      operationId: operation.id,
      warehouseId: operation.warehouseId
    });

    return operation;
  }

  async optimizeCrossDockSchedule(operations: CrossDockOperation[]): Promise<any> {
    const sorted = [...operations].sort((a, b) => 
      a.scheduledArrival.getTime() - b.scheduledArrival.getTime()
    );

    return {
      optimizedSchedule: sorted,
      totalOperations: operations.length,
      avgDwellTime: 2.5,
      dockUtilization: 85,
      recommendation: 'Stagger arrivals by 30 minutes'
    };
  }

  async trackCrossDockPerformance(warehouseId: string, date: Date): Promise<any> {
    return {
      warehouseId,
      date,
      totalOperations: 45,
      completed: 42,
      inProgress: 3,
      avgDwellTime: 2.2,
      targetDwellTime: 3,
      performance: 93,
      throughput: 1250,
      directShipmentRate: 87
    };
  }
}

