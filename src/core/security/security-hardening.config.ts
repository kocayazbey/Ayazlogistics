import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  // Rate limiting configuration
  rateLimit: {
    ttl: 900000, // 15 minutes
    limit: 100, // requests per window
    strictLimit: 5, // strict limit for sensitive endpoints
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  },

  // Security headers configuration
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  },

  // Input validation configuration
  validation: {
    maxBodySize: '10mb',
    maxFileSize: '5mb',
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    sanitizeInput: true,
    forbidUnknownValues: true,
  },

  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiration: '1h',
    refreshTokenExpiration: '7d',
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    requireStrongPassword: true,
    enableMFA: true,
  },

  // API configuration
  api: {
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    timeout: 30000, // 30 seconds
    maxConcurrentRequests: 100,
    enableRequestLogging: true,
    enableResponseLogging: false, // Sensitive data protection
  },

  // Database security
  database: {
    enableQueryLogging: false,
    enableParameterLogging: false,
    maxConnections: 20,
    connectionTimeout: 60000,
    sslRequired: true,
  },

  // File upload security
  uploads: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'],
    scanForVirus: true,
    quarantineSuspicious: true,
  },

  // Monitoring and alerting
  monitoring: {
    enableSecurityAudit: true,
    logSecurityEvents: true,
    alertThreshold: {
      failedLogins: 5,
      suspiciousActivity: 10,
      rateLimitExceeded: 50,
    },
  },
}));
