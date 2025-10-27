import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const portalUsers = pgTable('portal_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 50 }).default('customer_user'),
  permissions: jsonb('permissions'),
  lastLogin: timestamp('last_login'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const stockCardUploads = pgTable('portal_stock_card_uploads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  uploadNumber: varchar('upload_number', { length: 50 }).notNull().unique(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url'),
  fileType: varchar('file_type', { length: 20 }), // 'excel', 'csv'
  totalRecords: integer('total_records'),
  processedRecords: integer('processed_records').default(0),
  successCount: integer('success_count').default(0),
  errorCount: integer('error_count').default(0),
  errors: jsonb('errors'),
  status: varchar('status', { length: 20 }).default('pending'),
  uploadedBy: uuid('uploaded_by').references(() => portalUsers.id),
  processedAt: timestamp('processed_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const portalNotifications = pgTable('portal_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => portalUsers.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  notificationType: varchar('notification_type', { length: 50 }),
  priority: varchar('priority', { length: 20 }).default('normal'),
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  actionUrl: text('action_url'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type PortalUser = typeof portalUsers.$inferSelect;
export type NewPortalUser = typeof portalUsers.$inferInsert;
export type StockCardUpload = typeof stockCardUploads.$inferSelect;
export type NewStockCardUpload = typeof stockCardUploads.$inferInsert;
export type PortalNotification = typeof portalNotifications.$inferSelect;
export type NewPortalNotification = typeof portalNotifications.$inferInsert;

