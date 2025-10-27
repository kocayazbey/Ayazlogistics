import { pgTable, uuid, varchar, timestamp, decimal, date, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

// Minimum Billing Guarantees - Customer minimum billing commitments
export const minimumBillingGuarantees = pgTable('minimum_billing_guarantees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  contractId: uuid('contract_id'),
  minimumAmount: decimal('minimum_amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  period: varchar('period', { length: 20 }).notNull(), // 'monthly', 'quarterly', 'annually'
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  adjustmentMethod: varchar('adjustment_method', { length: 50 }).default('invoice_credit'), // 'invoice_credit', 'next_period_rollover', 'refund'
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Minimum Billing Adjustments - Records of adjustments applied
export const minimumBillingAdjustments = pgTable('minimum_billing_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  guaranteeId: uuid('guarantee_id')
    .notNull()
    .references(() => minimumBillingGuarantees.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  actualBilling: decimal('actual_billing', { precision: 15, scale: 2 }).notNull(),
  minimumRequired: decimal('minimum_required', { precision: 15, scale: 2 }).notNull(),
  shortfall: decimal('shortfall', { precision: 15, scale: 2 }).notNull(),
  adjustmentMethod: varchar('adjustment_method', { length: 50 }).notNull(),
  adjustmentAmount: decimal('adjustment_amount', { precision: 15, scale: 2 }).notNull(),
  invoiceId: uuid('invoice_id'), // If invoice credit method
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'applied', 'failed'
  appliedAt: timestamp('applied_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type MinimumBillingGuarantee = typeof minimumBillingGuarantees.$inferSelect;
export type NewMinimumBillingGuarantee = typeof minimumBillingGuarantees.$inferInsert;
export type MinimumBillingAdjustment = typeof minimumBillingAdjustments.$inferSelect;
export type NewMinimumBillingAdjustment = typeof minimumBillingAdjustments.$inferInsert;

