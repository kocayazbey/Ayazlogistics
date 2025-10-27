import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, decimal } from 'drizzle-orm/pg-core';

export const locations = pgTable('locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 20 }),
  country: varchar('country', { length: 100 }).notNull().default('Turkey'),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  // coordinates: point('coordinates'), // PostGIS point for spatial queries - disabled for now
  type: varchar('type', { length: 50 }).notNull(), // warehouse, storage, picking, etc.
  description: text('description'),
  contactPerson: varchar('contact_person', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  capacity: decimal('capacity', { precision: 10, scale: 2 }),
  zone: varchar('zone', { length: 10 }),
  aisle: varchar('aisle', { length: 10 }),
  shelf: varchar('shelf', { length: 10 }),
  level: varchar('level', { length: 10 }),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  isActive: boolean('is_active').notNull().default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
