import { registerAs } from '@nestjs/config';

export default registerAs('integrations', () => ({
  // Framework configuration
  framework: {
    enableMonitoring: process.env.INTEGRATIONS_ENABLE_MONITORING !== 'false',
    monitoringInterval: parseInt(process.env.INTEGRATIONS_MONITORING_INTERVAL || '30', 10), // seconds
    enableHealthChecks: process.env.INTEGRATIONS_ENABLE_HEALTH_CHECKS !== 'false',
    healthCheckInterval: parseInt(process.env.INTEGRATIONS_HEALTH_CHECK_INTERVAL || '60', 10), // seconds
    maxConcurrentRequests: parseInt(process.env.INTEGRATIONS_MAX_CONCURRENT_REQUESTS || '10', 10),
    requestTimeout: parseInt(process.env.INTEGRATIONS_REQUEST_TIMEOUT || '30', 10), // seconds
  },

  // Payment integrations
  payment: {
    iyzico: {
      enabled: process.env.IYZICO_ENABLED !== 'false',
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      baseUrl: process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com',
      webhookUrl: process.env.IYZICO_WEBHOOK_URL,
      rateLimit: {
        requestsPerMinute: parseInt(process.env.IYZICO_RATE_LIMIT_RPM || '100', 10),
        burstLimit: parseInt(process.env.IYZICO_RATE_LIMIT_BURST || '10', 10),
      },
    },
    stripe: {
      enabled: process.env.STRIPE_ENABLED !== 'false',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      rateLimit: {
        requestsPerMinute: parseInt(process.env.STRIPE_RATE_LIMIT_RPM || '200', 10),
        burstLimit: parseInt(process.env.STRIPE_RATE_LIMIT_BURST || '20', 10),
      },
    },
  },

  // Shipping integrations
  shipping: {
    arasKargo: {
      enabled: process.env.ARAS_KARGO_ENABLED !== 'false',
      username: process.env.ARAS_KARGO_USERNAME,
      password: process.env.ARAS_KARGO_PASSWORD,
      customerId: process.env.ARAS_KARGO_CUSTOMER_ID,
      apiUrl: process.env.ARAS_KARGO_API_URL || 'https://api.araskargo.com.tr/v1',
      rateLimit: {
        requestsPerMinute: parseInt(process.env.ARAS_KARGO_RATE_LIMIT_RPM || '50', 10),
        burstLimit: parseInt(process.env.ARAS_KARGO_RATE_LIMIT_BURST || '5', 10),
      },
    },
    mngKargo: {
      enabled: process.env.MNG_KARGO_ENABLED !== 'false',
      username: process.env.MNG_KARGO_USERNAME,
      password: process.env.MNG_KARGO_PASSWORD,
      customerId: process.env.MNG_KARGO_CUSTOMER_ID,
      apiUrl: process.env.MNG_KARGO_API_URL || 'https://api.mngkargo.com.tr/v1',
      rateLimit: {
        requestsPerMinute: parseInt(process.env.MNG_KARGO_RATE_LIMIT_RPM || '50', 10),
        burstLimit: parseInt(process.env.MNG_KARGO_RATE_LIMIT_BURST || '5', 10),
      },
    },
    yurticiKargo: {
      enabled: process.env.YURTICI_KARGO_ENABLED !== 'false',
      username: process.env.YURTICI_KARGO_USERNAME,
      password: process.env.YURTICI_KARGO_PASSWORD,
      customerId: process.env.YURTICI_KARGO_CUSTOMER_ID,
      apiUrl: process.env.YURTICI_KARGO_API_URL || 'https://api.yurticikargo.com/v1',
      rateLimit: {
        requestsPerMinute: parseInt(process.env.YURTICI_KARGO_RATE_LIMIT_RPM || '50', 10),
        burstLimit: parseInt(process.env.YURTICI_KARGO_RATE_LIMIT_BURST || '5', 10),
      },
    },
  },

  // Banking integrations
  banking: {
    akbank: {
      enabled: process.env.AKBANK_API_ENABLED !== 'false',
      apiKey: process.env.AKBANK_API_KEY,
      apiSecret: process.env.AKBANK_API_SECRET,
      baseUrl: process.env.AKBANK_API_URL || 'https://api.akbank.com',
      rateLimit: {
        requestsPerMinute: parseInt(process.env.AKBANK_RATE_LIMIT_RPM || '30', 10),
        burstLimit: parseInt(process.env.AKBANK_RATE_LIMIT_BURST || '3', 10),
      },
    },
    isbank: {
      enabled: process.env.ISBANK_API_ENABLED !== 'false',
      apiKey: process.env.ISBANK_API_KEY,
      apiSecret: process.env.ISBANK_API_SECRET,
      baseUrl: process.env.ISBANK_API_URL || 'https://api.isbank.com.tr',
      rateLimit: {
        requestsPerMinute: parseInt(process.env.ISBANK_RATE_LIMIT_RPM || '30', 10),
        burstLimit: parseInt(process.env.ISBANK_RATE_LIMIT_BURST || '3', 10),
      },
    },
  },

  // Communication integrations
  communication: {
    sms: {
      netgsm: {
        enabled: process.env.NETGSM_ENABLED !== 'false',
        username: process.env.NETGSM_USERNAME,
        password: process.env.NETGSM_PASSWORD,
        sender: process.env.NETGSM_SENDER || 'AyazLog',
        rateLimit: {
          requestsPerMinute: parseInt(process.env.NETGSM_RATE_LIMIT_RPM || '100', 10),
          burstLimit: parseInt(process.env.NETGSM_RATE_LIMIT_BURST || '10', 10),
        },
      },
    },
    email: {
      sendgrid: {
        enabled: process.env.SENDGRID_ENABLED !== 'false',
        apiKey: process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@ayazlogistics.com',
        fromName: process.env.SENDGRID_FROM_NAME || 'Ayaz Logistics',
        rateLimit: {
          requestsPerMinute: parseInt(process.env.SENDGRID_RATE_LIMIT_RPM || '200', 10),
          burstLimit: parseInt(process.env.SENDGRID_RATE_LIMIT_BURST || '20', 10),
        },
      },
    },
    whatsapp: {
      enabled: process.env.WHATSAPP_ENABLED !== 'false',
      apiKey: process.env.WHATSAPP_API_KEY,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      rateLimit: {
        requestsPerMinute: parseInt(process.env.WHATSAPP_RATE_LIMIT_RPM || '50', 10),
        burstLimit: parseInt(process.env.WHATSAPP_RATE_LIMIT_BURST || '5', 10),
      },
    },
  },

  // GPS/Tracking integrations
  tracking: {
    teltonika: {
      enabled: process.env.TELTONIKA_ENABLED !== 'false',
      server: process.env.TELTONIKA_SERVER,
      port: parseInt(process.env.TELTONIKA_PORT || '5027', 10),
      protocol: process.env.TELTONIKA_PROTOCOL || 'tcp',
      rateLimit: {
        requestsPerMinute: parseInt(process.env.TELTONIKA_RATE_LIMIT_RPM || '1000', 10),
        burstLimit: parseInt(process.env.TELTONIKA_RATE_LIMIT_BURST || '100', 10),
      },
    },
    googleMaps: {
      enabled: process.env.GOOGLE_MAPS_ENABLED !== 'false',
      apiKey: process.env.GOOGLE_MAPS_API_KEY,
      rateLimit: {
        requestsPerMinute: parseInt(process.env.GOOGLE_MAPS_RATE_LIMIT_RPM || '100', 10),
        burstLimit: parseInt(process.env.GOOGLE_MAPS_RATE_LIMIT_BURST || '10', 10),
      },
    },
  },

  // Government integrations
  government: {
    gib: {
      enabled: process.env.GIB_ENABLED !== 'false',
      testMode: process.env.GIB_TEST_MODE === 'true',
      username: process.env.GIB_USERNAME,
      password: process.env.GIB_PASSWORD,
      rateLimit: {
        requestsPerMinute: parseInt(process.env.GIB_RATE_LIMIT_RPM || '20', 10),
        burstLimit: parseInt(process.env.GIB_RATE_LIMIT_BURST || '2', 10),
      },
    },
    sgk: {
      enabled: process.env.SGK_ENABLED !== 'false',
      username: process.env.SGK_USERNAME,
      password: process.env.SGK_PASSWORD,
      rateLimit: {
        requestsPerMinute: parseInt(process.env.SGK_RATE_LIMIT_RPM || '10', 10),
        burstLimit: parseInt(process.env.SGK_RATE_LIMIT_BURST || '1', 10),
      },
    },
  },

  // Marketplace integrations
  marketplace: {
    trendyol: {
      enabled: process.env.TRENDYOL_ENABLED !== 'false',
      apiKey: process.env.TRENDYOL_API_KEY,
      apiSecret: process.env.TRENDYOL_API_SECRET,
      sellerId: process.env.TRENDYOL_SELLER_ID,
      baseUrl: process.env.TRENDYOL_BASE_URL || 'https://api.trendyol.com',
      rateLimit: {
        requestsPerMinute: parseInt(process.env.TRENDYOL_RATE_LIMIT_RPM || '30', 10),
        burstLimit: parseInt(process.env.TRENDYOL_RATE_LIMIT_BURST || '3', 10),
      },
    },
  },

  // Webhook configurations
  webhooks: {
    enableGlobalWebhooks: process.env.WEBHOOKS_ENABLED !== 'false',
    maxRetries: parseInt(process.env.WEBHOOKS_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.WEBHOOKS_RETRY_DELAY || '5000', 10), // milliseconds
    timeout: parseInt(process.env.WEBHOOKS_TIMEOUT || '30', 10), // seconds
    signatureValidation: process.env.WEBHOOKS_SIGNATURE_VALIDATION !== 'false',
  },

  // Security configurations
  security: {
    enableRequestLogging: process.env.INTEGRATIONS_ENABLE_REQUEST_LOGGING !== 'false',
    enableResponseLogging: process.env.INTEGRATIONS_ENABLE_RESPONSE_LOGGING === 'true',
    enableIPWhitelist: process.env.INTEGRATIONS_ENABLE_IP_WHITELIST === 'true',
    allowedIPs: process.env.INTEGRATIONS_ALLOWED_IPS ? process.env.INTEGRATIONS_ALLOWED_IPS.split(',') : [],
    enableRateLimiting: process.env.INTEGRATIONS_ENABLE_RATE_LIMITING !== 'false',
    enableCircuitBreaker: process.env.INTEGRATIONS_ENABLE_CIRCUIT_BREAKER !== 'false',
    circuitBreakerThreshold: parseInt(process.env.INTEGRATIONS_CIRCUIT_BREAKER_THRESHOLD || '5', 10),
    circuitBreakerTimeout: parseInt(process.env.INTEGRATIONS_CIRCUIT_BREAKER_TIMEOUT || '60', 10), // seconds
  },

  // Monitoring configurations
  monitoring: {
    enableMetrics: process.env.INTEGRATIONS_ENABLE_METRICS !== 'false',
    metricsRetentionDays: parseInt(process.env.INTEGRATIONS_METRICS_RETENTION_DAYS || '90', 10),
    enableAlerts: process.env.INTEGRATIONS_ENABLE_ALERTS !== 'false',
    alertThresholds: {
      errorRate: parseFloat(process.env.INTEGRATIONS_ERROR_RATE_THRESHOLD || '0.05'), // 5%
      responseTime: parseInt(process.env.INTEGRATIONS_RESPONSE_TIME_THRESHOLD || '5000', 10), // 5 seconds
      uptime: parseFloat(process.env.INTEGRATIONS_UPTIME_THRESHOLD || '0.99'), // 99%
    },
  },

  // Environment settings
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
}));
