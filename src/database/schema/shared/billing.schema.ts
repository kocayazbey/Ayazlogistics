import { pgTable, text, timestamp, uuid, integer, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Invoices
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  customer: text('customer'),
  status: text('status').default('draft'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }),
  balance: decimal('balance', { precision: 15, scale: 2 }),
  invoiceDate: timestamp('invoice_date'),
  dueDate: timestamp('due_date'),
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Contracts
export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  contractNumber: text('contract_number').notNull(),
  customer: text('customer'),
  type: text('type'),
  status: text('status').default('draft'),
  totalValue: decimal('total_value', { precision: 15, scale: 2 }),
  paidAmount: decimal('paid_amount', { precision: 15, scale: 2 }),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  activatedAt: timestamp('activated_at'),
  renewedAt: timestamp('renewed_at'),
  renewalCount: integer('renewal_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Payments
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  paymentNumber: text('payment_number').notNull(),
  invoiceId: uuid('invoice_id'),
  customer: text('customer'),
  amount: decimal('amount', { precision: 15, scale: 2 }),
  method: text('method'),
  status: text('status').default('pending'),
  paymentDate: timestamp('payment_date'),
  processedAt: timestamp('processed_at'),
  refundedAt: timestamp('refunded_at'),
  refundAmount: decimal('refund_amount', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const invoiceRelations = relations(invoices, ({ many }) => ({
  payments: many(payments),
  items: many(invoiceItems),
}));

export const contractRelations = relations(contracts, ({ many }) => ({
  terms: many(contractTerms),
}));

export const paymentRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  invoiceId: uuid('invoice_id').notNull(),
  itemId: uuid('item_id'),
  description: text('description'),
  quantity: integer('quantity'),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }),
  totalPrice: decimal('total_price', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const invoiceItemRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export const contractTerms = pgTable('contract_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  contractId: uuid('contract_id').notNull(),
  term: text('term').notNull(),
  value: text('value'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const contractTermRelations = relations(contractTerms, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractTerms.contractId],
    references: [contracts.id],
  }),
}));
