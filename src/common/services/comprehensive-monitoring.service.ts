import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ComprehensiveMonitoringService {
  private readonly logger = new Logger(ComprehensiveMonitoringService.name);
  private readonly metrics = new Map<string, any>();

  /**
   * Track system health
   */
  async trackSystemHealth(): Promise<any> {
    const health = {
      timestamp: new Date(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
    };

    this.logger.log(`[MONITORING] System Health: ${JSON.stringify(health)}`);
    return health;
  }

  /**
   * Track performance metrics
   */
  trackPerformanceMetrics(
    endpoint: string,
    method: string,
    executionTime: number,
    memoryUsage: number,
    cpuUsage: number
  ): void {
    const key = `${method}:${endpoint}`;
    const metrics = {
      endpoint,
      method,
      executionTime,
      memoryUsage,
      cpuUsage,
      timestamp: new Date(),
      count: (this.metrics.get(key)?.count || 0) + 1,
    };

    this.metrics.set(key, metrics);
    this.logger.log(`[MONITORING] Performance: ${JSON.stringify(metrics)}`);
  }

  /**
   * Track error metrics
   */
  trackErrorMetrics(
    endpoint: string,
    method: string,
    error: Error,
    statusCode: number
  ): void {
    const errorMetrics = {
      endpoint,
      method,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      statusCode,
      timestamp: new Date(),
    };

    this.logger.error(`[MONITORING] Error: ${JSON.stringify(errorMetrics)}`);
  }

  /**
   * Track user activity
   */
  trackUserActivity(
    userId: string,
    tenantId: string,
    action: string,
    resource: string,
    details?: any
  ): void {
    const activity = {
      userId,
      tenantId,
      action,
      resource,
      details,
      timestamp: new Date(),
    };

    this.logger.log(`[MONITORING] User Activity: ${JSON.stringify(activity)}`);
  }

  /**
   * Track API usage
   */
  trackAPIUsage(
    endpoint: string,
    method: string,
    userId: string,
    tenantId: string,
    responseTime: number,
    statusCode: number
  ): void {
    const usage = {
      endpoint,
      method,
      userId,
      tenantId,
      responseTime,
      statusCode,
      timestamp: new Date(),
    };

    this.logger.log(`[MONITORING] API Usage: ${JSON.stringify(usage)}`);
  }

  /**
   * Track database queries
   */
  trackDatabaseQuery(
    query: string,
    executionTime: number,
    rowsAffected: number,
    userId: string,
    tenantId: string
  ): void {
    const dbMetrics = {
      query: query.substring(0, 100) + '...', // Truncate for logging
      executionTime,
      rowsAffected,
      userId,
      tenantId,
      timestamp: new Date(),
    };

    this.logger.log(`[MONITORING] Database Query: ${JSON.stringify(dbMetrics)}`);
  }

  /**
   * Track external service calls
   */
  trackExternalServiceCall(
    service: string,
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    userId: string,
    tenantId: string
  ): void {
    const externalCall = {
      service,
      endpoint,
      method,
      responseTime,
      statusCode,
      userId,
      tenantId,
      timestamp: new Date(),
    };

    this.logger.log(`[MONITORING] External Service Call: ${JSON.stringify(externalCall)}`);
  }

  /**
   * Track cache operations
   */
  trackCacheOperation(
    operation: 'GET' | 'SET' | 'DELETE' | 'CLEAR',
    key: string,
    hit: boolean,
    executionTime: number,
    userId: string,
    tenantId: string
  ): void {
    const cacheMetrics = {
      operation,
      key,
      hit,
      executionTime,
      userId,
      tenantId,
      timestamp: new Date(),
    };

    this.logger.log(`[MONITORING] Cache Operation: ${JSON.stringify(cacheMetrics)}`);
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): any {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      timestamp: new Date(),
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): any {
    const metrics: any = {};
    for (const [key, value] of this.metrics.entries()) {
      metrics[key] = value;
    }
    return metrics;
  }

  /**
   * Check system alerts
   */
  checkSystemAlerts(): any[] {
    const alerts: any[] = [];
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Memory usage alert
    if (memoryUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      alerts.push({
        type: 'MEMORY_USAGE',
        severity: 'WARNING',
        message: `High memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        timestamp: new Date(),
      });
    }

    // Uptime alert
    if (uptime > 86400) { // 24 hours
      alerts.push({
        type: 'UPTIME',
        severity: 'INFO',
        message: `System uptime: ${Math.round(uptime / 3600)} hours`,
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Generate monitoring report
   */
  generateMonitoringReport(): any {
    return {
      system: this.getSystemMetrics(),
      performance: this.getPerformanceMetrics(),
      alerts: this.checkSystemAlerts(),
      timestamp: new Date(),
    };
  }
}