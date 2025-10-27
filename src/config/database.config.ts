import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  // Connection details
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'ayazlogistics',
  url: process.env.DATABASE_URL,

  // SSL configuration
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  // Connection pool configuration
  maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20', 10),
  minConnections: parseInt(process.env.DATABASE_MIN_CONNECTIONS || '2', 10),
  idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30', 10), // seconds
  connectTimeout: parseInt(process.env.DATABASE_CONNECT_TIMEOUT || '10', 10), // seconds
  acquireTimeout: parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT || '30', 10), // seconds
  maxLifetime: parseInt(process.env.DATABASE_MAX_LIFETIME || '3600', 10), // seconds (1 hour)

  // Retry configuration
  connectionRetryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS || '5', 10),
  connectionRetryDelay: parseInt(process.env.DATABASE_RETRY_DELAY || '1000', 10), // milliseconds

  // Performance optimizations
  enablePipelining: process.env.DATABASE_ENABLE_PIPELINING !== 'false',
  maxPipeline: parseInt(process.env.DATABASE_MAX_PIPELINE || '100', 10),
  fetchTypes: process.env.DATABASE_FETCH_TYPES !== 'false',
  prepare: process.env.DATABASE_PREPARE !== 'false',

  // Monitoring
  enableHealthChecks: process.env.DATABASE_ENABLE_HEALTH_CHECKS !== 'false',
  healthCheckInterval: parseInt(process.env.DATABASE_HEALTH_CHECK_INTERVAL || '30', 10), // seconds
  enableMetrics: process.env.DATABASE_ENABLE_METRICS !== 'false',
  metricsInterval: parseInt(process.env.DATABASE_METRICS_INTERVAL || '30', 10), // seconds

  // Development options
  enableLogging: process.env.NODE_ENV === 'development',
  logLevel: process.env.DATABASE_LOG_LEVEL || 'info',

  // Connection validation
  validateConnection: process.env.DATABASE_VALIDATE_CONNECTION !== 'false',
  validationQuery: process.env.DATABASE_VALIDATION_QUERY || 'SELECT 1',

  // Pool behavior
  allowExitOnIdle: process.env.DATABASE_ALLOW_EXIT_ON_IDLE === 'true',
  maxUses: parseInt(process.env.DATABASE_MAX_USES || '0', 10), // 0 = unlimited

  // Environment specific settings
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Migration settings
  migrationsTable: process.env.DATABASE_MIGRATIONS_TABLE || 'drizzle_migrations',
  migrationsPath: process.env.DATABASE_MIGRATIONS_PATH || 'drizzle/migrations',

  // Read replica configuration (for future scaling)
  readReplicas: process.env.DATABASE_READ_REPLICAS ? process.env.DATABASE_READ_REPLICAS.split(',') : [],
  enableReadReplicaLoadBalancing: process.env.DATABASE_ENABLE_READ_REPLICA_LOAD_BALANCING === 'true',
}));
