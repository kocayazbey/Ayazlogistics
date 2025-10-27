// =====================================================================================
// AYAZLOGISTICS - ASSET TRACKING & MANAGEMENT SERVICE
// =====================================================================================
// Description: Complete asset lifecycle management with depreciation, maintenance
// Features: Asset registry, depreciation calculation, transfer tracking, disposal
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
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

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  assetNumber: varchar('asset_number', { length: 50 }).notNull().unique(),
  assetName: varchar('asset_name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  subcategory: varchar('subcategory', { length: 100 }),
  description: text('description'),
  manufacturer: varchar('manufacturer', { length: 255 }),
  model: varchar('model', { length: 255 }),
  serialNumber: varchar('serial_number', { length: 100 }).unique(),
  barcode: varchar('barcode', { length: 100 }),
  rfidTag: varchar('rfid_tag', { length: 100 }),
  purchaseDate: date('purchase_date').notNull(),
  purchaseCost: decimal('purchase_cost', { precision: 18, scale: 2 }).notNull(),
  supplier: varchar('supplier', { length: 255 }),
  warrantyExpiry: date('warranty_expiry'),
  depreciationMethod: varchar('depreciation_method', { length: 50 }).notNull(),
  usefulLife: integer('useful_life').notNull(),
  salvageValue: decimal('salvage_value', { precision: 18, scale: 2 }),
  accumulatedDepreciation: decimal('accumulated_depreciation', { precision: 18, scale: 2 }).default('0'),
  netBookValue: decimal('net_book_value', { precision: 18, scale: 2 }),
  status: varchar('status', { length: 20 }).default('active'),
  condition: varchar('condition', { length: 20 }).default('good'),
  location: varchar('location', { length: 255 }),
  department: varchar('department', { length: 100 }),
  assignedTo: uuid('assigned_to').references(() => users.id),
  assignedDate: date('assigned_date'),
  custodian: uuid('custodian').references(() => users.id),
  specifications: jsonb('specifications'),
  documents: jsonb('documents'),
  photos: jsonb('photos'),
  insurancePolicy: varchar('insurance_policy', { length: 100 }),
  insuranceExpiry: date('insurance_expiry'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const assetDepreciation = pgTable('asset_depreciation', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  periodDate: date('period_date').notNull(),
  depreciationAmount: decimal('depreciation_amount', { precision: 18, scale: 2 }).notNull(),
  accumulatedDepreciation: decimal('accumulated_depreciation', { precision: 18, scale: 2 }).notNull(),
  netBookValue: decimal('net_book_value', { precision: 18, scale: 2 }).notNull(),
  method: varchar('method', { length: 50 }),
  journalEntryId: uuid('journal_entry_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const assetTransfers = pgTable('asset_transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  transferNumber: varchar('transfer_number', { length: 50 }).notNull().unique(),
  transferDate: date('transfer_date').notNull(),
  transferType: varchar('transfer_type', { length: 50 }).notNull(),
  fromLocation: varchar('from_location', { length: 255 }),
  toLocation: varchar('to_location', { length: 255 }),
  fromDepartment: varchar('from_department', { length: 100 }),
  toDepartment: varchar('to_department', { length: 100 }),
  fromCustodian: uuid('from_custodian').references(() => users.id),
  toCustodian: uuid('to_custodian').references(() => users.id),
  reason: text('reason'),
  condition: varchar('condition', { length: 20 }),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedDate: timestamp('approved_date'),
  status: varchar('status', { length: 20 }).default('pending'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const assetMaintenanceSchedules = pgTable('asset_maintenance_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  assetId: uuid('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),
  scheduleName: varchar('schedule_name', { length: 255 }).notNull(),
  maintenanceType: varchar('maintenance_type', { length: 50 }).notNull(),
  frequency: varchar('frequency', { length: 50 }).notNull(),
  frequencyValue: integer('frequency_value'),
  frequencyUnit: varchar('frequency_unit', { length: 20 }),
  lastPerformed: date('last_performed'),
  nextDue: date('next_due'),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }),
  estimatedDuration: integer('estimated_duration'),
  vendor: varchar('vendor', { length: 255 }),
  instructions: text('instructions'),
  checklist: jsonb('checklist'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const assetDisposals = pgTable('asset_disposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  assetId: uuid('asset_id').notNull().references(() => assets.id),
  disposalNumber: varchar('disposal_number', { length: 50 }).notNull().unique(),
  disposalDate: date('disposal_date').notNull(),
  disposalMethod: varchar('disposal_method', { length: 50 }).notNull(),
  disposalReason: text('disposal_reason').notNull(),
  salePrice: decimal('sale_price', { precision: 18, scale: 2 }),
  buyerName: varchar('buyer_name', { length: 255 }),
  netBookValue: decimal('net_book_value', { precision: 18, scale: 2 }),
  gainLoss: decimal('gain_loss', { precision: 18, scale: 2 }),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedDate: timestamp('approved_date'),
  certificateOfDestruction: varchar('certificate_of_destruction', { length: 255 }),
  environmentalCompliance: boolean('environmental_compliance'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface AssetRegistration {
  assetName: string;
  category: string;
  subcategory?: string;
  description?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate: Date;
  purchaseCost: number;
  supplier?: string;
  warrantyYears?: number;
  depreciationMethod: 'straight_line' | 'declining_balance' | 'sum_of_years_digits' | 'units_of_production';
  usefulLife: number;
  salvageValue?: number;
  location: string;
  department?: string;
  assignedTo?: string;
  custodian: string;
  specifications?: Record<string, any>;
  insuranceRequired?: boolean;
  registeredBy: string;
}

interface DepreciationCalculation {
  assetId: string;
  assetName: string;
  method: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLife: number;
  ageMonths: number;
  monthlyDepreciation: number;
  annualDepreciation: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  remainingLife: number;
  depreciationSchedule: Array<{
    year: number;
    beginningValue: number;
    depreciationExpense: number;
    accumulatedDepreciation: number;
    endingValue: number;
  }>;
}

interface AssetTransfer {
  assetId: string;
  transferType: 'location' | 'department' | 'custodian' | 'disposal' | 'return';
  transferDate: Date;
  fromLocation?: string;
  toLocation?: string;
  fromDepartment?: string;
  toDepartment?: string;
  fromCustodian?: string;
  toCustodian?: string;
  reason: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  requestedBy: string;
}

interface AssetValuation {
  assetId: string;
  assetNumber: string;
  assetName: string;
  category: string;
  acquisition: {
    date: Date;
    cost: number;
    age: number;
  };
  depreciation: {
    method: string;
    annual: number;
    accumulated: number;
    remaining: number;
  };
  valuation: {
    purchaseCost: number;
    accumulatedDepreciation: number;
    netBookValue: number;
    marketValue?: number;
    replacementCost?: number;
  };
  condition: string;
  location: string;
  utilizationRate?: number;
}

interface AssetPortfolio {
  summary: {
    totalAssets: number;
    totalValue: number;
    totalDepreciation: number;
    netValue: number;
    averageAge: number;
  };
  byCategory: Array<{
    category: string;
    count: number;
    totalCost: number;
    netValue: number;
    percentage: number;
  }>;
  byStatus: Record<string, number>;
  byCondition: Record<string, number>;
  byLocation: Array<{
    location: string;
    assetCount: number;
    totalValue: number;
  }>;
  depreciation: {
    currentYear: number;
    previousYear: number;
    accumulated: number;
  };
  upcomingMaintenance: Array<{
    assetId: string;
    assetName: string;
    maintenanceType: string;
    dueDate: Date;
    estimatedCost: number;
  }>;
  expiringWarranties: Array<{
    assetId: string;
    assetName: string;
    expiryDate: Date;
    daysRemaining: number;
  }>;
}

interface MaintenanceSchedule {
  scheduleName: string;
  maintenanceType: 'preventive' | 'predictive' | 'corrective' | 'inspection';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'usage_based';
  frequencyValue?: number;
  frequencyUnit?: 'days' | 'weeks' | 'months' | 'hours' | 'kilometers';
  estimatedCost?: number;
  estimatedDuration?: number;
  vendor?: string;
  instructions?: string;
  checklist?: string[];
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class AssetTrackingService {
  private readonly logger = new Logger(AssetTrackingService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // ASSET REGISTRATION
  // =====================================================================================

  async registerAsset(tenantId: string, registration: AssetRegistration): Promise<any> {
    this.logger.log(`Registering asset: ${registration.assetName}`);

    const assetNumber = await this.generateAssetNumber(tenantId);

    const warrantyExpiry = registration.warrantyYears
      ? new Date(registration.purchaseDate.getFullYear() + registration.warrantyYears, registration.purchaseDate.getMonth(), registration.purchaseDate.getDate())
      : null;

    const salvageValue = registration.salvageValue || registration.purchaseCost * 0.1;

    const [asset] = await this.db.insert(assets).values({
      tenantId,
      assetNumber,
      assetName: registration.assetName,
      category: registration.category,
      subcategory: registration.subcategory,
      description: registration.description,
      manufacturer: registration.manufacturer,
      model: registration.model,
      serialNumber: registration.serialNumber,
      purchaseDate: registration.purchaseDate,
      purchaseCost: registration.purchaseCost.toString(),
      supplier: registration.supplier,
      warrantyExpiry,
      depreciationMethod: registration.depreciationMethod,
      usefulLife: registration.usefulLife,
      salvageValue: salvageValue.toString(),
      netBookValue: registration.purchaseCost.toString(),
      location: registration.location,
      department: registration.department,
      assignedTo: registration.assignedTo,
      assignedDate: registration.assignedTo ? new Date() : null,
      custodian: registration.custodian,
      specifications: registration.specifications as any,
      status: 'active',
      condition: 'good',
      createdBy: registration.registeredBy,
    }).returning();

    await this.eventBus.emit('asset.registered', {
      assetId: asset.id,
      assetNumber,
      assetName: registration.assetName,
      purchaseCost: registration.purchaseCost,
    });

    return asset;
  }

  async updateAssetCondition(
    assetId: string,
    condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged',
    notes?: string,
    updatedBy?: string,
  ): Promise<any> {
    const [updated] = await this.db
      .update(assets)
      .set({
        condition,
        metadata: sql`COALESCE(${assets.metadata}, '{}'::jsonb) || ${JSON.stringify({
          conditionUpdated: new Date(),
          conditionNotes: notes,
          updatedBy,
        })}::jsonb`,
      })
      .where(eq(assets.id, assetId))
      .returning();

    await this.eventBus.emit('asset.condition.updated', {
      assetId,
      assetNumber: updated.assetNumber,
      condition,
    });

    return updated;
  }

  // =====================================================================================
  // DEPRECIATION CALCULATION
  // =====================================================================================

  async calculateDepreciation(assetId: string, asOfDate?: Date): Promise<DepreciationCalculation> {
    const [asset] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId))
      .limit(1);

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const targetDate = asOfDate || new Date();
    const purchaseCost = parseFloat(asset.purchaseCost);
    const salvageValue = parseFloat(asset.salvageValue || '0');
    const usefulLife = asset.usefulLife;

    const purchaseDate = new Date(asset.purchaseDate);
    const ageMonths = this.calculateMonthsDifference(purchaseDate, targetDate);
    const ageYears = ageMonths / 12;

    let monthlyDepreciation = 0;
    let accumulatedDepreciation = 0;
    let netBookValue = purchaseCost;

    switch (asset.depreciationMethod) {
      case 'straight_line':
        monthlyDepreciation = (purchaseCost - salvageValue) / (usefulLife * 12);
        accumulatedDepreciation = Math.min(purchaseCost - salvageValue, monthlyDepreciation * ageMonths);
        netBookValue = purchaseCost - accumulatedDepreciation;
        break;

      case 'declining_balance':
        const rate = 2 / usefulLife;
        let remainingValue = purchaseCost;
        accumulatedDepreciation = 0;

        for (let year = 0; year < Math.min(Math.ceil(ageYears), usefulLife); year++) {
          const yearDepreciation = remainingValue * rate;
          const applicableDepreciation = year < ageYears
            ? (year + 1 <= ageYears ? yearDepreciation : yearDepreciation * (ageYears - year))
            : 0;

          accumulatedDepreciation += applicableDepreciation;
          remainingValue -= yearDepreciation;
        }

        netBookValue = Math.max(purchaseCost - accumulatedDepreciation, salvageValue);
        monthlyDepreciation = accumulatedDepreciation / ageMonths;
        break;

      case 'sum_of_years_digits':
        const syd = (usefulLife * (usefulLife + 1)) / 2;
        accumulatedDepreciation = 0;

        for (let year = 1; year <= Math.min(Math.ceil(ageYears), usefulLife); year++) {
          const yearFraction = (usefulLife - year + 1) / syd;
          const yearDepreciation = (purchaseCost - salvageValue) * yearFraction;

          const applicableDepreciation = year <= ageYears
            ? (year < ageYears ? yearDepreciation : yearDepreciation * (ageYears - (year - 1)))
            : 0;

          accumulatedDepreciation += applicableDepreciation;
        }

        netBookValue = purchaseCost - accumulatedDepreciation;
        monthlyDepreciation = accumulatedDepreciation / ageMonths;
        break;
    }

    const annualDepreciation = monthlyDepreciation * 12;
    const remainingLife = Math.max(0, usefulLife - ageYears);

    // Generate depreciation schedule
    const schedule = this.generateDepreciationSchedule(
      purchaseCost,
      salvageValue,
      usefulLife,
      asset.depreciationMethod,
    );

    return {
      assetId,
      assetName: asset.assetName,
      method: asset.depreciationMethod,
      purchaseCost,
      salvageValue,
      usefulLife,
      ageMonths,
      monthlyDepreciation: parseFloat(monthlyDepreciation.toFixed(2)),
      annualDepreciation: parseFloat(annualDepreciation.toFixed(2)),
      accumulatedDepreciation: parseFloat(accumulatedDepreciation.toFixed(2)),
      netBookValue: parseFloat(netBookValue.toFixed(2)),
      remainingLife: parseFloat(remainingLife.toFixed(2)),
      depreciationSchedule: schedule,
    };
  }

  async recordMonthlyDepreciation(tenantId: string, periodDate: Date): Promise<{
    assetsProcessed: number;
    totalDepreciation: number;
  }> {
    this.logger.log(`Recording depreciation for period: ${periodDate.toISOString()}`);

    const activeAssets = await this.db
      .select()
      .from(assets)
      .where(
        and(
          eq(assets.tenantId, tenantId),
          eq(assets.status, 'active'),
        ),
      );

    let totalDepreciation = 0;
    let assetsProcessed = 0;

    for (const asset of activeAssets) {
      const depreciation = await this.calculateDepreciation(asset.id, periodDate);

      if (depreciation.monthlyDepreciation > 0) {
        await this.db.insert(assetDepreciation).values({
          assetId: asset.id,
          periodDate,
          depreciationAmount: depreciation.monthlyDepreciation.toString(),
          accumulatedDepreciation: depreciation.accumulatedDepreciation.toString(),
          netBookValue: depreciation.netBookValue.toString(),
          method: asset.depreciationMethod,
        });

        await this.db
          .update(assets)
          .set({
            accumulatedDepreciation: depreciation.accumulatedDepreciation.toString(),
            netBookValue: depreciation.netBookValue.toString(),
          })
          .where(eq(assets.id, asset.id));

        totalDepreciation += depreciation.monthlyDepreciation;
        assetsProcessed++;
      }
    }

    await this.eventBus.emit('depreciation.monthly.recorded', {
      periodDate,
      assetsProcessed,
      totalDepreciation,
    });

    return {
      assetsProcessed,
      totalDepreciation: parseFloat(totalDepreciation.toFixed(2)),
    };
  }

  // =====================================================================================
  // ASSET TRANSFERS
  // =====================================================================================

  async transferAsset(tenantId: string, transfer: AssetTransfer): Promise<any> {
    this.logger.log(`Transferring asset ${transfer.assetId}`);

    const transferNumber = await this.generateTransferNumber(tenantId);

    const [transferRecord] = await this.db.insert(assetTransfers).values({
      tenantId,
      assetId: transfer.assetId,
      transferNumber,
      transferDate: transfer.transferDate,
      transferType: transfer.transferType,
      fromLocation: transfer.fromLocation,
      toLocation: transfer.toLocation,
      fromDepartment: transfer.fromDepartment,
      toDepartment: transfer.toDepartment,
      fromCustodian: transfer.fromCustodian,
      toCustodian: transfer.toCustodian,
      reason: transfer.reason,
      condition: transfer.condition,
      status: 'pending',
      createdBy: transfer.requestedBy,
    }).returning();

    await this.eventBus.emit('asset.transfer.requested', {
      transferId: transferRecord.id,
      transferNumber,
      assetId: transfer.assetId,
    });

    return transferRecord;
  }

  async approveTransfer(transferId: string, approvedBy: string): Promise<any> {
    const [transfer] = await this.db
      .select()
      .from(assetTransfers)
      .where(eq(assetTransfers.id, transferId))
      .limit(1);

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    // Update asset location/custodian
    const updates: any = {
      condition: transfer.condition,
    };

    if (transfer.toLocation) updates.location = transfer.toLocation;
    if (transfer.toDepartment) updates.department = transfer.toDepartment;
    if (transfer.toCustodian) {
      updates.assignedTo = transfer.toCustodian;
      updates.assignedDate = new Date();
      updates.custodian = transfer.toCustodian;
    }

    await this.db
      .update(assets)
      .set(updates)
      .where(eq(assets.id, transfer.assetId));

    const [approved] = await this.db
      .update(assetTransfers)
      .set({
        status: 'approved',
        approvedBy,
        approvedDate: new Date(),
      })
      .where(eq(assetTransfers.id, transferId))
      .returning();

    await this.eventBus.emit('asset.transfer.approved', {
      transferId,
      transferNumber: transfer.transferNumber,
      assetId: transfer.assetId,
    });

    return approved;
  }

  // =====================================================================================
  // ASSET DISPOSAL
  // =====================================================================================

  async disposeAsset(tenantId: string, data: {
    assetId: string;
    disposalDate: Date;
    disposalMethod: 'sale' | 'donation' | 'scrap' | 'trade_in' | 'destruction';
    disposalReason: string;
    salePrice?: number;
    buyerName?: string;
    disposedBy: string;
  }): Promise<any> {
    const [asset] = await this.db
      .select()
      .from(assets)
      .where(eq(assets.id, data.assetId))
      .limit(1);

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const disposalNumber = await this.generateDisposalNumber(tenantId);

    const netBookValue = parseFloat(asset.netBookValue);
    const salePrice = data.salePrice || 0;
    const gainLoss = salePrice - netBookValue;

    const [disposal] = await this.db.insert(assetDisposals).values({
      tenantId,
      assetId: data.assetId,
      disposalNumber,
      disposalDate: data.disposalDate,
      disposalMethod: data.disposalMethod,
      disposalReason: data.disposalReason,
      salePrice: salePrice.toString(),
      buyerName: data.buyerName,
      netBookValue: netBookValue.toString(),
      gainLoss: gainLoss.toFixed(2),
      createdBy: data.disposedBy,
    }).returning();

    await this.db
      .update(assets)
      .set({
        status: 'disposed',
      })
      .where(eq(assets.id, data.assetId));

    await this.eventBus.emit('asset.disposed', {
      assetId: data.assetId,
      assetNumber: asset.assetNumber,
      disposalNumber,
      gainLoss,
    });

    return disposal;
  }

  // =====================================================================================
  // PORTFOLIO ANALYTICS
  // =====================================================================================

  async getAssetPortfolio(tenantId: string): Promise<AssetPortfolio> {
    const allAssets = await this.db
      .select()
      .from(assets)
      .where(eq(assets.tenantId, tenantId));

    const totalAssets = allAssets.length;
    const totalValue = allAssets.reduce((sum, a) => sum + parseFloat(a.purchaseCost), 0);
    const totalDepreciation = allAssets.reduce((sum, a) => sum + parseFloat(a.accumulatedDepreciation || '0'), 0);
    const netValue = totalValue - totalDepreciation;

    const totalAge = allAssets.reduce((sum, a) => {
      const age = this.calculateMonthsDifference(new Date(a.purchaseDate), new Date()) / 12;
      return sum + age;
    }, 0);
    const averageAge = totalAssets > 0 ? totalAge / totalAssets : 0;

    // By category
    const categoryMap = new Map<string, { count: number; cost: number; netValue: number }>();
    allAssets.forEach(a => {
      const existing = categoryMap.get(a.category) || { count: 0, cost: 0, netValue: 0 };
      existing.count++;
      existing.cost += parseFloat(a.purchaseCost);
      existing.netValue += parseFloat(a.netBookValue);
      categoryMap.set(a.category, existing);
    });

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        totalCost: parseFloat(data.cost.toFixed(2)),
        netValue: parseFloat(data.netValue.toFixed(2)),
        percentage: parseFloat(((data.cost / totalValue) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.totalCost - a.totalCost);

    // By status
    const byStatus: Record<string, number> = {};
    allAssets.forEach(a => {
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });

    // By condition
    const byCondition: Record<string, number> = {};
    allAssets.forEach(a => {
      byCondition[a.condition] = (byCondition[a.condition] || 0) + 1;
    });

    // By location
    const locationMap = new Map<string, { count: number; value: number }>();
    allAssets.forEach(a => {
      const existing = locationMap.get(a.location) || { count: 0, value: 0 };
      existing.count++;
      existing.value += parseFloat(a.netBookValue);
      locationMap.set(a.location, existing);
    });

    const byLocation = Array.from(locationMap.entries())
      .map(([location, data]) => ({
        location,
        assetCount: data.count,
        totalValue: parseFloat(data.value.toFixed(2)),
      }));

    return {
      summary: {
        totalAssets,
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalDepreciation: parseFloat(totalDepreciation.toFixed(2)),
        netValue: parseFloat(netValue.toFixed(2)),
        averageAge: parseFloat(averageAge.toFixed(2)),
      },
      byCategory,
      byStatus,
      byCondition,
      byLocation,
      depreciation: {
        currentYear: 0,
        previousYear: 0,
        accumulated: parseFloat(totalDepreciation.toFixed(2)),
      },
      upcomingMaintenance: [],
      expiringWarranties: [],
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private calculateMonthsDifference(startDate: Date, endDate: Date): number {
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    return years * 12 + months;
  }

  private generateDepreciationSchedule(
    cost: number,
    salvage: number,
    life: number,
    method: string,
  ): Array<any> {
    const schedule: any[] = [];
    let bookValue = cost;
    let accumulated = 0;

    for (let year = 1; year <= life; year++) {
      let yearDepreciation = 0;

      if (method === 'straight_line') {
        yearDepreciation = (cost - salvage) / life;
      } else if (method === 'declining_balance') {
        const rate = 2 / life;
        yearDepreciation = bookValue * rate;
      }

      accumulated += yearDepreciation;
      const endingValue = cost - accumulated;

      schedule.push({
        year,
        beginningValue: parseFloat(bookValue.toFixed(2)),
        depreciationExpense: parseFloat(yearDepreciation.toFixed(2)),
        accumulatedDepreciation: parseFloat(accumulated.toFixed(2)),
        endingValue: parseFloat(Math.max(endingValue, salvage).toFixed(2)),
      });

      bookValue = endingValue;
    }

    return schedule;
  }

  private async generateAssetNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(assets)
      .where(
        and(
          eq(assets.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${assets.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `AST-${year}-${String(sequence).padStart(5, '0')}`;
  }

  private async generateTransferNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(assetTransfers)
      .where(
        and(
          eq(assetTransfers.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${assetTransfers.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `TRF-${year}-${String(sequence).padStart(4, '0')}`;
  }

  private async generateDisposalNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(assetDisposals)
      .where(
        and(
          eq(assetDisposals.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${assetDisposals.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `DSP-${year}-${String(sequence).padStart(4, '0')}`;
  }
}

