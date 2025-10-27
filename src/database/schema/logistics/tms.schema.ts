import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, boolean, date, pgEnum, index } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';
import { users } from '../core/users.schema';

// Enums for better type safety
export const vehicleTypeEnum = pgEnum('vehicle_type', ['truck', 'van', 'car', 'motorcycle']);
export const vehicleStatusEnum = pgEnum('vehicle_status', ['available', 'in_use', 'maintenance', 'out_of_service']);
export const fuelTypeEnum = pgEnum('fuel_type', ['diesel', 'gasoline', 'electric', 'hybrid', 'lpg']);
export const driverStatusEnum = pgEnum('driver_status', ['available', 'busy', 'off_duty', 'suspended']);
export const routeStatusEnum = pgEnum('route_status', ['planned', 'in_progress', 'completed', 'cancelled']);
export const stopStatusEnum = pgEnum('stop_status', ['pending', 'in_progress', 'completed', 'skipped']);

export const vehicles = pgTable('tms_vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleNumber: varchar('vehicle_number', { length: 50 }).notNull().unique(),
  licensePlate: varchar('license_plate', { length: 50 }).notNull(),
  vehicleType: vehicleTypeEnum('vehicle_type').notNull(),
  make: varchar('make', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }).notNull(),
  year: integer('year').notNull(),
  capacity: decimal('capacity', { precision: 12, scale: 2 }).notNull(),
  maxWeight: decimal('max_weight', { precision: 12, scale: 2 }).notNull(),
  fuelType: fuelTypeEnum('fuel_type').notNull(),
  currentOdometer: decimal('current_odometer', { precision: 12, scale: 2 }).default('0'),
  gpsDevice: varchar('gps_device', { length: 100 }),
  status: vehicleStatusEnum('status').default('available').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_vehicles_tenant_id').on(table.tenantId),
  statusIdx: index('idx_vehicles_status').on(table.status),
  vehicleTypeIdx: index('idx_vehicles_vehicle_type').on(table.vehicleType),
  licensePlateIdx: index('idx_vehicles_license_plate').on(table.licensePlate),
}));

export const drivers = pgTable('tms_drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  driverNumber: varchar('driver_number', { length: 50 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  licenseNumber: varchar('license_number', { length: 50 }).notNull(),
  licenseExpiry: date('license_expiry').notNull(),
  status: driverStatusEnum('status').default('available').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_drivers_tenant_id').on(table.tenantId),
  statusIdx: index('idx_drivers_status').on(table.status),
  licenseNumberIdx: index('idx_drivers_license_number').on(table.licenseNumber),
  phoneIdx: index('idx_drivers_phone').on(table.phone),
}));

export const routes = pgTable('tms_routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  routeNumber: varchar('route_number', { length: 50 }).notNull().unique(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  driverId: uuid('driver_id').notNull().references(() => drivers.id, { onDelete: 'cascade' }),
  routeDate: date('route_date').notNull(),
  status: routeStatusEnum('status').default('planned').notNull(),
  totalDistance: decimal('total_distance', { precision: 12, scale: 2 }),
  estimatedDuration: integer('estimated_duration'),
  totalStops: integer('total_stops'),
  optimizationAlgorithm: varchar('optimization_algorithm', { length: 50 }),
  metadata: jsonb('metadata'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_routes_tenant_id').on(table.tenantId),
  vehicleIdIdx: index('idx_routes_vehicle_id').on(table.vehicleId),
  driverIdIdx: index('idx_routes_driver_id').on(table.driverId),
  statusIdx: index('idx_routes_status').on(table.status),
  routeDateIdx: index('idx_routes_route_date').on(table.routeDate),
}));

export const routeStops = pgTable('tms_route_stops', {
  id: uuid('id').primaryKey().defaultRandom(),
  routeId: uuid('route_id')
    .notNull()
    .references(() => routes.id, { onDelete: 'cascade' }),
  stopSequence: integer('stop_sequence').notNull(),
  stopType: varchar('stop_type', { length: 20 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
  estimatedArrival: timestamp('estimated_arrival'),
  actualArrival: timestamp('actual_arrival'),
  status: stopStatusEnum('status').default('pending').notNull(),
  podSignature: text('pod_signature'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  routeIdIdx: index('idx_route_stops_route_id').on(table.routeId),
  sequenceIdx: index('idx_route_stops_sequence').on(table.stopSequence),
  statusIdx: index('idx_route_stops_status').on(table.status),
}));

export const gpsTracking = pgTable('tms_gps_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
  speed: decimal('speed', { precision: 6, scale: 2 }),
  heading: decimal('heading', { precision: 5, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),
  timestamp: timestamp('timestamp').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_gps_tracking_tenant_id').on(table.tenantId),
  vehicleIdIdx: index('idx_gps_tracking_vehicle_id').on(table.vehicleId),
  timestampIdx: index('idx_gps_tracking_timestamp').on(table.timestamp),
}));

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type Driver = typeof drivers.$inferSelect;
export type NewDriver = typeof drivers.$inferInsert;
export type Route = typeof routes.$inferSelect;
export type NewRoute = typeof routes.$inferInsert;
export type RouteStop = typeof routeStops.$inferSelect;
export type NewRouteStop = typeof routeStops.$inferInsert;
export type GPSTracking = typeof gpsTracking.$inferSelect;
export type NewGPSTracking = typeof gpsTracking.$inferInsert;

