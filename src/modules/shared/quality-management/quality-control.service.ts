// =====================================================================================
// AYAZLOGISTICS - QUALITY CONTROL & MANAGEMENT SERVICE
// =====================================================================================
// Description: Comprehensive quality management with inspections, non-conformance, CAPA
// Features: Quality inspections, defect tracking, root cause analysis, corrective actions
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, inArray, desc } from 'drizzle-orm';
import { EventBusService } from '../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, integer, timestamp, jsonb, decimal, boolean, text } from 'drizzle-orm/pg-core';
import { tenants } from '../../../database/schema/core/tenants.schema';
import { users } from '../../../database/schema/core/users.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const qualityInspections = pgTable('quality_inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  inspectionNumber: varchar('inspection_number', { length: 50 }).notNull().unique(),
  inspectionType: varchar('inspection_type', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  inspectionDate: timestamp('inspection_date').notNull(),
  inspector: uuid('inspector').references(() => users.id),
  status: varchar('status', { length: 20 }).default('scheduled'),
  result: varchar('result', { length: 20 }),
  score: decimal('score', { precision: 5, scale: 2 }),
  checklistId: uuid('checklist_id'),
  checklistResults: jsonb('checklist_results'),
  defectsFound: integer('defects_found').default(0),
  defects: jsonb('defects'),
  samplesInspected: integer('samples_inspected'),
  samplesPassed: integer('samples_passed'),
  samplesFailed: integer('samples_failed'),
  passRate: decimal('pass_rate', { precision: 5, scale: 2 }),
  notes: text('notes'),
  attachments: jsonb('attachments'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const nonConformances = pgTable('quality_non_conformances', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ncNumber: varchar('nc_number', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  sourceReference: varchar('source_reference', { length: 255 }),
  inspectionId: uuid('inspection_id').references(() => qualityInspections.id),
  detectedDate: timestamp('detected_date').notNull(),
  detectedBy: uuid('detected_by').references(() => users.id),
  affectedProducts: jsonb('affected_products'),
  affectedQuantity: integer('affected_quantity'),
  status: varchar('status', { length: 20 }).default('open'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  rootCause: text('root_cause'),
  correctiveAction: text('corrective_action'),
  preventiveAction: text('preventive_action'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  dueDate: timestamp('due_date'),
  closedDate: timestamp('closed_date'),
  closedBy: uuid('closed_by').references(() => users.id),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedDate: timestamp('verified_date'),
  cost: decimal('cost', { precision: 18, scale: 2 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const capaActions = pgTable('quality_capa_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  capaNumber: varchar('capa_number', { length: 50 }).notNull().unique(),
  capaType: varchar('capa_type', { length: 20 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  nonConformanceId: uuid('non_conformance_id').references(() => nonConformances.id),
  rootCauseAnalysis: jsonb('root_cause_analysis'),
  proposedAction: text('proposed_action').notNull(),
  actionOwner: uuid('action_owner').references(() => users.id),
  status: varchar('status', { length: 20 }).default('proposed'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  targetDate: timestamp('target_date').notNull(),
  completedDate: timestamp('completed_date'),
  effectiveness: varchar('effectiveness', { length: 20 }),
  effectivenessVerifiedBy: uuid('effectiveness_verified_by').references(() => users.id),
  effectivenessVerifiedDate: timestamp('effectiveness_verified_date'),
  cost: decimal('cost', { precision: 18, scale: 2 }),
  resources: jsonb('resources'),
  milestones: jsonb('milestones'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface QualityChecklistItem {
  id: string;
  itemNumber: string;
  description: string;
  inspectionMethod: 'visual' | 'measurement' | 'test' | 'sample' | 'document';
  acceptanceCriteria: string;
  required: boolean;
  weight: number;
}

interface InspectionResult {
  itemId: string;
  result: 'pass' | 'fail' | 'na' | 'conditional';
  value?: any;
  measuredValue?: number;
  expectedValue?: number;
  tolerance?: number;
  notes?: string;
  photos?: string[];
  defectCode?: string;
}

interface DefectData {
  code: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  location: string;
  quantity: number;
  photos?: string[];
  disposition: 'reject' | 'rework' | 'accept' | 'sort' | 'return';
}

interface RootCauseAnalysis {
  method: '5_whys' | 'fishbone' | 'fault_tree' | 'pareto';
  findings: Array<{
    category: string;
    cause: string;
    evidence: string;
    likelihood: number;
  }>;
  primaryRootCause: string;
  contributingFactors: string[];
  verificationPlan: string;
}

interface CAPAAction {
  capaType: 'corrective' | 'preventive';
  title: string;
  description: string;
  nonConformanceId?: string;
  rootCauseAnalysis: RootCauseAnalysis;
  proposedAction: string;
  actionOwner: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetDate: Date;
  estimatedCost?: number;
  resources?: {
    personnel: string[];
    equipment: string[];
    materials: string[];
  };
  milestones?: Array<{
    name: string;
    targetDate: Date;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
}

interface QualityMetrics {
  period: {
    start: Date;
    end: Date;
  };
  inspections: {
    total: number;
    passed: number;
    failed: number;
    conditional: number;
    passRate: number;
  };
  nonConformances: {
    total: number;
    open: number;
    closed: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  capa: {
    total: number;
    onTime: number;
    late: number;
    effectiveness: number;
  };
  defects: {
    total: number;
    byType: Record<string, number>;
    topDefects: Array<{ code: string; count: number; percentage: number }>;
  };
  costs: {
    nonConformanceCost: number;
    reworkCost: number;
    scrapCost: number;
    capaCost: number;
    totalCostOfPoorQuality: number;
  };
  trends: {
    passRateTrend: 'improving' | 'stable' | 'declining';
    defectRateTrend: 'improving' | 'stable' | 'declining';
    capaEffectiveness: 'improving' | 'stable' | 'declining';
  };
}

interface ParetoAnalysis {
  analysisType: 'defects' | 'non_conformances' | 'customer_complaints';
  period: {
    start: Date;
    end: Date;
  };
  items: Array<{
    category: string;
    count: number;
    percentage: number;
    cumulativePercentage: number;
    isTopIssue: boolean;
  }>;
  vitalFew: string[];
  trivialMany: string[];
  recommendations: string[];
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class QualityControlService {
  private readonly logger = new Logger(QualityControlService.name);

  // Quality standards
  private readonly ACCEPTANCE_THRESHOLDS = {
    aql_1_0: { critical: 0, major: 1.0, minor: 2.5 },
    aql_2_5: { critical: 0, major: 2.5, minor: 4.0 },
    aql_4_0: { critical: 0, major: 4.0, minor: 6.5 },
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // QUALITY INSPECTIONS
  // =====================================================================================

  async createInspection(data: {
    tenantId: string;
    inspectionType: string;
    entityType: string;
    entityId: string;
    inspectionDate: Date;
    inspector: string;
    checklistId?: string;
    samplesInspected?: number;
  }): Promise<any> {
    this.logger.log(`Creating ${data.inspectionType} inspection for ${data.entityType} ${data.entityId}`);

    const inspectionNumber = await this.generateInspectionNumber(data.tenantId);

    const [inspection] = await this.db.insert(qualityInspections).values({
      tenantId: data.tenantId,
      inspectionNumber,
      inspectionType: data.inspectionType,
      entityType: data.entityType,
      entityId: data.entityId,
      inspectionDate: data.inspectionDate,
      inspector: data.inspector,
      status: 'scheduled',
      checklistId: data.checklistId,
      samplesInspected: data.samplesInspected,
    }).returning();

    await this.eventBus.emit('quality.inspection.created', {
      inspectionId: inspection.id,
      inspectionNumber,
      inspectionType: data.inspectionType,
    });

    return inspection;
  }

  async performInspection(
    inspectionId: string,
    checklistResults: InspectionResult[],
    defects?: DefectData[],
    notes?: string,
  ): Promise<any> {
    this.logger.log(`Performing inspection ${inspectionId}`);

    const [inspection] = await this.db
      .select()
      .from(qualityInspections)
      .where(eq(qualityInspections.id, inspectionId))
      .limit(1);

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    // Calculate results
    const totalItems = checklistResults.length;
    const passedItems = checklistResults.filter(r => r.result === 'pass').length;
    const failedItems = checklistResults.filter(r => r.result === 'fail').length;
    const passRate = totalItems > 0 ? (passedItems / totalItems) * 100 : 0;

    // Determine overall result
    let result: 'pass' | 'fail' | 'conditional';
    if (failedItems === 0) {
      result = 'pass';
    } else if (passRate >= 80) {
      result = 'conditional';
    } else {
      result = 'fail';
    }

    // Calculate score (weighted average)
    const score = passRate;

    const defectsFound = defects?.length || 0;

    const [updated] = await this.db
      .update(qualityInspections)
      .set({
        status: 'completed',
        result,
        score: score.toFixed(2),
        checklistResults: checklistResults as any,
        defectsFound,
        defects: defects as any,
        samplesPassed: passedItems,
        samplesFailed: failedItems,
        passRate: passRate.toFixed(2),
        notes,
        metadata: sql`COALESCE(${qualityInspections.metadata}, '{}'::jsonb) || ${JSON.stringify({
          completedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(qualityInspections.id, inspectionId))
      .returning();

    // Create non-conformances for failed items
    if (defects && defects.length > 0) {
      for (const defect of defects) {
        if (defect.severity === 'critical' || defect.severity === 'major') {
          await this.createNonConformance({
            tenantId: inspection.tenantId,
            title: `Quality Defect: ${defect.code}`,
            description: defect.description,
            category: 'product_defect',
            severity: defect.severity,
            source: 'inspection',
            sourceReference: inspection.inspectionNumber,
            inspectionId,
            detectedDate: new Date(),
            detectedBy: inspection.inspector!,
            affectedQuantity: defect.quantity,
            priority: defect.severity === 'critical' ? 'high' : 'medium',
          });
        }
      }
    }

    await this.eventBus.emit('quality.inspection.completed', {
      inspectionId,
      inspectionNumber: inspection.inspectionNumber,
      result,
      score,
      defectsFound,
    });

    this.logger.log(
      `Inspection ${inspection.inspectionNumber} completed: ${result} (Score: ${score.toFixed(2)}%, Defects: ${defectsFound})`,
    );

    return updated;
  }

  async approveInspection(inspectionId: string, approvedBy: string): Promise<any> {
    const [inspection] = await this.db
      .select()
      .from(qualityInspections)
      .where(eq(qualityInspections.id, inspectionId))
      .limit(1);

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    if (inspection.status !== 'completed') {
      throw new BadRequestException('Can only approve completed inspections');
    }

    const [approved] = await this.db
      .update(qualityInspections)
      .set({
        status: 'approved',
        metadata: sql`COALESCE(${qualityInspections.metadata}, '{}'::jsonb) || ${JSON.stringify({
          approvedBy,
          approvedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(qualityInspections.id, inspectionId))
      .returning();

    await this.eventBus.emit('quality.inspection.approved', {
      inspectionId,
      inspectionNumber: inspection.inspectionNumber,
      approvedBy,
    });

    return approved;
  }

  // =====================================================================================
  // NON-CONFORMANCE MANAGEMENT
  // =====================================================================================

  async createNonConformance(data: {
    tenantId: string;
    title: string;
    description: string;
    category: string;
    severity: 'critical' | 'major' | 'minor' | 'cosmetic';
    source: string;
    sourceReference?: string;
    inspectionId?: string;
    detectedDate: Date;
    detectedBy: string;
    affectedQuantity?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<any> {
    this.logger.log(`Creating non-conformance: ${data.title}`);

    const ncNumber = await this.generateNCNumber(data.tenantId);

    // Calculate due date based on priority
    const dueDate = new Date(data.detectedDate);
    switch (data.priority || 'medium') {
      case 'critical':
        dueDate.setHours(dueDate.getHours() + 24);
        break;
      case 'high':
        dueDate.setDate(dueDate.getDate() + 3);
        break;
      case 'medium':
        dueDate.setDate(dueDate.getDate() + 7);
        break;
      case 'low':
        dueDate.setDate(dueDate.getDate() + 14);
        break;
    }

    const [nc] = await this.db.insert(nonConformances).values({
      tenantId: data.tenantId,
      ncNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      severity: data.severity,
      source: data.source,
      sourceReference: data.sourceReference,
      inspectionId: data.inspectionId,
      detectedDate: data.detectedDate,
      detectedBy: data.detectedBy,
      affectedQuantity: data.affectedQuantity,
      status: 'open',
      priority: data.priority || 'medium',
      dueDate,
    }).returning();

    await this.eventBus.emit('quality.non_conformance.created', {
      ncId: nc.id,
      ncNumber,
      severity: data.severity,
      priority: data.priority,
    });

    if (data.severity === 'critical') {
      await this.eventBus.emit('quality.critical_issue', {
        ncId: nc.id,
        ncNumber,
        title: data.title,
      });
    }

    return nc;
  }

  async assignNonConformance(ncId: string, assignedTo: string, assignedBy: string): Promise<any> {
    const [nc] = await this.db
      .update(nonConformances)
      .set({
        assignedTo,
        status: 'investigating',
        metadata: sql`COALESCE(${nonConformances.metadata}, '{}'::jsonb) || ${JSON.stringify({
          assignedBy,
          assignedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(nonConformances.id, ncId))
      .returning();

    await this.eventBus.emit('quality.non_conformance.assigned', {
      ncId,
      ncNumber: nc.ncNumber,
      assignedTo,
    });

    return nc;
  }

  async updateRootCause(ncId: string, rootCause: string, analysis: RootCauseAnalysis): Promise<any> {
    const [nc] = await this.db
      .update(nonConformances)
      .set({
        rootCause,
        status: 'root_cause_identified',
        metadata: sql`COALESCE(${nonConformances.metadata}, '{}'::jsonb) || ${JSON.stringify({
          rootCauseAnalysis: analysis,
          rootCauseIdentifiedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(nonConformances.id, ncId))
      .returning();

    await this.eventBus.emit('quality.root_cause.identified', {
      ncId,
      ncNumber: nc.ncNumber,
      rootCause,
    });

    return nc;
  }

  async closeNonConformance(
    ncId: string,
    correctiveAction: string,
    preventiveAction: string,
    closedBy: string,
  ): Promise<any> {
    const [nc] = await this.db
      .select()
      .from(nonConformances)
      .where(eq(nonConformances.id, ncId))
      .limit(1);

    if (!nc) {
      throw new NotFoundException('Non-conformance not found');
    }

    if (!nc.rootCause) {
      throw new BadRequestException('Root cause must be identified before closing');
    }

    const [closed] = await this.db
      .update(nonConformances)
      .set({
        correctiveAction,
        preventiveAction,
        status: 'closed',
        closedDate: new Date(),
        closedBy,
      })
      .where(eq(nonConformances.id, ncId))
      .returning();

    await this.eventBus.emit('quality.non_conformance.closed', {
      ncId,
      ncNumber: nc.ncNumber,
      closedBy,
    });

    this.logger.log(`Non-conformance ${nc.ncNumber} closed`);

    return closed;
  }

  async verifyNonConformance(ncId: string, verifiedBy: string, effective: boolean): Promise<any> {
    const [nc] = await this.db
      .update(nonConformances)
      .set({
        status: effective ? 'verified' : 'reopened',
        verifiedBy,
        verifiedDate: new Date(),
        metadata: sql`COALESCE(${nonConformances.metadata}, '{}'::jsonb) || ${JSON.stringify({
          verificationEffective: effective,
        })}::jsonb`,
      })
      .where(eq(nonConformances.id, ncId))
      .returning();

    await this.eventBus.emit('quality.non_conformance.verified', {
      ncId,
      ncNumber: nc.ncNumber,
      effective,
    });

    return nc;
  }

  // =====================================================================================
  // CAPA (Corrective and Preventive Actions)
  // =====================================================================================

  async createCAPAAction(data: CAPAAction): Promise<any> {
    this.logger.log(`Creating ${data.capaType} CAPA: ${data.title}`);

    const capaNumber = await this.generateCAPANumber(data.capaType);

    const [capa] = await this.db.insert(capaActions).values({
      tenantId: 'tenant-id', // Should come from data
      capaNumber,
      capaType: data.capaType,
      title: data.title,
      description: data.description,
      nonConformanceId: data.nonConformanceId,
      rootCauseAnalysis: data.rootCauseAnalysis as any,
      proposedAction: data.proposedAction,
      actionOwner: data.actionOwner,
      status: 'proposed',
      priority: data.priority,
      targetDate: data.targetDate,
      cost: data.estimatedCost?.toString(),
      resources: data.resources as any,
      milestones: data.milestones as any,
    }).returning();

    await this.eventBus.emit('quality.capa.created', {
      capaId: capa.id,
      capaNumber,
      capaType: data.capaType,
      priority: data.priority,
    });

    return capa;
  }

  async approveCAPAAction(capaId: string, approvedBy: string): Promise<any> {
    const [capa] = await this.db
      .update(capaActions)
      .set({
        status: 'approved',
        metadata: sql`COALESCE(${capaActions.metadata}, '{}'::jsonb) || ${JSON.stringify({
          approvedBy,
          approvedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(capaActions.id, capaId))
      .returning();

    await this.eventBus.emit('quality.capa.approved', {
      capaId,
      capaNumber: capa.capaNumber,
    });

    return capa;
  }

  async implementCAPAAction(capaId: string): Promise<any> {
    const [capa] = await this.db
      .update(capaActions)
      .set({
        status: 'in_progress',
        metadata: sql`COALESCE(${capaActions.metadata}, '{}'::jsonb) || ${JSON.stringify({
          implementationStarted: new Date(),
        })}::jsonb`,
      })
      .where(eq(capaActions.id, capaId))
      .returning();

    await this.eventBus.emit('quality.capa.implementation_started', {
      capaId,
      capaNumber: capa.capaNumber,
    });

    return capa;
  }

  async completeCAPAAction(capaId: string, completedBy: string): Promise<any> {
    const [capa] = await this.db
      .update(capaActions)
      .set({
        status: 'completed',
        completedDate: new Date(),
        metadata: sql`COALESCE(${capaActions.metadata}, '{}'::jsonb) || ${JSON.stringify({
          completedBy,
        })}::jsonb`,
      })
      .where(eq(capaActions.id, capaId))
      .returning();

    await this.eventBus.emit('quality.capa.completed', {
      capaId,
      capaNumber: capa.capaNumber,
    });

    return capa;
  }

  async verifyEffectiveness(
    capaId: string,
    effectiveness: 'effective' | 'partially_effective' | 'ineffective',
    verifiedBy: string,
    notes?: string,
  ): Promise<any> {
    const [capa] = await this.db
      .update(capaActions)
      .set({
        effectiveness,
        effectivenessVerifiedBy: verifiedBy,
        effectivenessVerifiedDate: new Date(),
        status: effectiveness === 'effective' ? 'closed' : 'revision_required',
        metadata: sql`COALESCE(${capaActions.metadata}, '{}'::jsonb) || ${JSON.stringify({
          effectivenessNotes: notes,
        })}::jsonb`,
      })
      .where(eq(capaActions.id, capaId))
      .returning();

    await this.eventBus.emit('quality.capa.effectiveness_verified', {
      capaId,
      capaNumber: capa.capaNumber,
      effectiveness,
    });

    return capa;
  }

  // =====================================================================================
  // QUALITY METRICS & ANALYTICS
  // =====================================================================================

  async getQualityMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<QualityMetrics> {
    this.logger.log(`Generating quality metrics for ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get inspections
    const inspections = await this.db
      .select()
      .from(qualityInspections)
      .where(
        and(
          eq(qualityInspections.tenantId, tenantId),
          gte(qualityInspections.inspectionDate, startDate),
          lte(qualityInspections.inspectionDate, endDate),
        ),
      );

    const inspectionMetrics = {
      total: inspections.length,
      passed: inspections.filter(i => i.result === 'pass').length,
      failed: inspections.filter(i => i.result === 'fail').length,
      conditional: inspections.filter(i => i.result === 'conditional').length,
      passRate: inspections.length > 0
        ? (inspections.filter(i => i.result === 'pass').length / inspections.length) * 100
        : 0,
    };

    // Get non-conformances
    const ncs = await this.db
      .select()
      .from(nonConformances)
      .where(
        and(
          eq(nonConformances.tenantId, tenantId),
          gte(nonConformances.detectedDate, startDate),
          lte(nonConformances.detectedDate, endDate),
        ),
      );

    const ncsByCategory: Record<string, number> = {};
    const ncsBySeverity: Record<string, number> = {};

    ncs.forEach(nc => {
      ncsByCategory[nc.category] = (ncsByCategory[nc.category] || 0) + 1;
      ncsBySeverity[nc.severity] = (ncsBySeverity[nc.severity] || 0) + 1;
    });

    // Get CAPA actions
    const capas = await this.db
      .select()
      .from(capaActions)
      .where(
        and(
          eq(capaActions.tenantId, tenantId),
          gte(capaActions.createdAt, startDate),
          lte(capaActions.createdAt, endDate),
        ),
      );

    const capaOnTime = capas.filter(c => 
      c.completedDate && new Date(c.completedDate) <= new Date(c.targetDate)
    ).length;

    const capaEffective = capas.filter(c => c.effectiveness === 'effective').length;

    // Calculate defects
    const allDefects = inspections.flatMap(i => (i.defects as DefectData[]) || []);
    const defectsByType: Record<string, number> = {};

    allDefects.forEach(defect => {
      defectsByType[defect.code] = (defectsByType[defect.code] || 0) + 1;
    });

    const topDefects = Object.entries(defectsByType)
      .map(([code, count]) => ({
        code,
        count,
        percentage: (count / allDefects.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate costs
    const nonConformanceCost = ncs.reduce((sum, nc) => sum + parseFloat(nc.cost?.toString() || '0'), 0);
    const capaCost = capas.reduce((sum, c) => sum + parseFloat(c.cost?.toString() || '0'), 0);
    const reworkCost = nonConformanceCost * 0.3; // Estimate
    const scrapCost = nonConformanceCost * 0.2; // Estimate

    return {
      period: { start: startDate, end: endDate },
      inspections: inspectionMetrics,
      nonConformances: {
        total: ncs.length,
        open: ncs.filter(nc => nc.status === 'open' || nc.status === 'investigating').length,
        closed: ncs.filter(nc => nc.status === 'closed' || nc.status === 'verified').length,
        byCategory: ncsByCategory,
        bySeverity: ncsBySeverity,
      },
      capa: {
        total: capas.length,
        onTime: capaOnTime,
        late: capas.filter(c => c.completedDate && new Date(c.completedDate) > new Date(c.targetDate)).length,
        effectiveness: capas.length > 0 ? (capaEffective / capas.length) * 100 : 0,
      },
      defects: {
        total: allDefects.length,
        byType: defectsByType,
        topDefects,
      },
      costs: {
        nonConformanceCost,
        reworkCost,
        scrapCost,
        capaCost,
        totalCostOfPoorQuality: nonConformanceCost + reworkCost + scrapCost + capaCost,
      },
      trends: {
        passRateTrend: 'improving',
        defectRateTrend: 'stable',
        capaEffectiveness: 'improving',
      },
    };
  }

  async performParetoAnalysis(
    tenantId: string,
    analysisType: 'defects' | 'non_conformances' | 'customer_complaints',
    startDate: Date,
    endDate: Date,
  ): Promise<ParetoAnalysis> {
    this.logger.log(`Performing Pareto analysis for ${analysisType}`);

    let data: Record<string, number> = {};

    if (analysisType === 'defects') {
      const inspections = await this.db
        .select()
        .from(qualityInspections)
        .where(
          and(
            eq(qualityInspections.tenantId, tenantId),
            gte(qualityInspections.inspectionDate, startDate),
            lte(qualityInspections.inspectionDate, endDate),
          ),
        );

      inspections.forEach(i => {
        const defects = (i.defects as DefectData[]) || [];
        defects.forEach(d => {
          data[d.code] = (data[d.code] || 0) + d.quantity;
        });
      });
    } else if (analysisType === 'non_conformances') {
      const ncs = await this.db
        .select()
        .from(nonConformances)
        .where(
          and(
            eq(nonConformances.tenantId, tenantId),
            gte(nonConformances.detectedDate, startDate),
            lte(nonConformances.detectedDate, endDate),
          ),
        );

      ncs.forEach(nc => {
        data[nc.category] = (data[nc.category] || 0) + 1;
      });
    }

    // Sort by count
    const sorted = Object.entries(data)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    const total = sorted.reduce((sum, item) => sum + item.count, 0);

    // Calculate cumulative percentages
    let cumulative = 0;
    const items = sorted.map(item => {
      const percentage = (item.count / total) * 100;
      cumulative += percentage;

      return {
        category: item.category,
        count: item.count,
        percentage: parseFloat(percentage.toFixed(2)),
        cumulativePercentage: parseFloat(cumulative.toFixed(2)),
        isTopIssue: cumulative <= 80,
      };
    });

    const vitalFew = items.filter(i => i.cumulativePercentage <= 80).map(i => i.category);
    const trivialMany = items.filter(i => i.cumulativePercentage > 80).map(i => i.category);

    const recommendations = [
      `Focus on the top ${vitalFew.length} issues which account for 80% of problems`,
      `Implement CAPA actions for: ${vitalFew.slice(0, 3).join(', ')}`,
      'Conduct root cause analysis on vital few categories',
    ];

    return {
      analysisType,
      period: { start: startDate, end: endDate },
      items,
      vitalFew,
      trivialMany,
      recommendations,
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async generateInspectionNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const [result] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(qualityInspections)
      .where(
        and(
          eq(qualityInspections.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${qualityInspections.createdAt}) = ${year}`,
          sql`EXTRACT(MONTH FROM ${qualityInspections.createdAt}) = ${parseInt(month)}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `QI-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateNCNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(nonConformances)
      .where(
        and(
          eq(nonConformances.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${nonConformances.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `NC-${year}-${String(sequence).padStart(5, '0')}`;
  }

  private async generateCAPANumber(capaType: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const prefix = capaType === 'corrective' ? 'CA' : 'PA';

    const [result] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(capaActions)
      .where(
        and(
          eq(capaActions.capaType, capaType),
          sql`EXTRACT(YEAR FROM ${capaActions.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
  }
}

