import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '../events/event-bus.service';

interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

interface Alert {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  lastTriggered?: Date;
  cooldownMs: number;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  lastChecked: Date;
  details?: any;
}

@Injectable()
export class AdvancedMonitoringService {
  private readonly logger = new Logger(AdvancedMonitoringService.name);
  private readonly metrics: Map<string, Metric[]> = new Map();
  private readonly alerts: Map<string, Alert> = new Map();
  private readonly healthChecks: Map<string, HealthCheck> = new Map();
  private readonly alertHistory: Array<{ alertId: string; triggeredAt: Date; value: number }> = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
  ) {
    this.initializeDefaultAlerts();
    this.startHealthChecks();
  }

  /**
   * Record a metric
   */
  recordMetric(
    name: string,
    value: number,
    type: 'counter' | 'gauge' | 'histogram' | 'summary' = 'gauge',
    labels?: Record<string, string>
  ): void {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      labels,
      type,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);

    // Keep only last 1000 metrics per name
    const metrics = this.metrics.get(name)!;
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    // Check alerts
    this.checkAlerts(name, value);

    // Emit metric event
    this.eventBus.emit('metric.recorded', { name, value, type, labels });
  }

  /**
   * Increment counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    const current = this.getCurrentMetricValue(name, labels) || 0;
    this.recordMetric(name, current + 1, 'counter', labels);
  }

  /**
   * Decrement counter metric
   */
  decrementCounter(name: string, labels?: Record<string, string>): void {
    const current = this.getCurrentMetricValue(name, labels) || 0;
    this.recordMetric(name, Math.max(0, current - 1), 'counter', labels);
  }

  /**
   * Set gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, 'gauge', labels);
  }

  /**
   * Record histogram metric
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.recordMetric(name, value, 'histogram', labels);
  }

  /**
   * Get metrics for a specific name
   */
  getMetrics(name: string, limit = 100): Metric[] {
    const metrics = this.metrics.get(name) || [];
    return metrics.slice(-limit);
  }

  /**
   * Get current metric value
   */
  getCurrentMetricValue(name: string, labels?: Record<string, string>): number | null {
    const metrics = this.metrics.get(name) || [];
    const filtered = labels 
      ? metrics.filter(m => this.matchLabels(m.labels, labels))
      : metrics;
    
    if (filtered.length === 0) return null;
    
    return filtered[filtered.length - 1].value;
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string, timeWindowMs = 3600000): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
    latest: number;
  } {
    const now = new Date();
    const cutoff = new Date(now.getTime() - timeWindowMs);
    
    const metrics = (this.metrics.get(name) || [])
      .filter(m => m.timestamp >= cutoff);

    if (metrics.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0, latest: 0 };
    }

    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

    return { count: values.length, sum, avg, min, max, latest };
  }

  /**
   * Create alert
   */
  createAlert(alert: Omit<Alert, 'id'>): string {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newAlert: Alert = { id, ...alert };
    this.alerts.set(id, newAlert);
    return id;
  }

  /**
   * Update alert
   */
  updateAlert(alertId: string, updates: Partial<Alert>): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    Object.assign(alert, updates);
    return true;
  }

  /**
   * Delete alert
   */
  deleteAlert(alertId: string): boolean {
    return this.alerts.delete(alertId);
  }

  /**
   * Get all alerts
   */
  getAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.isActive);
  }

  /**
   * Check alerts for a metric
   */
  private checkAlerts(metricName: string, value: number): void {
    const now = new Date();
    
    for (const alert of this.alerts.values()) {
      if (!alert.isActive) continue;
      
      // Check cooldown
      if (alert.lastTriggered) {
        const timeSinceLastTrigger = now.getTime() - alert.lastTriggered.getTime();
        if (timeSinceLastTrigger < alert.cooldownMs) continue;
      }

      // Check condition
      let shouldTrigger = false;
      switch (alert.condition) {
        case 'greater_than':
          shouldTrigger = value > alert.threshold;
          break;
        case 'less_than':
          shouldTrigger = value < alert.threshold;
          break;
        case 'equals':
          shouldTrigger = value === alert.threshold;
          break;
        case 'not_equals':
          shouldTrigger = value !== alert.threshold;
          break;
      }

      if (shouldTrigger) {
        this.triggerAlert(alert, value);
      }
    }
  }

  /**
   * Trigger alert
   */
  private triggerAlert(alert: Alert, value: number): void {
    alert.lastTriggered = new Date();
    this.alertHistory.push({
      alertId: alert.id,
      triggeredAt: alert.lastTriggered,
      value,
    });

    this.logger.warn(`Alert triggered: ${alert.name}`, {
      alertId: alert.id,
      value,
      threshold: alert.threshold,
      severity: alert.severity,
    });

    this.eventBus.emit('alert.triggered', {
      alertId: alert.id,
      name: alert.name,
      value,
      threshold: alert.threshold,
      severity: alert.severity,
    });
  }

  /**
   * Register health check
   */
  registerHealthCheck(
    name: string,
    checkFn: () => Promise<{ status: 'healthy' | 'unhealthy' | 'degraded'; details?: any }>
  ): void {
    const healthCheck: HealthCheck = {
      name,
      status: 'healthy',
      lastChecked: new Date(),
    };

    this.healthChecks.set(name, healthCheck);

    // Store check function for periodic execution
    (healthCheck as any).checkFn = checkFn;
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    overall: 'healthy' | 'unhealthy' | 'degraded';
    checks: HealthCheck[];
    summary: {
      healthy: number;
      unhealthy: number;
      degraded: number;
    };
  } {
    const checks = Array.from(this.healthChecks.values());
    const healthy = checks.filter(c => c.status === 'healthy').length;
    const unhealthy = checks.filter(c => c.status === 'unhealthy').length;
    const degraded = checks.filter(c => c.status === 'degraded').length;

    let overall: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (unhealthy > 0) {
      overall = 'unhealthy';
    } else if (degraded > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      checks,
      summary: { healthy, unhealthy, degraded },
    };
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): {
    memory: NodeJS.MemoryUsage;
    uptime: number;
    cpuUsage?: NodeJS.CpuUsage;
    metricsCount: number;
    alertsCount: number;
    healthChecksCount: number;
  } {
    return {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      metricsCount: this.metrics.size,
      alertsCount: this.alerts.size,
      healthChecksCount: this.healthChecks.size,
    };
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100): Array<{ alertId: string; triggeredAt: Date; value: number }> {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Initialize default alerts
   */
  private initializeDefaultAlerts(): void {
    // Memory usage alert
    this.createAlert({
      name: 'High Memory Usage',
      condition: 'greater_than',
      threshold: 0.8, // 80%
      severity: 'high',
      isActive: true,
      cooldownMs: 5 * 60 * 1000, // 5 minutes
    });

    // Error rate alert
    this.createAlert({
      name: 'High Error Rate',
      condition: 'greater_than',
      threshold: 0.05, // 5%
      severity: 'critical',
      isActive: true,
      cooldownMs: 2 * 60 * 1000, // 2 minutes
    });

    // Response time alert
    this.createAlert({
      name: 'High Response Time',
      condition: 'greater_than',
      threshold: 5000, // 5 seconds
      severity: 'medium',
      isActive: true,
      cooldownMs: 3 * 60 * 1000, // 3 minutes
    });
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    // Database health check
    this.registerHealthCheck('database', async () => {
      try {
        // This would be implemented with actual database check
        return { status: 'healthy' as const };
      } catch (error) {
        return { status: 'unhealthy' as const, details: error };
      }
    });

    // Redis health check
    this.registerHealthCheck('redis', async () => {
      try {
        // This would be implemented with actual Redis check
        return { status: 'healthy' as const };
      } catch (error) {
        return { status: 'unhealthy' as const, details: error };
      }
    });

    // API health check
    this.registerHealthCheck('api', async () => {
      try {
        // This would be implemented with actual API check
        return { status: 'healthy' as const };
      } catch (error) {
        return { status: 'unhealthy' as const, details: error };
      }
    });

    // Run health checks every 30 seconds
    setInterval(async () => {
      for (const [name, healthCheck] of this.healthChecks.entries()) {
        const checkFn = (healthCheck as any).checkFn;
        if (checkFn) {
          try {
            const result = await checkFn();
            healthCheck.status = result.status;
            healthCheck.details = result.details;
            healthCheck.lastChecked = new Date();
          } catch (error) {
            healthCheck.status = 'unhealthy';
            healthCheck.details = error;
            healthCheck.lastChecked = new Date();
          }
        }
      }
    }, 30000);
  }

  /**
   * Match labels helper
   */
  private matchLabels(metricLabels?: Record<string, string>, queryLabels?: Record<string, string>): boolean {
    if (!metricLabels || !queryLabels) return true;
    
    return Object.entries(queryLabels).every(([key, value]) => 
      metricLabels[key] === value
    );
  }
}
