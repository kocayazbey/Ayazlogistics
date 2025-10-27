import { pgTable, text, timestamp, uuid, integer, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../core/tenants.schema';
import { products } from '../logistics/tms.schema';

// Analytics Dashboard
export const analyticsDashboards = pgTable('analytics_dashboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // wms, tms, crm, erp, billing
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Analytics Widgets
export const analyticsWidgets = pgTable('analytics_widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  dashboardId: uuid('dashboard_id').notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // chart, table, metric, kpi
  config: jsonb('config'),
  position: jsonb('position'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Analytics Reports
export const analyticsReports = pgTable('analytics_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  category: text('category'),
  status: text('status').default('active'),
  config: jsonb('config'),
  schedule: jsonb('schedule'),
  lastGenerated: timestamp('last_generated'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Analytics Metrics
export const analyticsMetrics = pgTable('analytics_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  value: decimal('value', { precision: 15, scale: 2 }),
  unit: text('unit'),
  category: text('category'),
  subcategory: text('subcategory'),
  timestamp: timestamp('timestamp').defaultNow(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Analytics KPIs
export const analyticsKpis = pgTable('analytics_kpis', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  target: decimal('target', { precision: 15, scale: 2 }),
  current: decimal('current', { precision: 15, scale: 2 }),
  unit: text('unit'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Analytics Alerts
export const analyticsAlerts = pgTable('analytics_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(), // threshold, anomaly, trend
  condition: jsonb('condition'),
  status: text('status').default('active'),
  triggeredAt: timestamp('triggered_at'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// AI/ML Results - Customer Segmentation
export const customerSegmentationResults = pgTable('customer_segmentation_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  totalCustomers: integer('total_customers').notNull(),
  totalClusters: integer('total_clusters').notNull(),
  averageClusterSize: decimal('average_cluster_size', { precision: 10, scale: 2 }),
  totalWithinClusterSum: decimal('total_within_cluster_sum', { precision: 15, scale: 2 }),
  averageSilhouetteScore: decimal('average_silhouette_score', { precision: 5, scale: 4 }),
  convergenceIterations: integer('convergence_iterations'),
  processingTime: integer('processing_time'), // milliseconds
  silhouetteScore: decimal('silhouette_score', { precision: 5, scale: 4 }),
  calinskiHarabaszScore: decimal('calinski_harabasz_score', { precision: 10, scale: 2 }),
  daviesBouldinScore: decimal('davies_bouldin_score', { precision: 5, scale: 2 }),
  inertia: decimal('inertia', { precision: 15, scale: 2 }),
  stability: decimal('stability', { precision: 5, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// AI/ML Results - Demand Forecasting
export const demandForecastingResults = pgTable('demand_forecasting_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  productId: uuid('product_id').notNull(),
  forecastType: text('forecast_type').notNull(), // lstm, arima, ensemble
  forecastPeriod: text('forecast_period').notNull(), // 7d, 30d, 90d
  predictedValue: decimal('predicted_value', { precision: 15, scale: 2 }),
  confidenceInterval: jsonb('confidence_interval'), // { lower, upper }
  accuracy: decimal('accuracy', { precision: 5, scale: 4 }),
  modelVersion: text('model_version'),
  featuresUsed: jsonb('features_used'),
  createdAt: timestamp('created_at').defaultNow(),
});

// AI/ML Results - Route Optimization
export const routeOptimizationResults = pgTable('route_optimization_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  optimizationType: text('optimization_type').notNull(), // basic, advanced, multi-objective
  totalDistance: decimal('total_distance', { precision: 10, scale: 2 }),
  totalTime: decimal('total_time', { precision: 8, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 15, scale: 2 }),
  fuelConsumption: decimal('fuel_consumption', { precision: 8, scale: 2 }),
  carbonFootprint: decimal('carbon_footprint', { precision: 8, scale: 2 }),
  numberOfRoutes: integer('number_of_routes'),
  numberOfVehicles: integer('number_of_vehicles'),
  algorithmUsed: text('algorithm_used'),
  parameters: jsonb('parameters'),
  resultData: jsonb('result_data'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const analyticsDashboardRelations = relations(analyticsDashboards, ({ many }) => ({
  widgets: many(analyticsWidgets),
}));

export const analyticsWidgetRelations = relations(analyticsWidgets, ({ one }) => ({
  dashboard: one(analyticsDashboards, {
    fields: [analyticsWidgets.dashboardId],
    references: [analyticsDashboards.id],
  }),
}));

export const analyticsReportRelations = relations(analyticsReports, ({ many }) => ({
  metrics: many(analyticsMetrics),
}));

export const analyticsMetricRelations = relations(analyticsMetrics, ({ one }) => ({
  report: one(analyticsReports, {
    fields: [analyticsMetrics.reportId],
    references: [analyticsReports.id],
  }),
}));

export const analyticsKpiRelations = relations(analyticsKpis, ({ many }) => ({
  metrics: many(analyticsMetrics),
}));

export const analyticsAlertRelations = relations(analyticsAlerts, ({ many }) => ({
  metrics: many(analyticsMetrics),
}));

export const customerSegmentationResultRelations = relations(customerSegmentationResults, ({ one }) => ({
  tenant: one(tenants, {
    fields: [customerSegmentationResults.tenantId],
    references: [tenants.id],
  }),
}));

export const demandForecastingResultRelations = relations(demandForecastingResults, ({ one }) => ({
  tenant: one(tenants, {
    fields: [demandForecastingResults.tenantId],
    references: [tenants.id],
  }),
  product: one(products, {
    fields: [demandForecastingResults.productId],
    references: [products.id],
  }),
}));

export const routeOptimizationResultRelations = relations(routeOptimizationResults, ({ one }) => ({
  tenant: one(tenants, {
    fields: [routeOptimizationResults.tenantId],
    references: [tenants.id],
  }),
}));