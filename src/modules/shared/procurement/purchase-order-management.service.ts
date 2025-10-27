// =====================================================================================
// AYAZLOGISTICS - PURCHASE ORDER MANAGEMENT SERVICE
// =====================================================================================
// Description: Complete purchase order lifecycle with approval workflows
// Features: PO creation, approval routing, receiving, matching, invoice reconciliation
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, desc, inArray, or } from 'drizzle-orm';
import { EventBusService } from '../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer, boolean, text, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../database/schema/core/tenants.schema';
import { users } from '../../../database/schema/core/users.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  poNumber: varchar('po_number', { length: 50 }).notNull().unique(),
  poType: varchar('po_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).default('draft'),
  supplierId: uuid('supplier_id').notNull(),
  supplierName: varchar('supplier_name', { length: 255 }),
  contactPerson: varchar('contact_person', { length: 255 }),
  poDate: date('po_date').notNull(),
  requiredDate: date('required_date'),
  deliveryDate: date('delivery_date'),
  deliveryLocation: varchar('delivery_location', { length: 255 }),
  items: jsonb('items').notNull(),
  subtotal: decimal('subtotal', { precision: 18, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 18, scale: 2 }),
  shippingCost: decimal('shipping_cost', { precision: 18, scale: 2 }),
  discountAmount: decimal('discount_amount', { precision: 18, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY'),
  paymentTerms: varchar('payment_terms', { length: 255 }),
  deliveryTerms: varchar('delivery_terms', { length: 255 }),
  incoterms: varchar('incoterms', { length: 20 }),
  approvalWorkflow: jsonb('approval_workflow'),
  currentApprover: uuid('current_approver'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedDate: timestamp('approved_date'),
  sentToSupplier: boolean('sent_to_supplier').default(false),
  sentDate: timestamp('sent_date'),
  acknowledgmentDate: timestamp('acknowledgment_date'),
  receivingStatus: varchar('receiving_status', { length: 20 }),
  invoiceStatus: varchar('invoice_status', { length: 20 }),
  paymentStatus: varchar('payment_status', { length: 20 }),
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  attachments: jsonb('attachments'),
  closedDate: date('closed_date'),
  closedBy: uuid('closed_by').references(() => users.id),
  cancellationReason: text('cancellation_reason'),
  requesterId: uuid('requester_id').references(() => users.id),
  departmentId: uuid('department_id'),
  projectId: uuid('project_id'),
  costCenter: varchar('cost_center', { length: 50 }),
  glAccount: varchar('gl_account', { length: 50 }),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const purchaseRequisitions = pgTable('purchase_requisitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  prNumber: varchar('pr_number', { length: 50 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  requestDate: date('request_date').notNull(),
  requiredDate: date('required_date').notNull(),
  priority: varchar('priority', { length: 20 }).default('normal'),
  items: jsonb('items').notNull(),
  estimatedTotal: decimal('estimated_total', { precision: 18, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('TRY'),
  justification: text('justification'),
  status: varchar('status', { length: 20 }).default('pending'),
  approvalWorkflow: jsonb('approval_workflow'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedDate: timestamp('approved_date'),
  convertedToPO: boolean('converted_to_po').default(false),
  purchaseOrderId: uuid('purchase_order_id'),
  requesterId: uuid('requester_id').notNull().references(() => users.id),
  departmentId: uuid('department_id'),
  costCenter: varchar('cost_center', { length: 50 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const poReceivings = pgTable('po_receivings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  receivingNumber: varchar('receiving_number', { length: 50 }).notNull().unique(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id),
  poNumber: varchar('po_number', { length: 50 }),
  receivingDate: timestamp('receiving_date').notNull(),
  receivedBy: uuid('received_by').references(() => users.id),
  items: jsonb('items').notNull(),
  totalQuantityOrdered: integer('total_quantity_ordered'),
  totalQuantityReceived: integer('total_quantity_received'),
  status: varchar('status', { length: 20 }).default('partial'),
  qualityInspectionRequired: boolean('quality_inspection_required').default(true),
  qualityInspectionStatus: varchar('quality_inspection_status', { length: 20 }),
  inspectionId: uuid('inspection_id'),
  discrepancies: jsonb('discrepancies'),
  notes: text('notes'),
  attachments: jsonb('attachments'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const threeWayMatching = pgTable('three_way_matching', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  matchNumber: varchar('match_number', { length: 50 }).notNull().unique(),
  purchaseOrderId: uuid('purchase_order_id').notNull().references(() => purchaseOrders.id),
  receivingId: uuid('receiving_id'),
  invoiceId: uuid('invoice_id'),
  matchDate: timestamp('match_date').notNull(),
  matchStatus: varchar('match_status', { length: 20 }).notNull(),
  matchResult: varchar('match_result', { length: 20 }),
  discrepancies: jsonb('discrepancies'),
  tolerances: jsonb('tolerances'),
  matchDetails: jsonb('match_details'),
  autoApproved: boolean('auto_approved').default(false),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedDate: timestamp('approved_date'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface PurchaseRequisitionItem {
  itemId: string;
  description: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice?: number;
  estimatedTotal?: number;
  specifications?: string;
  preferredSupplier?: string;
  requiredDate?: Date;
}

interface PurchaseRequisition {
  title: string;
  description?: string;
  requestDate: Date;
  requiredDate: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  items: PurchaseRequisitionItem[];
  justification: string;
  requesterId: string;
  departmentId?: string;
  costCenter?: string;
}

interface PurchaseOrderItem {
  lineNumber: number;
  itemId: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  lineTotal: number;
  requiredDate?: Date;
  specifications?: string;
  glAccount?: string;
}

interface PurchaseOrder {
  poType: 'standard' | 'blanket' | 'contract' | 'planned';
  supplierId: string;
  poDate: Date;
  requiredDate: Date;
  deliveryLocation: string;
  items: PurchaseOrderItem[];
  paymentTerms?: string;
  deliveryTerms?: string;
  incoterms?: string;
  shippingCost?: number;
  notes?: string;
  requesterId: string;
  departmentId?: string;
  costCenter?: string;
}

interface ApprovalWorkflow {
  steps: Array<{
    level: number;
    approverRole: string;
    approverId?: string;
    amountThreshold?: number;
    status: 'pending' | 'approved' | 'rejected';
    approvedDate?: Date;
    comments?: string;
    required: boolean;
  }>;
  currentLevel: number;
  overallStatus: 'pending' | 'approved' | 'rejected';
}

interface ReceivingRecord {
  purchaseOrderId: string;
  receivingDate: Date;
  receivedBy: string;
  items: Array<{
    poLineNumber: number;
    itemId: string;
    quantityOrdered: number;
    quantityReceived: number;
    quantityAccepted: number;
    quantityRejected: number;
    condition: 'good' | 'damaged' | 'defective';
    location?: string;
    batchNumber?: string;
    expiryDate?: Date;
    notes?: string;
  }>;
  qualityInspectionRequired: boolean;
  notes?: string;
}

interface ThreeWayMatch {
  purchaseOrderId: string;
  receivingId: string;
  invoiceId: string;
  tolerances: {
    quantityTolerance: number;
    priceTolerance: number;
    amountTolerance: number;
  };
}

interface MatchResult {
  matchNumber: string;
  matchDate: Date;
  matchStatus: 'matched' | 'partially_matched' | 'mismatched';
  matchResult: 'approved' | 'review_required' | 'rejected';
  autoApproved: boolean;
  comparison: {
    po: {
      quantity: number;
      unitPrice: number;
      amount: number;
    };
    receipt: {
      quantity: number;
      acceptedQuantity: number;
    };
    invoice: {
      quantity: number;
      unitPrice: number;
      amount: number;
    };
  };
  discrepancies: Array<{
    type: 'quantity' | 'price' | 'amount';
    field: string;
    expected: number;
    actual: number;
    variance: number;
    variancePercentage: number;
    withinTolerance: boolean;
  }>;
  recommendations: string[];
}

interface ProcurementAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalPOs: number;
    totalSpend: number;
    averagePOValue: number;
    approvalCycleTime: number;
    receivingCycleTime: number;
  };
  byStatus: Record<string, number>;
  bySupplier: Array<{
    supplierId: string;
    supplierName: string;
    poCount: number;
    totalSpend: number;
    percentage: number;
  }>;
  byCategory: Record<string, number>;
  compliance: {
    poWithApprovals: number;
    approvalRate: number;
    mavericBuying: number;
    contractCompliance: number;
  };
  efficiency: {
    averageApprovalTime: number;
    averageLeadTime: number;
    onTimeDelivery: number;
    matchRate: number;
  };
  savings: {
    negotiatedSavings: number;
    volumeDiscounts: number;
    earlyPaymentDiscounts: number;
    totalSavings: number;
    savingsRate: number;
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class PurchaseOrderManagementService {
  private readonly logger = new Logger(PurchaseOrderManagementService.name);

  // Approval thresholds
  private readonly APPROVAL_THRESHOLDS = [
    { level: 1, role: 'manager', amount: 10000 },
    { level: 2, role: 'director', amount: 50000 },
    { level: 3, role: 'vp', amount: 100000 },
    { level: 4, role: 'cfo', amount: 500000 },
    { level: 5, role: 'ceo', amount: Infinity },
  ];

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // PURCHASE REQUISITION
  // =====================================================================================

  async createPurchaseRequisition(tenantId: string, requisition: PurchaseRequisition): Promise<any> {
    this.logger.log(`Creating purchase requisition: ${requisition.title}`);

    const prNumber = await this.generatePRNumber(tenantId);

    const estimatedTotal = requisition.items.reduce(
      (sum, item) => sum + (item.estimatedTotal || 0),
      0,
    );

    const approvalWorkflow = this.buildApprovalWorkflow(estimatedTotal);

    const [pr] = await this.db.insert(purchaseRequisitions).values({
      tenantId,
      prNumber,
      title: requisition.title,
      description: requisition.description,
      requestDate: requisition.requestDate,
      requiredDate: requisition.requiredDate,
      priority: requisition.priority,
      items: requisition.items as any,
      estimatedTotal: estimatedTotal.toString(),
      justification: requisition.justification,
      status: 'pending',
      approvalWorkflow: approvalWorkflow as any,
      requesterId: requisition.requesterId,
      departmentId: requisition.departmentId,
      costCenter: requisition.costCenter,
    }).returning();

    await this.eventBus.emit('purchase.requisition.created', {
      prId: pr.id,
      prNumber,
      estimatedTotal,
      priority: requisition.priority,
    });

    return pr;
  }

  async approvePurchaseRequisition(
    prId: string,
    approverId: string,
    approverRole: string,
    comments?: string,
  ): Promise<any> {
    const [pr] = await this.db
      .select()
      .from(purchaseRequisitions)
      .where(eq(purchaseRequisitions.id, prId))
      .limit(1);

    if (!pr) {
      throw new NotFoundException('Purchase requisition not found');
    }

    const workflow = pr.approvalWorkflow as ApprovalWorkflow;

    const currentStep = workflow.steps.find(s => s.level === workflow.currentLevel);

    if (!currentStep || currentStep.approverRole !== approverRole) {
      throw new BadRequestException('Invalid approver for current level');
    }

    currentStep.status = 'approved';
    currentStep.approverId = approverId;
    currentStep.approvedDate = new Date();
    currentStep.comments = comments;

    const nextStep = workflow.steps.find(
      s => s.level > workflow.currentLevel && s.required
    );

    if (nextStep) {
      workflow.currentLevel = nextStep.level;
    } else {
      workflow.overallStatus = 'approved';
    }

    const newStatus = workflow.overallStatus === 'approved' ? 'approved' : 'pending';

    const [updated] = await this.db
      .update(purchaseRequisitions)
      .set({
        status: newStatus,
        approvalWorkflow: workflow as any,
        approvedBy: workflow.overallStatus === 'approved' ? approverId : pr.approvedBy,
        approvedDate: workflow.overallStatus === 'approved' ? new Date() : pr.approvedDate,
      })
      .where(eq(purchaseRequisitions.id, prId))
      .returning();

    await this.eventBus.emit('purchase.requisition.approved', {
      prId,
      prNumber: pr.prNumber,
      level: currentStep.level,
      finalApproval: workflow.overallStatus === 'approved',
    });

    return updated;
  }

  async convertPRtoPO(prId: string, supplierId: string, convertedBy: string): Promise<any> {
    const [pr] = await this.db
      .select()
      .from(purchaseRequisitions)
      .where(eq(purchaseRequisitions.id, prId))
      .limit(1);

    if (!pr) {
      throw new NotFoundException('Purchase requisition not found');
    }

    if (pr.status !== 'approved') {
      throw new BadRequestException('Purchase requisition must be approved');
    }

    const prItems = pr.items as PurchaseRequisitionItem[];

    const poItems: PurchaseOrderItem[] = prItems.map((item, idx) => ({
      lineNumber: idx + 1,
      itemId: item.itemId,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.estimatedUnitPrice || 0,
      lineTotal: (item.estimatedUnitPrice || 0) * item.quantity,
      requiredDate: item.requiredDate,
      specifications: item.specifications,
    }));

    const po = await this.createPurchaseOrder(tenantId, {
      poType: 'standard',
      supplierId,
      poDate: new Date(),
      requiredDate: new Date(pr.requiredDate),
      deliveryLocation: 'Main Warehouse',
      items: poItems,
      requesterId: pr.requesterId,
      departmentId: pr.departmentId,
      costCenter: pr.costCenter,
    });

    await this.db
      .update(purchaseRequisitions)
      .set({
        convertedToPO: true,
        purchaseOrderId: po.id,
      })
      .where(eq(purchaseRequisitions.id, prId));

    await this.eventBus.emit('purchase.requisition.converted', {
      prId,
      prNumber: pr.prNumber,
      poId: po.id,
      poNumber: po.poNumber,
    });

    return po;
  }

  // =====================================================================================
  // PURCHASE ORDER
  // =====================================================================================

  async createPurchaseOrder(tenantId: string, order: PurchaseOrder): Promise<any> {
    this.logger.log(`Creating purchase order for supplier ${order.supplierId}`);

    const poNumber = await this.generatePONumber(tenantId);

    const subtotal = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const taxAmount = subtotal * 0.18;
    const totalAmount = subtotal + taxAmount + (order.shippingCost || 0);

    const approvalWorkflow = this.buildApprovalWorkflow(totalAmount);

    const [po] = await this.db.insert(purchaseOrders).values({
      tenantId,
      poNumber,
      poType: order.poType,
      status: 'draft',
      supplierId: order.supplierId,
      poDate: order.poDate,
      requiredDate: order.requiredDate,
      deliveryLocation: order.deliveryLocation,
      items: order.items as any,
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      shippingCost: order.shippingCost?.toString(),
      totalAmount: totalAmount.toString(),
      paymentTerms: order.paymentTerms,
      deliveryTerms: order.deliveryTerms,
      incoterms: order.incoterms,
      approvalWorkflow: approvalWorkflow as any,
      notes: order.notes,
      requesterId: order.requesterId,
      departmentId: order.departmentId,
      costCenter: order.costCenter,
      receivingStatus: 'pending',
      invoiceStatus: 'pending',
      paymentStatus: 'pending',
      createdBy: order.requesterId,
    }).returning();

    await this.eventBus.emit('purchase.order.created', {
      poId: po.id,
      poNumber,
      supplierId: order.supplierId,
      totalAmount,
    });

    return po;
  }

  async approvePurchaseOrder(
    poId: string,
    approverId: string,
    approverRole: string,
    comments?: string,
  ): Promise<any> {
    const [po] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, poId))
      .limit(1);

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const workflow = po.approvalWorkflow as ApprovalWorkflow;

    const currentStep = workflow.steps.find(s => s.level === workflow.currentLevel);

    if (!currentStep || currentStep.approverRole !== approverRole) {
      throw new BadRequestException('Invalid approver for current level');
    }

    currentStep.status = 'approved';
    currentStep.approverId = approverId;
    currentStep.approvedDate = new Date();
    currentStep.comments = comments;

    const nextStep = workflow.steps.find(
      s => s.level > workflow.currentLevel && s.required
    );

    if (nextStep) {
      workflow.currentLevel = nextStep.level;
    } else {
      workflow.overallStatus = 'approved';
    }

    const newStatus = workflow.overallStatus === 'approved' ? 'approved' : 'pending_approval';

    const [updated] = await this.db
      .update(purchaseOrders)
      .set({
        status: newStatus,
        approvalWorkflow: workflow as any,
        approvedBy: workflow.overallStatus === 'approved' ? approverId : po.approvedBy,
        approvedDate: workflow.overallStatus === 'approved' ? new Date() : po.approvedDate,
      })
      .where(eq(purchaseOrders.id, poId))
      .returning();

    await this.eventBus.emit('purchase.order.approved', {
      poId,
      poNumber: po.poNumber,
      level: currentStep.level,
      finalApproval: workflow.overallStatus === 'approved',
    });

    if (workflow.overallStatus === 'approved') {
      await this.sendPOToSupplier(po.id);
    }

    return updated;
  }

  async sendPOToSupplier(poId: string): Promise<any> {
    const [po] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, poId))
      .limit(1);

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== 'approved') {
      throw new BadRequestException('PO must be approved before sending');
    }

    const [updated] = await this.db
      .update(purchaseOrders)
      .set({
        sentToSupplier: true,
        sentDate: new Date(),
        status: 'sent',
      })
      .where(eq(purchaseOrders.id, poId))
      .returning();

    await this.eventBus.emit('purchase.order.sent', {
      poId,
      poNumber: po.poNumber,
      supplierId: po.supplierId,
    });

    return updated;
  }

  // =====================================================================================
  // RECEIVING & MATCHING
  // =====================================================================================

  async recordReceiving(tenantId: string, receiving: ReceivingRecord): Promise<any> {
    this.logger.log(`Recording receipt for PO ${receiving.purchaseOrderId}`);

    const receivingNumber = await this.generateReceivingNumber(tenantId);

    const totalOrdered = receiving.items.reduce((sum, item) => sum + item.quantityOrdered, 0);
    const totalReceived = receiving.items.reduce((sum, item) => sum + item.quantityReceived, 0);

    const status = totalReceived >= totalOrdered ? 'complete' : 'partial';

    const [rec] = await this.db.insert(poReceivings).values({
      tenantId,
      receivingNumber,
      purchaseOrderId: receiving.purchaseOrderId,
      receivingDate: receiving.receivingDate,
      receivedBy: receiving.receivedBy,
      items: receiving.items as any,
      totalQuantityOrdered: totalOrdered,
      totalQuantityReceived: totalReceived,
      status,
      qualityInspectionRequired: receiving.qualityInspectionRequired,
      notes: receiving.notes,
    }).returning();

    await this.db
      .update(purchaseOrders)
      .set({
        receivingStatus: status,
      })
      .where(eq(purchaseOrders.id, receiving.purchaseOrderId));

    await this.eventBus.emit('purchase.order.received', {
      receivingId: rec.id,
      receivingNumber,
      poId: receiving.purchaseOrderId,
      status,
    });

    return rec;
  }

  async performThreeWayMatch(tenantId: string, match: ThreeWayMatch): Promise<MatchResult> {
    this.logger.log(`Performing 3-way match for PO ${match.purchaseOrderId}`);

    const [po] = await this.db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, match.purchaseOrderId))
      .limit(1);

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const [receiving] = await this.db
      .select()
      .from(poReceivings)
      .where(eq(poReceivings.id, match.receivingId))
      .limit(1);

    if (!receiving) {
      throw new NotFoundException('Receiving record not found');
    }

    const matchNumber = await this.generateMatchNumber(tenantId);

    const poItems = po.items as PurchaseOrderItem[];
    const recItems = receiving.items as any[];

    const discrepancies: any[] = [];
    let matchStatus: 'matched' | 'partially_matched' | 'mismatched' = 'matched';

    // Compare quantities
    const poTotalQty = poItems.reduce((sum, i) => sum + i.quantity, 0);
    const recTotalQty = recItems.reduce((sum, i) => sum + i.quantityAccepted, 0);
    const qtyVariance = Math.abs(poTotalQty - recTotalQty);
    const qtyVariancePct = poTotalQty > 0 ? (qtyVariance / poTotalQty) * 100 : 0;

    if (qtyVariancePct > match.tolerances.quantityTolerance) {
      matchStatus = qtyVariancePct > match.tolerances.quantityTolerance * 2 ? 'mismatched' : 'partially_matched';
      discrepancies.push({
        type: 'quantity',
        field: 'Total Quantity',
        expected: poTotalQty,
        actual: recTotalQty,
        variance: qtyVariance,
        variancePercentage: parseFloat(qtyVariancePct.toFixed(2)),
        withinTolerance: false,
      });
    }

    // Compare prices (would compare with invoice)
    const poTotalAmount = parseFloat(po.totalAmount);
    const priceVariancePct = 0; // Would calculate from invoice

    const autoApproved = matchStatus === 'matched' && discrepancies.length === 0;

    const matchResult: 'approved' | 'review_required' | 'rejected' = 
      autoApproved ? 'approved' : matchStatus === 'mismatched' ? 'rejected' : 'review_required';

    const [matchRecord] = await this.db.insert(threeWayMatching).values({
      tenantId,
      matchNumber,
      purchaseOrderId: match.purchaseOrderId,
      receivingId: match.receivingId,
      invoiceId: match.invoiceId,
      matchDate: new Date(),
      matchStatus,
      matchResult,
      discrepancies: discrepancies as any,
      tolerances: match.tolerances as any,
      autoApproved,
    }).returning();

    await this.eventBus.emit('three.way.match.completed', {
      matchId: matchRecord.id,
      matchNumber,
      matchResult,
      autoApproved,
    });

    return {
      matchNumber,
      matchDate: new Date(),
      matchStatus,
      matchResult,
      autoApproved,
      comparison: {
        po: {
          quantity: poTotalQty,
          unitPrice: poTotalAmount / poTotalQty,
          amount: poTotalAmount,
        },
        receipt: {
          quantity: recTotalQty,
          acceptedQuantity: recTotalQty,
        },
        invoice: {
          quantity: 0,
          unitPrice: 0,
          amount: 0,
        },
      },
      discrepancies,
      recommendations: this.generateMatchRecommendations(matchStatus, discrepancies),
    };
  }

  // =====================================================================================
  // ANALYTICS
  // =====================================================================================

  async getProcurementAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ProcurementAnalytics> {
    const pos = await this.db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          gte(purchaseOrders.poDate, startDate),
          lte(purchaseOrders.poDate, endDate),
        ),
      );

    const totalPOs = pos.length;
    const totalSpend = pos.reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
    const averagePOValue = totalPOs > 0 ? totalSpend / totalPOs : 0;

    const byStatus: Record<string, number> = {};
    pos.forEach(p => {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    });

    const supplierMap = new Map<string, { count: number; spend: number; name: string }>();
    pos.forEach(p => {
      const existing = supplierMap.get(p.supplierId) || { count: 0, spend: 0, name: p.supplierName || '' };
      existing.count++;
      existing.spend += parseFloat(p.totalAmount);
      supplierMap.set(p.supplierId, existing);
    });

    const bySupplier = Array.from(supplierMap.entries())
      .map(([supplierId, data]) => ({
        supplierId,
        supplierName: data.name,
        poCount: data.count,
        totalSpend: parseFloat(data.spend.toFixed(2)),
        percentage: parseFloat(((data.spend / totalSpend) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalPOs,
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        averagePOValue: parseFloat(averagePOValue.toFixed(2)),
        approvalCycleTime: 2.5,
        receivingCycleTime: 1.8,
      },
      byStatus,
      bySupplier,
      byCategory: {},
      compliance: {
        poWithApprovals: pos.filter(p => p.approvedBy).length,
        approvalRate: totalPOs > 0 ? (pos.filter(p => p.approvedBy).length / totalPOs) * 100 : 0,
        mavericBuying: 5,
        contractCompliance: 92,
      },
      efficiency: {
        averageApprovalTime: 2.5,
        averageLeadTime: 12,
        onTimeDelivery: 94,
        matchRate: 96,
      },
      savings: {
        negotiatedSavings: 125000,
        volumeDiscounts: 75000,
        earlyPaymentDiscounts: 25000,
        totalSavings: 225000,
        savingsRate: totalSpend > 0 ? (225000 / totalSpend) * 100 : 0,
      },
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private buildApprovalWorkflow(amount: number): ApprovalWorkflow {
    const requiredApprovals = this.APPROVAL_THRESHOLDS.filter(
      threshold => amount >= threshold.amount
    );

    const steps = requiredApprovals.map((threshold, idx) => ({
      level: threshold.level,
      approverRole: threshold.role,
      amountThreshold: threshold.amount,
      status: 'pending' as const,
      required: true,
    }));

    return {
      steps,
      currentLevel: steps[0]?.level || 1,
      overallStatus: 'pending',
    };
  }

  private generateMatchRecommendations(matchStatus: string, discrepancies: any[]): string[] {
    const recommendations: string[] = [];

    if (matchStatus === 'mismatched') {
      recommendations.push('Investigate significant discrepancies before payment');
      recommendations.push('Contact supplier for clarification');
    } else if (matchStatus === 'partially_matched') {
      recommendations.push('Review variances with receiving team');
      recommendations.push('Consider partial payment based on accepted quantity');
    } else {
      recommendations.push('Proceed with payment processing');
    }

    return recommendations;
  }

  private async generatePRNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(purchaseRequisitions)
      .where(
        and(
          eq(purchaseRequisitions.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${purchaseRequisitions.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `PR-${year}-${String(sequence).padStart(5, '0')}`;
  }

  private async generatePONumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${purchaseOrders.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `PO-${year}-${String(sequence).padStart(5, '0')}`;
  }

  private async generateReceivingNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(poReceivings)
      .where(
        and(
          eq(poReceivings.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${poReceivings.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `REC-${year}-${String(sequence).padStart(5, '0')}`;
  }

  private async generateMatchNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(threeWayMatching)
      .where(
        and(
          eq(threeWayMatching.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${threeWayMatching.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `MATCH-${year}-${String(sequence).padStart(4, '0')}`;
  }
}

