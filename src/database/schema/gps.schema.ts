import { pgTable, varchar, boolean, timestamp, decimal, integer, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// GPS Devices table
export const gpsDevices = pgTable('gps_devices', {
  deviceId: varchar('device_id', { length: 100 }).primaryKey(),
  imei: varchar('imei', { length: 20 }).notNull(),
  vehicleId: varchar('vehicle_id', { length: 100 }).notNull(),
  model: varchar('model', { length: 100 }),
  provider: varchar('provider', { length: 50 }), // teltonika, queclink, concox
  isActive: boolean('is_active').default(true),
  firmware: varchar('firmware', { length: 50 }),
  lastUpdate: timestamp('last_update').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// GPS Positions table
export const gpsPositions = pgTable('gps_positions', {
  id: varchar('id', { length: 100 }).primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar('device_id', { length: 100 }).notNull(),
  vehicleId: varchar('vehicle_id', { length: 100 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  speed: decimal('speed', { precision: 6, scale: 2 }),
  heading: decimal('heading', { precision: 5, scale: 1 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),
  timestamp: timestamp('timestamp').defaultNow(),
  satellites: integer('satellites'),
  odometer: decimal('odometer', { precision: 10, scale: 2 }),
  engineStatus: varchar('engine_status', { length: 10 }), // on, off
  ignition: boolean('ignition'),
  batteryLevel: decimal('battery_level', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// GPS Alerts table
export const gpsAlerts = pgTable('gps_alerts', {
  id: varchar('id', { length: 100 }).primaryKey(),
  deviceId: varchar('device_id', { length: 100 }).notNull(),
  vehicleId: varchar('vehicle_id', { length: 100 }).notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  message: varchar('message', { length: 500 }).notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }),
  longitude: decimal('longitude', { precision: 11, scale: 8 }),
  timestamp: timestamp('timestamp').defaultNow(),
  acknowledged: boolean('acknowledged').default(false),
  acknowledgedBy: varchar('acknowledged_by', { length: 100 }),
  acknowledgedAt: timestamp('acknowledged_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// GPS Trips table
export const gpsTrips = pgTable('gps_trips', {
  tripId: varchar('trip_id', { length: 100 }).primaryKey(),
  vehicleId: varchar('vehicle_id', { length: 100 }).notNull(),
  driverId: varchar('driver_id', { length: 100 }),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  startLatitude: decimal('start_latitude', { precision: 10, scale: 8 }),
  startLongitude: decimal('start_longitude', { precision: 11, scale: 8 }),
  endLatitude: decimal('end_latitude', { precision: 10, scale: 8 }),
  endLongitude: decimal('end_longitude', { precision: 11, scale: 8 }),
  totalDistance: decimal('total_distance', { precision: 10, scale: 2 }).default('0'),
  totalDuration: integer('total_duration'), // seconds
  maxSpeed: decimal('max_speed', { precision: 6, scale: 2 }),
  avgSpeed: decimal('avg_speed', { precision: 6, scale: 2 }),
  idleTime: integer('idle_time').default(0), // seconds
  fuelConsumed: decimal('fuel_consumed', { precision: 8, scale: 2 }),
  route: jsonb('route').$type<Array<{ latitude: number; longitude: number; timestamp: Date }>>(),
  status: varchar('status', { length: 20 }).default('active'), // active, completed, cancelled
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Geofences table for location-based alerts
export const geofences = pgTable('geofences', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  geometry: jsonb('geometry').notNull(), // GeoJSON format
  alertOnEntry: boolean('alert_on_entry').default(true),
  alertOnExit: boolean('alert_on_exit').default(true),
  isActive: boolean('is_active').default(true),
  tenantId: varchar('tenant_id', { length: 100 }),
  createdBy: varchar('created_by', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
