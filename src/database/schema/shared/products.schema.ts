import { pgTable, uuid, varchar, text, decimal, integer, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  supplier: varchar('supplier', { length: 255 }),
  unitCost: decimal('unit_cost', { precision: 18, scale: 2 }),
  unitPrice: decimal('unit_price', { precision: 18, scale: 2 }),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  dimensions: jsonb('dimensions'),
  stock: jsonb('stock'),
  status: varchar('status', { length: 50 }).default('active'),
  images: jsonb('images'),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
