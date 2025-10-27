import { pgTable, uuid, varchar, text, timestamp, decimal, date, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

// SLA Metrics - Warehouse/Customer specific SLA metrics
export const slaMetrics = pgTable('sla_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  contractId: uuid('contract_id').notNull(),
  metricType: varchar('metric_type', { length: 50 }).notNull(), // 'order_accuracy', 'on_time_shipment', 'inventory_accuracy', 'cycle_time', 'damage_rate', 'order_fill_rate'
  targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
  actualValue: decimal('actual_value', { precision: 10, scale: 2 }),
  unit: varchar('unit', { length: 20 }).default('percentage'),
  period: varchar('period', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
  penaltyAmount: decimal('penalty_amount', { precision: 15, scale: 2 }),
  penaltyCurrency: varchar('penalty_currency', { length: 10 }).default('TRY'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// SLA Violations - Records of SLA violations
export const slaViolations = pgTable('sla_violations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  contractId: uuid('contract_id').notNull(),
  metricId: uuid('metric_id')
    .references(() => slaMetrics.id, { onDelete: 'set null' }),
  metricType: varchar('metric_type', { length: 50 }).notNull(),
  targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
  actualValue: decimal('actual_value', { precision: 10, scale: 2 }).notNull(),
  variance: decimal('variance', { precision: 10, scale: 2 }).notNull(),
  violationDate: date('violation_date').notNull(),
  penaltyApplied: boolean('penalty_applied').default(false),
  penaltyAmount: decimal('penalty_amount', { precision: 15, scale: 2 }),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// SLA Metric Records - Daily/weekly/monthly metric values
export const slaMetricRecords = pgTable('sla_metric_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  metricId: uuid('metric_id')
    .notNull()
    .references(() => slaMetrics.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  contractId: uuid('contract_id').notNull(),
  recordedDate: date('recorded_date').notNull(),
  actualValue: decimal('actual_value', { precision: 10, scale: 2 }).notNull(),
  complianceRate: decimal('compliance_rate', { precision: 5, scale: 2 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type SLAMetric = typeof slaMetrics.$inferSelect;
export type NewSLAMetric = typeof slaMetrics.$inferInsert;
export type SLAViolation = typeof slaViolations.$inferSelect;
export type NewSLAViolation = typeof slaViolations.$inferInsert;
export type SLAMetricRecord = typeof slaMetricRecords.$inferSelect;
export type NewSLAMetricRecord = typeof slaMetricRecords.$inferInsert;

