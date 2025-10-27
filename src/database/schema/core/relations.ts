import { relations } from 'drizzle-orm';
import { tenants } from './tenants.schema';
import { users } from './users.schema';
import { vehicles, drivers, routes, routeStops, gpsTracking } from '../logistics/tms.schema';
import { billingContracts, billingRates, usageTracking, invoices } from '../logistics/billing.schema';
import { customers, dealers, leads, activities } from '../shared/crm.schema';

// Tenant Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  vehicles: many(vehicles),
  drivers: many(drivers),
  routes: many(routes),
  customers: many(customers),
  dealers: many(dealers),
  leads: many(leads),
  activities: many(activities),
  billingContracts: many(billingContracts),
  invoices: many(invoices),
}));

// User Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  assignedLeads: many(leads, { relationName: 'assignedLeads' }),
  assignedActivities: many(activities, { relationName: 'assignedActivities' }),
  createdActivities: many(activities, { relationName: 'createdActivities' }),
}));

// TMS Relations
export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [vehicles.tenantId],
    references: [tenants.id],
  }),
  routes: many(routes),
  gpsTracking: many(gpsTracking),
}));

export const driversRelations = relations(drivers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [drivers.tenantId],
    references: [tenants.id],
  }),
  routes: many(routes),
}));

export const routesRelations = relations(routes, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [routes.tenantId],
    references: [tenants.id],
  }),
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

export const routeStopsRelations = relations(routeStops, ({ one }) => ({
  route: one(routes, {
    fields: [routeStops.routeId],
    references: [routes.id],
  }),
}));

export const gpsTrackingRelations = relations(gpsTracking, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [gpsTracking.vehicleId],
    references: [vehicles.id],
  }),
}));

// Billing Relations
export const billingContractsRelations = relations(billingContracts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [billingContracts.tenantId],
    references: [tenants.id],
  }),
  customer: one(customers, {
    fields: [billingContracts.customerId],
    references: [customers.id],
  }),
  rates: many(billingRates),
  usageTracking: many(usageTracking),
  invoices: many(invoices),
}));

export const billingRatesRelations = relations(billingRates, ({ one }) => ({
  contract: one(billingContracts, {
    fields: [billingRates.contractId],
    references: [billingContracts.id],
  }),
}));

export const usageTrackingRelations = relations(usageTracking, ({ one }) => ({
  tenant: one(tenants, {
    fields: [usageTracking.tenantId],
    references: [tenants.id],
  }),
  contract: one(billingContracts, {
    fields: [usageTracking.contractId],
    references: [billingContracts.id],
  }),
  invoice: one(invoices, {
    fields: [usageTracking.invoiceId],
    references: [invoices.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenantId],
    references: [tenants.id],
  }),
  contract: one(billingContracts, {
    fields: [invoices.contractId],
    references: [billingContracts.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  usageDetails: many(usageTracking),
}));

// CRM Relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  salesRep: one(users, {
    fields: [customers.salesRepId],
    references: [users.id],
  }),
  billingContracts: many(billingContracts),
  invoices: many(invoices),
  activities: many(activities, { relationName: 'customerActivities' }),
}));

export const dealersRelations = relations(dealers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [dealers.tenantId],
    references: [tenants.id],
  }),
  salesRep: one(users, {
    fields: [dealers.salesRepId],
    references: [users.id],
  }),
  activities: many(activities, { relationName: 'dealerActivities' }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leads.tenantId],
    references: [tenants.id],
  }),
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

export const activitiesRelations = relations(activities, ({ one }) => ({
  tenant: one(tenants, {
    fields: [activities.tenantId],
    references: [tenants.id],
  }),
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
}));

