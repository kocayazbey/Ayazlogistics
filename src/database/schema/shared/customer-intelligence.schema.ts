import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer, boolean, text, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../core/tenants.schema';
import { customers } from './crm.schema';

// Customer Segments
export const customerSegments = pgTable('customer_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  segmentName: varchar('segment_name', { length: 255 }).notNull(),
  segmentType: varchar('segment_type', { length: 50 }),
  description: text('description'),
  criteria: jsonb('criteria'),
  customerCount: integer('customer_count').default(0),
  totalRevenue: decimal('total_revenue', { precision: 18, scale: 2 }),
  averageCLV: decimal('average_clv', { precision: 18, scale: 2 }),
  churnRate: decimal('churn_rate', { precision: 5, scale: 2 }),
  profitability: decimal('profitability', { precision: 5, scale: 2 }),
  growthRate: decimal('growth_rate', { precision: 5, scale: 2 }),
  characteristics: jsonb('characteristics'),
  recommendedStrategy: text('recommended_strategy'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Scores
export const customerScores = pgTable('customer_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  scoreDate: date('score_date').notNull(),
  creditScore: decimal('credit_score', { precision: 5, scale: 2 }),
  healthScore: decimal('health_score', { precision: 5, scale: 2 }),
  engagementScore: decimal('engagement_score', { precision: 5, scale: 2 }),
  satisfactionScore: decimal('satisfaction_score', { precision: 5, scale: 2 }),
  loyaltyScore: decimal('loyalty_score', { precision: 5, scale: 2 }),
  riskScore: decimal('risk_score', { precision: 5, scale: 2 }),
  overallScore: decimal('overall_score', { precision: 5, scale: 2 }),
  scoreFactors: jsonb('score_factors'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Predictions
export const customerPredictions = pgTable('customer_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  predictionDate: date('prediction_date').notNull(),
  predictionType: varchar('prediction_type', { length: 50 }).notNull(), // 'churn', 'clv', 'next_purchase'
  predictionValue: decimal('prediction_value', { precision: 18, scale: 2 }),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  predictionHorizon: integer('prediction_horizon'), // days
  actualValue: decimal('actual_value', { precision: 18, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 5, scale: 2 }),
  modelVersion: varchar('model_version', { length: 50 }),
  features: jsonb('features'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Customer Recommendations
export const customerRecommendations = pgTable('customer_recommendations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  recommendationType: varchar('recommendation_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  category: varchar('category', { length: 50 }),
  expectedImpact: decimal('expected_impact', { precision: 5, scale: 2 }),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  actionItems: jsonb('action_items'),
  status: varchar('status', { length: 20 }).default('pending'),
  implementedAt: timestamp('implemented_at'),
  result: text('result'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const customerSegmentRelations = relations(customerSegments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customerSegments.tenantId],
    references: [tenants.id],
  }),
  scores: many(customerScores),
  predictions: many(customerPredictions),
  recommendations: many(customerRecommendations),
}));

export const customerScoreRelations = relations(customerScores, ({ one }) => ({
  tenant: one(tenants, {
    fields: [customerScores.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [customerScores.customerId],
    references: [customers.id],
  }),
}));

export const customerPredictionRelations = relations(customerPredictions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [customerPredictions.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [customerPredictions.customerId],
    references: [customers.id],
  }),
}));

export const customerRecommendationRelations = relations(customerRecommendations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [customerRecommendations.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [customerRecommendations.customerId],
    references: [customers.id],
  }),
}));

// Type definitions
export type CustomerSegment = typeof customerSegments.$inferSelect;
export type NewCustomerSegment = typeof customerSegments.$inferInsert;
export type CustomerScore = typeof customerScores.$inferSelect;
export type NewCustomerScore = typeof customerScores.$inferInsert;
export type CustomerPrediction = typeof customerPredictions.$inferSelect;
export type NewCustomerPrediction = typeof customerPredictions.$inferInsert;
export type CustomerRecommendation = typeof customerRecommendations.$inferSelect;
export type NewCustomerRecommendation = typeof customerRecommendations.$inferInsert;
