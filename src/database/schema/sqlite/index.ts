// SQLite compatible schema
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Users table for SQLite
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('customer'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  twoFactorEnabled: integer('two_factor_enabled', { mode: 'boolean' }).default(false),
  twoFactorSecret: text('two_factor_secret'),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(Date.now),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(Date.now),
});

// Products table
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  brand: text('brand'),
  weightKg: real('weight_kg'),
  dimensionsLengthCm: real('dimensions_length_cm'),
  dimensionsWidthCm: real('dimensions_width_cm'),
  dimensionsHeightCm: real('dimensions_height_cm'),
  volumeCubicMeters: real('volume_cubic_meters'),
  unitOfMeasure: text('unit_of_measure').default('piece'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(Date.now),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(Date.now),
});

// Orders table
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  customerId: text('customer_id').references(() => users.id, { onDelete: 'cascade' }),
  status: text('status').default('pending'),
  orderDate: integer('order_date', { mode: 'timestamp' }).default(Date.now),
  requiredDeliveryDate: integer('required_delivery_date', { mode: 'timestamp' }),
  priority: text('priority').default('medium'),
  totalWeightKg: real('total_weight_kg'),
  totalVolumeCubicMeters: real('total_volume_cubic_meters'),
  subtotal: real('subtotal').notNull(),
  taxAmount: real('tax_amount').default(0),
  shippingCost: real('shipping_cost').default(0),
  totalAmount: real('total_amount').notNull(),
  billingAddress: text('billing_address'),
  shippingAddress: text('shipping_address'),
  specialInstructions: text('special_instructions'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(Date.now),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(Date.now),
});

// Order items table
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
  weightKg: real('weight_kg'),
  volumeCubicMeters: real('volume_cubic_meters'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(Date.now),
});

// Inventory table
export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id, { onDelete: 'cascade' }),
  warehouseId: text('warehouse_id'),
  locationId: text('location_id'),
  quantityAvailable: integer('quantity_available').notNull().default(0),
  quantityReserved: integer('quantity_reserved').notNull().default(0),
  quantityShipped: integer('quantity_shipped').notNull().default(0),
  status: text('status').default('available'),
  batchNumber: text('batch_number'),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  costPerUnit: real('cost_per_unit'),
  lastCountedAt: integer('last_counted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(Date.now),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(Date.now),
});

// Payments table
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }),
  paymentId: text('payment_id'),
  provider: text('provider'),
  status: text('status').default('pending'),
  amount: real('amount').notNull(),
  currency: text('currency').default('TRY'),
  customerId: text('customer_id').references(() => users.id),
  customerEmail: text('customer_email'),
  fraudScore: real('fraud_score'),
  riskLevel: text('risk_level'),
  providerResponse: text('provider_response'),
  errorDetails: text('error_details'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(Date.now),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(Date.now),
});

// System logs table
export const systemLogs = sqliteTable('system_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  oldValues: text('old_values'),
  newValues: text('new_values'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(Date.now),
});

// Mobile tasks table
export const mobileTasks = sqliteTable('mobile_tasks', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  priority: text('priority').default('medium'),
  status: text('status').default('pending'),
  assignedTo: text('assigned_to'),
  location: text('location'),
  customerId: text('customer_id'),
  estimatedDuration: text('estimated_duration'),
  actualDuration: text('actual_duration'),
  scheduledDate: integer('scheduled_date', { mode: 'timestamp' }),
  completedDate: integer('completed_date', { mode: 'timestamp' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(Date.now),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(Date.now),
});

// Export all tables
export {
  users,
  products,
  orders,
  orderItems,
  inventory,
  payments,
  systemLogs,
  mobileTasks,
};
