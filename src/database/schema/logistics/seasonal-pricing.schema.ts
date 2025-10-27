import { pgTable, uuid, varchar, decimal, date, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const seasonalPricingRules = pgTable('seasonal_pricing_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  seasonType: varchar('season_type', { length: 50 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  applicableServiceTypes: jsonb('applicable_service_types'),
  adjustmentType: varchar('adjustment_type', { length: 20 }).notNull(),
  adjustmentValue: decimal('adjustment_value', { precision: 10, scale: 2 }).notNull(),
  minimumCharge: decimal('minimum_charge', { precision: 12, scale: 2 }),
  maximumCharge: decimal('maximum_charge', { precision: 12, scale: 2 }),
  priority: varchar('priority', { length: 10 }).default('medium'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type SeasonalPricingRule = typeof seasonalPricingRules.$inferSelect;
export type NewSeasonalPricingRule = typeof seasonalPricingRules.$inferInsert;

