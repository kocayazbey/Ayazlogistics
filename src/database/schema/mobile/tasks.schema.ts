import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';
import { users } from '../core/users.schema';

export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'cancelled']);
export const taskTypeEnum = pgEnum('task_type', ['delivery', 'inventory', 'pickup', 'putaway', 'cycle_count', 'maintenance', 'other']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);

export const mobileTasks = pgTable('mobile_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: taskTypeEnum('type').notNull(),
  status: taskStatusEnum('status').default('pending'),
  priority: taskPriorityEnum('priority').default('medium'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  location: jsonb('location'), // { latitude, longitude, address }
  dueDate: timestamp('due_date'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  tenantStatusIdx: index('mobile_tasks_tenant_status_idx').on(table.tenantId, table.status),
  assignedIdx: index('mobile_tasks_assigned_idx').on(table.assignedTo),
  typeIdx: index('mobile_tasks_type_idx').on(table.type),
}));

export type MobileTask = typeof mobileTasks.$inferSelect;
export type NewMobileTask = typeof mobileTasks.$inferInsert;

