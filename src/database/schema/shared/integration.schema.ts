import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const integrations = pgTable('integration_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  integrationName: varchar('integration_name', { length: 255 }).notNull(),
  integrationType: varchar('integration_type', { length: 50 }).notNull(), // 'payment', 'shipping', 'marketplace', 'gps', 'iot', 'erp'
  provider: varchar('provider', { length: 100 }),
  credentials: jsonb('credentials'), // encrypted
  config: jsonb('config'),
  webhookUrl: text('webhook_url'),
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const integrationLogs = pgTable('integration_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: uuid('integration_id')
    .notNull()
    .references(() => integrations.id, { onDelete: 'cascade' }),
  operation: varchar('operation', { length: 100 }).notNull(),
  direction: varchar('direction', { length: 10 }), // 'inbound', 'outbound'
  request: jsonb('request'),
  response: jsonb('response'),
  statusCode: integer('status_code'),
  success: boolean('success'),
  errorMessage: text('error_message'),
  duration: integer('duration'), // milliseconds
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;
export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type NewIntegrationLog = typeof integrationLogs.$inferInsert;

