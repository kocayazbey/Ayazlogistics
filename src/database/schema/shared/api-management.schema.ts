import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, decimal } from 'drizzle-orm/pg-core';

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  clientId: varchar('client_id', { length: 100 }).notNull().unique(),
  keyHash: varchar('key_hash', { length: 64 }).notNull().unique(),
  tier: varchar('tier', { length: 20 }).notNull().default('basic'),
  permissions: jsonb('permissions'),
  rateLimitPerMinute: integer('rate_limit_per_minute').default(100),
  rateLimitPerHour: integer('rate_limit_per_hour').default(1000),
  rateLimitPerDay: integer('rate_limit_per_day').default(10000),
  allowedIPs: text('allowed_ips'),
  webhookUrl: varchar('webhook_url', { length: 500 }),
  notes: text('notes'),
  isActive: boolean('is_active').notNull().default(true),
  lastUsed: timestamp('last_used'),
  revokedAt: timestamp('revoked_at'),
  expiresAt: timestamp('expires_at'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const apiKeyUsage = pgTable('api_key_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id),
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  method: varchar('method', { length: 10 }).notNull(),
  statusCode: integer('status_code').notNull(),
  responseTime: integer('response_time'), // in milliseconds
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  requestSize: integer('request_size'), // in bytes
  responseSize: integer('response_size'), // in bytes
  date: timestamp('date').notNull().defaultNow(),
  metadata: jsonb('metadata'),
});

export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  apiKeyId: uuid('api_key_id').notNull().references(() => apiKeys.id),
  windowStart: timestamp('window_start').notNull(),
  windowEnd: timestamp('window_end').notNull(),
  requestCount: integer('request_count').notNull().default(0),
  limitType: varchar('limit_type', { length: 20 }).notNull(), // minute, hour, day
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type ApiKeyUsage = typeof apiKeyUsage.$inferSelect;
export type NewApiKeyUsage = typeof apiKeyUsage.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
