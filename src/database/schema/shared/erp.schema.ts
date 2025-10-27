import { pgTable, text, timestamp, uuid, integer, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Finance
export const finance = pgTable('finance', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  transactionNumber: text('transaction_number').notNull(),
  type: text('type').notNull(), // revenue, expense, asset, liability
  category: text('category'),
  account: text('account'),
  amount: decimal('amount', { precision: 15, scale: 2 }),
  description: text('description'),
  status: text('status').default('pending'),
  date: timestamp('date'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Employees
export const employees = pgTable('employees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  employeeNumber: text('employee_number').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  department: text('department'),
  position: text('position'),
  managerId: uuid('manager_id'),
  salary: decimal('salary', { precision: 15, scale: 2 }),
  status: text('status').default('active'),
  hireDate: timestamp('hire_date'),
  statusUpdatedAt: timestamp('status_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Inventory
export const inventory = pgTable('inventory', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  itemNumber: text('item_number').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  supplier: text('supplier'),
  quantity: integer('quantity').default(0),
  unitCost: decimal('unit_cost', { precision: 15, scale: 2 }),
  reorderLevel: integer('reorder_level').default(0),
  status: text('status').default('active'),
  lastUpdated: timestamp('last_updated'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Purchase Orders
export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  orderNumber: text('order_number').notNull(),
  supplier: text('supplier'),
  status: text('status').default('pending'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }),
  orderDate: timestamp('order_date'),
  expectedDate: timestamp('expected_date'),
  receivedDate: timestamp('received_date'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const employeeRelations = relations(employees, ({ one, many }) => ({
  manager: one(employees, {
    fields: [employees.managerId],
    references: [employees.id],
  }),
  subordinates: many(employees),
}));

export const purchaseOrderRelations = relations(purchaseOrders, ({ many }) => ({
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItems = pgTable('purchase_order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  purchaseOrderId: uuid('purchase_order_id').notNull(),
  itemId: uuid('item_id'),
  quantity: integer('quantity'),
  unitPrice: decimal('unit_price', { precision: 15, scale: 2 }),
  totalPrice: decimal('total_price', { precision: 15, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const purchaseOrderItemRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}));
