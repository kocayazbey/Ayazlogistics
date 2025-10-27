import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PerformanceMetric {
  id: string;
  service: string;
  method: string;
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface PerformanceStats {
  totalRequests: number;
  averageDuration: number;
  successRate: number;
  memoryUsage: number;
  cpuUsage: number;
  slowestQueries: PerformanceMetric[];
  errorRate: number;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000;

  constructor(private configService: ConfigService) {}

  async recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): Promise<void> {
    try {
      const performanceMetric: PerformanceMetric = {
        ...metric,
        id: this.generateMetricId(),
        timestamp: new Date(),
      };

      this.metrics.push(performanceMetric);

      // Keep only the last maxMetrics entries
      if (this.metrics.length > this.maxMetrics) {
        this.metrics = this.metrics.slice(-this.maxMetrics);
      }

      // Log slow operations
      if (metric.duration > 1000) {
        this.logger.warn(
          `Slow operation: ${metric.service}.${metric.method} took ${metric.duration}ms`
        );
      }

      // Log errors
      if (!metric.success && metric.error) {
        this.logger.error(
          `Operation failed: ${metric.service}.${metric.method} - ${metric.error}`
        );
      }

    } catch (error) {
      this.logger.error('Failed to record performance metric', error.stack);
    }
  }

  async getPerformanceStats(service?: string, method?: string): Promise<PerformanceStats> {
    try {
      let filteredMetrics = this.metrics;

      if (service) {
        filteredMetrics = filteredMetrics.filter(m => m.service === service);
      }

      if (method) {
        filteredMetrics = filteredMetrics.filter(m => m.method === method);
      }

      if (filteredMetrics.length === 0) {
        return {
          totalRequests: 0,
          averageDuration: 0,
          successRate: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          slowestQueries: [],
          errorRate: 0,
        };
      }

      const totalRequests = filteredMetrics.length;
      const successfulRequests = filteredMetrics.filter(m => m.success).length;
      const failedRequests = filteredMetrics.filter(m => !m.success).length;
      
      const averageDuration = filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
      const successRate = (successfulRequests / totalRequests) * 100;
      const errorRate = (failedRequests / totalRequests) * 100;
      
      const memoryUsage = filteredMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / totalRequests;
      const cpuUsage = filteredMetrics.reduce((sum, m) => sum + m.cpuUsage, 0) / totalRequests;
      
      const slowestQueries = filteredMetrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);

      return {
        totalRequests,
        averageDuration,
        successRate,
        memoryUsage,
        cpuUsage,
        slowestQueries,
        errorRate,
      };
    } catch (error) {
      this.logger.error('Failed to get performance stats', error.stack);
      return {
        totalRequests: 0,
        averageDuration: 0,
        successRate: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        slowestQueries: [],
        errorRate: 0,
      };
    }
  }

  async getSlowQueries(limit: number = 10): Promise<PerformanceMetric[]> {
    return this.metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  async getErrorQueries(limit: number = 10): Promise<PerformanceMetric[]> {
    return this.metrics
      .filter(m => !m.success)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getMetricsByService(service: string, limit: number = 100): Promise<PerformanceMetric[]> {
    return this.metrics
      .filter(m => m.service === service)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getMetricsByMethod(service: string, method: string, limit: number = 100): Promise<PerformanceMetric[]> {
    return this.metrics
      .filter(m => m.service === service && m.method === method)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getRecentMetrics(limit: number = 100): Promise<PerformanceMetric[]> {
    return this.metrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getMetricsByTimeRange(startDate: Date, endDate: Date): Promise<PerformanceMetric[]> {
    return this.metrics.filter(m => 
      m.timestamp >= startDate && m.timestamp <= endDate
    );
  }

  async getTopServicesByDuration(limit: number = 10): Promise<{ service: string; totalDuration: number; averageDuration: number; count: number }[]> {
    const serviceStats = new Map<string, { totalDuration: number; count: number }>();

    this.metrics.forEach(metric => {
      const existing = serviceStats.get(metric.service) || { totalDuration: 0, count: 0 };
      existing.totalDuration += metric.duration;
      existing.count += 1;
      serviceStats.set(metric.service, existing);
    });

    return Array.from(serviceStats.entries())
      .map(([service, stats]) => ({
        service,
        totalDuration: stats.totalDuration,
        averageDuration: stats.totalDuration / stats.count,
        count: stats.count,
      }))
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, limit);
  }

  async getTopMethodsByDuration(limit: number = 10): Promise<{ service: string; method: string; totalDuration: number; averageDuration: number; count: number }[]> {
    const methodStats = new Map<string, { totalDuration: number; count: number }>();

    this.metrics.forEach(metric => {
      const key = `${metric.service}.${metric.method}`;
      const existing = methodStats.get(key) || { totalDuration: 0, count: 0 };
      existing.totalDuration += metric.duration;
      existing.count += 1;
      methodStats.set(key, existing);
    });

    return Array.from(methodStats.entries())
      .map(([key, stats]) => {
        const [service, method] = key.split('.');
        return {
          service,
          method,
          totalDuration: stats.totalDuration,
          averageDuration: stats.totalDuration / stats.count,
          count: stats.count,
        };
      })
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, limit);
  }

  async getSystemMetrics(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    uptime: number;
    nodeVersion: string;
    platform: string;
  }> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        memoryUsage: memoryUsage.heapUsed,
        cpuUsage: cpuUsage.user + cpuUsage.system,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
      };
    } catch (error) {
      this.logger.error('Failed to get system metrics', error.stack);
      return {
        memoryUsage: 0,
        cpuUsage: 0,
        uptime: 0,
        nodeVersion: 'unknown',
        platform: 'unknown',
      };
    }
  }

  async clearMetrics(): Promise<void> {
    this.metrics = [];
    this.logger.log('Performance metrics cleared');
  }

  async exportMetrics(): Promise<PerformanceMetric[]> {
    return [...this.metrics];
  }

  private generateMetricId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
