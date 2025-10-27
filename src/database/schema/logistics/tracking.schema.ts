import { pgTable, uuid, varchar, text, timestamp, decimal, jsonb, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const vehicleTracking = pgTable('tracking_vehicle_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
  speed: decimal('speed', { precision: 6, scale: 2 }),
  heading: decimal('heading', { precision: 5, scale: 2 }),
  altitude: decimal('altitude', { precision: 8, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 6, scale: 2 }),
  timestamp: timestamp('timestamp').notNull(),
  metadata: jsonb('metadata'),
}, (table) => ({
  tenantTimestampIdx: index('idx_vehicle_tracking_tenant_timestamp').on(table.tenantId, table.timestamp.desc()),
  vehicleTimestampIdx: index('idx_vehicle_tracking_vehicle_timestamp').on(table.vehicleId, table.timestamp.desc()),
  locationIdx: index('idx_vehicle_tracking_location').on(table.latitude, table.longitude, table.timestamp.desc()),
  speedIdx: index('idx_vehicle_tracking_speed').on(table.vehicleId, table.speed.desc()).where(table.speed.gt(0)),
  recentIdx: index('idx_vehicle_tracking_recent').on(table.vehicleId, table.timestamp.desc()).where(table.timestamp.gt(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
}));

export const shipmentTracking = pgTable('tracking_shipment_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  shipmentId: uuid('shipment_id').notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  location: varchar('location', { length: 255 }),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  description: text('description'),
  timestamp: timestamp('timestamp').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tenantTimestampIdx: index('idx_shipment_tracking_tenant_timestamp').on(table.tenantId, table.timestamp.desc()),
  shipmentStatusIdx: index('idx_shipment_tracking_shipment_status').on(table.shipmentId, table.status, table.timestamp.desc()),
  locationIdx: index('idx_shipment_tracking_location').on(table.latitude, table.longitude, table.timestamp.desc()).where(table.latitude.isNotNull()),
  recentIdx: index('idx_shipment_tracking_recent').on(table.shipmentId, table.timestamp.desc()).where(table.timestamp.gt(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))),
}));

export const geofences = pgTable('tracking_geofences', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  geofenceType: varchar('geofence_type', { length: 50 }), // 'circle', 'polygon'
  centerLat: decimal('center_lat', { precision: 10, scale: 7 }),
  centerLng: decimal('center_lng', { precision: 10, scale: 7 }),
  radius: decimal('radius', { precision: 10, scale: 2 }), // meters
  polygon: jsonb('polygon'), // array of {lat, lng}
  alertOnEntry: boolean('alert_on_entry').default(true),
  alertOnExit: boolean('alert_on_exit').default(true),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const slaMetrics = pgTable('tracking_sla_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  metricType: varchar('metric_type', { length: 50 }).notNull(), // 'delivery_time', 'accuracy', 'response_time'
  targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
  actualValue: decimal('actual_value', { precision: 10, scale: 2 }),
  achievementRate: decimal('achievement_rate', { precision: 5, scale: 2 }),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  status: varchar('status', { length: 20 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type VehicleTracking = typeof vehicleTracking.$inferSelect;
export type NewVehicleTracking = typeof vehicleTracking.$inferInsert;
export type ShipmentTracking = typeof shipmentTracking.$inferSelect;
export type NewShipmentTracking = typeof shipmentTracking.$inferInsert;
export type Geofence = typeof geofences.$inferSelect;
export type NewGeofence = typeof geofences.$inferInsert;
export type SLAMetric = typeof slaMetrics.$inferSelect;
export type NewSLAMetric = typeof slaMetrics.$inferInsert;

