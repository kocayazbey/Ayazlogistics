import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ComplianceItem {
  id: string;
  category: string;
  requirement: string;
  description: string;
  regulatoryBody: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'as_needed';
  lastChecked?: Date;
  nextDue: Date;
  status: 'compliant' | 'non_compliant' | 'pending_review';
  responsible: string;
  evidence?: string[];
}

@Injectable()
export class ComplianceChecklistService {
  private checklists: ComplianceItem[] = [
    {
      id: 'comp-001',
      category: 'Transportation',
      requirement: 'Driver License Validation',
      description: 'Verify all drivers have valid licenses',
      regulatoryBody: 'Ministry of Transport',
      frequency: 'monthly',
      nextDue: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'compliant',
      responsible: 'HR Department',
      evidence: ['driver-licenses.pdf'],
    },
    {
      id: 'comp-002',
      category: 'Safety',
      requirement: 'Vehicle Safety Inspection',
      description: 'Annual safety inspection for all vehicles',
      regulatoryBody: 'Traffic Safety Board',
      frequency: 'annually',
      nextDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'compliant',
      responsible: 'Fleet Manager',
    },
    {
      id: 'comp-003',
      category: 'Environmental',
      requirement: 'Emissions Compliance',
      description: 'Vehicle emissions within legal limits',
      regulatoryBody: 'Ministry of Environment',
      frequency: 'annually',
      nextDue: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      status: 'pending_review',
      responsible: 'Operations',
    },
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async getComplianceChecklist(category?: string): Promise<ComplianceItem[]> {
    if (category) {
      return this.checklists.filter(item => item.category === category);
    }
    return this.checklists;
  }

  async updateComplianceStatus(itemId: string, status: 'compliant' | 'non_compliant', evidence?: string[]): Promise<ComplianceItem> {
    const item = this.checklists.find(i => i.id === itemId);
    
    if (!item) {
      throw new Error('Compliance item not found');
    }

    item.status = status;
    item.lastChecked = new Date();
    if (evidence) {
      item.evidence = evidence;
    }

    await this.eventBus.publish('compliance.status.updated', {
      itemId,
      status,
      checkedAt: item.lastChecked,
    });

    return item;
  }

  async getComplianceDashboard(tenantId: string): Promise<any> {
    return {
      totalItems: this.checklists.length,
      compliant: this.checklists.filter(i => i.status === 'compliant').length,
      nonCompliant: this.checklists.filter(i => i.status === 'non_compliant').length,
      pendingReview: this.checklists.filter(i => i.status === 'pending_review').length,
      complianceRate: (this.checklists.filter(i => i.status === 'compliant').length / this.checklists.length) * 100,
      upcomingDue: this.checklists.filter(i => {
        const daysUntilDue = (i.nextDue.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilDue <= 30;
      }),
      byCategory: this.groupByCategory(),
    };
  }

  private groupByCategory(): any {
    const grouped = new Map();
    this.checklists.forEach(item => {
      if (!grouped.has(item.category)) {
        grouped.set(item.category, []);
      }
      grouped.get(item.category).push(item);
    });
    return Object.fromEntries(grouped);
  }
}

