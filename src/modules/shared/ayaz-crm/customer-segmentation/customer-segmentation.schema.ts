import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../database/schema/core/tenants.schema';

// Customer Segments
export const customerSegments = pgTable('customer_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  criteria: jsonb('criteria').notNull(),
  characteristics: jsonb('characteristics').notNull(),
  strategies: jsonb('strategies').notNull(),
  kpis: jsonb('kpis').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Segment Assignments
export const customerSegmentAssignments = pgTable('customer_segment_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  segmentId: uuid('segment_id')
    .notNull()
    .references(() => customerSegments.id, { onDelete: 'cascade' }),
  assignmentType: varchar('assignment_type', { length: 20 }).notNull(), // primary, secondary
  confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(), // 0-1
  assignedBy: uuid('assigned_by').notNull(),
  assignedAt: timestamp('assigned_at').notNull().defaultNow(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Profiles
export const customerProfiles = pgTable('customer_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  basicInfo: jsonb('basic_info').notNull(),
  behavioralMetrics: jsonb('behavioral_metrics').notNull(),
  logisticsPreferences: jsonb('logistics_preferences').notNull(),
  financialMetrics: jsonb('financial_metrics').notNull(),
  segment: jsonb('segment').notNull(),
  aiInsights: jsonb('ai_insights').notNull(),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Personalization Engine
export const personalizationEngine = pgTable('personalization_engine', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  personalizedContent: jsonb('personalized_content').notNull(),
  recommendations: jsonb('recommendations').notNull(),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Analytics
export const customerAnalytics = pgTable('customer_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  totalCustomers: integer('total_customers').notNull(),
  segmentDistribution: jsonb('segment_distribution').notNull(),
  averageCustomerValue: decimal('average_customer_value', { precision: 12, scale: 2 }).notNull(),
  topPerformingSegments: jsonb('top_performing_segments').notNull(),
  recommendations: jsonb('recommendations').notNull(),
  growthMetrics: jsonb('growth_metrics').notNull(),
  revenueMetrics: jsonb('revenue_metrics').notNull(),
  analysisDate: date('analysis_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Insights
export const customerInsights = pgTable('customer_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  predictedChurn: decimal('predicted_churn', { precision: 3, scale: 2 }).notNull(),
  nextOrderPrediction: timestamp('next_order_prediction'),
  recommendedServices: jsonb('recommended_services').notNull(),
  upsellingOpportunities: jsonb('upselling_opportunities').notNull(),
  crossSellingOpportunities: jsonb('cross_selling_opportunities').notNull(),
  personalizedOffers: jsonb('personalized_offers').notNull(),
  riskFactors: jsonb('risk_factors').notNull(),
  opportunityFactors: jsonb('opportunity_factors').notNull(),
  actionRecommendations: jsonb('action_recommendations').notNull(),
  lastUpdated: timestamp('last_updated').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Journey
export const customerJourney = pgTable('customer_journey', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  stages: jsonb('stages').notNull(),
  touchpoints: jsonb('touchpoints').notNull(),
  metrics: jsonb('metrics').notNull(),
  nextActions: jsonb('next_actions').notNull(),
  journeyStartDate: timestamp('journey_start_date').notNull(),
  journeyEndDate: timestamp('journey_end_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Segment Performance
export const segmentPerformance = pgTable('segment_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  segmentId: uuid('segment_id')
    .notNull()
    .references(() => customerSegments.id, { onDelete: 'cascade' }),
  metrics: jsonb('metrics').notNull(),
  growth: jsonb('growth').notNull(),
  efficiency: jsonb('efficiency').notNull(),
  recommendations: jsonb('recommendations').notNull(),
  performanceDate: date('performance_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Churn Analysis
export const customerChurnAnalysis = pgTable('customer_churn_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  segmentId: uuid('segment_id')
    .notNull()
    .references(() => customerSegments.id, { onDelete: 'cascade' }),
  churnRate: decimal('churn_rate', { precision: 3, scale: 2 }).notNull(),
  churnedCustomers: integer('churned_customers').notNull(),
  atRiskCustomers: integer('at_risk_customers').notNull(),
  retentionRate: decimal('retention_rate', { precision: 3, scale: 2 }).notNull(),
  churnFactors: jsonb('churn_factors').notNull(),
  retentionStrategies: jsonb('retention_strategies').notNull(),
  analysisDate: date('analysis_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Lifetime Value
export const customerLifetimeValue = pgTable('customer_lifetime_value', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  segmentId: uuid('segment_id')
    .notNull()
    .references(() => customerSegments.id, { onDelete: 'cascade' }),
  currentValue: decimal('current_value', { precision: 12, scale: 2 }).notNull(),
  predictedValue: decimal('predicted_value', { precision: 12, scale: 2 }).notNull(),
  lifetimeValue: decimal('lifetime_value', { precision: 12, scale: 2 }).notNull(),
  valueGrowth: decimal('value_growth', { precision: 3, scale: 2 }).notNull(),
  valueFactors: jsonb('value_factors').notNull(),
  optimizationOpportunities: jsonb('optimization_opportunities').notNull(),
  analysisDate: date('analysis_date').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Recommendations
export const customerRecommendations = pgTable('customer_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  recommendationType: varchar('recommendation_type', { length: 50 }).notNull(), // products, services, promotions
  recommendations: jsonb('recommendations').notNull(),
  confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Touchpoints
export const customerTouchpoints = pgTable('customer_touchpoints', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  touchpointType: varchar('touchpoint_type', { length: 50 }).notNull(), // email, phone, chat, visit
  channel: varchar('channel', { length: 50 }).notNull(),
  outcome: varchar('outcome', { length: 50 }).notNull(),
  satisfaction: decimal('satisfaction', { precision: 3, scale: 2 }),
  notes: text('notes'),
  touchpointDate: timestamp('touchpoint_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Type exports
export type CustomerSegment = typeof customerSegments.$inferSelect;
export type NewCustomerSegment = typeof customerSegments.$inferInsert;

export type CustomerSegmentAssignment = typeof customerSegmentAssignments.$inferSelect;
export type NewCustomerSegmentAssignment = typeof customerSegmentAssignments.$inferInsert;

export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type NewCustomerProfile = typeof customerProfiles.$inferInsert;

export type PersonalizationEngine = typeof personalizationEngine.$inferSelect;
export type NewPersonalizationEngine = typeof personalizationEngine.$inferInsert;

export type CustomerAnalytics = typeof customerAnalytics.$inferSelect;
export type NewCustomerAnalytics = typeof customerAnalytics.$inferInsert;

export type CustomerInsight = typeof customerInsights.$inferSelect;
export type NewCustomerInsight = typeof customerInsights.$inferInsert;

export type CustomerJourney = typeof customerJourney.$inferSelect;
export type NewCustomerJourney = typeof customerJourney.$inferInsert;

export type SegmentPerformance = typeof segmentPerformance.$inferSelect;
export type NewSegmentPerformance = typeof segmentPerformance.$inferInsert;

export type CustomerChurnAnalysis = typeof customerChurnAnalysis.$inferSelect;
export type NewCustomerChurnAnalysis = typeof customerChurnAnalysis.$inferInsert;

export type CustomerLifetimeValue = typeof customerLifetimeValue.$inferSelect;
export type NewCustomerLifetimeValue = typeof customerLifetimeValue.$inferInsert;

export type CustomerRecommendation = typeof customerRecommendations.$inferSelect;
export type NewCustomerRecommendation = typeof customerRecommendations.$inferInsert;

export type CustomerTouchpoint = typeof customerTouchpoints.$inferSelect;
export type NewCustomerTouchpoint = typeof customerTouchpoints.$inferInsert;
