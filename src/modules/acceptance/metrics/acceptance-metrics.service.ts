import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface NRRMetric {
  id: string;
  tenantId: string;
  period: string;
  startingRevenue: number;
  endingRevenue: number;
  newRevenue: number;
  expansionRevenue: number;
  contractionRevenue: number;
  churnRevenue: number;
  nrr: number; // Net Revenue Retention
  createdAt: Date;
}

export interface SLAMetric {
  id: string;
  tenantId: string;
  service: string;
  slaTarget: number; // percentage
  slaActual: number; // percentage
  period: string;
  incidents: number;
  totalRequests: number;
  createdAt: Date;
}

export interface IncidentMetric {
  id: string;
  tenantId: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  mttr: number; // Mean Time To Resolution in minutes
  period: string;
  incidentCount: number;
  totalDowntime: number; // minutes
  createdAt: Date;
}

export interface CostPerOrder {
  id: string;
  tenantId: string;
  period: string;
  totalCosts: number;
  totalOrders: number;
  costPerOrder: number;
  currency: string;
  createdAt: Date;
}

@Injectable()
export class AcceptanceMetricsService {
  private readonly logger = new Logger(AcceptanceMetricsService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async recordNRRMetric(nrrMetric: Omit<NRRMetric, 'id' | 'createdAt'>): Promise<NRRMetric> {
    const id = `NRR-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO nrr_metrics (id, tenant_id, period, starting_revenue, ending_revenue,
                              new_revenue, expansion_revenue, contraction_revenue, churn_revenue, nrr, created_at)
      VALUES (${id}, ${nrrMetric.tenantId}, ${nrrMetric.period}, ${nrrMetric.startingRevenue},
              ${nrrMetric.endingRevenue}, ${nrrMetric.newRevenue}, ${nrrMetric.expansionRevenue},
              ${nrrMetric.contractionRevenue}, ${nrrMetric.churnRevenue}, ${nrrMetric.nrr}, ${now})
    `);

    this.logger.log(`NRR metric recorded: ${id} for tenant ${nrrMetric.tenantId}`);

    return {
      id,
      ...nrrMetric,
      createdAt: now,
    };
  }

