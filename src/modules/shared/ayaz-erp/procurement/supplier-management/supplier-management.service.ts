import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, or, ilike } from 'drizzle-orm';
import { EventBusService } from '../../../../../core/events/event-bus.service';
import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, decimal, integer } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../../database/schema/core/tenants.schema';

export const suppliers = pgTable('erp_suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  supplierCode: varchar('supplier_code', { length: 50 }).notNull().unique(),
  supplierName: varchar('supplier_name', { length: 255 }).notNull(),
  companyType: varchar('company_type', { length: 50 }),
  taxNumber: varchar('tax_number', { length: 20 }),
  taxOffice: varchar('tax_office', { length: 100 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  country: varchar('country', { length: 100 }).default('TR'),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }),
  currentBalance: decimal('current_balance', { precision: 12, scale: 2 }).default('0'),
  rating: integer('rating'),
  category: varchar('category', { length: 50 }),
  status: varchar('status', { length: 20 }).default('active'),
  bankAccounts: jsonb('bank_accounts'),
  certificates: jsonb('certificates'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const supplierPerformance = pgTable('erp_supplier_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplierId: uuid('supplier_id').notNull().references(() => suppliers.id, { onDelete: 'cascade' }),
  evaluationDate: timestamp('evaluation_date').notNull(),
  qualityScore: integer('quality_score'),
  deliveryScore: integer('delivery_score'),
  priceCompetitiveness: integer('price_competitiveness'),
  communicationScore: integer('communication_score'),
  overallScore: integer('overall_score'),
  onTimeDeliveryRate: decimal('on_time_delivery_rate', { precision: 5, scale: 2 }),
  defectRate: decimal('defect_rate', { precision: 5, scale: 2 }),
  totalOrders: integer('total_orders'),
  totalSpend: decimal('total_spend', { precision: 12, scale: 2 }),
  comments: text('comments'),
  evaluatedBy: uuid('evaluated_by'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

@Injectable()
export class SupplierManagementService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createSupplier(data: {
    tenantId: string;
    supplierName: string;
    companyType?: string;
    taxNumber?: string;
    taxOffice?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    paymentTerms?: string;
    creditLimit?: number;
    category?: string;
  }): Promise<any> {
    const supplierCode = `SUP-${Date.now()}`;

    const [supplier] = await this.db.insert(suppliers).values({
      tenantId: data.tenantId,
      supplierCode,
      supplierName: data.supplierName,
      companyType: data.companyType,
      taxNumber: data.taxNumber,
      taxOffice: data.taxOffice,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      country: data.country || 'TR',
      paymentTerms: data.paymentTerms,
      creditLimit: data.creditLimit?.toString(),
      category: data.category,
      status: 'active',
      isActive: true,
    }).returning();

    await this.eventBus.emit('supplier.created', {
      supplierId: supplier.id,
      supplierCode,
    });

    return supplier;
  }

  async getSuppliers(tenantId: string, filters?: {
    status?: string;
    category?: string;
    search?: string;
  }): Promise<any[]> {
    let query = this.db.select().from(suppliers).where(eq(suppliers.tenantId, tenantId));

    if (filters?.status) {
      query = query.where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.status, filters.status)));
    }

    if (filters?.category) {
      query = query.where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.category, filters.category)));
    }

    if (filters?.search) {
      query = query.where(
        and(
          eq(suppliers.tenantId, tenantId),
          or(
            ilike(suppliers.supplierName, `%${filters.search}%`),
            ilike(suppliers.supplierCode, `%${filters.search}%`),
          ),
        ),
      );
    }

    return await query;
  }

  async updateSupplier(supplierId: string, updates: any): Promise<any> {
    const [updated] = await this.db
      .update(suppliers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(suppliers.id, supplierId))
      .returning();

    await this.eventBus.emit('supplier.updated', { supplierId });

    return updated;
  }

  async evaluateSupplier(data: {
    supplierId: string;
    qualityScore: number;
    deliveryScore: number;
    priceCompetitiveness: number;
    communicationScore: number;
    onTimeDeliveryRate: number;
    defectRate: number;
    totalOrders: number;
    totalSpend: number;
    comments?: string;
    evaluatedBy: string;
  }): Promise<any> {
    const overallScore = Math.round(
      (data.qualityScore + data.deliveryScore + data.priceCompetitiveness + data.communicationScore) / 4,
    );

    const [performance] = await this.db.insert(supplierPerformance).values({
      supplierId: data.supplierId,
      evaluationDate: new Date(),
      qualityScore: data.qualityScore,
      deliveryScore: data.deliveryScore,
      priceCompetitiveness: data.priceCompetitiveness,
      communicationScore: data.communicationScore,
      overallScore,
      onTimeDeliveryRate: data.onTimeDeliveryRate.toString(),
      defectRate: data.defectRate.toString(),
      totalOrders: data.totalOrders,
      totalSpend: data.totalSpend.toString(),
      comments: data.comments,
      evaluatedBy: data.evaluatedBy,
    }).returning();

    await this.db
      .update(suppliers)
      .set({ rating: overallScore })
      .where(eq(suppliers.id, data.supplierId));

    await this.eventBus.emit('supplier.evaluated', {
      supplierId: data.supplierId,
      overallScore,
    });

    return performance;
  }

  async getSupplierPerformanceHistory(supplierId: string): Promise<any[]> {
    return await this.db
      .select()
      .from(supplierPerformance)
      .where(eq(supplierPerformance.supplierId, supplierId))
      .orderBy(supplierPerformance.evaluationDate);
  }

  async getTopSuppliers(tenantId: string, limit: number = 10): Promise<any[]> {
    return await this.db
      .select()
      .from(suppliers)
      .where(
        and(
          eq(suppliers.tenantId, tenantId),
          eq(suppliers.isActive, true),
        ),
      )
      .orderBy(suppliers.rating)
      .limit(limit);
  }
}

