import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../database/schema/core/tenants.schema';

// Performance Metrics
export const performanceMetrics = pgTable('performance_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // efficiency, productivity, quality, cost, customer_satisfaction, financial, operational, strategic
  category: varchar('category', { length: 50 }).notNull(), // financial, operational, customer, employee, quality, innovation, sustainability
  value: decimal('value', { precision: 12, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull(), // daily, weekly, monthly, quarterly, yearly
  owner: varchar('owner', { length: 100 }).notNull(),
  stakeholders: jsonb('stakeholders').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// KPI Definitions
export const kpiDefinitions = pgTable('kpi_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  targetValue: decimal('target_value', { precision: 12, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull(),
  owner: varchar('owner', { length: 100 }).notNull(),
  stakeholders: jsonb('stakeholders').notNull(),
  calculationFormula: text('calculation_formula'),
  dataSource: varchar('data_source', { length: 100 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// KPI Values
export const kpiValues = pgTable('kpi_values', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  kpiId: uuid('kpi_id')
    .notNull()
    .references(() => kpiDefinitions.id, { onDelete: 'cascade' }),
  value: decimal('value', { precision: 12, scale: 2 }).notNull(),
  targetValue: decimal('target_value', { precision: 12, scale: 2 }).notNull(),
  previousValue: decimal('previous_value', { precision: 12, scale: 2 }),
  changePercentage: decimal('change_percentage', { precision: 5, scale: 2 }),
  trendDirection: varchar('trend_direction', { length: 20 }).notNull(), // improving, declining, stable, volatile
  status: varchar('status', { length: 20 }).notNull(), // on_track, at_risk, off_track
  measurementDate: date('measurement_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Performance Dashboards
export const performanceDashboards = pgTable('performance_dashboards', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // executive, operational, departmental, custom
  layout: jsonb('layout').notNull(),
  widgets: jsonb('widgets').notNull(),
  filters: jsonb('filters').notNull(),
  refreshInterval: integer('refresh_interval').notNull().default(300), // seconds
  permissions: jsonb('permissions').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Performance Reports
export const performanceReports = pgTable('performance_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // monthly, quarterly, yearly, custom
  period: jsonb('period').notNull(),
  summary: jsonb('summary').notNull(),
  details: jsonb('details').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, generated, published, archived
  generatedBy: uuid('generated_by').notNull(),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Performance Alerts
export const performanceAlerts = pgTable('performance_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(), // low, medium, high, critical
  message: text('message').notNull(),
  description: text('description'),
  metric: varchar('metric', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'), // open, acknowledged, in_progress, resolved, closed
  acknowledgedBy: uuid('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at'),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  resolution: text('resolution'),
  actions: jsonb('actions').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Performance Benchmarks
export const performanceBenchmarks = pgTable('performance_benchmarks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  industry: varchar('industry', { length: 50 }).notNull(),
  companySize: varchar('company_size', { length: 20 }).notNull(),
  value: decimal('value', { precision: 12, scale: 2 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  percentile: decimal('percentile', { precision: 5, scale: 2 }).notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  date: date('date').notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Performance Trends
export const performanceTrends = pgTable('performance_trends', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  metric: varchar('metric', { length: 100 }).notNull(),
  period: jsonb('period').notNull(),
  data: jsonb('data').notNull(),
  direction: varchar('direction', { length: 20 }).notNull(), // improving, declining, stable, volatile
  magnitude: decimal('magnitude', { precision: 5, scale: 2 }).notNull(),
  significance: varchar('significance', { length: 20 }).notNull(), // low, medium, high
  forecast: jsonb('forecast').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Performance Comparisons
export const performanceComparisons = pgTable('performance_comparisons', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(), // period_over_period, year_over_year, benchmark, target, peer
  metric: varchar('metric', { length: 100 }).notNull(),
  periods: jsonb('periods').notNull(),
  result: jsonb('result').notNull(),
  insights: jsonb('insights').notNull(),
  recommendations: jsonb('recommendations').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Performance Forecasts
export const performanceForecasts = pgTable('performance_forecasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  metric: varchar('metric', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // short_term, medium_term, long_term, seasonal
  period: jsonb('period').notNull(),
  data: jsonb('data').notNull(),
  accuracy: jsonb('accuracy').notNull(),
  assumptions: jsonb('assumptions').notNull(),
  limitations: jsonb('limitations').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Custom Metrics
export const customMetrics = pgTable('custom_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  formula: text('formula').notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  unit: varchar('unit', { length: 20 }).notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull(),
  owner: varchar('owner', { length: 100 }).notNull(),
  stakeholders: jsonb('stakeholders').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Performance Insights
export const performanceInsights = pgTable('performance_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  impact: varchar('impact', { length: 20 }).notNull(), // low, medium, high
  confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),
  metrics: jsonb('metrics').notNull(),
  recommendations: jsonb('recommendations').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Performance Recommendations
export const performanceRecommendations = pgTable('performance_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }).notNull(), // low, medium, high, critical
  impact: varchar('impact', { length: 20 }).notNull(), // low, medium, high
  effort: varchar('effort', { length: 20 }).notNull(), // low, medium, high
  timeline: varchar('timeline', { length: 50 }).notNull(),
  owner: varchar('owner', { length: 100 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, in_progress, completed, cancelled
  metrics: jsonb('metrics').notNull(),
  actions: jsonb('actions').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Type exports
export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type NewPerformanceMetric = typeof performanceMetrics.$inferInsert;

export type KPIDefinition = typeof kpiDefinitions.$inferSelect;
export type NewKPIDefinition = typeof kpiDefinitions.$inferInsert;

export type KPIValue = typeof kpiValues.$inferSelect;
export type NewKPIValue = typeof kpiValues.$inferInsert;

export type PerformanceDashboard = typeof performanceDashboards.$inferSelect;
export type NewPerformanceDashboard = typeof performanceDashboards.$inferInsert;

export type PerformanceReport = typeof performanceReports.$inferSelect;
export type NewPerformanceReport = typeof performanceReports.$inferInsert;

export type PerformanceAlert = typeof performanceAlerts.$inferSelect;
export type NewPerformanceAlert = typeof performanceAlerts.$inferInsert;

export type PerformanceBenchmark = typeof performanceBenchmarks.$inferSelect;
export type NewPerformanceBenchmark = typeof performanceBenchmarks.$inferInsert;

export type PerformanceTrend = typeof performanceTrends.$inferSelect;
export type NewPerformanceTrend = typeof performanceTrends.$inferInsert;

export type PerformanceComparison = typeof performanceComparisons.$inferSelect;
export type NewPerformanceComparison = typeof performanceComparisons.$inferInsert;

export type PerformanceForecast = typeof performanceForecasts.$inferSelect;
export type NewPerformanceForecast = typeof performanceForecasts.$inferInsert;

export type CustomMetric = typeof customMetrics.$inferSelect;
export type NewCustomMetric = typeof customMetrics.$inferInsert;

export type PerformanceInsight = typeof performanceInsights.$inferSelect;
export type NewPerformanceInsight = typeof performanceInsights.$inferInsert;

export type PerformanceRecommendation = typeof performanceRecommendations.$inferSelect;
export type NewPerformanceRecommendation = typeof performanceRecommendations.$inferInsert;
