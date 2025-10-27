// =====================================================================================
// AYAZLOGISTICS - REVERSE LOGISTICS & RETURNS MANAGEMENT SERVICE
// =====================================================================================
// Description: Complete returns management with disposition and refurbishment tracking
// Features: Return authorization, disposition decision, refurbishment, resale management
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { EventBusService } from '../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer, boolean, text, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../database/schema/core/tenants.schema';
import { users } from '../../../database/schema/core/users.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const returnAuthorizations = pgTable('return_authorizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  rmaNumber: varchar('rma_number', { length: 50 }).notNull().unique(),
  customerId: uuid('customer_id').notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  originalOrderId: uuid('original_order_id'),
  originalOrderNumber: varchar('original_order_number', { length: 50 }),
  returnReason: varchar('return_reason', { length: 100 }).notNull(),
  returnReasonDetails: text('return_reason_details'),
  requestDate: date('request_date').notNull(),
  approvalDate: date('approval_date'),
  expiryDate: date('expiry_date'),
  status: varchar('status', { length: 20 }).default('pending'),
  returnType: varchar('return_type', { length: 50 }),
  items: jsonb('items').notNull(),
  estimatedValue: decimal('estimated_value', { precision: 18, scale: 2 }),
  refundAmount: decimal('refund_amount', { precision: 18, scale: 2 }),
  restockingFee: decimal('restocking_fee', { precision: 18, scale: 2 }),
  shippingMethod: varchar('shipping_method', { length: 100 }),
  shippingCost: decimal('shipping_cost', { precision: 18, scale: 2 }),
  shippingPaidBy: varchar('shipping_paid_by', { length: 20 }),
  pickupScheduled: boolean('pickup_scheduled').default(false),
  pickupDate: date('pickup_date'),
  receivedDate: date('received_date'),
  inspectionStatus: varchar('inspection_status', { length: 20 }),
  dispositionStatus: varchar('disposition_status', { length: 20 }),
  approvedBy: uuid('approved_by').references(() => users.id),
  processedBy: uuid('processed_by').references(() => users.id),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const returnInspections = pgTable('return_inspections', {
  id: uuid('id').primaryKey().defaultRandom(),
  rmaId: uuid('rma_id').notNull().references(() => returnAuthorizations.id, { onDelete: 'cascade' }),
  inspectionNumber: varchar('inspection_number', { length: 50 }).notNull().unique(),
  inspectionDate: timestamp('inspection_date').notNull(),
  inspectorId: uuid('inspector_id').references(() => users.id),
  items: jsonb('items'),
  overallCondition: varchar('overall_condition', { length: 20 }),
  findings: jsonb('findings'),
  photos: jsonb('photos'),
  disposition: varchar('disposition', { length: 50 }),
  refurbishmentRequired: boolean('refurbishment_required'),
  refurbishmentCost: decimal('refurbishment_cost', { precision: 18, scale: 2 }),
  resaleValue: decimal('resale_value', { precision: 18, scale: 2 }),
  scrapValue: decimal('scrap_value', { precision: 18, scale: 2 }),
  recommendations: text('recommendations'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const returnDispositions = pgTable('return_dispositions', {
  id: uuid('id').primaryKey().defaultRandom(),
  rmaId: uuid('rma_id').notNull().references(() => returnAuthorizations.id, { onDelete: 'cascade' }),
  dispositionNumber: varchar('disposition_number', { length: 50 }).notNull().unique(),
  dispositionDate: date('disposition_date').notNull(),
  dispositionType: varchar('disposition_type', { length: 50 }).notNull(),
  items: jsonb('items'),
  totalValue: decimal('total_value', { precision: 18, scale: 2 }),
  recoveryValue: decimal('recovery_value', { precision: 18, scale: 2 }),
  recoveryRate: decimal('recovery_rate', { precision: 5, scale: 2 }),
  destination: varchar('destination', { length: 255 }),
  processedBy: uuid('processed_by').references(() => users.id),
  completedDate: date('completed_date'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const refurbishments = pgTable('refurbishments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  refurbishmentNumber: varchar('refurbishment_number', { length: 50 }).notNull().unique(),
  rmaId: uuid('rma_id').references(() => returnAuthorizations.id),
  itemId: uuid('item_id'),
  startDate: date('start_date').notNull(),
  completedDate: date('completed_date'),
  status: varchar('status', { length: 20 }).default('scheduled'),
  workOrders: jsonb('work_orders'),
  partsReplaced: jsonb('parts_replaced'),
  laborHours: decimal('labor_hours', { precision: 8, scale: 2 }),
  partsCost: decimal('parts_cost', { precision: 18, scale: 2 }),
  laborCost: decimal('labor_cost', { precision: 18, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 18, scale: 2 }),
  qualityCheck: jsonb('quality_check'),
  certificationStatus: varchar('certification_status', { length: 20 }),
  resalePrice: decimal('resale_price', { precision: 18, scale: 2 }),
  profit: decimal('profit', { precision: 18, scale: 2 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface ReturnRequest {
  customerId: string;
  originalOrderId?: string;
  returnReason: 'defective' | 'damaged_in_transit' | 'wrong_item' | 'not_as_described' | 'customer_remorse' | 'other';
  returnReasonDetails: string;
  items: Array<{
    itemId: string;
    productId: string;
    productName: string;
    quantity: number;
    originalPrice: number;
    returnReason?: string;
    condition?: string;
  }>;
  requestedBy: string;
}

interface ReturnInspection {
  rmaId: string;
  inspectionDate: Date;
  inspectorId: string;
  itemInspections: Array<{
    itemId: string;
    condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor' | 'defective' | 'damaged';
    functionalStatus: 'fully_functional' | 'partially_functional' | 'non_functional';
    cosmeticCondition: 'excellent' | 'good' | 'fair' | 'poor';
    missingComponents: boolean;
    componentsList?: string[];
    photos?: string[];
    notes?: string;
  }>;
}

interface DispositionDecision {
  rmaId: string;
  dispositionDate: Date;
  decisions: Array<{
    itemId: string;
    dispositionType: 'restock' | 'refurbish' | 'liquidate' | 'scrap' | 'donate' | 'return_to_supplier';
    reason: string;
    estimatedRecovery: number;
    destination?: string;
  }>;
}

interface RefurbishmentPlan {
  itemId: string;
  itemDescription: string;
  currentCondition: string;
  targetCondition: string;
  workRequired: Array<{
    workType: 'repair' | 'cleaning' | 'testing' | 'packaging' | 'certification';
    description: string;
    estimatedTime: number;
    estimatedCost: number;
    partsRequired?: Array<{
      partId: string;
      description: string;
      quantity: number;
      cost: number;
    }>;
  }>;
  totalCost: number;
  estimatedResaleValue: number;
  profitMargin: number;
  roi: number;
}

interface ReturnsAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalReturns: number;
    returnRate: number;
    totalValue: number;
    totalRecovered: number;
    recoveryRate: number;
  };
  byReason: Array<{
    reason: string;
    count: number;
    percentage: number;
    avgValue: number;
  }>;
  byDisposition: Record<string, {
    count: number;
    totalValue: number;
    recoveryValue: number;
    recoveryRate: number;
  }>;
  costAnalysis: {
    processingCost: number;
    shippingCost: number;
    refurbishmentCost: number;
    disposalCost: number;
    totalCost: number;
    costPerReturn: number;
  };
  qualityIssues: Array<{
    productId: string;
    productName: string;
    returnCount: number;
    defectRate: number;
    topIssues: string[];
  }>;
  recommendations: string[];
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class ReverseLogisticsService {
  private readonly logger = new Logger(ReverseLogisticsService.name);

  // Restocking fee rates
  private readonly RESTOCKING_FEES = {
    customer_remorse: 0.20,
    wrong_item: 0.00,
    defective: 0.00,
    damaged_in_transit: 0.00,
    not_as_described: 0.00,
    other: 0.15,
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // RETURN AUTHORIZATION
  // =====================================================================================

  async createReturnAuthorization(tenantId: string, request: ReturnRequest): Promise<any> {
    this.logger.log(`Creating return authorization for customer ${request.customerId}`);

    const rmaNumber = await this.generateRMANumber(tenantId);

    const estimatedValue = request.items.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);

    const restockingFeeRate = this.RESTOCKING_FEES[request.returnReason as keyof typeof this.RESTOCKING_FEES] || 0;
    const restockingFee = estimatedValue * restockingFeeRate;
    const refundAmount = estimatedValue - restockingFee;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const [rma] = await this.db.insert(returnAuthorizations).values({
      tenantId,
      rmaNumber,
      customerId: request.customerId,
      originalOrderId: request.originalOrderId,
      returnReason: request.returnReason,
      returnReasonDetails: request.returnReasonDetails,
      requestDate: new Date(),
      expiryDate,
      status: 'approved',
      returnType: 'customer_return',
      items: request.items as any,
      estimatedValue: estimatedValue.toString(),
      refundAmount: refundAmount.toString(),
      restockingFee: restockingFee.toString(),
      shippingPaidBy: request.returnReason === 'defective' || request.returnReason === 'wrong_item' ? 'seller' : 'customer',
      approvalDate: new Date(),
      createdBy: request.requestedBy,
    }).returning();

    await this.eventBus.emit('return.authorization.created', {
      rmaId: rma.id,
      rmaNumber,
      customerId: request.customerId,
      estimatedValue,
    });

    return rma;
  }

  async recordReturnReceipt(
    rmaId: string,
    receivedDate: Date,
    receivedBy: string,
  ): Promise<any> {
    const [updated] = await this.db
      .update(returnAuthorizations)
      .set({
        receivedDate,
        status: 'received',
        inspectionStatus: 'pending',
        metadata: sql`COALESCE(${returnAuthorizations.metadata}, '{}'::jsonb) || ${JSON.stringify({
          receivedBy,
        })}::jsonb`,
      })
      .where(eq(returnAuthorizations.id, rmaId))
      .returning();

    await this.eventBus.emit('return.received', {
      rmaId,
      rmaNumber: updated.rmaNumber,
      receivedDate,
    });

    return updated;
  }

  // =====================================================================================
  // INSPECTION & DISPOSITION
  // =====================================================================================

  async inspectReturn(tenantId: string, inspection: ReturnInspection): Promise<any> {
    const inspectionNumber = await this.generateInspectionNumber(tenantId);

    // Determine overall condition
    const conditions = inspection.itemInspections.map(i => i.condition);
    const avgConditionScore = conditions.reduce((sum, c) => {
      const scores: Record<string, number> = {
        new: 5,
        like_new: 4,
        good: 3,
        fair: 2,
        poor: 1,
        defective: 0,
        damaged: 0,
      };
      return sum + scores[c];
    }, 0) / conditions.length;

    let overallCondition: string;
    if (avgConditionScore >= 4.5) overallCondition = 'excellent';
    else if (avgConditionScore >= 3.5) overallCondition = 'good';
    else if (avgConditionScore >= 2.5) overallCondition = 'fair';
    else if (avgConditionScore >= 1.5) overallCondition = 'poor';
    else overallCondition = 'unacceptable';

    // Auto-determine disposition
    const dispositions = inspection.itemInspections.map(item => {
      if (item.condition === 'new' || item.condition === 'like_new') {
        return 'restock';
      } else if (item.condition === 'good' || item.condition === 'fair') {
        return 'refurbish';
      } else if (item.functionalStatus === 'non_functional') {
        return 'scrap';
      } else {
        return 'liquidate';
      }
    });

    const needsRefurbishment = dispositions.includes('refurbish');

    const [inspectionRecord] = await this.db.insert(returnInspections).values({
      rmaId: inspection.rmaId,
      inspectionNumber,
      inspectionDate: inspection.inspectionDate,
      inspectorId: inspection.inspectorId,
      items: inspection.itemInspections as any,
      overallCondition,
      findings: inspection.itemInspections.map(i => ({
        itemId: i.itemId,
        condition: i.condition,
        notes: i.notes,
      })) as any,
      disposition: dispositions[0],
      refurbishmentRequired: needsRefurbishment,
    }).returning();

    await this.db
      .update(returnAuthorizations)
      .set({
        inspectionStatus: 'completed',
        dispositionStatus: 'pending',
      })
      .where(eq(returnAuthorizations.id, inspection.rmaId));

    await this.eventBus.emit('return.inspected', {
      rmaId: inspection.rmaId,
      inspectionNumber,
      overallCondition,
      disposition: dispositions[0],
    });

    return inspectionRecord;
  }

  async executeDisposition(tenantId: string, disposition: DispositionDecision): Promise<any> {
    const dispositionNumber = await this.generateDispositionNumber(tenantId);

    const totalValue = 0;
    const recoveryValue = disposition.decisions.reduce((sum, d) => sum + d.estimatedRecovery, 0);
    const recoveryRate = totalValue > 0 ? (recoveryValue / totalValue) * 100 : 0;

    const [dispositionRecord] = await this.db.insert(returnDispositions).values({
      rmaId: disposition.rmaId,
      dispositionNumber,
      dispositionDate: disposition.dispositionDate,
      dispositionType: disposition.decisions[0].dispositionType,
      items: disposition.decisions as any,
      totalValue: totalValue.toString(),
      recoveryValue: recoveryValue.toString(),
      recoveryRate: recoveryRate.toFixed(2),
    }).returning();

    await this.db
      .update(returnAuthorizations)
      .set({
        dispositionStatus: 'completed',
        status: 'closed',
      })
      .where(eq(returnAuthorizations.id, disposition.rmaId));

    // Process individual dispositions
    for (const decision of disposition.decisions) {
      switch (decision.dispositionType) {
        case 'restock':
          await this.eventBus.emit('return.restock', {
            rmaId: disposition.rmaId,
            itemId: decision.itemId,
          });
          break;
        case 'refurbish':
          await this.createRefurbishmentOrder(tenantId, disposition.rmaId, decision.itemId);
          break;
        case 'scrap':
          await this.eventBus.emit('return.scrap', {
            rmaId: disposition.rmaId,
            itemId: decision.itemId,
          });
          break;
      }
    }

    await this.eventBus.emit('return.disposition.completed', {
      rmaId: disposition.rmaId,
      dispositionNumber,
      recoveryRate,
    });

    return dispositionRecord;
  }

  // =====================================================================================
  // REFURBISHMENT
  // =====================================================================================

  private async createRefurbishmentOrder(
    tenantId: string,
    rmaId: string,
    itemId: string,
  ): Promise<any> {
    const refurbishmentNumber = await this.generateRefurbishmentNumber(tenantId);

    const [refurb] = await this.db.insert(refurbishments).values({
      tenantId,
      refurbishmentNumber,
      rmaId,
      itemId,
      startDate: new Date(),
      status: 'scheduled',
    }).returning();

    await this.eventBus.emit('refurbishment.created', {
      refurbishmentId: refurb.id,
      refurbishmentNumber,
      itemId,
    });

    return refurb;
  }

  // =====================================================================================
  // ANALYTICS
  // =====================================================================================

  async getReturnsAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ReturnsAnalytics> {
    const returns = await this.db
      .select()
      .from(returnAuthorizations)
      .where(
        and(
          eq(returnAuthorizations.tenantId, tenantId),
          gte(returnAuthorizations.requestDate, startDate),
          lte(returnAuthorizations.requestDate, endDate),
        ),
      );

    const totalValue = returns.reduce((sum, r) => sum + parseFloat(r.estimatedValue || '0'), 0);

    const dispositions = await this.db
      .select()
      .from(returnDispositions)
      .where(inArray(returnDispositions.rmaId, returns.map(r => r.id)));

    const totalRecovered = dispositions.reduce((sum, d) => sum + parseFloat(d.recoveryValue || '0'), 0);
    const recoveryRate = totalValue > 0 ? (totalRecovered / totalValue) * 100 : 0;

    const byReason = new Map<string, { count: number; totalValue: number }>();

    returns.forEach(r => {
      const existing = byReason.get(r.returnReason) || { count: 0, totalValue: 0 };
      existing.count++;
      existing.totalValue += parseFloat(r.estimatedValue || '0');
      byReason.set(r.returnReason, existing);
    });

    const byReasonArray = Array.from(byReason.entries()).map(([reason, data]) => ({
      reason,
      count: data.count,
      percentage: parseFloat(((data.count / returns.length) * 100).toFixed(2)),
      avgValue: parseFloat((data.totalValue / data.count).toFixed(2)),
    }));

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalReturns: returns.length,
        returnRate: 5.2,
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalRecovered: parseFloat(totalRecovered.toFixed(2)),
        recoveryRate: parseFloat(recoveryRate.toFixed(2)),
      },
      byReason: byReasonArray,
      byDisposition: {},
      costAnalysis: {
        processingCost: returns.length * 25,
        shippingCost: returns.length * 50,
        refurbishmentCost: dispositions.length * 100,
        disposalCost: returns.length * 10,
        totalCost: returns.length * 185,
        costPerReturn: 185,
      },
      qualityIssues: [],
      recommendations: [
        'Improve packaging to reduce transit damage',
        'Enhance product descriptions to reduce wrong expectations',
        'Implement pre-shipment quality checks',
      ],
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async generateRMANumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(returnAuthorizations)
      .where(
        and(
          eq(returnAuthorizations.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${returnAuthorizations.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `RMA-${year}-${String(sequence).padStart(5, '0')}`;
  }

  private async generateInspectionNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(returnInspections)
      .where(
        sql`EXTRACT(YEAR FROM ${returnInspections.createdAt}) = ${year}`,
      );

    const sequence = (result?.count || 0) + 1;
    return `RINSP-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateDispositionNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(returnDispositions)
      .where(
        sql`EXTRACT(YEAR FROM ${returnDispositions.createdAt}) = ${year}`,
      );

    const sequence = (result?.count || 0) + 1;
    return `DISP-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateRefurbishmentNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(refurbishments)
      .where(
        and(
          eq(refurbishments.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${refurbishments.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `REF-${year}-${String(sequence).padStart(4, '0')}`;
  }
}

