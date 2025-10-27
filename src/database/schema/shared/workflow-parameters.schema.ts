import { pgTable, text, timestamp, uuid, integer, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Workflow Parameters
export const workflowParameters = pgTable('workflow_parameters', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(), // wms, tms, crm, erp, billing
  type: text('type').notNull(), // string, number, boolean, json
  value: text('value'),
  defaultValue: text('default_value'),
  isRequired: boolean('is_required').default(false),
  isSystem: boolean('is_system').default(false),
  validation: jsonb('validation'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Workflow Rules
export const workflowRules = pgTable('workflow_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').notNull(),
  condition: jsonb('condition'),
  action: jsonb('action'),
  priority: integer('priority').default(0),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Workflow Triggers
export const workflowTriggers = pgTable('workflow_triggers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  event: text('event').notNull(),
  condition: jsonb('condition'),
  action: jsonb('action'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Workflow Logs
export const workflowLogs = pgTable('workflow_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  workflowId: uuid('workflow_id'),
  workflowType: text('workflow_type'),
  event: text('event').notNull(),
  data: jsonb('data'),
  status: text('status').default('pending'),
  executedAt: timestamp('executed_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const workflowParameterRelations = relations(workflowParameters, ({ many }) => ({
  rules: many(workflowRules),
  triggers: many(workflowTriggers),
}));

export const workflowRuleRelations = relations(workflowRules, ({ one, many }) => ({
  parameter: one(workflowParameters, {
    fields: [workflowRules.parameterId],
    references: [workflowParameters.id],
  }),
  logs: many(workflowLogs),
}));

export const workflowTriggerRelations = relations(workflowTriggers, ({ one, many }) => ({
  parameter: one(workflowParameters, {
    fields: [workflowTriggers.parameterId],
    references: [workflowParameters.id],
  }),
  logs: many(workflowLogs),
}));

export const workflowLogRelations = relations(workflowLogs, ({ one }) => ({
  rule: one(workflowRules, {
    fields: [workflowLogs.workflowId],
    references: [workflowRules.id],
  }),
  trigger: one(workflowTriggers, {
    fields: [workflowLogs.workflowId],
    references: [workflowTriggers.id],
  }),
}));

// Type definitions
export type WorkflowParameter = typeof workflowParameters.$inferSelect;
export type NewWorkflowParameter = typeof workflowParameters.$inferInsert;
export type WorkflowRule = typeof workflowRules.$inferSelect;
export type NewWorkflowRule = typeof workflowRules.$inferInsert;
export type WorkflowTrigger = typeof workflowTriggers.$inferSelect;
export type NewWorkflowTrigger = typeof workflowTriggers.$inferInsert;
export type WorkflowLog = typeof workflowLogs.$inferSelect;
export type NewWorkflowLog = typeof workflowLogs.$inferInsert;