import { pgTable, uuid, varchar, decimal, date, timestamp, text } from 'drizzle-orm/pg-core';
import { tenants } from '../core/tenants.schema';

export const exchangeRates = pgTable('exchange_rates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  fromCurrency: varchar('from_currency', { length: 10 }).notNull(),
  toCurrency: varchar('to_currency', { length: 10 }).notNull(),
  rate: decimal('rate', { precision: 20, scale: 10 }).notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type NewExchangeRate = typeof exchangeRates.$inferInsert;

