import { Injectable, Logger } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class PrometheusMetricsService {
  private readonly logger = new Logger(PrometheusMetricsService.name);
  private readonly register: client.Registry;

  private readonly httpRequestDuration: client.Histogram;
  private readonly httpRequestTotal: client.Counter;
  private readonly dbQueryDuration: client.Histogram;
  private readonly activeConnections: client.Gauge;
  private readonly cacheHitRate: client.Counter;

  constructor() {
    this.register = new client.Registry();
    client.collectDefaultMetrics({ register: this.register });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries',
      labelNames: ['query_type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1],
    });

    this.activeConnections = new client.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      labelNames: ['type'],
    });

    this.cacheHitRate = new client.Counter({
      name: 'cache_operations_total',
      help: 'Cache operations',
      labelNames: ['operation', 'status'],
    });

    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestTotal);
    this.register.registerMetric(this.dbQueryDuration);
    this.register.registerMetric(this.activeConnections);
    this.register.registerMetric(this.cacheHitRate);
  }

  recordHttpRequest(method: string, route: string, status: number, duration: number): void {
    this.httpRequestDuration.labels(method, route, status.toString()).observe(duration);
    this.httpRequestTotal.labels(method, route, status.toString()).inc();
  }

  recordDbQuery(queryType: string, duration: number): void {
    this.dbQueryDuration.labels(queryType).observe(duration);
  }

  setActiveConnections(type: string, count: number): void {
    this.activeConnections.labels(type).set(count);
  }

  recordCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete'): void {
    this.cacheHitRate.labels(operation, 'success').inc();
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }
}

