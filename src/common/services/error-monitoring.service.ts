import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByService: Record<string, number>;
  lastErrorTime: Date | null;
  criticalErrors: number;
}

@Injectable()
export class ErrorMonitoringService {
  private readonly logger = new Logger(ErrorMonitoringService.name);
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByType: {},
    errorsByService: {},
    lastErrorTime: null,
    criticalErrors: 0,
  };

  constructor(private configService: ConfigService) {}

  recordError(
    error: Error,
    context: {
      service: string;
      method: string;
      userId?: string;
      requestId?: string;
    }
  ): void {
    this.metrics.totalErrors++;
    this.metrics.lastErrorTime = new Date();

    // Update error type metrics
    const errorType = error.constructor.name;
    this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;

    // Update service metrics
    this.metrics.errorsByService[context.service] = 
      (this.metrics.errorsByService[context.service] || 0) + 1;

    // Check if critical error
    if (this.isCriticalError(error)) {
      this.metrics.criticalErrors++;
      this.handleCriticalError(error, context);
    }

    // Log error
    this.logger.error(
      `Error in ${context.service}.${context.method}`,
      error.stack,
      {
        userId: context.userId,
        requestId: context.requestId,
        errorType,
        timestamp: new Date().toISOString(),
      }
    );

    // Send to external monitoring if configured
    this.sendToExternalMonitoring(error, context);
  }

  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByType: {},
      errorsByService: {},
      lastErrorTime: null,
      criticalErrors: 0,
    };
  }

  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Database connection',
      'Out of memory',
      'Fatal error',
    ];

    return criticalPatterns.some(pattern => 
      error.message.includes(pattern) || error.stack?.includes(pattern)
    );
  }

  private handleCriticalError(
    error: Error,
    context: { service: string; method: string; userId?: string; requestId?: string }
  ): void {
    this.logger.fatal(
      `CRITICAL ERROR in ${context.service}.${context.method}`,
      error.stack,
      {
        userId: context.userId,
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
      }
    );

    // Send alert to administrators
    this.sendCriticalAlert(error, context);
  }

  private sendToExternalMonitoring(
    error: Error,
    context: { service: string; method: string; userId?: string; requestId?: string }
  ): void {
    const monitoringEndpoint = this.configService.get('MONITORING_ENDPOINT');
    if (!monitoringEndpoint) return;

    try {
      // In a real implementation, you would send to services like Sentry, DataDog, etc.
      this.logger.debug('Sending error to external monitoring service');
    } catch (monitoringError) {
      this.logger.error('Failed to send error to external monitoring', monitoringError.stack);
    }
  }

  private sendCriticalAlert(
    error: Error,
    context: { service: string; method: string; userId?: string; requestId?: string }
  ): void {
    const alertEndpoint = this.configService.get('ALERT_ENDPOINT');
    if (!alertEndpoint) return;

    try {
      // In a real implementation, you would send alerts via email, Slack, etc.
      this.logger.debug('Sending critical alert to administrators');
    } catch (alertError) {
      this.logger.error('Failed to send critical alert', alertError.stack);
    }
  }
}
