import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { routes, routeStops } from '../../../../database/schema/logistics/tms.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class DeliveryTrackingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async updateDeliveryStatus(routeId: string, stopId: string, status: string) {
    const [updated] = await this.db
      .update(routeStops)
      .set({ status, actualArrival: status === 'completed' ? new Date() : undefined })
      .where(eq(routeStops.id, stopId))
      .returning();

    await this.eventBus.emit('delivery.status.updated', { routeId, stopId, status });
    return updated;
  }

  async getRouteProgress(routeId: string) {
    const stops = await this.db
      .select()
      .from(routeStops)
      .where(eq(routeStops.routeId, routeId));

    const total = stops.length;
    const completed = stops.filter((s: any) => s.status === 'completed').length;
    const inProgress = stops.filter((s: any) => s.status === 'in_progress').length;

    return {
      total,
      completed,
      inProgress,
      pending: total - completed - inProgress,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      stops,
    };
  }
}
