import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface SLA {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  serviceType: 'api' | 'database' | 'storage' | 'compute' | 'network';
  availabilityTarget: number; // percentage
  responseTimeTarget: number; // milliseconds
  throughputTarget: number; // requests per second
  errorRateTarget: number; // percentage
  measurementPeriod: number; // days
  penalties: {
    availability: number; // percentage penalty
    responseTime: number; // percentage penalty
    throughput: number; // percentage penalty
    errorRate: number; // percentage penalty
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SLO {
  id: string;
  slaId: string;
  metric: string;
  target: number;
  measurement: 'percentage' | 'count' | 'duration' | 'rate';
  window: number; // minutes
  isActive: boolean;
}

export interface SupportPlan {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  responseTime: {
    critical: number; // minutes
    high: number;
    medium: number;
    low: number;
  };
  availability: number; // percentage
  features: string[];
  pricing: {
    monthly: number;
    annual: number;
    setup: number;
  };
  isActive: boolean;
  createdAt: Date;
}

export interface MaintenanceWindow {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  type: 'scheduled' | 'emergency' | 'planned';
  impact: 'low' | 'medium' | 'high' | 'critical';
  services: string[];
  notifications: {
    advance: number; // hours
    channels: string[];
  };
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
}

@Injectable()
export class SLAService {
  private readonly logger = new Logger(SLAService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createSLA(sla: Omit<SLA, 'id' | 'createdAt' | 'updatedAt'>): Promise<SLA> {
    const id = `SLA-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO slas (id, tenant_id, name, description, service_type, availability_target, 
                       response_time_target, throughput_target, error_rate_target, measurement_period,
                       penalties, is_active, created_at, updated_at)
      VALUES (${id}, ${sla.tenantId}, ${sla.name}, ${sla.description}, ${sla.serviceType},
              ${sla.availabilityTarget}, ${sla.responseTimeTarget}, ${sla.throughputTarget},
              ${sla.errorRateTarget}, ${sla.measurementPeriod}, ${JSON.stringify(sla.penalties)},
              ${sla.isActive}, ${now}, ${now})
    `);

    this.logger.log(`SLA created: ${id} for tenant ${sla.tenantId}`);

    return {
      id,
      ...sla,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getSLAs(tenantId: string): Promise<SLA[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM slas WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string,
      serviceType: row.service_type as SLA['serviceType'],
      availabilityTarget: parseFloat(row.availability_target as string),
      responseTimeTarget: parseFloat(row.response_time_target as string),
      throughputTarget: parseFloat(row.throughput_target as string),
      errorRateTarget: parseFloat(row.error_rate_target as string),
      measurementPeriod: parseInt(row.measurement_period as string),
      penalties: JSON.parse(row.penalties as string),
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  async createSLO(slo: Omit<SLO, 'id'>): Promise<SLO> {
    const id = `SLO-${Date.now()}`;

    await this.db.execute(sql`
      INSERT INTO slos (id, sla_id, metric, target, measurement, window, is_active)
      VALUES (${id}, ${slo.slaId}, ${slo.metric}, ${slo.target}, ${slo.measurement}, ${slo.window}, ${slo.isActive})
    `);

    this.logger.log(`SLO created: ${id} for SLA ${slo.slaId}`);

    return {
      id,
      ...slo,
    };
  }

  async createSupportPlan(plan: Omit<SupportPlan, 'id' | 'createdAt'>): Promise<SupportPlan> {
    const id = `SP-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO support_plans (id, tenant_id, name, description, tier, response_time, 
                               availability, features, pricing, is_active, created_at)
      VALUES (${id}, ${plan.tenantId}, ${plan.name}, ${plan.description}, ${plan.tier},
              ${JSON.stringify(plan.responseTime)}, ${plan.availability}, ${JSON.stringify(plan.features)},
              ${JSON.stringify(plan.pricing)}, ${plan.isActive}, ${now})
    `);

    this.logger.log(`Support plan created: ${id} for tenant ${plan.tenantId}`);

    return {
      id,
      ...plan,
      createdAt: now,
    };
  }

  async createMaintenanceWindow(window: Omit<MaintenanceWindow, 'id' | 'createdAt'>): Promise<MaintenanceWindow> {
    const id = `MW-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO maintenance_windows (id, tenant_id, name, description, start_time, end_time,
                                     duration, type, impact, services, notifications, status, created_at)
      VALUES (${id}, ${window.tenantId}, ${window.name}, ${window.description}, ${window.startTime},
              ${window.endTime}, ${window.duration}, ${window.type}, ${window.impact},
              ${JSON.stringify(window.services)}, ${JSON.stringify(window.notifications)},
              ${window.status}, ${now})
    `);

    this.logger.log(`Maintenance window created: ${id} for tenant ${window.tenantId}`);

    return {
      id,
      ...window,
      createdAt: now,
    };
  }

  async getMaintenanceWindows(tenantId: string, status?: string): Promise<MaintenanceWindow[]> {
    let query = sql`SELECT * FROM maintenance_windows WHERE tenant_id = ${tenantId}`;
    
    if (status) {
      query = sql`SELECT * FROM maintenance_windows WHERE tenant_id = ${tenantId} AND status = ${status}`;
    }

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string,
      startTime: new Date(row.start_time as string),
      endTime: new Date(row.end_time as string),
      duration: parseInt(row.duration as string),
      type: row.type as MaintenanceWindow['type'],
      impact: row.impact as MaintenanceWindow['impact'],
      services: JSON.parse(row.services as string),
      notifications: JSON.parse(row.notifications as string),
      status: row.status as MaintenanceWindow['status'],
      createdAt: new Date(row.created_at as string),
    }));
  }

  async updateMaintenanceWindowStatus(id: string, status: MaintenanceWindow['status']): Promise<void> {
    await this.db.execute(sql`
      UPDATE maintenance_windows SET status = ${status} WHERE id = ${id}
    `);

    this.logger.log(`Maintenance window ${id} status updated to ${status}`);
  }

  async calculateSLACompliance(slaId: string, period: { start: Date; end: Date }): Promise<any> {
    const result = await this.db.execute(sql`
      SELECT 
        sla.availability_target,
        sla.response_time_target,
        sla.throughput_target,
        sla.error_rate_target,
        COALESCE(metrics.availability, 0) as actual_availability,
        COALESCE(metrics.avg_response_time, 0) as actual_response_time,
        COALESCE(metrics.throughput, 0) as actual_throughput,
        COALESCE(metrics.error_rate, 0) as actual_error_rate
      FROM slas sla
      LEFT JOIN (
        SELECT 
          sla_id,
          AVG(availability) as availability,
          AVG(response_time) as avg_response_time,
          AVG(throughput) as throughput,
          AVG(error_rate) as error_rate
        FROM sla_metrics 
        WHERE sla_id = ${slaId} 
        AND timestamp BETWEEN ${period.start} AND ${period.end}
        GROUP BY sla_id
      ) metrics ON sla.id = metrics.sla_id
      WHERE sla.id = ${slaId}
    `);

    if (result.length === 0) {
      throw new Error('SLA not found');
    }

    const row = result[0];
    const availability = parseFloat(row.actual_availability as string);
    const responseTime = parseFloat(row.actual_response_time as string);
    const throughput = parseFloat(row.actual_throughput as string);
    const errorRate = parseFloat(row.actual_error_rate as string);

    const availabilityTarget = parseFloat(row.availability_target as string);
    const responseTimeTarget = parseFloat(row.response_time_target as string);
    const throughputTarget = parseFloat(row.throughput_target as string);
    const errorRateTarget = parseFloat(row.error_rate_target as string);

    const compliance = {
      availability: {
        target: availabilityTarget,
        actual: availability,
        compliant: availability >= availabilityTarget,
        deviation: availability - availabilityTarget,
      },
      responseTime: {
        target: responseTimeTarget,
        actual: responseTime,
        compliant: responseTime <= responseTimeTarget,
        deviation: responseTime - responseTimeTarget,
      },
      throughput: {
        target: throughputTarget,
        actual: throughput,
        compliant: throughput >= throughputTarget,
        deviation: throughput - throughputTarget,
      },
      errorRate: {
        target: errorRateTarget,
        actual: errorRate,
        compliant: errorRate <= errorRateTarget,
        deviation: errorRate - errorRateTarget,
      },
    };

    const overallCompliance = Object.values(compliance).every(metric => metric.compliant);

    return {
      slaId,
      period,
      compliance,
      overallCompliance,
      score: this.calculateComplianceScore(compliance),
    };
  }

  private calculateComplianceScore(compliance: any): number {
    const weights = {
      availability: 0.4,
      responseTime: 0.3,
      throughput: 0.2,
      errorRate: 0.1,
    };

    let score = 0;
    Object.entries(compliance).forEach(([metric, data]: [string, any]) => {
      const weight = weights[metric as keyof typeof weights];
      const metricScore = data.compliant ? 100 : Math.max(0, 100 + data.deviation);
      score += metricScore * weight;
    });

    return Math.round(score);
  }

  async getSupportPlanMetrics(tenantId: string, period: { start: Date; end: Date }): Promise<any> {
    const result = await this.db.execute(sql`
      SELECT 
        sp.tier,
        sp.response_time,
        COUNT(t.id) as total_tickets,
        AVG(t.resolution_time) as avg_resolution_time,
        COUNT(CASE WHEN t.priority = 'critical' THEN 1 END) as critical_tickets,
        COUNT(CASE WHEN t.priority = 'high' THEN 1 END) as high_tickets,
        COUNT(CASE WHEN t.status = 'resolved' THEN 1 END) as resolved_tickets
      FROM support_plans sp
      LEFT JOIN support_tickets t ON sp.tenant_id = t.tenant_id
      WHERE sp.tenant_id = ${tenantId}
      AND t.created_at BETWEEN ${period.start} AND ${period.end}
      GROUP BY sp.id, sp.tier, sp.response_time
    `);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    const totalTickets = parseInt(row.total_tickets as string);
    const avgResolutionTime = parseFloat(row.avg_resolution_time as string);
    const criticalTickets = parseInt(row.critical_tickets as string);
    const highTickets = parseInt(row.high_tickets as string);
    const resolvedTickets = parseInt(row.resolved_tickets as string);

    const responseTime = JSON.parse(row.response_time as string);
    const criticalResponseTime = responseTime.critical * 60; // convert to seconds

    return {
      tier: row.tier as string,
      totalTickets,
      avgResolutionTime,
      criticalTickets,
      highTickets,
      resolvedTickets,
      resolutionRate: totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0,
      criticalResponseCompliance: avgResolutionTime <= criticalResponseTime,
      metrics: {
        responseTimeTarget: responseTime,
        actualResponseTime: avgResolutionTime,
        compliance: avgResolutionTime <= criticalResponseTime,
      },
    };
  }
}
