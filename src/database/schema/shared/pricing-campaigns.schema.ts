import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';
import { products } from './products.schema';

// Pricing Rules
export const pricingRules = pgTable('pricing_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  ruleType: varchar('rule_type', { length: 50 }).notNull(), // percentage, fixed, tiered
  productId: uuid('product_id').references(() => products.id),
  customerId: uuid('customer_id'),
  minQuantity: integer('min_quantity'),
  maxQuantity: integer('max_quantity'),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }),
  discountAmount: decimal('discount_amount', { precision: 15, scale: 2 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  status: varchar('status', { length: 20 }).default('inactive'), // active, inactive
  priority: integer('priority').default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Campaigns
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  campaignName: varchar('campaign_name', { length: 255 }).notNull(),
  campaignType: varchar('campaign_type', { length: 50 }).notNull(), // discount, promotion, bundle
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: varchar('status', { length: 20 }).default('draft'), // draft, active, paused, completed
  discountType: varchar('discount_type', { length: 20 }), // percentage, fixed
  discountValue: decimal('discount_value', { precision: 15, scale: 2 }),
  minPurchaseAmount: decimal('min_purchase_amount', { precision: 15, scale: 2 }),
  maxDiscountAmount: decimal('max_discount_amount', { precision: 15, scale: 2 }),
  targetProducts: jsonb('target_products'),
  targetCustomers: jsonb('target_customers'),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').default(0),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Discounts
export const discounts = pgTable('discounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  discountCode: varchar('discount_code', { length: 50 }).notNull().unique(),
  discountName: varchar('discount_name', { length: 255 }).notNull(),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // percentage, fixed
  discountValue: decimal('discount_value', { precision: 15, scale: 2 }).notNull(),
  minPurchaseAmount: decimal('min_purchase_amount', { precision: 15, scale: 2 }),
  maxDiscountAmount: decimal('max_discount_amount', { precision: 15, scale: 2 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  status: varchar('status', { length: 20 }).default('active'),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').default(0),
  applicableProducts: jsonb('applicable_products'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Promotions
export const promotions = pgTable('promotions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  promotionName: varchar('promotion_name', { length: 255 }).notNull(),
  promotionType: varchar('promotion_type', { length: 50 }).notNull(), // buy_x_get_y, bundle, flash_sale
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  status: varchar('status', { length: 20 }).default('draft'),
  buyQuantity: integer('buy_quantity'),
  getQuantity: integer('get_quantity'),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }),
  applicableProducts: jsonb('applicable_products'),
  targetCustomers: jsonb('target_customers'),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').default(0),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type Discount = typeof discounts.$inferSelect;
export type NewDiscount = typeof discounts.$inferInsert;
export type Promotion = typeof promotions.$inferSelect;
export type NewPromotion = typeof promotions.$inferInsert;

