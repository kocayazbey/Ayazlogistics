import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { activities } from '../../../../database/schema/shared/crm.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createActivity(data: any, tenantId: string, userId: string) {
    const [activity] = await this.db
      .insert(activities)
      .values({
        tenantId,
        activityType: data.activityType,
        subject: data.subject,
        description: data.description,
        relatedTo: data.relatedTo,
        relatedId: data.relatedId,
        scheduledAt: data.scheduledAt,
        status: 'pending',
        priority: data.priority || 'normal',
        assignedTo: data.assignedTo || userId,
        createdBy: userId,
      })
      .returning();

    await this.eventBus.emit('activity.created', { activityId: activity.id, tenantId });

    return activity;
  }

  async getActivities(tenantId: string, filters?: {
    activityType?: string;
    status?: string;
    assignedTo?: string;
    relatedTo?: string;
    relatedId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    let query = this.db.select().from(activities).where(eq(activities.tenantId, tenantId));

    if (filters?.activityType) {
      query = query.where(and(eq(activities.tenantId, tenantId), eq(activities.activityType, filters.activityType)));
    }

    if (filters?.status) {
      query = query.where(and(eq(activities.tenantId, tenantId), eq(activities.status, filters.status)));
    }

    if (filters?.assignedTo) {
      query = query.where(and(eq(activities.tenantId, tenantId), eq(activities.assignedTo, filters.assignedTo)));
    }

    if (filters?.relatedTo && filters?.relatedId) {
      query = query.where(
        and(
          eq(activities.tenantId, tenantId),
          eq(activities.relatedTo, filters.relatedTo),
          eq(activities.relatedId, filters.relatedId),
        ),
      );
    }

    return await query;
  }

  async completeActivity(activityId: string, tenantId: string) {
    const [updated] = await this.db
      .update(activities)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, activityId), eq(activities.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('activity.completed', { activityId, tenantId });

    return updated;
  }

  async getUpcomingActivities(userId: string, tenantId: string, days: number = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return await this.db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.tenantId, tenantId),
          eq(activities.assignedTo, userId),
          eq(activities.status, 'pending'),
          lte(activities.scheduledAt, endDate),
        ),
      );
  }
}
