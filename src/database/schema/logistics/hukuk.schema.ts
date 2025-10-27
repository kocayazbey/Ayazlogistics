import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, date, integer } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';
import { users } from '../core/users.schema';

export const legalContracts = pgTable('hukuk_contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  contractNumber: varchar('contract_number', { length: 50 }).notNull().unique(),
  contractType: varchar('contract_type', { length: 50 }), // 'service_agreement', 'storage_agreement', 'transport_agreement'
  customerId: uuid('customer_id').notNull(),
  customerName: varchar('customer_name', { length: 255 }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  status: varchar('status', { length: 20 }).default('draft'),
  documentUrl: text('document_url'),
  signedDocumentUrl: text('signed_document_url'),
  terms: jsonb('terms'),
  clauses: jsonb('clauses'),
  approvalStatus: varchar('approval_status', { length: 20 }).default('pending'),
  legalApprovedBy: uuid('legal_approved_by').references(() => users.id),
  legalApprovedAt: timestamp('legal_approved_at'),
  adminApprovedBy: uuid('admin_approved_by').references(() => users.id),
  adminApprovedAt: timestamp('admin_approved_at'),
  customerSignedAt: timestamp('customer_signed_at'),
  customerSignature: text('customer_signature'),
  rejectionReason: text('rejection_reason'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const legalApprovals = pgTable('hukuk_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id')
    .notNull()
    .references(() => legalContracts.id, { onDelete: 'cascade' }),
  approvalStage: varchar('approval_stage', { length: 50 }).notNull(), // 'legal_review', 'admin_approval', 'customer_signature'
  approverRole: varchar('approver_role', { length: 50 }),
  approverId: uuid('approver_id').references(() => users.id),
  decision: varchar('decision', { length: 20 }), // 'approved', 'rejected', 'pending'
  comments: text('comments'),
  approvedAt: timestamp('approved_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const legalDocuments = pgTable('hukuk_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  contractId: uuid('contract_id')
    .references(() => legalContracts.id),
  documentType: varchar('document_type', { length: 50 }), // 'proposal', 'contract', 'amendment', 'termination'
  documentNumber: varchar('document_number', { length: 50 }).notNull(),
  version: integer('version').default(1),
  documentUrl: text('document_url'),
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  verifiedBy: uuid('verified_by').references(() => users.id),
  verifiedAt: timestamp('verified_at'),
  isVerified: boolean('is_verified').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type LegalContract = typeof legalContracts.$inferSelect;
export type NewLegalContract = typeof legalContracts.$inferInsert;
export type LegalApproval = typeof legalApprovals.$inferSelect;
export type NewLegalApproval = typeof legalApprovals.$inferInsert;
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type NewLegalDocument = typeof legalDocuments.$inferInsert;

