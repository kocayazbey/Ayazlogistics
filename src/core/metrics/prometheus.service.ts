import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, register } from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly registry: Registry;

  public readonly httpRequestTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly httpRequestErrors: Counter;
  public readonly activeConnections: Gauge;
  public readonly databaseQueryDuration: Histogram;
  public readonly cacheHits: Counter;
  public readonly cacheMisses: Counter;
  public readonly activeVehicles: Gauge;
  public readonly activeRoutes: Gauge;
  public readonly pendingOrders: Gauge;

  constructor() {
    this.registry = register;

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
      registers: [this.registry],
    });

    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });

    this.activeVehicles = new Gauge({
      name: 'active_vehicles',
      help: 'Number of active vehicles',
      labelNames: ['tenant_id'],
      registers: [this.registry],
    });

    this.activeRoutes = new Gauge({
      name: 'active_routes',
      help: 'Number of active routes',
      labelNames: ['tenant_id', 'status'],
      registers: [this.registry],
    });

    this.pendingOrders = new Gauge({
      name: 'pending_orders',
      help: 'Number of pending orders',
      labelNames: ['tenant_id', 'warehouse_id'],
      registers: [this.registry],
    });
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }

  recordRequest(method: string, route: string, status: number, duration: number) {
    this.httpRequestTotal.inc({ method, route, status: status.toString() });
    this.httpRequestDuration.observe(
      { method, route, status: status.toString() },
      duration / 1000
    );

    if (status >= 400) {
      this.httpRequestErrors.inc({ method, route, status: status.toString() });
    }
  }

  recordDatabaseQuery(queryType: string, table: string, duration: number) {
    this.databaseQueryDuration.observe(
      { query_type: queryType, table },
      duration / 1000
    );
  }

  recordCacheHit(cacheType: string = 'redis') {
    this.cacheHits.inc({ cache_type: cacheType });
  }

  recordCacheMiss(cacheType: string = 'redis') {
    this.cacheMisses.inc({ cache_type: cacheType });
  }

  setActiveVehicles(tenantId: string, count: number) {
    this.activeVehicles.set({ tenant_id: tenantId }, count);
  }

  setActiveRoutes(tenantId: string, status: string, count: number) {
    this.activeRoutes.set({ tenant_id: tenantId, status }, count);
  }

  setPendingOrders(tenantId: string, warehouseId: string, count: number) {
    this.pendingOrders.set({ tenant_id: tenantId, warehouse_id: warehouseId }, count);
  }
}

