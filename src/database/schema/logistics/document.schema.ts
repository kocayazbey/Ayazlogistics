import { pgTable, uuid, varchar, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';
import { users } from '../core/users.schema';

export const documentTemplates = pgTable('document_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  templateName: varchar('template_name', { length: 255 }).notNull(),
  templateType: varchar('template_type', { length: 50 }).notNull(), // 'proposal', 'contract', 'invoice'
  templateContent: text('template_content'),
  templateUrl: text('template_url'),
  variables: jsonb('variables'), // {customer_name: '', contract_date: '', etc}
  version: integer('version').default(1),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  documentNumber: varchar('document_number', { length: 50 }).notNull().unique(),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  documentName: varchar('document_name', { length: 255 }).notNull(),
  relatedTo: varchar('related_to', { length: 50 }), // 'customer', 'contract', 'shipment'
  relatedId: uuid('related_id'),
  templateId: uuid('template_id')
    .references(() => documentTemplates.id),
  fileUrl: text('file_url'),
  fileType: varchar('file_type', { length: 20 }),
  fileSize: integer('file_size'),
  version: integer('version').default(1),
  status: varchar('status', { length: 20 }).default('draft'),
  signatureRequired: boolean('signature_required').default(false),
  signedAt: timestamp('signed_at'),
  signedBy: uuid('signed_by'),
  signature: text('signature'),
  metadata: jsonb('metadata'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const documentVersions = pgTable('document_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  fileUrl: text('file_url').notNull(),
  changes: text('changes'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type NewDocumentTemplate = typeof documentTemplates.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;

