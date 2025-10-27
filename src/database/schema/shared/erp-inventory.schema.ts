import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const stockCards = pgTable('erp_stock_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 100 }).notNull(),
  barcode: varchar('barcode', { length: 100 }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  brand: varchar('brand', { length: 100 }),
  unitCost: decimal('unit_cost', { precision: 12, scale: 2 }),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  quantityOnHand: integer('quantity_on_hand').default(0),
  quantityAvailable: integer('quantity_available').default(0),
  quantityReserved: integer('quantity_reserved').default(0),
  reorderPoint: integer('reorder_point'),
  reorderQuantity: integer('reorder_quantity'),
  metadata: jsonb('metadata'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const batchLots = pgTable('erp_batch_lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  stockCardId: uuid('stock_card_id')
    .notNull()
    .references(() => stockCards.id, { onDelete: 'cascade' }),
  lotNumber: varchar('lot_number', { length: 100 }).notNull(),
  batchNumber: varchar('batch_number', { length: 100 }),
  quantity: integer('quantity').notNull(),
  manufactureDate: date('manufacture_date'),
  expiryDate: date('expiry_date'),
  receivedDate: date('received_date'),
  status: varchar('status', { length: 20 }).default('available'), // 'available', 'reserved', 'expired', 'quarantine'
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const stockMovements = pgTable('erp_stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  stockCardId: uuid('stock_card_id')
    .notNull()
    .references(() => stockCards.id, { onDelete: 'cascade' }),
  batchLotId: uuid('batch_lot_id')
    .references(() => batchLots.id),
  movementType: varchar('movement_type', { length: 50 }).notNull(), // 'in', 'out', 'transfer', 'adjustment'
  movementReason: varchar('movement_reason', { length: 100 }),
  quantity: integer('quantity').notNull(),
  unitCost: decimal('unit_cost', { precision: 12, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 12, scale: 2 }),
  fromLocation: varchar('from_location', { length: 100 }),
  toLocation: varchar('to_location', { length: 100 }),
  reference: varchar('reference', { length: 100 }),
  movementDate: timestamp('movement_date').notNull(),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type StockCard = typeof stockCards.$inferSelect;
export type NewStockCard = typeof stockCards.$inferInsert;
export type BatchLot = typeof batchLots.$inferSelect;
export type NewBatchLot = typeof batchLots.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;

