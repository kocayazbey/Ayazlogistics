import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface DORAMetrics {
  id: string;
  tenantId: string;
  period: string;
  deploymentFrequency: number;
  leadTimeForChanges: number; // hours
  meanTimeToRecovery: number; // hours
  changeFailureRate: number; // percentage
  createdAt: Date;
}

export interface Deployment {
  id: string;
  tenantId: string;
  environment: 'production' | 'staging' | 'development';
  strategy: 'canary' | 'blue_green' | 'rolling' | 'recreate';
  version: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date;
  endTime?: Date;
  rollbackTime?: Date;
  createdAt: Date;
}

export interface Incident {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'closed';
  startTime: Date;
  endTime?: Date;
  mttr?: number; // minutes
  rootCause?: string;
  resolution?: string;
  createdAt: Date;
}

export interface DisasterRecovery {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  rpo: number; // Recovery Point Objective in minutes
  rto: number; // Recovery Time Objective in minutes
  lastTested?: Date;
  status: 'active' | 'inactive' | 'testing';
  createdAt: Date;
}

@Injectable()
export class OperationalExcellenceService {
  private readonly logger = new Logger(OperationalExcellenceService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async recordDORAMetrics(metrics: Omit<DORAMetrics, 'id' | 'createdAt'>): Promise<DORAMetrics> {
    const id = `DORA-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO dora_metrics (id, tenant_id, period, deployment_frequency, lead_time_for_changes,
                               mean_time_to_recovery, change_failure_rate, created_at)
      VALUES (${id}, ${metrics.tenantId}, ${metrics.period}, ${metrics.deploymentFrequency},
              ${metrics.leadTimeForChanges}, ${metrics.meanTimeToRecovery}, ${metrics.changeFailureRate}, ${now})
    `);

    this.logger.log(`DORA metrics recorded: ${id} for tenant ${metrics.tenantId}`);

    return {
      id,
      ...metrics,
      createdAt: now,
    };
  }

