import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface Incident {
  id: string;
  type: 'damage' | 'delay' | 'theft' | 'accident' | 'spill' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reportedBy: string;
  reportedAt: Date;
  location: string;
  affectedShipments: string[];
  status: 'reported' | 'investigating' | 'resolved' | 'closed';
  assignedTo?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
  financialImpact?: number;
}

@Injectable()
export class IncidentManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async reportIncident(data: Omit<Incident, 'id' | 'reportedAt' | 'status'>): Promise<Incident> {
    const incident: Incident = {
      ...data,
      id: `INC-${Date.now()}`,
      reportedAt: new Date(),
      status: 'reported',
    };

    await this.eventBus.publish('incident.reported', {
      incidentId: incident.id,
      severity: incident.severity,
      type: incident.type,
    });

    if (incident.severity === 'critical') {
      await this.triggerCriticalIncidentWorkflow(incident);
    }

    return incident;
  }

  private async triggerCriticalIncidentWorkflow(incident: Incident): Promise<void> {
    await this.eventBus.publish('incident.critical.alert', {
      incidentId: incident.id,
      requiresImmediateAction: true,
    });
  }

  async assignIncident(incidentId: string, assignedTo: string): Promise<Incident> {
    const incident = await this.getIncident(incidentId);
    incident.assignedTo = assignedTo;
    incident.status = 'investigating';

    await this.eventBus.publish('incident.assigned', {
      incidentId,
      assignedTo,
    });

    return incident;
  }

  async resolveIncident(incidentId: string, resolutionNotes: string, financialImpact?: number): Promise<Incident> {
    const incident = await this.getIncident(incidentId);
    incident.status = 'resolved';
    incident.resolutionNotes = resolutionNotes;
    incident.resolvedAt = new Date();
    incident.financialImpact = financialImpact;

    await this.eventBus.publish('incident.resolved', {
      incidentId,
      financialImpact,
    });

    return incident;
  }

  private async getIncident(id: string): Promise<Incident> {
    return {
      id,
      type: 'damage',
      severity: 'medium',
      title: 'Package damage',
      description: 'Box damaged during loading',
      reportedBy: 'user-1',
      reportedAt: new Date(),
      location: 'Warehouse A',
      affectedShipments: ['SHP-001'],
      status: 'reported',
    };
  }

  async getIncidentReport(startDate: Date, endDate: Date): Promise<any> {
    return {
      period: { startDate, endDate },
      totalIncidents: 45,
      bySeverity: {
        critical: 2,
        high: 8,
        medium: 20,
        low: 15,
      },
      byType: {
        damage: 18,
        delay: 15,
        theft: 2,
        accident: 5,
        other: 5,
      },
      resolved: 38,
      avgResolutionTime: 2.5,
      totalFinancialImpact: 125000,
    };
  }
}

