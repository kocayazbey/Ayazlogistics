// =====================================================================================
// AYAZLOGISTICS - ENVIRONMENT VALIDATION
// =====================================================================================
// Description: Type-safe environment variable validation using Zod
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { z } from 'zod';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1024).max(65535)).default('3000'),
  APP_NAME: z.string().default('AyazLogistics'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_PREFIX: z.string().default('api'),
  FRONTEND_URL: z.string().url().optional(),

  // Database - Support both DATABASE_URL and individual components
  DATABASE_URL: z.string().url().optional(),
  DATABASE_HOST: z.string().min(1).optional(),
  DATABASE_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).optional(),
  DATABASE_NAME: z.string().min(1).optional(),
  DATABASE_USERNAME: z.string().min(1).optional(),
  DATABASE_PASSWORD: z.string().min(8).optional(),
  DATABASE_SSL: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  DATABASE_POOL_MIN: z.string().transform(Number).pipe(z.number().min(1)).default('2'),
  DATABASE_POOL_MAX: z.string().transform(Number).pipe(z.number().min(1)).default('10'),
  DATABASE_CONNECTION_TIMEOUT: z.string().transform(Number).default('30000'),
  DATABASE_STATEMENT_TIMEOUT: z.string().transform(Number).default('30000'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).pipe(z.number().min(0).max(15)).default('0'),
  REDIS_TTL: z.string().transform(Number).default('3600'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security
  PASSWORD_MIN_LENGTH: z.string().transform(Number).default('12'),
  SESSION_SECRET: z.string().min(32).optional(),
  RATE_LIMIT_TTL: z.string().transform(Number).default('60000'),
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),

  // AWS S3
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  // Email
  SENDGRID_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // SMS (NetGSM)
  NETGSM_USERNAME: z.string().optional(),
  NETGSM_PASSWORD: z.string().optional(),
  NETGSM_SENDER: z.string().default('AYAZLOJ'),

  // WhatsApp
  WHATSAPP_API_URL: z.string().url().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.string().transform(Number).pipe(z.number().min(0).max(1)).default('0.1'),

  // Feature Flags
  ENABLE_AI_FEATURES: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  ENABLE_BLOCKCHAIN: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  ENABLE_IOT_SENSORS: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  ENABLE_SWAGGER: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
  ENABLE_GRAPHQL: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:3001'),
  CORS_CREDENTIALS: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),

  // Localization
  TZ: z.string().default('Europe/Istanbul'),
  DEFAULT_LANGUAGE: z.string().default('tr'),
  DEFAULT_CURRENCY: z.string().default('TRY'),

  // Performance
  ENABLE_COMPRESSION: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
  REQUEST_TIMEOUT: z.string().transform(Number).default('30000'),
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'),

  // Development
  DEBUG_MODE: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
  ENABLE_QUERY_LOGGING: z.enum(['true', 'false']).transform(val => val === 'true').default('false'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    console.error('\n💡 Please check your .env file against .env.example');
    process.exit(1);
  }

  // Additional validation: If DATABASE_URL is not set, individual components must be provided
  if (!result.data.DATABASE_URL) {
    const requiredDatabaseFields = ['DATABASE_HOST', 'DATABASE_PORT', 'DATABASE_NAME', 'DATABASE_USERNAME', 'DATABASE_PASSWORD'];
    const missingFields = requiredDatabaseFields.filter(field => !result.data[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Database configuration error:');
      console.error(`   Either DATABASE_URL or all of the following must be provided: ${requiredDatabaseFields.join(', ')}`);
      console.error(`   Missing fields: ${missingFields.join(', ')}`);
      process.exit(1);
    }
  }

  console.log('✅ Environment variables validated successfully');
  return result.data;
}

export const env = validateEnv();
