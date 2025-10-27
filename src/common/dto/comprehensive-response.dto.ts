import { ApiProperty } from '@nestjs/swagger';

export class ComprehensiveApiResponse<T> {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Response message' })
  message?: string;

  @ApiProperty({ description: 'Response timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId?: string;

  @ApiProperty({ description: 'Response metadata' })
  metadata?: {
    version: string;
    environment: string;
    tenantId?: string;
    userId?: string;
    processingTime?: number;
    cacheHit?: boolean;
    rateLimitRemaining?: number;
    rateLimitReset?: number;
  };

  @ApiProperty({ description: 'Pagination metadata' })
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({ description: 'Performance metrics' })
  performance?: {
    queryTime: number;
    cacheTime: number;
    totalTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };

  @ApiProperty({ description: 'Security information' })
  security?: {
    auditId: string;
    permissions: string[];
    roles: string[];
    tenantIsolation: boolean;
    dataEncryption: boolean;
  };

  @ApiProperty({ description: 'Analytics data' })
  analytics?: {
    eventId: string;
    category: string;
    action: string;
    label?: string;
    value?: number;
    customDimensions?: Record<string, any>;
    customMetrics?: Record<string, number>;
  };

  @ApiProperty({ description: 'Error information (if applicable)' })
  error?: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
    correlationId?: string;
  };

  @ApiProperty({ description: 'Links for navigation' })
  links?: {
    self: string;
    next?: string;
    prev?: string;
    first?: string;
    last?: string;
  };

  @ApiProperty({ description: 'Feature flags' })
  featureFlags?: Record<string, boolean>;

  @ApiProperty({ description: 'Version information' })
  version?: {
    api: string;
    service: string;
    database: string;
    cache: string;
  };

  @ApiProperty({ description: 'Health status' })
  health?: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    uptime: number;
    lastCheck: string;
  };
}

export class ComprehensiveErrorResponse {
  @ApiProperty({ description: 'Success status' })
  success: boolean = false;

  @ApiProperty({ description: 'Error code' })
  errorCode: string;

  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Error timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Request path' })
  path: string;

  @ApiProperty({ description: 'HTTP method' })
  method: string;

  @ApiProperty({ description: 'Request ID for tracking' })
  requestId?: string;

  @ApiProperty({ description: 'Error details' })
  details?: any;

  @ApiProperty({ description: 'Error stack trace (development only)' })
  stack?: string;

  @ApiProperty({ description: 'Error correlation ID' })
  correlationId?: string;

  @ApiProperty({ description: 'Retry information' })
  retry?: {
    canRetry: boolean;
    retryAfter?: number;
    maxRetries?: number;
    retryCount?: number;
  };

  @ApiProperty({ description: 'Security information' })
  security?: {
    auditId: string;
    suspiciousActivity: boolean;
    blocked: boolean;
    reason?: string;
  };

  @ApiProperty({ description: 'Support information' })
  support?: {
    contactEmail: string;
    documentation: string;
    statusPage: string;
    incidentId?: string;
  };
}

export class ComprehensivePaginationMeta {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrev: boolean;

  @ApiProperty({ description: 'Next page URL' })
  nextUrl?: string;

  @ApiProperty({ description: 'Previous page URL' })
  prevUrl?: string;

  @ApiProperty({ description: 'First page URL' })
  firstUrl?: string;

  @ApiProperty({ description: 'Last page URL' })
  lastUrl?: string;
}

export class ComprehensivePerformanceMetrics {
  @ApiProperty({ description: 'Query execution time in milliseconds' })
  queryTime: number;

  @ApiProperty({ description: 'Cache hit time in milliseconds' })
  cacheTime: number;

  @ApiProperty({ description: 'Total response time in milliseconds' })
  totalTime: number;

  @ApiProperty({ description: 'Memory usage in bytes' })
  memoryUsage: number;

  @ApiProperty({ description: 'CPU usage percentage' })
  cpuUsage: number;

  @ApiProperty({ description: 'Database connection time' })
  dbConnectionTime?: number;

  @ApiProperty({ description: 'External API call time' })
  externalApiTime?: number;

  @ApiProperty({ description: 'Cache hit ratio' })
  cacheHitRatio?: number;

  @ApiProperty({ description: 'Database query count' })
  dbQueryCount?: number;

  @ApiProperty({ description: 'Cache operations count' })
  cacheOperationsCount?: number;
}

export class ComprehensiveSecurityInfo {
  @ApiProperty({ description: 'Audit trail ID' })
  auditId: string;

  @ApiProperty({ description: 'User permissions' })
  permissions: string[];

  @ApiProperty({ description: 'User roles' })
  roles: string[];

  @ApiProperty({ description: 'Tenant isolation enabled' })
  tenantIsolation: boolean;

  @ApiProperty({ description: 'Data encryption enabled' })
  dataEncryption: boolean;

  @ApiProperty({ description: 'Rate limiting applied' })
  rateLimiting: boolean;

  @ApiProperty({ description: 'Input validation applied' })
  inputValidation: boolean;

  @ApiProperty({ description: 'Output sanitization applied' })
  outputSanitization: boolean;

  @ApiProperty({ description: 'Security headers applied' })
  securityHeaders: boolean;

  @ApiProperty({ description: 'CORS configuration' })
  cors: boolean;

  @ApiProperty({ description: 'CSRF protection' })
  csrfProtection: boolean;

  @ApiProperty({ description: 'XSS protection' })
  xssProtection: boolean;

  @ApiProperty({ description: 'SQL injection protection' })
  sqlInjectionProtection: boolean;
}

export class ComprehensiveAnalyticsData {
  @ApiProperty({ description: 'Analytics event ID' })
  eventId: string;

  @ApiProperty({ description: 'Event category' })
  category: string;

  @ApiProperty({ description: 'Event action' })
  action: string;

  @ApiProperty({ description: 'Event label' })
  label?: string;

  @ApiProperty({ description: 'Event value' })
  value?: number;

  @ApiProperty({ description: 'Custom dimensions' })
  customDimensions?: Record<string, any>;

  @ApiProperty({ description: 'Custom metrics' })
  customMetrics?: Record<string, number>;

  @ApiProperty({ description: 'User ID' })
  userId?: string;

  @ApiProperty({ description: 'Session ID' })
  sessionId?: string;

  @ApiProperty({ description: 'Tenant ID' })
  tenantId?: string;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'User agent' })
  userAgent?: string;

  @ApiProperty({ description: 'IP address' })
  ipAddress?: string;

  @ApiProperty({ description: 'Referrer' })
  referrer?: string;

  @ApiProperty({ description: 'Page URL' })
  pageUrl?: string;

  @ApiProperty({ description: 'Page title' })
  pageTitle?: string;
}
