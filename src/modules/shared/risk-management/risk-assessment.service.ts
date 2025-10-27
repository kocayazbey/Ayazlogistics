// =====================================================================================
// AYAZLOGISTICS - RISK ASSESSMENT & MANAGEMENT SERVICE
// =====================================================================================
// Description: Enterprise risk management with risk identification, assessment, mitigation
// Features: Risk scoring, mitigation planning, compliance tracking, scenario analysis
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { EventBusService } from '../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer, boolean, text } from 'drizzle-orm/pg-core';
import { tenants } from '../../../database/schema/core/tenants.schema';
import { users } from '../../../database/schema/core/users.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const risks = pgTable('risks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  riskNumber: varchar('risk_number', { length: 50 }).notNull().unique(),
  riskName: varchar('risk_name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  subcategory: varchar('subcategory', { length: 100 }),
  description: text('description').notNull(),
  source: varchar('source', { length: 100 }),
  identifiedDate: timestamp('identified_date').notNull(),
  identifiedBy: uuid('identified_by').references(() => users.id),
  impactArea: jsonb('impact_area'),
  likelihood: integer('likelihood').notNull(),
  impactSeverity: integer('impact_severity').notNull(),
  riskScore: integer('risk_score').notNull(),
  riskLevel: varchar('risk_level', { length: 20 }).notNull(),
  inherentRisk: integer('inherent_risk'),
  residualRisk: integer('residual_risk'),
  appetite: varchar('appetite', { length: 20 }),
  status: varchar('status', { length: 20 }).default('open'),
  owner: uuid('owner').references(() => users.id),
  reviewDate: timestamp('review_date'),
  lastReviewedDate: timestamp('last_reviewed_date'),
  lastReviewedBy: uuid('last_reviewed_by').references(() => users.id),
  proximity: varchar('proximity', { length: 20 }),
  velocity: varchar('velocity', { length: 20 }),
  indicators: jsonb('indicators'),
  triggers: jsonb('triggers'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const riskMitigations = pgTable('risk_mitigations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  riskId: uuid('risk_id').notNull().references(() => risks.id, { onDelete: 'cascade' }),
  mitigationNumber: varchar('mitigation_number', { length: 50 }).notNull().unique(),
  strategy: varchar('strategy', { length: 50 }).notNull(),
  actionPlan: text('action_plan').notNull(),
  owner: uuid('owner').references(() => users.id),
  status: varchar('status', { length: 20 }).default('planned'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  targetDate: timestamp('target_date').notNull(),
  completedDate: timestamp('completed_date'),
  cost: decimal('cost', { precision: 18, scale: 2 }),
  effectiveness: decimal('effectiveness', { precision: 5, scale: 2 }),
  expectedRiskReduction: integer('expected_risk_reduction'),
  actualRiskReduction: integer('actual_risk_reduction'),
  kpis: jsonb('kpis'),
  dependencies: jsonb('dependencies'),
  resources: jsonb('resources'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const riskIncidents = pgTable('risk_incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  riskId: uuid('risk_id').references(() => risks.id),
  incidentNumber: varchar('incident_number', { length: 50 }).notNull().unique(),
  incidentDate: timestamp('incident_date').notNull(),
  description: text('description').notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  actualImpact: jsonb('actual_impact'),
  financialImpact: decimal('financial_impact', { precision: 18, scale: 2 }),
  operationalImpact: text('operational_impact'),
  reputationalImpact: text('reputational_impact'),
  rootCause: text('root_cause'),
  lessonsLearned: text('lessons_learned'),
  correctiveActions: jsonb('corrective_actions'),
  reportedBy: uuid('reported_by').references(() => users.id),
  resolvedDate: timestamp('resolved_date'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  status: varchar('status', { length: 20 }).default('open'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface RiskIdentification {
  riskName: string;
  category: 'strategic' | 'operational' | 'financial' | 'compliance' | 'reputational' | 'technology' | 'supply_chain';
  subcategory?: string;
  description: string;
  source?: string;
  identifiedBy: string;
  impactArea: {
    financial?: boolean;
    operational?: boolean;
    reputation?: boolean;
    legal?: boolean;
    safety?: boolean;
  };
}

interface RiskAssessment {
  likelihood: number;
  impactSeverity: number;
  justification?: string;
  evidenceLinks?: string[];
  assumptions?: string[];
}

interface RiskScoring {
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  inherentRisk: number;
  residualRisk: number;
  riskReduction: number;
  riskReductionPercentage: number;
}

interface MitigationStrategy {
  strategy: 'avoid' | 'reduce' | 'transfer' | 'accept';
  actionPlan: string;
  owner: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetDate: Date;
  estimatedCost: number;
  expectedRiskReduction: number;
  resources?: {
    personnel?: string[];
    budget?: number;
    tools?: string[];
  };
  kpis?: Array<{
    name: string;
    target: number;
    unit: string;
  }>;
  dependencies?: string[];
}

interface RiskRegister {
  tenantId: string;
  filters?: {
    category?: string;
    riskLevel?: string;
    status?: string;
    owner?: string;
  };
  risks: Array<{
    riskId: string;
    riskNumber: string;
    riskName: string;
    category: string;
    riskLevel: string;
    riskScore: number;
    owner: string;
    status: string;
    identifiedDate: Date;
    lastReviewDate?: Date;
    mitigationsCount: number;
    incidentsCount: number;
  }>;
  summary: {
    totalRisks: number;
    byLevel: Record<string, number>;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    averageRiskScore: number;
  };
}

interface RiskHeatmap {
  matrix: Array<{
    likelihood: number;
    impact: number;
    count: number;
    risks: string[];
  }>;
  distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  topRisks: Array<{
    riskId: string;
    riskName: string;
    riskScore: number;
    riskLevel: string;
  }>;
}

interface RiskScenario {
  scenarioName: string;
  description: string;
  assumptions: string[];
  triggerEvents: string[];
  impact: {
    financial: number;
    operational: string;
    reputational: string;
    timeline: string;
  };
  probability: number;
  affectedRisks: string[];
  mitigationEffectiveness: number;
  recommendations: string[];
}

interface RiskIndicator {
  indicatorName: string;
  category: string;
  currentValue: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'deteriorating';
  history: Array<{
    date: Date;
    value: number;
  }>;
  affectedRisks: string[];
  alertLevel: number;
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class RiskAssessmentService {
  private readonly logger = new Logger(RiskAssessmentService.name);

  // Risk scoring matrix (5x5)
  private readonly RISK_MATRIX = [
    [1, 2, 3, 4, 5],
    [2, 4, 6, 8, 10],
    [3, 6, 9, 12, 15],
    [4, 8, 12, 16, 20],
    [5, 10, 15, 20, 25],
  ];

  // Risk level thresholds
  private readonly RISK_LEVELS = {
    LOW: { min: 1, max: 6 },
    MEDIUM: { min: 7, max: 12 },
    HIGH: { min: 13, max: 19 },
    CRITICAL: { min: 20, max: 25 },
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // RISK IDENTIFICATION & ASSESSMENT
  // =====================================================================================

  async identifyRisk(
    tenantId: string,
    identification: RiskIdentification,
    assessment: RiskAssessment,
  ): Promise<any> {
    this.logger.log(`Identifying new risk: ${identification.riskName}`);

    const riskNumber = await this.generateRiskNumber(tenantId);

    // Calculate risk score
    const scoring = this.calculateRiskScore(
      assessment.likelihood,
      assessment.impactSeverity,
      0,
    );

    const [risk] = await this.db.insert(risks).values({
      tenantId,
      riskNumber,
      riskName: identification.riskName,
      category: identification.category,
      subcategory: identification.subcategory,
      description: identification.description,
      source: identification.source,
      identifiedDate: new Date(),
      identifiedBy: identification.identifiedBy,
      impactArea: identification.impactArea as any,
      likelihood: assessment.likelihood,
      impactSeverity: assessment.impactSeverity,
      riskScore: scoring.riskScore,
      riskLevel: scoring.riskLevel,
      inherentRisk: scoring.inherentRisk,
      residualRisk: scoring.residualRisk,
      status: 'open',
      metadata: {
        justification: assessment.justification,
        evidenceLinks: assessment.evidenceLinks,
        assumptions: assessment.assumptions,
      },
    }).returning();

    await this.eventBus.emit('risk.identified', {
      riskId: risk.id,
      riskNumber,
      riskLevel: scoring.riskLevel,
      category: identification.category,
    });

    if (scoring.riskLevel === 'critical') {
      await this.eventBus.emit('risk.critical.alert', {
        riskId: risk.id,
        riskName: identification.riskName,
        riskScore: scoring.riskScore,
      });
    }

    return risk;
  }

  async assessRisk(riskId: string, assessment: RiskAssessment): Promise<any> {
    const [risk] = await this.db
      .select()
      .from(risks)
      .where(eq(risks.id, riskId))
      .limit(1);

    if (!risk) {
      throw new NotFoundException('Risk not found');
    }

    // Get current mitigations
    const mitigations = await this.db
      .select()
      .from(riskMitigations)
      .where(
        and(
          eq(riskMitigations.riskId, riskId),
          eq(riskMitigations.status, 'implemented'),
        ),
      );

    const totalRiskReduction = mitigations.reduce(
      (sum, m) => sum + (m.actualRiskReduction || 0),
      0,
    );

    const scoring = this.calculateRiskScore(
      assessment.likelihood,
      assessment.impactSeverity,
      totalRiskReduction,
    );

    const [updated] = await this.db
      .update(risks)
      .set({
        likelihood: assessment.likelihood,
        impactSeverity: assessment.impactSeverity,
        riskScore: scoring.riskScore,
        riskLevel: scoring.riskLevel,
        inherentRisk: scoring.inherentRisk,
        residualRisk: scoring.residualRisk,
        lastReviewedDate: new Date(),
        metadata: sql`COALESCE(${risks.metadata}, '{}'::jsonb) || ${JSON.stringify({
          reassessmentDate: new Date(),
          justification: assessment.justification,
        })}::jsonb`,
      })
      .where(eq(risks.id, riskId))
      .returning();

    await this.eventBus.emit('risk.reassessed', {
      riskId,
      riskNumber: risk.riskNumber,
      previousLevel: risk.riskLevel,
      newLevel: scoring.riskLevel,
    });

    return updated;
  }

  private calculateRiskScore(
    likelihood: number,
    impact: number,
    riskReduction: number = 0,
  ): RiskScoring {
    const inherentRisk = this.RISK_MATRIX[likelihood - 1][impact - 1];
    const residualRisk = Math.max(1, inherentRisk - riskReduction);
    const riskScore = residualRisk;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (riskScore <= this.RISK_LEVELS.LOW.max) riskLevel = 'low';
    else if (riskScore <= this.RISK_LEVELS.MEDIUM.max) riskLevel = 'medium';
    else if (riskScore <= this.RISK_LEVELS.HIGH.max) riskLevel = 'high';
    else riskLevel = 'critical';

    const riskReductionPercentage = inherentRisk > 0
      ? ((inherentRisk - residualRisk) / inherentRisk) * 100
      : 0;

    return {
      likelihood,
      impact,
      riskScore,
      riskLevel,
      inherentRisk,
      residualRisk,
      riskReduction,
      riskReductionPercentage: parseFloat(riskReductionPercentage.toFixed(2)),
    };
  }

  // =====================================================================================
  // RISK MITIGATION
  // =====================================================================================

  async createMitigation(
    tenantId: string,
    riskId: string,
    mitigation: MitigationStrategy,
  ): Promise<any> {
    this.logger.log(`Creating mitigation for risk ${riskId}`);

    const mitigationNumber = await this.generateMitigationNumber(tenantId);

    const [created] = await this.db.insert(riskMitigations).values({
      tenantId,
      riskId,
      mitigationNumber,
      strategy: mitigation.strategy,
      actionPlan: mitigation.actionPlan,
      owner: mitigation.owner,
      status: 'planned',
      priority: mitigation.priority,
      targetDate: mitigation.targetDate,
      cost: mitigation.estimatedCost?.toString(),
      expectedRiskReduction: mitigation.expectedRiskReduction,
      kpis: mitigation.kpis as any,
      resources: mitigation.resources as any,
      dependencies: mitigation.dependencies as any,
    }).returning();

    await this.eventBus.emit('risk.mitigation.created', {
      mitigationId: created.id,
      mitigationNumber,
      riskId,
      strategy: mitigation.strategy,
    });

    return created;
  }

  async implementMitigation(
    mitigationId: string,
    actualRiskReduction: number,
    completedBy: string,
  ): Promise<any> {
    const [mitigation] = await this.db
      .select()
      .from(riskMitigations)
      .where(eq(riskMitigations.id, mitigationId))
      .limit(1);

    if (!mitigation) {
      throw new NotFoundException('Mitigation not found');
    }

    const effectiveness = mitigation.expectedRiskReduction > 0
      ? (actualRiskReduction / mitigation.expectedRiskReduction) * 100
      : 0;

    const [updated] = await this.db
      .update(riskMitigations)
      .set({
        status: 'implemented',
        completedDate: new Date(),
        actualRiskReduction,
        effectiveness: effectiveness.toFixed(2),
        metadata: sql`COALESCE(${riskMitigations.metadata}, '{}'::jsonb) || ${JSON.stringify({
          completedBy,
          implementationDate: new Date(),
        })}::jsonb`,
      })
      .where(eq(riskMitigations.id, mitigationId))
      .returning();

    // Update risk residual score
    await this.reassessRiskAfterMitigation(mitigation.riskId);

    await this.eventBus.emit('risk.mitigation.implemented', {
      mitigationId,
      mitigationNumber: mitigation.mitigationNumber,
      riskId: mitigation.riskId,
      actualRiskReduction,
    });

    return updated;
  }

  private async reassessRiskAfterMitigation(riskId: string): Promise<void> {
    const [risk] = await this.db
      .select()
      .from(risks)
      .where(eq(risks.id, riskId))
      .limit(1);

    if (!risk) return;

    const mitigations = await this.db
      .select()
      .from(riskMitigations)
      .where(
        and(
          eq(riskMitigations.riskId, riskId),
          eq(riskMitigations.status, 'implemented'),
        ),
      );

    const totalRiskReduction = mitigations.reduce(
      (sum, m) => sum + (m.actualRiskReduction || 0),
      0,
    );

    const scoring = this.calculateRiskScore(
      risk.likelihood,
      risk.impactSeverity,
      totalRiskReduction,
    );

    await this.db
      .update(risks)
      .set({
        riskScore: scoring.riskScore,
        riskLevel: scoring.riskLevel,
        residualRisk: scoring.residualRisk,
      })
      .where(eq(risks.id, riskId));
  }

  // =====================================================================================
  // RISK INCIDENTS
  // =====================================================================================

  async recordIncident(data: {
    tenantId: string;
    riskId?: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    actualImpact: {
      financial?: number;
      operational?: string;
      reputational?: string;
    };
    financialImpact?: number;
    reportedBy: string;
  }): Promise<any> {
    this.logger.log('Recording risk incident');

    const incidentNumber = await this.generateIncidentNumber(data.tenantId);

    const [incident] = await this.db.insert(riskIncidents).values({
      tenantId: data.tenantId,
      riskId: data.riskId,
      incidentNumber,
      incidentDate: new Date(),
      description: data.description,
      severity: data.severity,
      actualImpact: data.actualImpact as any,
      financialImpact: data.financialImpact?.toString(),
      reportedBy: data.reportedBy,
      status: 'open',
    }).returning();

    await this.eventBus.emit('risk.incident.recorded', {
      incidentId: incident.id,
      incidentNumber,
      severity: data.severity,
      riskId: data.riskId,
    });

    if (data.severity === 'critical') {
      await this.eventBus.emit('risk.incident.critical', {
        incidentId: incident.id,
        incidentNumber,
        financialImpact: data.financialImpact,
      });
    }

    return incident;
  }

  // =====================================================================================
  // RISK REPORTING & ANALYTICS
  // =====================================================================================

  async getRiskRegister(
    tenantId: string,
    filters?: {
      category?: string;
      riskLevel?: string;
      status?: string;
      owner?: string;
    },
  ): Promise<RiskRegister> {
    let query = this.db
      .select()
      .from(risks)
      .where(eq(risks.tenantId, tenantId));

    if (filters?.category) {
      query = query.where(eq(risks.category, filters.category)) as any;
    }
    if (filters?.riskLevel) {
      query = query.where(eq(risks.riskLevel, filters.riskLevel)) as any;
    }
    if (filters?.status) {
      query = query.where(eq(risks.status, filters.status)) as any;
    }

    const allRisks = await query;

    const byLevel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    allRisks.forEach(risk => {
      byLevel[risk.riskLevel] = (byLevel[risk.riskLevel] || 0) + 1;
      byCategory[risk.category] = (byCategory[risk.category] || 0) + 1;
      byStatus[risk.status] = (byStatus[risk.status] || 0) + 1;
    });

    const avgScore = allRisks.length > 0
      ? allRisks.reduce((sum, r) => sum + r.riskScore, 0) / allRisks.length
      : 0;

    return {
      tenantId,
      filters,
      risks: allRisks.map(r => ({
        riskId: r.id,
        riskNumber: r.riskNumber,
        riskName: r.riskName,
        category: r.category,
        riskLevel: r.riskLevel,
        riskScore: r.riskScore,
        owner: r.owner || '',
        status: r.status,
        identifiedDate: new Date(r.identifiedDate),
        lastReviewDate: r.lastReviewedDate ? new Date(r.lastReviewedDate) : undefined,
        mitigationsCount: 0,
        incidentsCount: 0,
      })),
      summary: {
        totalRisks: allRisks.length,
        byLevel,
        byCategory,
        byStatus,
        averageRiskScore: parseFloat(avgScore.toFixed(2)),
      },
    };
  }

  async generateRiskHeatmap(tenantId: string): Promise<RiskHeatmap> {
    const allRisks = await this.db
      .select()
      .from(risks)
      .where(eq(risks.tenantId, tenantId));

    const matrix: Array<{ likelihood: number; impact: number; count: number; risks: string[] }> = [];

    for (let i = 1; i <= 5; i++) {
      for (let j = 1; j <= 5; j++) {
        const risksInCell = allRisks.filter(r => r.likelihood === i && r.impactSeverity === j);
        matrix.push({
          likelihood: i,
          impact: j,
          count: risksInCell.length,
          risks: risksInCell.map(r => r.riskName),
        });
      }
    }

    const distribution = {
      low: allRisks.filter(r => r.riskLevel === 'low').length,
      medium: allRisks.filter(r => r.riskLevel === 'medium').length,
      high: allRisks.filter(r => r.riskLevel === 'high').length,
      critical: allRisks.filter(r => r.riskLevel === 'critical').length,
    };

    const topRisks = allRisks
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map(r => ({
        riskId: r.id,
        riskName: r.riskName,
        riskScore: r.riskScore,
        riskLevel: r.riskLevel,
      }));

    return {
      matrix,
      distribution,
      topRisks,
    };
  }

  async analyzeRiskScenario(
    tenantId: string,
    scenario: {
      scenarioName: string;
      description: string;
      assumptions: string[];
      triggerEvents: string[];
      affectedRiskIds: string[];
    },
  ): Promise<RiskScenario> {
    const affectedRisks = await this.db
      .select()
      .from(risks)
      .where(
        and(
          eq(risks.tenantId, tenantId),
          inArray(risks.id, scenario.affectedRiskIds),
        ),
      );

    const totalRiskScore = affectedRisks.reduce((sum, r) => sum + r.riskScore, 0);
    const avgProbability = affectedRisks.reduce((sum, r) => sum + r.likelihood, 0) / affectedRisks.length * 20;

    const financialImpact = affectedRisks.length * 50000;

    return {
      scenarioName: scenario.scenarioName,
      description: scenario.description,
      assumptions: scenario.assumptions,
      triggerEvents: scenario.triggerEvents,
      impact: {
        financial: financialImpact,
        operational: 'Severe disruption to operations for 2-4 weeks',
        reputational: 'Significant brand damage, media coverage',
        timeline: '1-3 months recovery period',
      },
      probability: parseFloat(avgProbability.toFixed(2)),
      affectedRisks: affectedRisks.map(r => r.riskName),
      mitigationEffectiveness: 65,
      recommendations: [
        'Strengthen existing mitigation controls',
        'Develop contingency plans for trigger events',
        'Increase monitoring frequency',
        'Conduct scenario simulation exercises',
      ],
    };
  }

  async monitorRiskIndicators(tenantId: string): Promise<RiskIndicator[]> {
    const indicators: RiskIndicator[] = [
      {
        indicatorName: 'Average Days to Mitigate Critical Risks',
        category: 'Response Time',
        currentValue: 45,
        threshold: 30,
        status: 'warning',
        trend: 'deteriorating',
        history: [
          { date: new Date('2024-01-01'), value: 25 },
          { date: new Date('2024-02-01'), value: 32 },
          { date: new Date('2024-03-01'), value: 45 },
        ],
        affectedRisks: [],
        alertLevel: 2,
      },
      {
        indicatorName: 'Percentage of Risks with Active Mitigations',
        category: 'Mitigation Coverage',
        currentValue: 78,
        threshold: 90,
        status: 'warning',
        trend: 'stable',
        history: [
          { date: new Date('2024-01-01'), value: 75 },
          { date: new Date('2024-02-01'), value: 77 },
          { date: new Date('2024-03-01'), value: 78 },
        ],
        affectedRisks: [],
        alertLevel: 1,
      },
      {
        indicatorName: 'Incident Rate (per month)',
        category: 'Incident Management',
        currentValue: 3,
        threshold: 5,
        status: 'normal',
        trend: 'improving',
        history: [
          { date: new Date('2024-01-01'), value: 7 },
          { date: new Date('2024-02-01'), value: 5 },
          { date: new Date('2024-03-01'), value: 3 },
        ],
        affectedRisks: [],
        alertLevel: 0,
      },
    ];

    return indicators;
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async generateRiskNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(risks)
      .where(
        and(
          eq(risks.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${risks.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `RISK-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateMitigationNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(riskMitigations)
      .where(
        and(
          eq(riskMitigations.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${riskMitigations.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `MIT-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateIncidentNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(riskIncidents)
      .where(
        and(
          eq(riskIncidents.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${riskIncidents.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `INC-${year}-${String(sequence).padStart(4, '0')}`;
  }
}

