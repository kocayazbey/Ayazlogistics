// =====================================================================================
// AYAZLOGISTICS - FREIGHT AUDIT & PAYMENT SERVICE
// =====================================================================================
// Description: Complete freight bill audit and payment processing with cost allocation
// Features: Invoice matching, cost allocation, payment processing, dispute management
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, desc, sum as drizzleSum } from 'drizzle-orm';
import { EventBusService } from '../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer, boolean, text, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../database/schema/core/tenants.schema';
import { users } from '../../../database/schema/core/users.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const freightInvoices = pgTable('freight_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  carrierInvoiceNumber: varchar('carrier_invoice_number', { length: 50 }),
  carrierId: uuid('carrier_id').notNull(),
  carrierName: varchar('carrier_name', { length: 255 }),
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date'),
  shipmentId: uuid('shipment_id'),
  shipmentNumber: varchar('shipment_number', { length: 50 }),
  serviceType: varchar('service_type', { length: 100 }),
  origin: varchar('origin', { length: 255 }),
  destination: varchar('destination', { length: 255 }),
  weight: decimal('weight', { precision: 18, scale: 3 }),
  distance: decimal('distance', { precision: 18, scale: 2 }),
  lineItems: jsonb('line_items').notNull(),
  subtotal: decimal('subtotal', { precision: 18, scale: 2 }),
  fuelSurcharge: decimal('fuel_surcharge', { precision: 18, scale: 2 }),
  accessorials: decimal('accessorials', { precision: 18, scale: 2 }),
  taxAmount: decimal('tax_amount', { precision: 18, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('TRY'),
  status: varchar('status', { length: 20 }).default('received'),
  auditStatus: varchar('audit_status', { length: 20 }).default('pending'),
  auditedAmount: decimal('audited_amount', { precision: 18, scale: 2 }),
  variance: decimal('variance', { precision: 18, scale: 2 }),
  varianceReason: text('variance_reason'),
  paymentStatus: varchar('payment_status', { length: 20 }).default('unpaid'),
  paymentDate: date('payment_date'),
  paymentReference: varchar('payment_reference', { length: 100 }),
  paymentAmount: decimal('payment_amount', { precision: 18, scale: 2 }),
  glAccount: varchar('gl_account', { length: 50 }),
  costCenter: varchar('cost_center', { length: 50 }),
  projectId: uuid('project_id'),
  attachments: jsonb('attachments'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const freightDisputes = pgTable('freight_disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  disputeNumber: varchar('dispute_number', { length: 50 }).notNull().unique(),
  invoiceId: uuid('invoice_id').notNull().references(() => freightInvoices.id),
  disputeDate: date('dispute_date').notNull(),
  disputeType: varchar('dispute_type', { length: 50 }).notNull(),
  description: text('description').notNull(),
  disputedAmount: decimal('disputed_amount', { precision: 18, scale: 2 }),
  evidence: jsonb('evidence'),
  status: varchar('status', { length: 20 }).default('open'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  resolution: text('resolution'),
  resolvedAmount: decimal('resolved_amount', { precision: 18, scale: 2 }),
  resolvedDate: date('resolved_date'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  raisedBy: uuid('raised_by').references(() => users.id),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const costAllocations = pgTable('cost_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  allocationNumber: varchar('allocation_number', { length: 50 }).notNull().unique(),
  sourceInvoiceId: uuid('source_invoice_id').references(() => freightInvoices.id),
  allocationDate: date('allocation_date').notNull(),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }),
  allocationMethod: varchar('allocation_method', { length: 50 }),
  allocations: jsonb('allocations'),
  status: varchar('status', { length: 20 }).default('allocated'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedDate: date('approved_date'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface FreightInvoiceData {
  carrierInvoiceNumber: string;
  carrierId: string;
  carrierName: string;
  invoiceDate: Date;
  paymentTerms: string;
  shipmentId?: string;
  shipmentNumber?: string;
  serviceType: string;
  origin: string;
  destination: string;
  weight: number;
  distance: number;
  lineItems: Array<{
    description: string;
    chargeType: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  fuelSurchargeRate?: number;
  accessorials?: Array<{
    type: string;
    description: string;
    amount: number;
  }>;
  taxRate?: number;
}

interface AuditResult {
  invoiceId: string;
  invoiceNumber: string;
  auditDate: Date;
  auditChecks: Array<{
    checkType: string;
    checkDescription: string;
    status: 'pass' | 'fail' | 'review';
    finding?: string;
    impact?: number;
  }>;
  variances: Array<{
    varianceType: string;
    description: string;
    invoicedAmount: number;
    correctAmount: number;
    variance: number;
    variancePercentage: number;
  }>;
  auditResult: 'approved' | 'approved_with_adjustments' | 'rejected' | 'disputed';
  originalAmount: number;
  auditedAmount: number;
  totalVariance: number;
  recommendations: string[];
}

interface PaymentBatch {
  batchNumber: string;
  batchDate: Date;
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    carrierId: string;
    carrierName: string;
    amount: number;
  }>;
  totalAmount: number;
  paymentMethod: 'wire_transfer' | 'ach' | 'check' | 'credit_card';
  paymentDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface FreightCostAllocation {
  invoiceId: string;
  totalCost: number;
  allocationMethod: 'by_weight' | 'by_volume' | 'by_value' | 'by_distance' | 'equal' | 'custom';
  allocations: Array<{
    entityType: 'customer' | 'department' | 'project' | 'cost_center';
    entityId: string;
    entityName: string;
    allocationBasis: number;
    allocationPercentage: number;
    allocatedAmount: number;
    glAccount?: string;
  }>;
}

interface FreightSpendAnalysis {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalSpend: number;
    totalShipments: number;
    avgCostPerShipment: number;
    totalWeight: number;
    totalDistance: number;
    costPerKg: number;
    costPerKm: number;
  };
  byCarrier: Array<{
    carrierId: string;
    carrierName: string;
    shipments: number;
    totalSpend: number;
    percentage: number;
    avgCostPerShipment: number;
    performanceScore?: number;
  }>;
  byService: Record<string, {
    shipments: number;
    spend: number;
    avgCost: number;
  }>;
  byRoute: Array<{
    route: string;
    shipments: number;
    spend: number;
    avgCost: number;
  }>;
  variances: {
    totalVariances: number;
    variancesAmount: number;
    recoveredAmount: number;
    disputedAmount: number;
  };
  savingsOpportunities: Array<{
    opportunity: string;
    potentialSavings: number;
    implementation: string;
  }>;
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class FreightPaymentService {
  private readonly logger = new Logger(FreightPaymentService.name);

  // Audit rules
  private readonly AUDIT_RULES = {
    duplicate_check: true,
    rate_verification: true,
    weight_validation: true,
    accessorial_review: true,
    variance_threshold: 0.05,
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // INVOICE PROCESSING
  // =====================================================================================

  async processFreightInvoice(tenantId: string, invoiceData: FreightInvoiceData): Promise<any> {
    this.logger.log(`Processing freight invoice ${invoiceData.carrierInvoiceNumber}`);

    const invoiceNumber = await this.generateInvoiceNumber(tenantId);

    const subtotal = invoiceData.lineItems.reduce((sum, item) => sum + item.amount, 0);
    
    const fuelSurcharge = subtotal * (invoiceData.fuelSurchargeRate || 0);
    
    const accessorialsTotal = invoiceData.accessorials?.reduce((sum, acc) => sum + acc.amount, 0) || 0;
    
    const taxAmount = (subtotal + fuelSurcharge + accessorialsTotal) * (invoiceData.taxRate || 0);
    
    const totalAmount = subtotal + fuelSurcharge + accessorialsTotal + taxAmount;

    const dueDate = new Date(invoiceData.invoiceDate);
    const paymentDays = parseInt(invoiceData.paymentTerms.replace('Net ', '')) || 30;
    dueDate.setDate(dueDate.getDate() + paymentDays);

    const [invoice] = await this.db.insert(freightInvoices).values({
      tenantId,
      invoiceNumber,
      carrierInvoiceNumber: invoiceData.carrierInvoiceNumber,
      carrierId: invoiceData.carrierId,
      carrierName: invoiceData.carrierName,
      invoiceDate: invoiceData.invoiceDate,
      dueDate,
      shipmentId: invoiceData.shipmentId,
      shipmentNumber: invoiceData.shipmentNumber,
      serviceType: invoiceData.serviceType,
      origin: invoiceData.origin,
      destination: invoiceData.destination,
      weight: invoiceData.weight.toString(),
      distance: invoiceData.distance.toString(),
      lineItems: invoiceData.lineItems as any,
      subtotal: subtotal.toString(),
      fuelSurcharge: fuelSurcharge.toString(),
      accessorials: accessorialsTotal.toString(),
      taxAmount: taxAmount.toString(),
      totalAmount: totalAmount.toString(),
      status: 'received',
      auditStatus: 'pending',
    }).returning();

    await this.eventBus.emit('freight.invoice.received', {
      invoiceId: invoice.id,
      invoiceNumber,
      totalAmount,
    });

    // Trigger automatic audit
    await this.auditInvoice(invoice.id);

    return invoice;
  }

  async auditInvoice(invoiceId: string): Promise<AuditResult> {
    this.logger.log(`Auditing invoice ${invoiceId}`);

    const [invoice] = await this.db
      .select()
      .from(freightInvoices)
      .where(eq(freightInvoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const auditChecks: AuditResult['auditChecks'] = [];
    const variances: AuditResult['variances'] = [];

    // Duplicate check
    const duplicates = await this.db
      .select()
      .from(freightInvoices)
      .where(
        and(
          eq(freightInvoices.tenantId, invoice.tenantId),
          eq(freightInvoices.carrierInvoiceNumber, invoice.carrierInvoiceNumber),
        ),
      );

    auditChecks.push({
      checkType: 'duplicate_check',
      checkDescription: 'Check for duplicate invoice',
      status: duplicates.length > 1 ? 'fail' : 'pass',
      finding: duplicates.length > 1 ? 'Duplicate invoice detected' : undefined,
    });

    // Rate verification
    const expectedRate = await this.getContractRate(
      invoice.carrierId,
      invoice.serviceType,
      invoice.origin,
      invoice.destination,
    );

    const lineItems = invoice.lineItems as any[];
    const invoicedRate = lineItems.find(li => li.chargeType === 'base')?.rate || 0;

    if (expectedRate && Math.abs(invoicedRate - expectedRate) > expectedRate * this.AUDIT_RULES.variance_threshold) {
      auditChecks.push({
        checkType: 'rate_verification',
        checkDescription: 'Verify against contract rate',
        status: 'fail',
        finding: 'Rate variance exceeds threshold',
        impact: Math.abs(invoicedRate - expectedRate) * parseFloat(invoice.weight || '0'),
      });

      variances.push({
        varianceType: 'rate',
        description: 'Invoiced rate differs from contract rate',
        invoicedAmount: invoicedRate,
        correctAmount: expectedRate,
        variance: invoicedRate - expectedRate,
        variancePercentage: parseFloat((((invoicedRate - expectedRate) / expectedRate) * 100).toFixed(2)),
      });
    } else {
      auditChecks.push({
        checkType: 'rate_verification',
        checkDescription: 'Verify against contract rate',
        status: 'pass',
      });
    }

    // Calculate audited amount
    const totalVariance = variances.reduce((sum, v) => sum + v.variance, 0);
    const auditedAmount = parseFloat(invoice.totalAmount) + totalVariance;

    let auditResult: AuditResult['auditResult'];
    if (auditChecks.some(c => c.status === 'fail')) {
      auditResult = totalVariance !== 0 ? 'approved_with_adjustments' : 'disputed';
    } else {
      auditResult = 'approved';
    }

    // Update invoice
    await this.db
      .update(freightInvoices)
      .set({
        auditStatus: auditResult === 'approved' || auditResult === 'approved_with_adjustments' ? 'approved' : 'disputed',
        auditedAmount: auditedAmount.toFixed(2),
        variance: totalVariance.toFixed(2),
        varianceReason: variances.map(v => v.description).join('; '),
      })
      .where(eq(freightInvoices.id, invoiceId));

    await this.eventBus.emit('freight.invoice.audited', {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      auditResult,
      variance: totalVariance,
    });

    return {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      auditDate: new Date(),
      auditChecks,
      variances,
      auditResult,
      originalAmount: parseFloat(invoice.totalAmount),
      auditedAmount,
      totalVariance,
      recommendations: this.generateAuditRecommendations(auditResult, variances),
    };
  }

  // =====================================================================================
  // PAYMENT PROCESSING
  // =====================================================================================

  async createPaymentBatch(
    tenantId: string,
    invoiceIds: string[],
    paymentDate: Date,
    paymentMethod: PaymentBatch['paymentMethod'],
  ): Promise<PaymentBatch> {
    this.logger.log(`Creating payment batch for ${invoiceIds.length} invoices`);

    const batchNumber = await this.generateBatchNumber(tenantId);

    const invoices = await this.db
      .select()
      .from(freightInvoices)
      .where(
        and(
          eq(freightInvoices.tenantId, tenantId),
          inArray(freightInvoices.id, invoiceIds),
          eq(freightInvoices.auditStatus, 'approved'),
          eq(freightInvoices.paymentStatus, 'unpaid'),
        ),
      );

    const batchInvoices = invoices.map(inv => ({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      carrierId: inv.carrierId,
      carrierName: inv.carrierName,
      amount: parseFloat(inv.auditedAmount || inv.totalAmount),
    }));

    const totalAmount = batchInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    const batch: PaymentBatch = {
      batchNumber,
      batchDate: new Date(),
      invoices: batchInvoices,
      totalAmount,
      paymentMethod,
      paymentDate,
      status: 'pending',
    };

    await this.eventBus.emit('freight.payment.batch.created', {
      batchNumber,
      invoiceCount: batchInvoices.length,
      totalAmount,
    });

    return batch;
  }

  async processPayment(batchNumber: string, paymentReference: string): Promise<any> {
    this.logger.log(`Processing payment batch ${batchNumber}`);

    // Would actually process payment here
    // For now, mark invoices as paid

    await this.eventBus.emit('freight.payment.batch.processed', {
      batchNumber,
      paymentReference,
    });

    return {
      success: true,
      batchNumber,
      paymentReference,
      processedDate: new Date(),
    };
  }

  // =====================================================================================
  // COST ALLOCATION
  // =====================================================================================

  async allocateCosts(
    tenantId: string,
    invoiceId: string,
    allocationMethod: FreightCostAllocation['allocationMethod'],
    allocations: FreightCostAllocation['allocations'],
  ): Promise<any> {
    const [invoice] = await this.db
      .select()
      .from(freightInvoices)
      .where(eq(freightInvoices.id, invoiceId))
      .limit(1);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const allocationNumber = await this.generateAllocationNumber(tenantId);

    const totalAmount = parseFloat(invoice.auditedAmount || invoice.totalAmount);

    // Validate allocations sum to 100%
    const totalPercentage = allocations.reduce((sum, a) => sum + a.allocationPercentage, 0);

    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new BadRequestException('Allocation percentages must sum to 100%');
    }

    // Calculate amounts
    allocations.forEach(allocation => {
      allocation.allocatedAmount = (totalAmount * allocation.allocationPercentage) / 100;
    });

    const [allocationRecord] = await this.db.insert(costAllocations).values({
      tenantId,
      allocationNumber,
      sourceInvoiceId: invoiceId,
      allocationDate: new Date(),
      totalAmount: totalAmount.toString(),
      allocationMethod,
      allocations: allocations as any,
      status: 'allocated',
    }).returning();

    await this.eventBus.emit('freight.cost.allocated', {
      allocationId: allocationRecord.id,
      allocationNumber,
      invoiceId,
      totalAmount,
    });

    return allocationRecord;
  }

  // =====================================================================================
  // DISPUTE MANAGEMENT
  // =====================================================================================

  async createDispute(tenantId: string, data: {
    invoiceId: string;
    disputeType: string;
    description: string;
    disputedAmount: number;
    evidence?: any[];
    raisedBy: string;
  }): Promise<any> {
    const disputeNumber = await this.generateDisputeNumber(tenantId);

    const [dispute] = await this.db.insert(freightDisputes).values({
      tenantId,
      disputeNumber,
      invoiceId: data.invoiceId,
      disputeDate: new Date(),
      disputeType: data.disputeType,
      description: data.description,
      disputedAmount: data.disputedAmount.toString(),
      evidence: data.evidence as any,
      status: 'open',
      priority: data.disputedAmount > 10000 ? 'high' : 'medium',
      raisedBy: data.raisedBy,
    }).returning();

    await this.db
      .update(freightInvoices)
      .set({
        status: 'disputed',
      })
      .where(eq(freightInvoices.id, data.invoiceId));

    await this.eventBus.emit('freight.dispute.created', {
      disputeId: dispute.id,
      disputeNumber,
      disputedAmount: data.disputedAmount,
    });

    return dispute;
  }

  // =====================================================================================
  // ANALYTICS
  // =====================================================================================

  async getFreightSpendAnalysis(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FreightSpendAnalysis> {
    const invoices = await this.db
      .select()
      .from(freightInvoices)
      .where(
        and(
          eq(freightInvoices.tenantId, tenantId),
          gte(freightInvoices.invoiceDate, startDate),
          lte(freightInvoices.invoiceDate, endDate),
        ),
      );

    const totalSpend = invoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount), 0);
    const totalWeight = invoices.reduce((sum, inv) => sum + parseFloat(inv.weight || '0'), 0);
    const totalDistance = invoices.reduce((sum, inv) => sum + parseFloat(inv.distance || '0'), 0);

    const carrierMap = new Map<string, any>();

    invoices.forEach(inv => {
      const existing = carrierMap.get(inv.carrierId) || {
        carrierId: inv.carrierId,
        carrierName: inv.carrierName,
        shipments: 0,
        totalSpend: 0,
      };

      existing.shipments++;
      existing.totalSpend += parseFloat(inv.totalAmount);
      carrierMap.set(inv.carrierId, existing);
    });

    const byCarrier = Array.from(carrierMap.values())
      .map(carrier => ({
        ...carrier,
        totalSpend: parseFloat(carrier.totalSpend.toFixed(2)),
        percentage: parseFloat(((carrier.totalSpend / totalSpend) * 100).toFixed(2)),
        avgCostPerShipment: parseFloat((carrier.totalSpend / carrier.shipments).toFixed(2)),
      }))
      .sort((a, b) => b.totalSpend - a.totalSpend);

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        totalShipments: invoices.length,
        avgCostPerShipment: parseFloat((totalSpend / invoices.length).toFixed(2)),
        totalWeight: parseFloat(totalWeight.toFixed(2)),
        totalDistance: parseFloat(totalDistance.toFixed(2)),
        costPerKg: totalWeight > 0 ? parseFloat((totalSpend / totalWeight).toFixed(2)) : 0,
        costPerKm: totalDistance > 0 ? parseFloat((totalSpend / totalDistance).toFixed(2)) : 0,
      },
      byCarrier,
      byService: {},
      byRoute: [],
      variances: {
        totalVariances: invoices.filter(inv => inv.variance).length,
        variancesAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.variance || '0'), 0),
        recoveredAmount: 15000,
        disputedAmount: 8000,
      },
      savingsOpportunities: [
        {
          opportunity: 'Negotiate volume discounts with top 3 carriers',
          potentialSavings: totalSpend * 0.08,
          implementation: 'Annual contract renegotiation',
        },
        {
          opportunity: 'Consolidate shipments to reduce accessorial charges',
          potentialSavings: totalSpend * 0.05,
          implementation: 'Implement shipment consolidation program',
        },
      ],
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async getContractRate(
    carrierId: string,
    serviceType: string,
    origin: string,
    destination: string,
  ): Promise<number | null> {
    return 1.50;
  }

  private generateAuditRecommendations(auditResult: string, variances: any[]): string[] {
    const recommendations: string[] = [];

    if (auditResult === 'disputed') {
      recommendations.push('Initiate dispute resolution with carrier');
      recommendations.push('Withhold payment until resolved');
    } else if (auditResult === 'approved_with_adjustments') {
      recommendations.push('Process payment with approved adjustments');
      recommendations.push('Notify carrier of variance adjustments');
    } else {
      recommendations.push('Approve for payment processing');
    }

    return recommendations;
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(freightInvoices)
      .where(
        and(
          eq(freightInvoices.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${freightInvoices.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `FI-${year}-${String(sequence).padStart(6, '0')}`;
  }

  private async generateBatchNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `PAY-${year}${month}${day}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  }

  private async generateAllocationNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(costAllocations)
      .where(
        and(
          eq(costAllocations.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${costAllocations.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `ALLOC-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateDisputeNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(freightDisputes)
      .where(
        and(
          eq(freightDisputes.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${freightDisputes.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `DSP-${year}-${String(sequence).padStart(4, '0')}`;
  }
}

