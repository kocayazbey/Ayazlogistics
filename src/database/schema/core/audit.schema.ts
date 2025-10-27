import { pgTable, text, timestamp, uuid, jsonb, integer, boolean } from 'drizzle-orm/pg-core';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id'),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  method: text('method').notNull(),
  endpoint: text('endpoint').notNull(),
  ip: text('ip').notNull(),
  userAgent: text('user_agent').notNull(),
  requestBody: jsonb('request_body'),
  responseStatus: integer('response_status').notNull(),
  responseTime: integer('response_time').notNull(),
  changes: jsonb('changes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Soft delete tracking table
export const softDeletes = pgTable('soft_deletes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  userId: uuid('user_id').notNull(),

  // Entity information
  entityType: text('entity_type').notNull(), // 'users', 'products', 'orders', etc.
  entityId: uuid('entity_id').notNull(),
  entityData: jsonb('entity_data').notNull(), // Full entity data before deletion

  // Deletion details
  deletedAt: timestamp('deleted_at').defaultNow(),
  deletedBy: uuid('deleted_by').notNull(),

  // Restore information
  isRestored: boolean('is_restored').default(false),
  restoredAt: timestamp('restored_at'),
  restoredBy: uuid('restored_by'),

  // Audit trail
  reason: text('reason'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  // Compliance
  retentionUntil: timestamp('retention_until'), // For GDPR compliance
  backupLocation: text('backup_location'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Backup and recovery table for critical data
export const dataBackups = pgTable('data_backups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),

  backupType: text('backup_type').notNull(), // 'full', 'incremental', 'entity'
  entityType: text('entity_type'),
  entityIds: jsonb('entity_ids'), // Array of entity IDs

  // Backup metadata
  backupSize: integer('backup_size'), // Size in bytes
  recordCount: integer('record_count'),
  compressionRatio: integer('compression_ratio'),

  // Storage information
  storageLocation: text('storage_location').notNull(),
  storageProvider: text('storage_provider').default('local'),

  // Encryption
  isEncrypted: boolean('is_encrypted').default(true),
  encryptionKey: text('encryption_key'),

  // Status
  status: text('status').default('completed'), // pending, in_progress, completed, failed
  errorMessage: text('error_message'),

  // Scheduling
  isScheduled: boolean('is_scheduled').default(false),
  scheduleCron: text('schedule_cron'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type SoftDelete = typeof softDeletes.$inferSelect;
export type NewSoftDelete = typeof softDeletes.$inferInsert;
export type DataBackup = typeof dataBackups.$inferSelect;
export type NewDataBackup = typeof dataBackups.$inferInsert;