  async getDORAMetrics(tenantId: string, period?: string): Promise<DORAMetrics[]> {
    let query = sql`SELECT * FROM dora_metrics WHERE tenant_id = ${tenantId}`;
    
    if (period) {
      query = sql`SELECT * FROM dora_metrics WHERE tenant_id = ${tenantId} AND period = ${period}`;
    }

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      period: row.period as string,
      deploymentFrequency: parseFloat(row.deployment_frequency as string),
      leadTimeForChanges: parseFloat(row.lead_time_for_changes as string),
      meanTimeToRecovery: parseFloat(row.mean_time_to_recovery as string),
      changeFailureRate: parseFloat(row.change_failure_rate as string),
      createdAt: new Date(row.created_at as string),
    }));
  }

  async createDeployment(deployment: Omit<Deployment, 'id' | 'createdAt'>): Promise<Deployment> {
    const id = `DEP-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO deployments (id, tenant_id, environment, strategy, version, status,
                              start_time, end_time, rollback_time, created_at)
      VALUES (${id}, ${deployment.tenantId}, ${deployment.environment}, ${deployment.strategy},
              ${deployment.version}, ${deployment.status}, ${deployment.startTime},
              ${deployment.endTime || null}, ${deployment.rollbackTime || null}, ${now})
    `);

    this.logger.log(`Deployment created: ${id} for tenant ${deployment.tenantId}`);

    return {
      id,
      ...deployment,
      createdAt: now,
    };
  }

  async updateDeploymentStatus(id: string, status: Deployment['status'], endTime?: Date, rollbackTime?: Date): Promise<void> {
    await this.db.execute(sql`
      UPDATE deployments SET status = ${status}, end_time = ${endTime || null}, rollback_time = ${rollbackTime || null}
      WHERE id = ${id}
    `);

    this.logger.log(`Deployment ${id} status updated to ${status}`);
  }

  async createIncident(incident: Omit<Incident, 'id' | 'createdAt'>): Promise<Incident> {
    const id = `INC-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO incidents (id, tenant_id, title, description, severity, status, start_time,
                            end_time, mttr, root_cause, resolution, created_at)
      VALUES (${id}, ${incident.tenantId}, ${incident.title}, ${incident.description},
              ${incident.severity}, ${incident.status}, ${incident.startTime}, ${incident.endTime || null},
              ${incident.mttr || null}, ${incident.rootCause || null}, ${incident.resolution || null}, ${now})
    `);

    this.logger.log(`Incident created: ${id} for tenant ${incident.tenantId}`);

    return {
      id,
      ...incident,
      createdAt: now,
    };
  }

  async updateIncidentStatus(id: string, status: Incident['status'], endTime?: Date, mttr?: number, rootCause?: string, resolution?: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE incidents SET status = ${status}, end_time = ${endTime || null}, mttr = ${mttr || null},
                         root_cause = ${rootCause || null}, resolution = ${resolution || null}
      WHERE id = ${id}
    `);

    this.logger.log(`Incident ${id} status updated to ${status}`);
  }

  async createDisasterRecovery(dr: Omit<DisasterRecovery, 'id' | 'createdAt'>): Promise<DisasterRecovery> {
    const id = `DR-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO disaster_recovery (id, tenant_id, name, description, rpo, rto, last_tested,
                                    status, created_at)
      VALUES (${id}, ${dr.tenantId}, ${dr.name}, ${dr.description}, ${dr.rpo}, ${dr.rto},
              ${dr.lastTested || null}, ${dr.status}, ${now})
    `);

    this.logger.log(`Disaster recovery plan created: ${id} for tenant ${dr.tenantId}`);

    return {
      id,
      ...dr,
      createdAt: now,
    };
  }

  async getOperationalExcellenceDashboard(tenantId: string): Promise<any> {
    const doraMetrics = await this.getDORAMetrics(tenantId);
    const latestDORA = doraMetrics[doraMetrics.length - 1];

    const deploymentsResult = await this.db.execute(sql`
      SELECT * FROM deployments WHERE tenant_id = ${tenantId} 
      ORDER BY created_at DESC LIMIT 10
    `);

    const incidentsResult = await this.db.execute(sql`
      SELECT * FROM incidents WHERE tenant_id = ${tenantId} 
      AND start_time > NOW() - INTERVAL '30 days'
      ORDER BY start_time DESC
    `);

    const drPlansResult = await this.db.execute(sql`
      SELECT * FROM disaster_recovery WHERE tenant_id = ${tenantId} AND status = 'active'
    `);

    const activeIncidents = incidentsResult.filter(row => 
      ['open', 'investigating', 'identified', 'monitoring'].includes(row.status as string)
    );

    const p0Incidents = incidentsResult.filter(row => row.severity === 'P0');
    const p1Incidents = incidentsResult.filter(row => row.severity === 'P1');

    const avgMTTR = incidentsResult.length > 0 
      ? incidentsResult.reduce((sum, row) => sum + (parseFloat(row.mttr as string) || 0), 0) / incidentsResult.length
      : 0;

    return {
      doraMetrics: latestDORA ? {
        deploymentFrequency: latestDORA.deploymentFrequency,
        leadTimeForChanges: latestDORA.leadTimeForChanges,
        meanTimeToRecovery: latestDORA.meanTimeToRecovery,
        changeFailureRate: latestDORA.changeFailureRate,
        period: latestDORA.period,
      } : null,
      deployments: {
        total: deploymentsResult.length,
        recent: deploymentsResult.slice(0, 5).map(row => ({
          id: row.id as string,
          environment: row.environment as string,
          strategy: row.strategy as string,
          version: row.version as string,
          status: row.status as string,
          startTime: new Date(row.start_time as string),
        })),
      },
      incidents: {
        active: activeIncidents.length,
        p0: p0Incidents.length,
        p1: p1Incidents.length,
        avgMTTR: Math.round(avgMTTR),
        recent: incidentsResult.slice(0, 5).map(row => ({
          id: row.id as string,
          title: row.title as string,
          severity: row.severity as string,
          status: row.status as string,
          startTime: new Date(row.start_time as string),
        })),
      },
      disasterRecovery: {
        plans: drPlansResult.length,
        coverage: drPlansResult.map(row => ({
          name: row.name as string,
          rpo: parseInt(row.rpo as string),
          rto: parseInt(row.rto as string),
          lastTested: row.last_tested ? new Date(row.last_tested as string) : null,
        })),
      },
    };
  }
}
