import { pgTable, uuid, varchar, text, timestamp, decimal, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const glAccounts = pgTable('erp_gl_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  accountCode: varchar('account_code', { length: 50 }).notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(), // 'asset', 'liability', 'equity', 'revenue', 'expense'
  parentAccountId: uuid('parent_account_id'),
  balance: decimal('balance', { precision: 15, scale: 2 }).default('0'),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const journalEntries = pgTable('erp_journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  entryNumber: varchar('entry_number', { length: 50 }).notNull().unique(),
  entryDate: timestamp('entry_date').notNull(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => glAccounts.id),
  debit: decimal('debit', { precision: 15, scale: 2 }).default('0'),
  credit: decimal('credit', { precision: 15, scale: 2 }).default('0'),
  description: text('description'),
  reference: varchar('reference', { length: 100 }),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const transactions = pgTable('erp_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  transactionNumber: varchar('transaction_number', { length: 50 }).notNull().unique(),
  transactionDate: timestamp('transaction_date').notNull(),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // 'income', 'expense', 'transfer'
  category: varchar('category', { length: 100 }),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  description: text('description'),
  reference: varchar('reference', { length: 100 }),
  status: varchar('status', { length: 20 }).default('completed'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type GLAccount = typeof glAccounts.$inferSelect;
export type NewGLAccount = typeof glAccounts.$inferInsert;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

