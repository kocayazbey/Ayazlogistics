import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

export interface LogContext {
  userId?: string;
  tenantId?: string;
  requestId?: string;
  correlationId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  databaseQueries?: number;
  cacheHits?: number;
  cacheMisses?: number;
  externalApiCalls?: number;
  errorCode?: string;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ComprehensiveLoggerService implements LoggerService {
  private readonly logger: winston.Logger;
  private readonly contextLogger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...meta,
          });
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/audit.log',
          level: 'info',
          maxsize: 5242880, // 5MB
          maxFiles: 10,
        }),
        new winston.transports.File({
          filename: 'logs/security.log',
          level: 'warn',
          maxsize: 5242880, // 5MB
          maxFiles: 10,
        }),
        new winston.transports.File({
          filename: 'logs/performance.log',
          level: 'info',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });

    this.contextLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: 'logs/context.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });
  }

  log(message: string, context?: string, logContext?: LogContext) {
    this.logger.info(message, {
      context,
      ...logContext,
    });
  }

  error(message: string, trace?: string, context?: string, logContext?: LogContext) {
    this.logger.error(message, {
      context,
      trace,
      ...logContext,
    });
  }

  warn(message: string, context?: string, logContext?: LogContext) {
    this.logger.warn(message, {
      context,
      ...logContext,
    });
  }

  debug(message: string, context?: string, logContext?: LogContext) {
    this.logger.debug(message, {
      context,
      ...logContext,
    });
  }

  verbose(message: string, context?: string, logContext?: LogContext) {
    this.logger.verbose(message, {
      context,
      ...logContext,
    });
  }

  /**
   * Log API request
   */
  logApiRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    logContext: LogContext
  ) {
    this.logger.info('API Request', {
      type: 'api_request',
      method,
      url,
      statusCode,
      responseTime,
      ...logContext,
    });
  }

  /**
   * Log API response
   */
  logApiResponse(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    logContext: LogContext
  ) {
    this.logger.info('API Response', {
      type: 'api_response',
      method,
      url,
      statusCode,
      responseTime,
      ...logContext,
    });
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    logContext: LogContext
  ) {
    this.logger.info('Database Operation', {
      type: 'database_operation',
      operation,
      table,
      duration,
      ...logContext,
    });
  }

  /**
   * Log cache operation
   */
  logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'delete',
    key: string,
    duration: number,
    logContext: LogContext
  ) {
    this.logger.info('Cache Operation', {
      type: 'cache_operation',
      operation,
      key,
      duration,
      ...logContext,
    });
  }

  /**
   * Log external API call
   */
  logExternalApiCall(
    service: string,
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    logContext: LogContext
  ) {
    this.logger.info('External API Call', {
      type: 'external_api_call',
      service,
      endpoint,
      method,
      statusCode,
      duration,
      ...logContext,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    logContext: LogContext
  ) {
    this.logger.warn('Security Event', {
      type: 'security_event',
      event,
      severity,
      ...logContext,
    });
  }

  /**
   * Log audit event
   */
  logAuditEvent(
    action: string,
    resource: string,
    resourceId: string,
    logContext: LogContext
  ) {
    this.logger.info('Audit Event', {
      type: 'audit_event',
      action,
      resource,
      resourceId,
      ...logContext,
    });
  }

  /**
   * Log performance metrics
   */
  logPerformanceMetrics(
    operation: string,
    metrics: {
      duration: number;
      memoryUsage: number;
      cpuUsage: number;
      databaseQueries: number;
      cacheHits: number;
      cacheMisses: number;
    },
    logContext: LogContext
  ) {
    this.logger.info('Performance Metrics', {
      type: 'performance_metrics',
      operation,
      ...metrics,
      ...logContext,
    });
  }

  /**
   * Log business event
   */
  logBusinessEvent(
    event: string,
    category: string,
    value?: number,
    logContext: LogContext
  ) {
    this.logger.info('Business Event', {
      type: 'business_event',
      event,
      category,
      value,
      ...logContext,
    });
  }

  /**
   * Log error with comprehensive context
   */
  logError(
    error: Error,
    context: string,
    logContext: LogContext
  ) {
    this.logger.error('Application Error', {
      type: 'application_error',
      error: error.message,
      stack: error.stack,
      context,
      ...logContext,
    });
  }

  /**
   * Log system health
   */
  logSystemHealth(
    status: 'healthy' | 'degraded' | 'unhealthy',
    checks: Record<string, boolean>,
    logContext: LogContext
  ) {
    this.logger.info('System Health', {
      type: 'system_health',
      status,
      checks,
      ...logContext,
    });
  }

  /**
   * Log user activity
   */
  logUserActivity(
    activity: string,
    logContext: LogContext
  ) {
    this.logger.info('User Activity', {
      type: 'user_activity',
      activity,
      ...logContext,
    });
  }

  /**
   * Log tenant activity
   */
  logTenantActivity(
    activity: string,
    logContext: LogContext
  ) {
    this.logger.info('Tenant Activity', {
      type: 'tenant_activity',
      activity,
      ...logContext,
    });
  }

  /**
   * Log feature flag usage
   */
  logFeatureFlagUsage(
    flag: string,
    enabled: boolean,
    logContext: LogContext
  ) {
    this.logger.info('Feature Flag Usage', {
      type: 'feature_flag_usage',
      flag,
      enabled,
      ...logContext,
    });
  }

  /**
   * Log A/B test event
   */
  logABTestEvent(
    test: string,
    variant: string,
    logContext: LogContext
  ) {
    this.logger.info('A/B Test Event', {
      type: 'ab_test_event',
      test,
      variant,
      ...logContext,
    });
  }

  /**
   * Log analytics event
   */
  logAnalyticsEvent(
    event: string,
    category: string,
    action: string,
    label?: string,
    value?: number,
    logContext: LogContext
  ) {
    this.logger.info('Analytics Event', {
      type: 'analytics_event',
      event,
      category,
      action,
      label,
      value,
      ...logContext,
    });
  }

  /**
   * Get log statistics
   */
  getLogStatistics(): Promise<{
    totalLogs: number;
    errorCount: number;
    warningCount: number;
    infoCount: number;
    debugCount: number;
    lastLogTime: string;
  }> {
    // This would query the log files or database for statistics
    // Implementation depends on your logging setup
    return Promise.resolve({
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      lastLogTime: new Date().toISOString(),
    });
  }

  /**
   * Clear old logs
   */
  clearOldLogs(olderThanDays: number = 30): Promise<void> {
    // This would clear old log files
    // Implementation depends on your logging setup
    return Promise.resolve();
  }
}
