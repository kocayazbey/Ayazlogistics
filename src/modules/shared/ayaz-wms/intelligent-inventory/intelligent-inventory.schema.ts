import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../database/schema/core/tenants.schema';
import { warehouses } from '../../../../database/schema/shared/wms.schema';
import { products } from '../../../../database/schema/shared/wms.schema';

// ABC/XYZ Analysis Results
export const abcXyzAnalysis = pgTable('abc_xyz_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  analysisPeriod: integer('analysis_period').notNull(), // days
  abcCategory: varchar('abc_category', { length: 1 }).notNull(), // A, B, C
  xyzCategory: varchar('xyz_category', { length: 1 }).notNull(), // X, Y, Z
  demandVariability: decimal('demand_variability', { precision: 5, scale: 3 }).notNull(),
  leadTime: integer('lead_time').notNull(), // days
  safetyStock: decimal('safety_stock', { precision: 10, scale: 2 }).notNull(),
  reorderPoint: decimal('reorder_point', { precision: 10, scale: 2 }).notNull(),
  economicOrderQuantity: decimal('economic_order_quantity', { precision: 10, scale: 2 }).notNull(),
  stockoutRisk: decimal('stockout_risk', { precision: 3, scale: 2 }).notNull(), // 0-1
  carryingCost: decimal('carrying_cost', { precision: 10, scale: 2 }).notNull(),
  stockoutCost: decimal('stockout_cost', { precision: 10, scale: 2 }).notNull(),
  recommendations: jsonb('recommendations').notNull(),
  analysisDate: timestamp('analysis_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Reorder Recommendations
export const reorderRecommendations = pgTable('reorder_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  currentStock: decimal('current_stock', { precision: 10, scale: 2 }).notNull(),
  reorderPoint: decimal('reorder_point', { precision: 10, scale: 2 }).notNull(),
  recommendedQuantity: decimal('recommended_quantity', { precision: 10, scale: 2 }).notNull(),
  urgencyLevel: varchar('urgency_level', { length: 20 }).notNull(), // critical, high, medium, low
  expectedStockoutDate: timestamp('expected_stockout_date'),
  costImpact: decimal('cost_impact', { precision: 12, scale: 2 }).notNull(),
  supplierLeadTime: integer('supplier_lead_time').notNull(), // days
  recommendedAction: text('recommended_action').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected, implemented
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  implementedAt: timestamp('implemented_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Demand Forecasts
export const demandForecasts = pgTable('demand_forecasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  forecastPeriod: integer('forecast_period').notNull(), // days
  forecastedDemand: decimal('forecasted_demand', { precision: 10, scale: 2 }).notNull(),
  confidenceLevel: decimal('confidence_level', { precision: 3, scale: 2 }).notNull(), // 0-1
  seasonalFactors: jsonb('seasonal_factors').notNull(),
  trendDirection: varchar('trend_direction', { length: 20 }).notNull(), // increasing, decreasing, stable
  modelAccuracy: decimal('model_accuracy', { precision: 3, scale: 2 }).notNull(), // 0-1
  forecastData: jsonb('forecast_data').notNull(),
  recommendations: jsonb('recommendations').notNull(),
  forecastDate: timestamp('forecast_date').notNull().defaultNow(),
  validUntil: timestamp('valid_until').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Inventory Optimization
export const inventoryOptimization = pgTable('inventory_optimization', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  currentLevel: decimal('current_level', { precision: 10, scale: 2 }).notNull(),
  recommendedLevel: decimal('recommended_level', { precision: 10, scale: 2 }).notNull(),
  potentialSavings: decimal('potential_savings', { precision: 12, scale: 2 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(), // increase, decrease, maintain
  reason: text('reason').notNull(),
  implementationComplexity: varchar('implementation_complexity', { length: 20 }).notNull(), // low, medium, high
  estimatedTimeline: varchar('estimated_timeline', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected, implemented
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  implementedAt: timestamp('implemented_at'),
  actualSavings: decimal('actual_savings', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Inventory Alerts
export const inventoryAlerts = pgTable('inventory_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  alertType: varchar('alert_type', { length: 30 }).notNull(), // low_stock, high_stock, stockout_risk, excess_inventory, slow_moving
  severity: varchar('severity', { length: 20 }).notNull(), // low, medium, high, critical
  message: text('message').notNull(),
  currentValue: decimal('current_value', { precision: 10, scale: 2 }).notNull(),
  thresholdValue: decimal('threshold_value', { precision: 10, scale: 2 }).notNull(),
  recommendedAction: text('recommended_action').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  acknowledgedBy: uuid('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Inventory Analytics Cache
export const inventoryAnalyticsCache = pgTable('inventory_analytics_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id')
    .notNull()
    .references(() => warehouses.id, { onDelete: 'cascade' }),
  cacheKey: varchar('cache_key', { length: 255 }).notNull().unique(),
  cacheData: jsonb('cache_data').notNull(),
  timeRange: integer('time_range').notNull(), // days
  includeTrends: boolean('include_trends').notNull().default(true),
  includeForecasts: boolean('include_forecasts').notNull().default(true),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Type exports
export type ABCXYZAnalysis = typeof abcXyzAnalysis.$inferSelect;
export type NewABCXYZAnalysis = typeof abcXyzAnalysis.$inferInsert;

export type ReorderRecommendation = typeof reorderRecommendations.$inferSelect;
export type NewReorderRecommendation = typeof reorderRecommendations.$inferInsert;

export type DemandForecast = typeof demandForecasts.$inferSelect;
export type NewDemandForecast = typeof demandForecasts.$inferInsert;

export type InventoryOptimization = typeof inventoryOptimization.$inferSelect;
export type NewInventoryOptimization = typeof inventoryOptimization.$inferInsert;

export type InventoryAlert = typeof inventoryAlerts.$inferSelect;
export type NewInventoryAlert = typeof inventoryAlerts.$inferInsert;

export type InventoryAnalyticsCache = typeof inventoryAnalyticsCache.$inferSelect;
export type NewInventoryAnalyticsCache = typeof inventoryAnalyticsCache.$inferInsert;
