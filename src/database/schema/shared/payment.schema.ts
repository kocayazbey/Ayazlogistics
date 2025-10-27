import { pgTable, uuid, varchar, text, timestamp, decimal, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';
import { users } from '../core/users.schema';

// Enums for payment system
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'credit_card',
  'debit_card',
  'bank_transfer',
  'cash',
  'check'
]);

export const currencyEnum = pgEnum('currency', [
  'TRY',
  'USD',
  'EUR',
  'GBP'
]);

// Payment transactions table
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Payment identifiers
  paymentId: varchar('payment_id', { length: 100 }).notNull().unique(),
  orderId: varchar('order_id', { length: 100 }).notNull(),

  // Payment details
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: currencyEnum('currency').notNull().default('TRY'),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),

  // Status and timestamps
  status: paymentStatusEnum('status').notNull().default('pending'),
  statusMessage: text('status_message'),
  processedAt: timestamp('processed_at'),
  completedAt: timestamp('completed_at'),
  refundedAt: timestamp('refunded_at'),

  // 3D Secure details
  threeDSecureId: varchar('three_d_secure_id', { length: 100 }),
  authenticationId: varchar('authentication_id', { length: 100 }),
  cavv: varchar('cavv', { length: 100 }),
  eci: varchar('eci', { length: 10 }),
  xid: varchar('xid', { length: 100 }),

  // Bank details
  bankReference: varchar('bank_reference', { length: 100 }),
  transactionId: varchar('transaction_id', { length: 100 }),
  authCode: varchar('auth_code', { length: 50 }),

  // Refund details
  refundAmount: decimal('refund_amount', { precision: 15, scale: 2 }),
  refundReason: text('refund_reason'),
  originalPaymentId: uuid('original_payment_id').references(() => payments.id),

  // Customer and billing info
  customerName: varchar('customer_name', { length: 255 }),
  customerEmail: varchar('customer_email', { length: 255 }),
  billingAddress: jsonb('billing_address'),

  // Security and compliance
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  riskScore: decimal('risk_score', { precision: 5, scale: 2 }),

  // Metadata
  metadata: jsonb('metadata'),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Payment logs for audit trail
export const paymentLogs = pgTable('payment_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id, { onDelete: 'cascade' }),

  action: varchar('action', { length: 50 }).notNull(), // initiated, verified, completed, failed, refunded
  oldStatus: paymentStatusEnum('old_status'),
  newStatus: paymentStatusEnum('new_status'),

  amount: decimal('amount', { precision: 15, scale: 2 }),
  currency: currencyEnum('currency'),

  userId: uuid('user_id').references(() => users.id),
  description: text('description'),

  // Technical details
  requestData: jsonb('request_data'),
  responseData: jsonb('response_data'),
  errorMessage: text('error_message'),

  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Payment gateway configurations
export const paymentGateways = pgTable('payment_gateways', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  gatewayName: varchar('gateway_name', { length: 100 }).notNull(),
  gatewayType: varchar('gateway_type', { length: 50 }).notNull(), // bank, psp, wallet

  // API credentials (encrypted)
  apiKey: text('api_key').notNull(),
  apiSecret: text('api_secret').notNull(),
  merchantId: varchar('merchant_id', { length: 100 }),
  webhookSecret: text('webhook_secret'),

  // Gateway settings
  isActive: boolean('is_active').notNull().default(true),
  isSandbox: boolean('is_sandbox').notNull().default(false),

  // Supported features
  supports3DS: boolean('supports_3ds').notNull().default(true),
  supportsRefunds: boolean('supports_refunds').notNull().default(true),
  supportsInstallments: boolean('supports_installments').notNull().default(false),

  // Limits
  minAmount: decimal('min_amount', { precision: 15, scale: 2 }),
  maxAmount: decimal('max_amount', { precision: 15, scale: 2 }),

  // Webhook configuration
  webhookUrl: text('webhook_url'),
  webhookEvents: jsonb('webhook_events'),

  metadata: jsonb('metadata'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentLog = typeof paymentLogs.$inferSelect;
export type NewPaymentLog = typeof paymentLogs.$inferInsert;
export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type NewPaymentGateway = typeof paymentGateways.$inferInsert;