  async getNRRMetrics(tenantId: string, period?: string): Promise<NRRMetric[]> {
    // SECURITY FIX: Use parameterized queries instead of string interpolation
    const whereConditions = [eq(nrrMetrics.tenantId, tenantId)];
    
    if (period) {
      whereConditions.push(eq(nrrMetrics.period, period));
    }
    
    return this.db
      .select()
      .from(nrrMetrics)
      .where(and(...whereConditions));

    query = sql`${query} ORDER BY period DESC`;

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      period: row.period as string,
      startingRevenue: parseFloat(row.starting_revenue as string),
      endingRevenue: parseFloat(row.ending_revenue as string),
      newRevenue: parseFloat(row.new_revenue as string),
      expansionRevenue: parseFloat(row.expansion_revenue as string),
      contractionRevenue: parseFloat(row.contraction_revenue as string),
      churnRevenue: parseFloat(row.churn_revenue as string),
      nrr: parseFloat(row.nrr as string),
      createdAt: new Date(row.created_at as string),
    }));
  }

  async recordSLAMetric(slaMetric: Omit<SLAMetric, 'id' | 'createdAt'>): Promise<SLAMetric> {
    const id = `SLA-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO sla_metrics (id, tenant_id, service, sla_target, sla_actual, period,
                              incidents, total_requests, created_at)
      VALUES (${id}, ${slaMetric.tenantId}, ${slaMetric.service}, ${slaMetric.slaTarget},
              ${slaMetric.slaActual}, ${slaMetric.period}, ${slaMetric.incidents},
              ${slaMetric.totalRequests}, ${now})
    `);

    this.logger.log(`SLA metric recorded: ${id} for tenant ${slaMetric.tenantId}`);

    return {
      id,
      ...slaMetric,
      createdAt: now,
    };
  }

  async getSLAMetrics(tenantId: string, period?: string): Promise<SLAMetric[]> {
    let query = sql`SELECT * FROM sla_metrics WHERE tenant_id = ${tenantId}`;
    
    if (period) {
      query = sql`SELECT * FROM sla_metrics WHERE tenant_id = ${tenantId} AND period = ${period}`;
    }

    query = sql`${query} ORDER BY period DESC`;

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      service: row.service as string,
      slaTarget: parseFloat(row.sla_target as string),
      slaActual: parseFloat(row.sla_actual as string),
      period: row.period as string,
      incidents: parseInt(row.incidents as string),
      totalRequests: parseInt(row.total_requests as string),
      createdAt: new Date(row.created_at as string),
    }));
  }

  async recordIncidentMetric(incidentMetric: Omit<IncidentMetric, 'id' | 'createdAt'>): Promise<IncidentMetric> {
    const id = `INC-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO incident_metrics (id, tenant_id, severity, mttr, period, incident_count,
                                   total_downtime, created_at)
      VALUES (${id}, ${incidentMetric.tenantId}, ${incidentMetric.severity}, ${incidentMetric.mttr},
              ${incidentMetric.period}, ${incidentMetric.incidentCount}, ${incidentMetric.totalDowntime}, ${now})
    `);

    this.logger.log(`Incident metric recorded: ${id} for tenant ${incidentMetric.tenantId}`);

    return {
      id,
      ...incidentMetric,
      createdAt: now,
    };
  }

  async getIncidentMetrics(tenantId: string, period?: string): Promise<IncidentMetric[]> {
    let query = sql`SELECT * FROM incident_metrics WHERE tenant_id = ${tenantId}`;
    
    if (period) {
      query = sql`SELECT * FROM incident_metrics WHERE tenant_id = ${tenantId} AND period = ${period}`;
    }

    query = sql`${query} ORDER BY period DESC`;

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      severity: row.severity as IncidentMetric['severity'],
      mttr: parseFloat(row.mttr as string),
      period: row.period as string,
      incidentCount: parseInt(row.incident_count as string),
      totalDowntime: parseFloat(row.total_downtime as string),
      createdAt: new Date(row.created_at as string),
    }));
  }

  async recordCostPerOrder(costPerOrder: Omit<CostPerOrder, 'id' | 'createdAt'>): Promise<CostPerOrder> {
    const id = `CPO-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO cost_per_order (id, tenant_id, period, total_costs, total_orders,
                                 cost_per_order, currency, created_at)
      VALUES (${id}, ${costPerOrder.tenantId}, ${costPerOrder.period}, ${costPerOrder.totalCosts},
              ${costPerOrder.totalOrders}, ${costPerOrder.costPerOrder}, ${costPerOrder.currency}, ${now})
    `);

    this.logger.log(`Cost per order recorded: ${id} for tenant ${costPerOrder.tenantId}`);

    return {
      id,
      ...costPerOrder,
      createdAt: now,
    };
  }

  async getCostPerOrder(tenantId: string, period?: string): Promise<CostPerOrder[]> {
    let query = sql`SELECT * FROM cost_per_order WHERE tenant_id = ${tenantId}`;
    
    if (period) {
      query = sql`SELECT * FROM cost_per_order WHERE tenant_id = ${tenantId} AND period = ${period}`;
    }

    query = sql`${query} ORDER BY period DESC`;

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      period: row.period as string,
      totalCosts: parseFloat(row.total_costs as string),
      totalOrders: parseInt(row.total_orders as string),
      costPerOrder: parseFloat(row.cost_per_order as string),
      currency: row.currency as string,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async getAcceptanceMetricsDashboard(tenantId: string): Promise<any> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const nrrMetrics = await this.getNRRMetrics(tenantId, currentMonth);
    const slaMetrics = await this.getSLAMetrics(tenantId, currentMonth);
    const incidentMetrics = await this.getIncidentMetrics(tenantId, currentMonth);
    const costPerOrder = await this.getCostPerOrder(tenantId, currentMonth);

    const latestNRR = nrrMetrics[0];
    const latestSLA = slaMetrics[0];
    const latestCostPerOrder = costPerOrder[0];

    const p0Incidents = incidentMetrics.filter(inc => inc.severity === 'P0');
    const p1Incidents = incidentMetrics.filter(inc => inc.severity === 'P1');

    const avgMTTR = incidentMetrics.length > 0 
      ? incidentMetrics.reduce((sum, inc) => sum + inc.mttr, 0) / incidentMetrics.length 
      : 0;

    const totalDowntime = incidentMetrics.reduce((sum, inc) => sum + inc.totalDowntime, 0);

    return {
      summary: {
        nrr: latestNRR?.nrr || 0,
        slaCompliance: latestSLA ? (latestSLA.slaActual / latestSLA.slaTarget) * 100 : 0,
        p0Incidents: p0Incidents.length,
        p1Incidents: p1Incidents.length,
        avgMTTR: Math.round(avgMTTR),
        totalDowntime: Math.round(totalDowntime),
        costPerOrder: latestCostPerOrder?.costPerOrder || 0,
      },
      nrr: latestNRR ? {
        period: latestNRR.period,
        startingRevenue: latestNRR.startingRevenue,
        endingRevenue: latestNRR.endingRevenue,
        newRevenue: latestNRR.newRevenue,
        expansionRevenue: latestNRR.expansionRevenue,
        contractionRevenue: latestNRR.contractionRevenue,
        churnRevenue: latestNRR.churnRevenue,
        nrr: latestNRR.nrr,
      } : null,
      sla: latestSLA ? {
        service: latestSLA.service,
        target: latestSLA.slaTarget,
        actual: latestSLA.slaActual,
        compliance: (latestSLA.slaActual / latestSLA.slaTarget) * 100,
        incidents: latestSLA.incidents,
        totalRequests: latestSLA.totalRequests,
      } : null,
      incidents: {
        p0: p0Incidents.map(inc => ({
          severity: inc.severity,
          mttr: inc.mttr,
          incidentCount: inc.incidentCount,
          totalDowntime: inc.totalDowntime,
        })),
        p1: p1Incidents.map(inc => ({
          severity: inc.severity,
          mttr: inc.mttr,
          incidentCount: inc.incidentCount,
          totalDowntime: inc.totalDowntime,
        })),
        averageMTTR: Math.round(avgMTTR),
      },
      costPerOrder: latestCostPerOrder ? {
        period: latestCostPerOrder.period,
        totalCosts: latestCostPerOrder.totalCosts,
        totalOrders: latestCostPerOrder.totalOrders,
        costPerOrder: latestCostPerOrder.costPerOrder,
        currency: latestCostPerOrder.currency,
      } : null,
    };
  }
}
