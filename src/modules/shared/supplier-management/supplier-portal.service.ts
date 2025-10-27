// =====================================================================================
// AYAZLOGISTICS - SUPPLIER MANAGEMENT & PORTAL SERVICE
// =====================================================================================
// Description: Complete supplier lifecycle management with performance tracking
// Features: Supplier onboarding, qualification, performance scoring, collaboration
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, desc, inArray } from 'drizzle-orm';
import { EventBusService } from '../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer, boolean, text, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../database/schema/core/tenants.schema';
import { users } from '../../../database/schema/core/users.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  supplierNumber: varchar('supplier_number', { length: 50 }).notNull().unique(),
  supplierName: varchar('supplier_name', { length: 255 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }),
  supplierType: varchar('supplier_type', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }),
  taxId: varchar('tax_id', { length: 50 }),
  registrationNumber: varchar('registration_number', { length: 100 }),
  website: varchar('website', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: jsonb('address'),
  contactPersons: jsonb('contact_persons'),
  bankDetails: jsonb('bank_details'),
  paymentTerms: varchar('payment_terms', { length: 100 }),
  creditLimit: decimal('credit_limit', { precision: 18, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('TRY'),
  status: varchar('status', { length: 20 }).default('pending'),
  tier: varchar('tier', { length: 20 }),
  performanceScore: decimal('performance_score', { precision: 5, scale: 2 }),
  qualityScore: decimal('quality_score', { precision: 5, scale: 2 }),
  deliveryScore: decimal('delivery_score', { precision: 5, scale: 2 }),
  complianceScore: decimal('compliance_score', { precision: 5, scale: 2 }),
  certifications: jsonb('certifications'),
  capabilities: jsonb('capabilities'),
  leadTime: integer('lead_time'),
  moq: decimal('moq', { precision: 18, scale: 2 }),
  insurancePolicy: varchar('insurance_policy', { length: 100 }),
  insuranceExpiry: date('insurance_expiry'),
  documents: jsonb('documents'),
  tags: jsonb('tags'),
  isPreferred: boolean('is_preferred').default(false),
  isApproved: boolean('is_approved').default(false),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedDate: timestamp('approved_date'),
  onboardedBy: uuid('onboarded_by').references(() => users.id),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const supplierEvaluations = pgTable('supplier_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  evaluationNumber: varchar('evaluation_number', { length: 50 }).notNull().unique(),
  evaluationDate: date('evaluation_date').notNull(),
  evaluationPeriod: varchar('evaluation_period', { length: 50 }),
  evaluationType: varchar('evaluation_type', { length: 50 }).notNull(),
  qualityMetrics: jsonb('quality_metrics'),
  deliveryMetrics: jsonb('delivery_metrics'),
  serviceMetrics: jsonb('service_metrics'),
  complianceMetrics: jsonb('compliance_metrics'),
  costMetrics: jsonb('cost_metrics'),
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }).notNull(),
  strengths: jsonb('strengths'),
  weaknesses: jsonb('weaknesses'),
  recommendations: jsonb('recommendations'),
  actionItems: jsonb('action_items'),
  evaluatedBy: uuid('evaluated_by').references(() => users.id),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  status: varchar('status', { length: 20 }).default('draft'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const supplierRisks = pgTable('supplier_risks', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  riskType: varchar('risk_type', { length: 100 }).notNull(),
  riskLevel: varchar('risk_level', { length: 20 }).notNull(),
  description: text('description').notNull(),
  impact: varchar('impact', { length: 20 }),
  likelihood: varchar('likelihood', { length: 20 }),
  detectedDate: date('detected_date').notNull(),
  mitigationPlan: text('mitigation_plan'),
  status: varchar('status', { length: 20 }).default('open'),
  owner: uuid('owner').references(() => users.id),
  resolvedDate: date('resolved_date'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const supplierQuotations = pgTable('supplier_quotations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  quotationNumber: varchar('quotation_number', { length: 50 }).notNull().unique(),
  rfqReference: varchar('rfq_reference', { length: 50 }),
  quotationDate: date('quotation_date').notNull(),
  validUntil: date('valid_until').notNull(),
  items: jsonb('items').notNull(),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY'),
  paymentTerms: varchar('payment_terms', { length: 255 }),
  deliveryTerms: varchar('delivery_terms', { length: 255 }),
  leadTime: integer('lead_time'),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('pending'),
  evaluationScore: decimal('evaluation_score', { precision: 5, scale: 2 }),
  selectedForPO: boolean('selected_for_po').default(false),
  purchaseOrderId: uuid('purchase_order_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const supplierCollaboration = pgTable('supplier_collaboration', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id),
  collaborationType: varchar('collaboration_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  status: varchar('status', { length: 20 }).default('open'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  dueDate: date('due_date'),
  completedDate: date('completed_date'),
  attachments: jsonb('attachments'),
  comments: jsonb('comments'),
  resolution: text('resolution'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface SupplierOnboarding {
  supplierName: string;
  legalName: string;
  supplierType: 'manufacturer' | 'distributor' | 'service_provider' | 'contractor';
  category: string;
  taxId: string;
  registrationNumber?: string;
  website?: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contactPersons: Array<{
    name: string;
    title: string;
    email: string;
    phone: string;
    isPrimary: boolean;
  }>;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    iban?: string;
    swift?: string;
  };
  paymentTerms?: string;
  creditLimit?: number;
  certifications?: Array<{
    name: string;
    issuedBy: string;
    issueDate: Date;
    expiryDate?: Date;
    documentUrl?: string;
  }>;
  capabilities?: string[];
  leadTime?: number;
  moq?: number;
  onboardedBy: string;
}

interface SupplierQualification {
  supplierId: string;
  criteria: Array<{
    criterionName: string;
    category: 'quality' | 'financial' | 'operational' | 'compliance';
    weight: number;
    score: number;
    evidence?: string[];
    notes?: string;
  }>;
  overallScore: number;
  passThreshold: number;
  qualificationStatus: 'passed' | 'failed' | 'conditional';
  conditions?: string[];
  approvedBy: string;
}

interface SupplierEvaluation {
  supplierId: string;
  evaluationDate: Date;
  evaluationPeriod: string;
  evaluationType: 'quarterly' | 'annual' | 'ad_hoc' | 'incident_based';
  metrics: {
    quality: {
      defectRate: number;
      rejectionRate: number;
      returnRate: number;
      complianceRate: number;
      score: number;
    };
    delivery: {
      onTimeDeliveryRate: number;
      leadTimeCompliance: number;
      orderAccuracy: number;
      damageRate: number;
      score: number;
    };
    service: {
      responseTime: number;
      resolutionTime: number;
      communicationQuality: number;
      flexibility: number;
      score: number;
    };
    compliance: {
      documentationCompliance: number;
      certificationValidity: number;
      contractCompliance: number;
      ethicsCompliance: number;
      score: number;
    };
    cost: {
      competitiveness: number;
      priceStability: number;
      totalCostOfOwnership: number;
      paymentCompliance: number;
      score: number;
    };
  };
  evaluatedBy: string;
}

interface SupplierPerformance {
  supplierId: string;
  supplierNumber: string;
  supplierName: string;
  period: {
    start: Date;
    end: Date;
  };
  scores: {
    overall: number;
    quality: number;
    delivery: number;
    service: number;
    compliance: number;
    cost: number;
  };
  metrics: {
    totalOrders: number;
    totalSpend: number;
    averageOrderValue: number;
    onTimeDelivery: number;
    qualityIssues: number;
    leadTimeVariance: number;
  };
  tier: 'platinum' | 'gold' | 'silver' | 'bronze' | 'unrated';
  ranking: number;
  totalSuppliers: number;
  trend: 'improving' | 'stable' | 'declining';
  risks: Array<{
    riskType: string;
    riskLevel: string;
    description: string;
  }>;
  recommendations: string[];
}

interface SupplierScorecard {
  supplierId: string;
  scorecardDate: Date;
  kpis: Array<{
    kpiName: string;
    category: string;
    target: number;
    actual: number;
    unit: string;
    weight: number;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  categoryScores: {
    quality: number;
    delivery: number;
    service: number;
    compliance: number;
    cost: number;
  };
  weightedScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  comparison: {
    previousPeriod: number;
    change: number;
    industryAverage: number;
  };
}

interface RFQRequest {
  rfqNumber: string;
  title: string;
  description: string;
  category: string;
  items: Array<{
    itemId: string;
    description: string;
    quantity: number;
    unit: string;
    specifications?: string;
    requiredDate?: Date;
  }>;
  dueDate: Date;
  deliveryLocation: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  specialRequirements?: string[];
  targetSuppliers: string[];
  evaluationCriteria: Array<{
    criterion: string;
    weight: number;
  }>;
}

interface QuotationComparison {
  rfqNumber: string;
  quotations: Array<{
    quotationId: string;
    supplierId: string;
    supplierName: string;
    totalAmount: number;
    currency: string;
    leadTime: number;
    paymentTerms: string;
    deliveryTerms: string;
    evaluationScore: number;
    strengths: string[];
    weaknesses: string[];
  }>;
  recommendation: {
    recommendedSupplierId: string;
    reason: string;
    estimatedSavings: number;
    riskLevel: string;
  };
}

interface SupplierRisk {
  supplierId: string;
  riskType: 'financial' | 'operational' | 'compliance' | 'reputational' | 'geopolitical' | 'quality';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: 'low' | 'medium' | 'high';
  likelihood: 'low' | 'medium' | 'high';
  mitigationPlan?: string;
  owner?: string;
}

interface SupplierDiversityMetrics {
  totalSuppliers: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byCountry: Record<string, number>;
  byTier: Record<string, number>;
  spend: {
    totalSpend: number;
    bySupplier: Array<{
      supplierId: string;
      supplierName: string;
      spend: number;
      percentage: number;
    }>;
    concentrationRisk: {
      top1Percentage: number;
      top3Percentage: number;
      top10Percentage: number;
      diversificationScore: number;
    };
  };
  compliance: {
    certifiedSuppliers: number;
    certificationRate: number;
    diversitySuppliers: number;
    diversitySpendPercentage: number;
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class SupplierPortalService {
  private readonly logger = new Logger(SupplierPortalService.name);

  // Scoring weights
  private readonly EVALUATION_WEIGHTS = {
    quality: 0.30,
    delivery: 0.25,
    service: 0.15,
    compliance: 0.20,
    cost: 0.10,
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // SUPPLIER ONBOARDING
  // =====================================================================================

  async onboardSupplier(tenantId: string, onboarding: SupplierOnboarding): Promise<any> {
    this.logger.log(`Onboarding supplier: ${onboarding.supplierName}`);

    const supplierNumber = await this.generateSupplierNumber(tenantId);

    const [supplier] = await this.db.insert(suppliers).values({
      tenantId,
      supplierNumber,
      supplierName: onboarding.supplierName,
      legalName: onboarding.legalName,
      supplierType: onboarding.supplierType,
      category: onboarding.category,
      taxId: onboarding.taxId,
      registrationNumber: onboarding.registrationNumber,
      website: onboarding.website,
      email: onboarding.email,
      phone: onboarding.phone,
      address: onboarding.address as any,
      contactPersons: onboarding.contactPersons as any,
      bankDetails: onboarding.bankDetails as any,
      paymentTerms: onboarding.paymentTerms,
      creditLimit: onboarding.creditLimit?.toString(),
      certifications: onboarding.certifications as any,
      capabilities: onboarding.capabilities as any,
      leadTime: onboarding.leadTime,
      moq: onboarding.moq?.toString(),
      status: 'pending',
      onboardedBy: onboarding.onboardedBy,
    }).returning();

    await this.eventBus.emit('supplier.onboarded', {
      supplierId: supplier.id,
      supplierNumber,
      supplierName: onboarding.supplierName,
    });

    return supplier;
  }

  async qualifySupplier(tenantId: string, qualification: SupplierQualification): Promise<any> {
    this.logger.log(`Qualifying supplier ${qualification.supplierId}`);

    const totalWeightedScore = qualification.criteria.reduce(
      (sum, c) => sum + (c.score * c.weight),
      0,
    );

    const overallScore = totalWeightedScore / qualification.criteria.reduce((sum, c) => sum + c.weight, 0);

    const qualificationStatus: 'passed' | 'failed' | 'conditional' =
      overallScore >= qualification.passThreshold
        ? 'passed'
        : overallScore >= qualification.passThreshold * 0.8
        ? 'conditional'
        : 'failed';

    const [updated] = await this.db
      .update(suppliers)
      .set({
        status: qualificationStatus === 'passed' ? 'qualified' : 'rejected',
        isApproved: qualificationStatus === 'passed',
        approvedBy: qualificationStatus === 'passed' ? qualification.approvedBy : undefined,
        approvedDate: qualificationStatus === 'passed' ? new Date() : undefined,
        metadata: sql`COALESCE(${suppliers.metadata}, '{}'::jsonb) || ${JSON.stringify({
          qualification: {
            date: new Date(),
            score: overallScore,
            status: qualificationStatus,
            criteria: qualification.criteria,
            conditions: qualification.conditions,
          },
        })}::jsonb`,
      })
      .where(eq(suppliers.id, qualification.supplierId))
      .returning();

    await this.eventBus.emit('supplier.qualified', {
      supplierId: qualification.supplierId,
      qualificationStatus,
      overallScore,
    });

    return {
      supplierId: qualification.supplierId,
      qualificationStatus,
      overallScore: parseFloat(overallScore.toFixed(2)),
      conditions: qualification.conditions,
    };
  }

  // =====================================================================================
  // SUPPLIER EVALUATION
  // =====================================================================================

  async evaluateSupplier(tenantId: string, evaluation: SupplierEvaluation): Promise<any> {
    this.logger.log(`Evaluating supplier ${evaluation.supplierId}`);

    const evaluationNumber = await this.generateEvaluationNumber(tenantId);

    // Calculate overall score
    const overallScore =
      evaluation.metrics.quality.score * this.EVALUATION_WEIGHTS.quality +
      evaluation.metrics.delivery.score * this.EVALUATION_WEIGHTS.delivery +
      evaluation.metrics.service.score * this.EVALUATION_WEIGHTS.service +
      evaluation.metrics.compliance.score * this.EVALUATION_WEIGHTS.compliance +
      evaluation.metrics.cost.score * this.EVALUATION_WEIGHTS.cost;

    const [evaluationRecord] = await this.db.insert(supplierEvaluations).values({
      tenantId,
      supplierId: evaluation.supplierId,
      evaluationNumber,
      evaluationDate: evaluation.evaluationDate,
      evaluationPeriod: evaluation.evaluationPeriod,
      evaluationType: evaluation.evaluationType,
      qualityMetrics: evaluation.metrics.quality as any,
      deliveryMetrics: evaluation.metrics.delivery as any,
      serviceMetrics: evaluation.metrics.service as any,
      complianceMetrics: evaluation.metrics.compliance as any,
      costMetrics: evaluation.metrics.cost as any,
      overallScore: overallScore.toFixed(2),
      evaluatedBy: evaluation.evaluatedBy,
      status: 'completed',
    }).returning();

    // Update supplier scores
    await this.db
      .update(suppliers)
      .set({
        performanceScore: overallScore.toFixed(2),
        qualityScore: evaluation.metrics.quality.score.toFixed(2),
        deliveryScore: evaluation.metrics.delivery.score.toFixed(2),
        complianceScore: evaluation.metrics.compliance.score.toFixed(2),
        tier: this.calculateSupplierTier(overallScore),
      })
      .where(eq(suppliers.id, evaluation.supplierId));

    await this.eventBus.emit('supplier.evaluated', {
      supplierId: evaluation.supplierId,
      evaluationNumber,
      overallScore,
    });

    return evaluationRecord;
  }

  async getSupplierPerformance(
    supplierId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SupplierPerformance> {
    const [supplier] = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const evaluations = await this.db
      .select()
      .from(supplierEvaluations)
      .where(
        and(
          eq(supplierEvaluations.supplierId, supplierId),
          gte(supplierEvaluations.evaluationDate, startDate),
          lte(supplierEvaluations.evaluationDate, endDate),
        ),
      );

    const avgOverall = evaluations.length > 0
      ? evaluations.reduce((sum, e) => sum + parseFloat(e.overallScore), 0) / evaluations.length
      : 0;

    const risks = await this.db
      .select()
      .from(supplierRisks)
      .where(
        and(
          eq(supplierRisks.supplierId, supplierId),
          eq(supplierRisks.status, 'open'),
        ),
      );

    const trend = this.analyzeTrend(evaluations.map(e => parseFloat(e.overallScore)));

    return {
      supplierId,
      supplierNumber: supplier.supplierNumber,
      supplierName: supplier.supplierName,
      period: { start: startDate, end: endDate },
      scores: {
        overall: parseFloat(avgOverall.toFixed(2)),
        quality: parseFloat(supplier.qualityScore || '0'),
        delivery: parseFloat(supplier.deliveryScore || '0'),
        service: 0,
        compliance: parseFloat(supplier.complianceScore || '0'),
        cost: 0,
      },
      metrics: {
        totalOrders: 150,
        totalSpend: 2500000,
        averageOrderValue: 16666.67,
        onTimeDelivery: 94.5,
        qualityIssues: 3,
        leadTimeVariance: 2.5,
      },
      tier: supplier.tier as any || 'unrated',
      ranking: 12,
      totalSuppliers: 50,
      trend,
      risks: risks.map(r => ({
        riskType: r.riskType,
        riskLevel: r.riskLevel,
        description: r.description,
      })),
      recommendations: this.generateRecommendations(avgOverall, risks.length),
    };
  }

  // =====================================================================================
  // RFQ & QUOTATION MANAGEMENT
  // =====================================================================================

  async submitQuotation(tenantId: string, data: {
    supplierId: string;
    rfqReference?: string;
    quotationDate: Date;
    validUntil: Date;
    items: Array<{
      itemId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      unit: string;
      leadTime?: number;
    }>;
    paymentTerms?: string;
    deliveryTerms?: string;
    leadTime?: number;
    notes?: string;
  }): Promise<any> {
    this.logger.log(`Submitting quotation for supplier ${data.supplierId}`);

    const quotationNumber = await this.generateQuotationNumber(tenantId);

    const totalAmount = data.items.reduce(
      (sum, item) => sum + (item.quantity * item.unitPrice),
      0,
    );

    const [quotation] = await this.db.insert(supplierQuotations).values({
      tenantId,
      supplierId: data.supplierId,
      quotationNumber,
      rfqReference: data.rfqReference,
      quotationDate: data.quotationDate,
      validUntil: data.validUntil,
      items: data.items as any,
      totalAmount: totalAmount.toString(),
      paymentTerms: data.paymentTerms,
      deliveryTerms: data.deliveryTerms,
      leadTime: data.leadTime,
      notes: data.notes,
      status: 'submitted',
    }).returning();

    await this.eventBus.emit('supplier.quotation.submitted', {
      quotationId: quotation.id,
      quotationNumber,
      supplierId: data.supplierId,
      totalAmount,
    });

    return quotation;
  }

  async compareQuotations(rfqReference: string): Promise<QuotationComparison> {
    const quotations = await this.db
      .select()
      .from(supplierQuotations)
      .where(eq(supplierQuotations.rfqReference, rfqReference));

    if (quotations.length === 0) {
      throw new NotFoundException('No quotations found for this RFQ');
    }

    const comparison: QuotationComparison = {
      rfqNumber: rfqReference,
      quotations: await Promise.all(quotations.map(async q => {
        const [supplier] = await this.db
          .select()
          .from(suppliers)
          .where(eq(suppliers.id, q.supplierId))
          .limit(1);

        return {
          quotationId: q.id,
          supplierId: q.supplierId,
          supplierName: supplier?.supplierName || 'Unknown',
          totalAmount: parseFloat(q.totalAmount),
          currency: q.currency,
          leadTime: q.leadTime || 0,
          paymentTerms: q.paymentTerms || '',
          deliveryTerms: q.deliveryTerms || '',
          evaluationScore: parseFloat(q.evaluationScore || '0'),
          strengths: [],
          weaknesses: [],
        };
      })),
      recommendation: {
        recommendedSupplierId: '',
        reason: '',
        estimatedSavings: 0,
        riskLevel: 'low',
      },
    };

    // Find best quotation (lowest price with good performance)
    const sortedQuotations = [...comparison.quotations].sort((a, b) => {
      const scoreA = (100 - (a.totalAmount / 1000)) * 0.6 + a.evaluationScore * 0.4;
      const scoreB = (100 - (b.totalAmount / 1000)) * 0.6 + b.evaluationScore * 0.4;
      return scoreB - scoreA;
    });

    if (sortedQuotations.length > 0) {
      const recommended = sortedQuotations[0];
      const avgPrice = comparison.quotations.reduce((sum, q) => sum + q.totalAmount, 0) / comparison.quotations.length;

      comparison.recommendation = {
        recommendedSupplierId: recommended.supplierId,
        reason: `Best value for money with competitive pricing and good supplier performance`,
        estimatedSavings: Math.max(0, avgPrice - recommended.totalAmount),
        riskLevel: recommended.evaluationScore > 80 ? 'low' : recommended.evaluationScore > 60 ? 'medium' : 'high',
      };
    }

    return comparison;
  }

  // =====================================================================================
  // RISK MANAGEMENT
  // =====================================================================================

  async identifySupplierRisk(risk: SupplierRisk): Promise<any> {
    const [riskRecord] = await this.db.insert(supplierRisks).values({
      supplierId: risk.supplierId,
      riskType: risk.riskType,
      riskLevel: risk.riskLevel,
      description: risk.description,
      impact: risk.impact,
      likelihood: risk.likelihood,
      detectedDate: new Date(),
      mitigationPlan: risk.mitigationPlan,
      status: 'open',
      owner: risk.owner,
    }).returning();

    await this.eventBus.emit('supplier.risk.identified', {
      supplierId: risk.supplierId,
      riskType: risk.riskType,
      riskLevel: risk.riskLevel,
    });

    if (risk.riskLevel === 'critical') {
      await this.eventBus.emit('supplier.risk.critical', {
        supplierId: risk.supplierId,
        description: risk.description,
      });
    }

    return riskRecord;
  }

  // =====================================================================================
  // ANALYTICS & REPORTING
  // =====================================================================================

  async getSupplierDiversityMetrics(tenantId: string): Promise<SupplierDiversityMetrics> {
    const allSuppliers = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId));

    const totalSuppliers = allSuppliers.length;

    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byCountry: Record<string, number> = {};
    const byTier: Record<string, number> = {};

    allSuppliers.forEach(s => {
      byType[s.supplierType] = (byType[s.supplierType] || 0) + 1;
      byCategory[s.category || 'Uncategorized'] = (byCategory[s.category || 'Uncategorized'] || 0) + 1;
      const address = s.address as any;
      byCountry[address?.country || 'Unknown'] = (byCountry[address?.country || 'Unknown'] || 0) + 1;
      byTier[s.tier || 'unrated'] = (byTier[s.tier || 'unrated'] || 0) + 1;
    });

    // Mock spend data - would calculate from actual purchase orders
    const totalSpend = 10000000;
    const supplierSpends = allSuppliers.map(s => ({
      supplierId: s.id,
      supplierName: s.supplierName,
      spend: Math.random() * 500000,
      percentage: 0,
    })).sort((a, b) => b.spend - a.spend);

    supplierSpends.forEach(s => {
      s.percentage = (s.spend / totalSpend) * 100;
    });

    const top1Percentage = supplierSpends[0]?.percentage || 0;
    const top3Percentage = supplierSpends.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0);
    const top10Percentage = supplierSpends.slice(0, 10).reduce((sum, s) => sum + s.percentage, 0);

    const diversificationScore = Math.max(0, 100 - top10Percentage);

    const certifiedSuppliers = allSuppliers.filter(s => {
      const certs = s.certifications as any[];
      return certs && certs.length > 0;
    }).length;

    return {
      totalSuppliers,
      byType,
      byCategory,
      byCountry,
      byTier,
      spend: {
        totalSpend,
        bySupplier: supplierSpends.slice(0, 20),
        concentrationRisk: {
          top1Percentage: parseFloat(top1Percentage.toFixed(2)),
          top3Percentage: parseFloat(top3Percentage.toFixed(2)),
          top10Percentage: parseFloat(top10Percentage.toFixed(2)),
          diversificationScore: parseFloat(diversificationScore.toFixed(2)),
        },
      },
      compliance: {
        certifiedSuppliers,
        certificationRate: totalSuppliers > 0 ? (certifiedSuppliers / totalSuppliers) * 100 : 0,
        diversitySuppliers: 0,
        diversitySpendPercentage: 0,
      },
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private calculateSupplierTier(score: number): string {
    if (score >= 90) return 'platinum';
    if (score >= 80) return 'gold';
    if (score >= 70) return 'silver';
    if (score >= 60) return 'bronze';
    return 'unrated';
  }

  private analyzeTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
    if (scores.length < 3) return 'stable';

    const recent = scores.slice(-3);
    const previous = scores.slice(-6, -3);

    if (previous.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, s) => sum + s, 0) / recent.length;
    const previousAvg = previous.reduce((sum, s) => sum + s, 0) / previous.length;

    const change = ((recentAvg - previousAvg) / previousAvg) * 100;

    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  private generateRecommendations(score: number, riskCount: number): string[] {
    const recommendations: string[] = [];

    if (score < 70) {
      recommendations.push('Schedule performance improvement meeting');
      recommendations.push('Develop corrective action plan');
    }

    if (score < 60) {
      recommendations.push('Consider alternative suppliers');
      recommendations.push('Implement enhanced monitoring');
    }

    if (riskCount > 0) {
      recommendations.push(`Address ${riskCount} identified risk(s)`);
    }

    if (score >= 90) {
      recommendations.push('Consider for preferred supplier status');
      recommendations.push('Explore strategic partnership opportunities');
    }

    return recommendations;
  }

  private async generateSupplierNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(suppliers)
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${suppliers.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `SUP-${year}-${String(sequence).padStart(5, '0')}`;
  }

  private async generateEvaluationNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(supplierEvaluations)
      .where(
        and(
          eq(supplierEvaluations.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${supplierEvaluations.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `EVAL-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateQuotationNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(supplierQuotations)
      .where(
        and(
          eq(supplierQuotations.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${supplierQuotations.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `QTE-${year}-${String(sequence).padStart(5, '0')}`;
  }
}

