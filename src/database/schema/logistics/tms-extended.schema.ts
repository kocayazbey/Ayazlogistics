import { pgTable, uuid, varchar, decimal, timestamp, jsonb, boolean, integer, date } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const multimodalShipments = pgTable('multimodal_shipments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  shipmentNumber: varchar('shipment_number', { length: 50 }).notNull().unique(),
  customerId: uuid('customer_id').notNull(),
  incoterm: varchar('incoterm', { length: 10 }),
  totalLegs: integer('total_legs').notNull(),
  currentLeg: integer('current_leg').default(1),
  status: varchar('status', { length: 30 }).default('pending'),
  totalCost: decimal('total_cost', { precision: 15, scale: 2 }),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const transportLegs = pgTable('transport_legs', {
  id: uuid('id').primaryKey().defaultRandom(),
  shipmentId: uuid('shipment_id').notNull().references(() => multimodalShipments.id, { onDelete: 'cascade' }),
  legNumber: integer('leg_number').notNull(),
  mode: varchar('mode', { length: 20 }).notNull(),
  serviceType: varchar('service_type', { length: 30 }),
  carrierId: uuid('carrier_id'),
  origin: varchar('origin', { length: 255 }).notNull(),
  destination: varchar('destination', { length: 255 }).notNull(),
  estimatedDuration: integer('estimated_duration'),
  actualDuration: integer('actual_duration'),
  cost: decimal('cost', { precision: 12, scale: 2 }),
  status: varchar('status', { length: 20 }).default('pending'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const carrierRates = pgTable('carrier_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  carrierId: uuid('carrier_id').notNull(),
  customerId: uuid('customer_id'),
  mode: varchar('mode', { length: 20 }).notNull(),
  serviceType: varchar('service_type', { length: 30 }).notNull(),
  origin: varchar('origin', { length: 255 }).notNull(),
  destination: varchar('destination', { length: 255 }).notNull(),
  rateType: varchar('rate_type', { length: 30 }).notNull(),
  rate: decimal('rate', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('TRY'),
  validFrom: date('valid_from').notNull(),
  validUntil: date('valid_until').notNull(),
  minimumCharge: decimal('minimum_charge', { precision: 12, scale: 2 }),
  freeTime: integer('free_time'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const dockAppointments = pgTable('dock_appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  dockId: uuid('dock_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull(),
  driverId: uuid('driver_id'),
  appointmentType: varchar('appointment_type', { length: 20 }).notNull(),
  scheduledTime: timestamp('scheduled_time').notNull(),
  estimatedDuration: integer('estimated_duration').notNull(),
  actualCheckIn: timestamp('actual_check_in'),
  actualCheckOut: timestamp('actual_check_out'),
  detention: integer('detention'),
  status: varchar('status', { length: 20 }).default('scheduled'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const maintenanceSchedules = pgTable('maintenance_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id').notNull(),
  type: varchar('type', { length: 30 }).notNull(),
  scheduledDate: date('scheduled_date').notNull(),
  completedDate: date('completed_date'),
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }),
  actualCost: decimal('actual_cost', { precision: 10, scale: 2 }),
  description: varchar('description', { length: 500 }),
  status: varchar('status', { length: 20 }).default('scheduled'),
  performedBy: varchar('performed_by', { length: 255 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const customsDeclarations = pgTable('customs_declarations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  shipmentId: uuid('shipment_id').notNull(),
  declarationType: varchar('declaration_type', { length: 20 }).notNull(),
  country: varchar('country', { length: 50 }).notNull(),
  hsCode: varchar('hs_code', { length: 20 }).notNull(),
  commodityDescription: varchar('commodity_description', { length: 500 }),
  value: decimal('value', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 10 }).default('USD'),
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
  weight: decimal('weight', { precision: 12, scale: 2 }).notNull(),
  dutyAmount: decimal('duty_amount', { precision: 12, scale: 2 }),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }),
  status: varchar('status', { length: 30 }).default('draft'),
  submittedAt: timestamp('submitted_at'),
  clearedAt: timestamp('cleared_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type MultimodalShipment = typeof multimodalShipments.$inferSelect;
export type TransportLeg = typeof transportLegs.$inferSelect;
export type CarrierRate = typeof carrierRates.$inferSelect;
export type DockAppointment = typeof dockAppointments.$inferSelect;
export type MaintenanceSchedule = typeof maintenanceSchedules.$inferSelect;
export type CustomsDeclaration = typeof customsDeclarations.$inferSelect;

