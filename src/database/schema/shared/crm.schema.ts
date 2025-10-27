import { pgTable, text, timestamp, uuid, integer, decimal, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../core/users.schema';

// Customers
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  customerNumber: text('customer_number').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  postalCode: text('postal_code'),
  type: text('type').default('individual'),
  status: text('status').default('active'),
  customerValue: decimal('customer_value', { precision: 15, scale: 2 }),
  source: text('source'),
  notes: text('notes'),
  salesRepId: uuid('sales_rep_id'),
  statusUpdatedAt: timestamp('status_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Leads
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  leadNumber: text('lead_number').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  source: text('source'),
  status: text('status').default('new'),
  assignedTo: uuid('assigned_to'),
  priority: text('priority').default('medium'),
  value: decimal('value', { precision: 15, scale: 2 }),
  notes: text('notes'),
  assignedAt: timestamp('assigned_at'),
  convertedAt: timestamp('converted_at'),
  convertedToCustomerId: uuid('converted_to_customer_id'),
  statusUpdatedAt: timestamp('status_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Activities
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  activityNumber: text('activity_number').notNull(),
  type: text('type').notNull(),
  subject: text('subject').notNull(),
  description: text('description'),
  status: text('status').default('pending'),
  priority: text('priority').default('medium'),
  assignedTo: uuid('assigned_to'),
  createdBy: uuid('created_by'),
  customerId: uuid('customer_id'),
  leadId: uuid('lead_id'),
  dealerId: uuid('dealer_id'),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  statusUpdatedAt: timestamp('status_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Dealers
export const dealers = pgTable('dealers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  dealerNumber: text('dealer_number').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  postalCode: text('postal_code'),
  type: text('type').default('dealer'),
  status: text('status').default('active'),
  salesRepId: uuid('sales_rep_id'),
  notes: text('notes'),
  statusUpdatedAt: timestamp('status_updated_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Contacts
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  customerId: uuid('customer_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  position: text('position'),
  department: text('department'),
  isPrimary: boolean('is_primary').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relations
export const customerRelations = relations(customers, ({ one, many }) => ({
  salesRep: one(users, {
    fields: [customers.salesRepId],
    references: [users.id],
  }),
  contacts: many(contacts),
  activities: many(activities, { relationName: 'customerActivities' }),
}));

export const dealerRelations = relations(dealers, ({ one, many }) => ({
  salesRep: one(users, {
    fields: [dealers.salesRepId],
    references: [users.id],
  }),
  activities: many(activities, { relationName: 'dealerActivities' }),
}));

export const leadRelations = relations(leads, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
    relationName: 'assignedLeads',
  }),
  convertedToCustomer: one(customers, {
    fields: [leads.convertedToCustomerId],
    references: [customers.id],
  }),
  activities: many(activities, { relationName: 'leadActivities' }),
}));

export const activityRelations = relations(activities, ({ one }) => ({
  assignedTo: one(users, {
    fields: [activities.assignedTo],
    references: [users.id],
    relationName: 'assignedActivities',
  }),
  createdBy: one(users, {
    fields: [activities.createdBy],
    references: [users.id],
    relationName: 'createdActivities',
  }),
  customer: one(customers, {
    fields: [activities.customerId],
    references: [customers.id],
  }),
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id],
  }),
  dealer: one(dealers, {
    fields: [activities.dealerId],
    references: [dealers.id],
  }),
}));

export const contactRelations = relations(contacts, ({ one }) => ({
  customer: one(customers, {
    fields: [contacts.customerId],
    references: [customers.id],
  }),
}));

// Type definitions
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Dealer = typeof dealers.$inferSelect;
export type NewDealer = typeof dealers.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;