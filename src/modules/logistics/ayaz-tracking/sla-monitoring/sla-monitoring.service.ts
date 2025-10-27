import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { slaMetrics } from '../../../../database/schema/logistics/tracking.schema';
import { slaAgreements } from '../../../../database/schema/shared/crm.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '@/core/events/event-bus.service';

interface SLAAlert {
  vehicleId: string;
  type: 'route_violation' | 'geofence_entry' | 'geofence_exit' | 'delay';
  message: string;
  timestamp: Date;
  data?: any;
}

@Injectable()
export class SlaMonitoringService {
  private readonly logger = new Logger(SlaMonitoringService.name);

  constructor(private readonly eventBus: EventBusService) {}

  async emitAlert(alert: SLAAlert): Promise<void> {
    await this.eventBus.emit('sla.alert', alert);
    this.logger.warn(`[SLA] ${alert.type}: ${alert.message}`);
  }
}
