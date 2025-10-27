import { pgTable, uuid, varchar, text, decimal, integer, jsonb, timestamp, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']);
export const orderTypeEnum = pgEnum('order_type', ['B2B', 'B2C', 'SUPPLIER']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded']);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  type: orderTypeEnum('type').notNull(),
  status: orderStatusEnum('status').default('pending'),
  
  customerId: uuid('customer_id').notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  customerCompany: varchar('customer_company', { length: 255 }),
  
  shippingAddress: text('shipping_address'),
  shippingCity: varchar('shipping_city', { length: 100 }),
  shippingCountry: varchar('shipping_country', { length: 100 }),
  shippingPostalCode: varchar('shipping_postal_code', { length: 20 }),
  shippingMethod: varchar('shipping_method', { length: 100 }),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  
  billingAddress: text('billing_address'),
  billingCity: varchar('billing_city', { length: 100 }),
  billingCountry: varchar('billing_country', { length: 100 }),
  billingPostalCode: varchar('billing_postal_code', { length: 20 }),
  taxNumber: varchar('tax_number', { length: 50 }),
  
  items: jsonb('items'),
  totals: jsonb('totals'),
  payment: jsonb('payment'),
  
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
});
