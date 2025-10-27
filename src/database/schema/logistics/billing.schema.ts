import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const billingContracts = pgTable('billing_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  contractNumber: varchar('contract_number', { length: 50 }).notNull().unique(),
  customerId: uuid('customer_id').notNull(),
  contractType: varchar('contract_type', { length: 50 }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  status: varchar('status', { length: 20 }).default('active'),
  billingCycle: varchar('billing_cycle', { length: 20 }), // 'daily', 'weekly', 'monthly'
  paymentTerms: varchar('payment_terms', { length: 50 }),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const billingRates = pgTable('billing_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id')
    .notNull()
    .references(() => billingContracts.id, { onDelete: 'cascade' }),
  rateType: varchar('rate_type', { length: 50 }).notNull(), // 'forklift_operator', 'rack_storage', 'handling', 'waiting_time'
  rateName: varchar('rate_name', { length: 255 }).notNull(),
  unitOfMeasure: varchar('unit_of_measure', { length: 50 }), // 'hour', 'day', 'month', 'pallet', 'kg', 'movement'
  rateAmount: decimal('rate_amount', { precision: 12, scale: 2 }).notNull(),
  minimumCharge: decimal('minimum_charge', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  validFrom: date('valid_from').notNull(),
  validUntil: date('valid_until'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const usageTracking = pgTable('billing_usage_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  contractId: uuid('contract_id')
    .notNull()
    .references(() => billingContracts.id, { onDelete: 'cascade' }),
  usageType: varchar('usage_type', { length: 50 }).notNull(),
  resourceId: uuid('resource_id'), // forklift_id, location_id, etc.
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
  unitOfMeasure: varchar('unit_of_measure', { length: 50 }),
  rateAmount: decimal('rate_amount', { precision: 12, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }),
  usageDate: date('usage_date').notNull(),
  usageStartTime: timestamp('usage_start_time'),
  usageEndTime: timestamp('usage_end_time'),
  invoiced: boolean('invoiced').default(false),
  invoiceId: uuid('invoice_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invoices = pgTable('billing_invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  contractId: uuid('contract_id')
    .references(() => billingContracts.id),
  customerId: uuid('customer_id').notNull(),
  invoiceDate: date('invoice_date').notNull(),
  dueDate: date('due_date').notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 15, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  status: varchar('status', { length: 20 }).default('draft'),
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type BillingContract = typeof billingContracts.$inferSelect;
export type NewBillingContract = typeof billingContracts.$inferInsert;
export type BillingRate = typeof billingRates.$inferSelect;
export type NewBillingRate = typeof billingRates.$inferInsert;
export type UsageTracking = typeof usageTracking.$inferSelect;
export type NewUsageTracking = typeof usageTracking.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

