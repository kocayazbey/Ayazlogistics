import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { slaAgreements } from '../../../../database/schema/shared/crm.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class SlaService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createSlaAgreement(data: any, tenantId: string) {
    const agreementNumber = `SLA-${Date.now()}`;

    const [sla] = await this.db
      .insert(slaAgreements)
      .values({
        tenantId,
        agreementNumber,
        customerId: data.customerId,
        startDate: data.startDate,
        endDate: data.endDate,
        responseTime: data.responseTime,
        resolutionTime: data.resolutionTime,
        deliveryTime: data.deliveryTime,
        accuracyTarget: data.accuracyTarget,
        uptime: data.uptime,
        penalties: data.penalties,
        status: 'active',
      })
      .returning();

    await this.eventBus.emit('sla.created', { slaId: sla.id, customerId: data.customerId, tenantId });

    return sla;
  }

  async getSlaAgreements(tenantId: string, customerId?: string) {
    let query = this.db.select().from(slaAgreements).where(eq(slaAgreements.tenantId, tenantId));

    if (customerId) {
      query = query.where(and(eq(slaAgreements.tenantId, tenantId), eq(slaAgreements.customerId, customerId)));
    }

    return await query;
  }

  async checkSlaCompliance(customerId: string, tenantId: string, metrics: {
    responseTime?: number;
    resolutionTime?: number;
    deliveryTime?: number;
    accuracy?: number;
  }) {
    const [sla] = await this.db
      .select()
      .from(slaAgreements)
      .where(
        and(
          eq(slaAgreements.tenantId, tenantId),
          eq(slaAgreements.customerId, customerId),
          eq(slaAgreements.status, 'active'),
        ),
      )
      .limit(1);

    if (!sla) {
      return { compliant: true, violations: [], message: 'No SLA agreement found' };
    }

    const violations: string[] = [];

    if (metrics.responseTime && sla.responseTime && metrics.responseTime > sla.responseTime) {
      violations.push(`Response time exceeded: ${metrics.responseTime} > ${sla.responseTime} minutes`);
    }

    if (metrics.resolutionTime && sla.resolutionTime && metrics.resolutionTime > sla.resolutionTime) {
      violations.push(`Resolution time exceeded: ${metrics.resolutionTime} > ${sla.resolutionTime} hours`);
    }

    if (metrics.deliveryTime && sla.deliveryTime && metrics.deliveryTime > sla.deliveryTime) {
      violations.push(`Delivery time exceeded: ${metrics.deliveryTime} > ${sla.deliveryTime} hours`);
    }

    if (metrics.accuracy && sla.accuracyTarget) {
      const targetAccuracy = parseFloat(sla.accuracyTarget);
      if (metrics.accuracy < targetAccuracy) {
        violations.push(`Accuracy below target: ${metrics.accuracy}% < ${targetAccuracy}%`);
      }
    }

    const compliant = violations.length === 0;

    if (!compliant) {
      await this.eventBus.emit('sla.violation', { slaId: sla.id, customerId, violations, tenantId });
    }

    return {
      compliant,
      violations,
      sla,
      metrics,
    };
  }
}
