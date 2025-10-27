import { pgTable, text, timestamp, uuid, integer, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Routes
export const routes = pgTable('routes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  routeNumber: text('route_number').notNull(),
  vehicleId: uuid('vehicle_id'),
  driverId: uuid('driver_id'),
  status: text('status').default('pending'),
  totalDistance: decimal('total_distance', { precision: 10, scale: 2 }),
  estimatedTime: integer('estimated_time'),
  actualTime: integer('actual_time'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Vehicles
export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  vehicleNumber: text('vehicle_number').notNull(),
  make: text('make'),
  model: text('model'),
  year: integer('year'),
  type: text('type'),
  capacity: decimal('capacity', { precision: 10, scale: 2 }),
  status: text('status').default('available'),
  driverId: uuid('driver_id'),
  currentLocation: jsonb('current_location'),
  lastLocationUpdate: timestamp('last_location_update'),
  assignedAt: timestamp('assigned_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Drivers
export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  driverNumber: text('driver_number').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  licenseNumber: text('license_number'),
  licenseType: text('license_type'),
  licenseExpiry: timestamp('license_expiry'),
  status: text('status').default('available'),
  vehicleId: uuid('vehicle_id'),
  assignedAt: timestamp('assigned_at'),
  statusUpdatedAt: timestamp('status_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// GPS Tracking
export const gpsTracking = pgTable('gps_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  vehicleId: uuid('vehicle_id').notNull(),
  driverId: uuid('driver_id'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  altitude: decimal('altitude', { precision: 10, scale: 2 }),
  speed: decimal('speed', { precision: 10, scale: 2 }),
  heading: decimal('heading', { precision: 10, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 10, scale: 2 }),
  timestamp: timestamp('timestamp').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Route Stops
export const routeStops = pgTable('route_stops', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  routeId: uuid('route_id').notNull(),
  stopSequence: integer('stop_sequence').notNull(),
  customerName: text('customer_name'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  estimatedArrival: timestamp('estimated_arrival'),
  actualArrival: timestamp('actual_arrival'),
  completedAt: timestamp('completed_at'),
  status: text('status').default('pending'), // pending, in_transit, arrived, completed, skipped
  deliveryNotes: text('delivery_notes'),
  signature: text('signature'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Load Board
export const loadBoard = pgTable('load_board', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  loadNumber: text('load_number').notNull(),
  origin: text('origin'),
  destination: text('destination'),
  weight: decimal('weight', { precision: 10, scale: 2 }),
  dimensions: jsonb('dimensions'),
  pickupDate: timestamp('pickup_date'),
  deliveryDate: timestamp('delivery_date'),
  rate: decimal('rate', { precision: 10, scale: 2 }),
  carrierId: uuid('carrier_id'),
  shipperId: uuid('shipper_id'),
  status: text('status').default('available'),
  matchedAt: timestamp('matched_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const routeRelations = relations(routes, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [routes.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [routes.driverId],
    references: [drivers.id],
  }),
  stops: many(routeStops),
}));

export const routeStopRelations = relations(routeStops, ({ one }) => ({
  route: one(routes, {
    fields: [routeStops.routeId],
    references: [routes.id],
  }),
}));

export const vehicleRelations = relations(vehicles, ({ one, many }) => ({
  driver: one(drivers, {
    fields: [vehicles.driverId],
    references: [drivers.id],
  }),
  routes: many(routes),
  gpsTracking: many(gpsTracking),
}));

export const driverRelations = relations(drivers, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [drivers.vehicleId],
    references: [vehicles.id],
  }),
  routes: many(routes),
  gpsTracking: many(gpsTracking),
}));

export const gpsTrackingRelations = relations(gpsTracking, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [gpsTracking.vehicleId],
    references: [vehicles.id],
  }),
  driver: one(drivers, {
    fields: [gpsTracking.driverId],
    references: [drivers.id],
  }),
}));

export const loadBoardRelations = relations(loadBoard, ({ one }) => ({
  carrier: one(vehicles, {
    fields: [loadBoard.carrierId],
    references: [vehicles.id],
  }),
  shipper: one(vehicles, {
    fields: [loadBoard.shipperId],
    references: [vehicles.id],
  }),
}));
