import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'ayazlogistics:',
    retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100', 10),
    enableReadyCheck: process.env.REDIS_ENABLE_READY_CHECK !== 'false',
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    lazyConnect: process.env.REDIS_LAZY_CONNECT === 'true',
  },

  // Cache strategies
  strategies: {
    memory: {
      enabled: process.env.CACHE_MEMORY_ENABLED !== 'false',
      maxSize: parseInt(process.env.CACHE_MEMORY_MAX_SIZE || '100', 10), // MB
      ttl: parseInt(process.env.CACHE_MEMORY_TTL || '3600', 10), // seconds
    },
    redis: {
      enabled: process.env.CACHE_REDIS_ENABLED !== 'false',
      ttl: parseInt(process.env.CACHE_REDIS_TTL || '3600', 10), // seconds
      keyPrefix: process.env.CACHE_REDIS_KEY_PREFIX || 'cache:',
    },
  },

  // Cache keys configuration
  keys: {
    // User related
    userProfile: 'user:profile:',
    userPermissions: 'user:permissions:',
    userSessions: 'user:sessions:',

    // Business data
    orders: 'orders:',
    shipments: 'shipments:',
    inventory: 'inventory:',
    customers: 'customers:',
    vehicles: 'vehicles:',

    // Analytics
    dashboardMetrics: 'dashboard:metrics:',
    reports: 'reports:',
    analytics: 'analytics:',

    // AI/ML
    aiModels: 'ai:models:',
    predictions: 'ai:predictions:',
    insights: 'ai:insights:',

    // System
    systemHealth: 'system:health:',
    performanceMetrics: 'system:performance:',
    auditLogs: 'system:audit:',
  },

  // TTL configurations by data type
  ttl: {
    // Short-lived data (5 minutes)
    temporary: 300,
    sessionData: 1800, // 30 minutes

    // Medium-lived data (1 hour)
    userProfile: 3600,
    dashboardMetrics: 3600,

    // Long-lived data (24 hours)
    businessData: 86400,
    reports: 86400,

    // Very long-lived data (7 days)
    analytics: 604800,
    systemMetrics: 604800,

    // Permanent data (no TTL)
    staticData: -1,
    configuration: -1,
  },

  // Cache invalidation patterns
  invalidation: {
    // Tag-based invalidation
    tags: {
      orders: 'tag:orders',
      shipments: 'tag:shipments',
      inventory: 'tag:inventory',
      users: 'tag:users',
      analytics: 'tag:analytics',
    },

    // Pattern-based invalidation
    patterns: {
      userData: 'user:*',
      orderData: 'orders:*',
      shipmentData: 'shipments:*',
      inventoryData: 'inventory:*',
    },
  },

  // Performance monitoring
  monitoring: {
    enabled: process.env.CACHE_MONITORING_ENABLED !== 'false',
    metricsInterval: parseInt(process.env.CACHE_METRICS_INTERVAL || '60', 10), // seconds
    enableStats: process.env.CACHE_ENABLE_STATS !== 'false',
    statsInterval: parseInt(process.env.CACHE_STATS_INTERVAL || '300', 10), // seconds
  },

  // Cache warming
  warming: {
    enabled: process.env.CACHE_WARMING_ENABLED !== 'false',
    preloadKeys: process.env.CACHE_PRELOAD_KEYS ? process.env.CACHE_PRELOAD_KEYS.split(',') : [],
    warmingInterval: parseInt(process.env.CACHE_WARMING_INTERVAL || '3600', 10), // seconds
  },

  // Fallback configuration
  fallback: {
    enabled: process.env.CACHE_FALLBACK_ENABLED !== 'false',
    fallbackToMemory: process.env.CACHE_FALLBACK_TO_MEMORY === 'true',
    fallbackTimeout: parseInt(process.env.CACHE_FALLBACK_TIMEOUT || '5000', 10), // milliseconds
  },

  // Environment settings
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
}));
