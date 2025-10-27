import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { kpis } from '../../../../database/schema/shared/analytics.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class KPIService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createKPI(data: any, tenantId: string) {
    const achievementRate = data.targetValue > 0 
      ? ((data.actualValue / data.targetValue) * 100).toFixed(2)
      : '0';

    const [kpi] = await this.db
      .insert(kpis)
      .values({
        tenantId,
        achievementRate,
        ...data,
      })
      .returning();

    await this.eventBus.emit('kpi.created', { kpiId: kpi.id, tenantId });
    return kpi;
  }

  async updateKPIActual(kpiId: string, actualValue: number, tenantId: string) {
    const [kpi] = await this.db
      .select()
      .from(kpis)
      .where(and(eq(kpis.id, kpiId), eq(kpis.tenantId, tenantId)))
      .limit(1);

    const targetValue = parseFloat(kpi.targetValue || '0');
    const achievementRate = targetValue > 0 ? ((actualValue / targetValue) * 100).toFixed(2) : '0';

    const [updated] = await this.db
      .update(kpis)
      .set({
        actualValue: actualValue.toString(),
        achievementRate,
      })
      .where(eq(kpis.id, kpiId))
      .returning();

    await this.eventBus.emit('kpi.updated', { kpiId, actualValue, achievementRate, tenantId });
    return updated;
  }

  async getKPIs(tenantId: string, category?: string) {
    let query = this.db.select().from(kpis).where(eq(kpis.tenantId, tenantId));

    if (category) {
      query = query.where(and(eq(kpis.tenantId, tenantId), eq(kpis.category, category)));
    }

    return await query;
  }

  async getKPIDashboard(tenantId: string, periodStart: Date, periodEnd: Date) {
    const periodKPIs = await this.db
      .select()
      .from(kpis)
      .where(
        and(
          eq(kpis.tenantId, tenantId),
          between(kpis.periodStart, periodStart, periodEnd)
        )
      );

    const summary = {
      totalKPIs: periodKPIs.length,
      achieved: periodKPIs.filter((k: any) => parseFloat(k.achievementRate) >= 100).length,
      inProgress: periodKPIs.filter((k: any) => parseFloat(k.achievementRate) >= 50 && parseFloat(k.achievementRate) < 100).length,
      underPerforming: periodKPIs.filter((k: any) => parseFloat(k.achievementRate) < 50).length,
      averageAchievement: periodKPIs.reduce((sum: number, k: any) => sum + parseFloat(k.achievementRate || '0'), 0) / periodKPIs.length || 0,
    };

    return {
      period: { periodStart, periodEnd },
      summary,
      kpis: periodKPIs,
    };
  }
}

