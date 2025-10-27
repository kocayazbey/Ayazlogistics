import { pgTable, text, timestamp, uuid, integer, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Vehicle Types
export const vehicleTypes = pgTable('vehicle_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  capacity: decimal('capacity', { precision: 10, scale: 2 }),
  dimensions: jsonb('dimensions'),
  fuelType: text('fuel_type'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Driver Licenses
export const driverLicenses = pgTable('driver_licenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  driverId: uuid('driver_id').notNull(),
  licenseNumber: text('license_number').notNull(),
  licenseType: text('license_type').notNull(),
  issuedDate: timestamp('issued_date'),
  expiryDate: timestamp('expiry_date'),
  issuingAuthority: text('issuing_authority'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Vehicle Maintenance
export const vehicleMaintenance = pgTable('vehicle_maintenance', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull(),
  maintenanceType: text('maintenance_type').notNull(),
  description: text('description'),
  cost: decimal('cost', { precision: 15, scale: 2 }),
  mileage: integer('mileage'),
  scheduledDate: timestamp('scheduled_date'),
  completedDate: timestamp('completed_date'),
  status: text('status').default('scheduled'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Driver Performance
export const driverPerformance = pgTable('driver_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  driverId: uuid('driver_id').notNull(),
  period: text('period').notNull(), // daily, weekly, monthly
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  totalDeliveries: integer('total_deliveries').default(0),
  onTimeDeliveries: integer('on_time_deliveries').default(0),
  averageRating: decimal('average_rating', { precision: 3, scale: 2 }),
  safetyScore: decimal('safety_score', { precision: 3, scale: 2 }),
  fuelEfficiency: decimal('fuel_efficiency', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Vehicle Assignments
export const vehicleAssignments = pgTable('vehicle_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull(),
  driverId: uuid('driver_id').notNull(),
  assignedAt: timestamp('assigned_at').defaultNow(),
  unassignedAt: timestamp('unassigned_at'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const vehicleTypeRelations = relations(vehicleTypes, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const driverLicenseRelations = relations(driverLicenses, ({ one }) => ({
  driver: one(drivers, {
    fields: [driverLicenses.driverId],
    references: [drivers.id],
  }),
}));

export const vehicleMaintenanceRelations = relations(vehicleMaintenance, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleMaintenance.vehicleId],
    references: [vehicles.id],
  }),
}));

export const driverPerformanceRelations = relations(driverPerformance, ({ one }) => ({
  driver: one(drivers, {
    fields: [driverPerformance.driverId],
    references: [drivers.id],
  }),
}));

export const vehicleAssignmentRelations = relations(vehicleAssignments, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleAssignments.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [vehicleAssignments.driverId],
    references: [drivers.id],
  }),
}));

// Type definitions
export type VehicleType = typeof vehicleTypes.$inferSelect;
export type NewVehicleType = typeof vehicleTypes.$inferInsert;
export type DriverLicense = typeof driverLicenses.$inferSelect;
export type NewDriverLicense = typeof driverLicenses.$inferInsert;
export type VehicleMaintenance = typeof vehicleMaintenance.$inferSelect;
export type NewVehicleMaintenance = typeof vehicleMaintenance.$inferInsert;
export type DriverPerformance = typeof driverPerformance.$inferSelect;
export type NewDriverPerformance = typeof driverPerformance.$inferInsert;
export type VehicleAssignment = typeof vehicleAssignments.$inferSelect;
export type NewVehicleAssignment = typeof vehicleAssignments.$inferInsert;