import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  companyName: varchar('company_name', { length: 255 }),
  domain: varchar('domain', { length: 255 }).unique(),
  logo: text('logo'),
  settings: jsonb('settings'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('basic'),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

