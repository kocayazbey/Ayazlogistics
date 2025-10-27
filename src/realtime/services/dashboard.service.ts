import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/database.provider';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway } from '../gateways/websocket.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  sql,
  eq,
  desc,
  gte,
  lte,
  and,
  count,
  sum,
  avg,
  max,
  min
} from 'drizzle-orm';

export interface DashboardMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number; // percentage change from previous period
  timestamp: Date;
  category: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'map' | 'alert';
  title: string;
  data: any;
  refreshInterval: number; // seconds
  lastUpdated: Date;
  config: Record<string, any>;
}

export interface DashboardAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  data: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface DashboardConfig {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  alerts: DashboardAlert[];
  refreshInterval: number;
  permissions: string[];
  tenantId?: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private dashboards = new Map<string, DashboardConfig>();
  private metricsCache = new Map<string, { data: DashboardMetric[]; timestamp: Date }>();
  private cacheTimeout = 30000; // 30 seconds

  constructor(
    @Inject(DRIZZLE_ORM) private db: any,
    private configService: ConfigService,
    private websocketGateway: WebSocketGateway,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeDashboards();
    this.startMetricsCollection();
  }

  private async initializeDashboards(): Promise<void> {
    this.logger.log('Initializing dashboard service...');

    // Create default dashboards
    await this.createDefaultDashboards();

    this.logger.log('Dashboard service initialized');
  }

  // Metrics Collection
  async getMetrics(
    category: string,
    timeRange: '1h' | '24h' | '7d' | '30d' = '24h',
    tenantId?: string,
  ): Promise<DashboardMetric[]> {
    const cacheKey = `${category}_${timeRange}_${tenantId || 'global'}`;

    // Check cache first
    const cached = this.metricsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const metrics = await this.collectMetrics(category, timeRange, tenantId);
      this.metricsCache.set(cacheKey, { data: metrics, timestamp: new Date() });

      return metrics;
    } catch (error) {
      this.logger.error(`Error collecting metrics for ${category}:`, error);
      return [];
    }
  }

  async getLogisticsMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h', tenantId?: string): Promise<DashboardMetric[]> {
    const endDate = new Date();
    const startDate = this.getStartDate(timeRange);

    const metrics: DashboardMetric[] = [];

    try {
      // Active shipments count
      const activeShipments = await this.db
        .select({ count: count() })
        .from(sql`shipments`)
        .where(and(
          gte(sql`created_at`, startDate),
          lte(sql`created_at`, endDate),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'active_shipments',
        name: 'Active Shipments',
        value: Number(activeShipments[0]?.count || 0),
        unit: 'count',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'logistics',
      });

      // Total orders count
      const totalOrders = await this.db
        .select({ count: count() })
        .from(sql`orders`)
        .where(and(
          gte(sql`created_at`, startDate),
          lte(sql`created_at`, endDate),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'total_orders',
        name: 'Total Orders',
        value: Number(totalOrders[0]?.count || 0),
        unit: 'count',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'logistics',
      });

      // Average delivery time
      const avgDeliveryTime = await this.db
        .select({ avg: avg(sql`EXTRACT(EPOCH FROM (delivered_at - created_at))/3600`) })
        .from(sql`shipments`)
        .where(and(
          gte(sql`created_at`, startDate),
          lte(sql`created_at`, endDate),
          sql`delivered_at IS NOT NULL`,
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'avg_delivery_time',
        name: 'Average Delivery Time',
        value: Number(avgDeliveryTime[0]?.avg || 0),
        unit: 'hours',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'logistics',
      });

      // On-time delivery rate
      const totalDelivered = await this.db
        .select({ count: count() })
        .from(sql`shipments`)
        .where(and(
          gte(sql`created_at`, startDate),
          lte(sql`created_at`, endDate),
          sql`delivered_at IS NOT NULL`,
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      const onTimeDelivered = await this.db
        .select({ count: count() })
        .from(sql`shipments`)
        .where(and(
          gte(sql`created_at`, startDate),
          lte(sql`created_at`, endDate),
          sql`delivered_at IS NOT NULL`,
          sql`delivered_at <= estimated_delivery_date`,
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      const onTimeRate = totalDelivered[0]?.count > 0
        ? (Number(onTimeDelivered[0]?.count || 0) / Number(totalDelivered[0]?.count)) * 100
        : 0;

      metrics.push({
        id: 'on_time_delivery_rate',
        name: 'On-Time Delivery Rate',
        value: onTimeRate,
        unit: 'percentage',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'logistics',
      });

      // Total revenue
      const totalRevenue = await this.db
        .select({ sum: sum(sql`total_amount`) })
        .from(sql`orders`)
        .where(and(
          gte(sql`created_at`, startDate),
          lte(sql`created_at`, endDate),
          eq(sql`status`, 'completed'),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'total_revenue',
        name: 'Total Revenue',
        value: Number(totalRevenue[0]?.sum || 0),
        unit: 'currency',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'logistics',
      });

    } catch (error) {
      this.logger.error('Error collecting logistics metrics:', error);
    }

    return metrics;
  }

  async getFleetMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h', tenantId?: string): Promise<DashboardMetric[]> {
    const endDate = new Date();
    const startDate = this.getStartDate(timeRange);

    const metrics: DashboardMetric[] = [];

    try {
      // Active vehicles count
      const activeVehicles = await this.db
        .select({ count: count() })
        .from(sql`vehicles`)
        .where(and(
          eq(sql`status`, 'active'),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'active_vehicles',
        name: 'Active Vehicles',
        value: Number(activeVehicles[0]?.count || 0),
        unit: 'count',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'fleet',
      });

      // Online drivers count
      const onlineDrivers = await this.db
        .select({ count: count() })
        .from(sql`drivers`)
        .where(and(
          eq(sql`status`, 'online'),
          gte(sql`last_seen`, sql`NOW() - INTERVAL '1 hour'`),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'online_drivers',
        name: 'Online Drivers',
        value: Number(onlineDrivers[0]?.count || 0),
        unit: 'count',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'fleet',
      });

      // Average fuel consumption
      const avgFuelConsumption = await this.db
        .select({ avg: avg(sql`fuel_consumption`) })
        .from(sql`vehicle_trips`)
        .where(and(
          gte(sql`created_at`, startDate),
          lte(sql`created_at`, endDate),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'avg_fuel_consumption',
        name: 'Average Fuel Consumption',
        value: Number(avgFuelConsumption[0]?.avg || 0),
        unit: 'liters_per_100km',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'fleet',
      });

      // Total distance covered
      const totalDistance = await this.db
        .select({ sum: sum(sql`distance_km`) })
        .from(sql`vehicle_trips`)
        .where(and(
          gte(sql`created_at`, startDate),
          lte(sql`created_at`, endDate),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'total_distance',
        name: 'Total Distance Covered',
        value: Number(totalDistance[0]?.sum || 0),
        unit: 'km',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'fleet',
      });

    } catch (error) {
      this.logger.error('Error collecting fleet metrics:', error);
    }

    return metrics;
  }

  async getInventoryMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h', tenantId?: string): Promise<DashboardMetric[]> {
    const endDate = new Date();
    const startDate = this.getStartDate(timeRange);

    const metrics: DashboardMetric[] = [];

    try {
      // Total inventory value
      const totalInventoryValue = await this.db
        .select({ sum: sum(sql`quantity * unit_cost`) })
        .from(sql`inventory_items`)
        .where(and(
          gte(sql`updated_at`, startDate),
          lte(sql`updated_at`, endDate),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'total_inventory_value',
        name: 'Total Inventory Value',
        value: Number(totalInventoryValue[0]?.sum || 0),
        unit: 'currency',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'inventory',
      });

      // Low stock items count
      const lowStockItems = await this.db
        .select({ count: count() })
        .from(sql`inventory_items`)
        .where(and(
          sql`quantity <= min_stock_level`,
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'low_stock_items',
        name: 'Low Stock Items',
        value: Number(lowStockItems[0]?.count || 0),
        unit: 'count',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'inventory',
      });

      // Out of stock items count
      const outOfStockItems = await this.db
        .select({ count: count() })
        .from(sql`inventory_items`)
        .where(and(
          eq(sql`quantity`, 0),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'out_of_stock_items',
        name: 'Out of Stock Items',
        value: Number(outOfStockItems[0]?.count || 0),
        unit: 'count',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'inventory',
      });

      // Inventory turnover rate
      const inventoryTurnover = await this.db
        .select({ avg: avg(sql`turnover_rate`) })
        .from(sql`inventory_items`)
        .where(and(
          gte(sql`updated_at`, startDate),
          lte(sql`updated_at`, endDate),
          tenantId ? eq(sql`tenant_id`, tenantId) : undefined
        ));

      metrics.push({
        id: 'inventory_turnover_rate',
        name: 'Inventory Turnover Rate',
        value: Number(inventoryTurnover[0]?.avg || 0),
        unit: 'turns_per_year',
        trend: 'stable',
        change: 0,
        timestamp: new Date(),
        category: 'inventory',
      });

    } catch (error) {
      this.logger.error('Error collecting inventory metrics:', error);
    }

    return metrics;
  }

  // Real-time Updates
  async subscribeToMetrics(userId: string, categories: string[]): Promise<void> {
    this.logger.log(`User ${userId} subscribed to metrics: ${categories.join(', ')}`);

    // Join user to metrics rooms
    categories.forEach(category => {
      this.websocketGateway.sendToClient(userId, 'metrics_subscribed', {
        category,
        timestamp: new Date().toISOString(),
      });
    });

    // Send initial data immediately
    for (const category of categories) {
      try {
        const metrics = await this.getMetrics(category, '1h');
        this.websocketGateway.sendToClient(userId, 'metrics_update', {
          category,
          metrics,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.error(`Error getting initial metrics for category ${category}:`, error);
      }
    }

    // Store subscription for cleanup
    this.eventService.emit('dashboard.metrics_subscribed', {
      userId,
      categories,
    });
  }

  async unsubscribeFromMetrics(userId: string, categories: string[]): Promise<void> {
    this.logger.log(`User ${userId} unsubscribed from metrics: ${categories.join(', ')}`);

    categories.forEach(category => {
      this.websocketGateway.sendToClient(userId, 'metrics_unsubscribed', {
        category,
        timestamp: new Date().toISOString(),
      });
    });

    this.eventService.emit('dashboard.metrics_unsubscribed', {
      userId,
      categories,
    });
  }

  // Alerts Management
  async createAlert(
    type: DashboardAlert['type'],
    title: string,
    message: string,
    severity: DashboardAlert['severity'],
    data: Record<string, any> = {},
    tenantId?: string,
  ): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: DashboardAlert = {
      id: alertId,
      type,
      title,
      message,
      severity,
      data,
      timestamp: new Date(),
      acknowledged: false,
    };

    try {
      // Store in database (if alerts table exists)
      // await this.db.insert(dashboardAlerts).values({...});

      // Broadcast to relevant users
      if (tenantId) {
        this.websocketGateway.broadcastToTenant(tenantId, 'dashboard_alert', alert);
      } else {
        this.websocketGateway.broadcastToAll('dashboard_alert', alert);
      }

      // Emit event
      this.eventService.emit('dashboard.alert_created', { alert, tenantId });

      this.logger.log(`Dashboard alert created: ${alertId} (${severity})`);
      return alertId;

    } catch (error) {
      this.logger.error(`Error creating dashboard alert: ${alertId}`, error);
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      // Update alert in database
      // await this.db.update(dashboardAlerts)
      //   .set({ acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date() })
      //   .where(eq(dashboardAlerts.id, alertId));

      this.logger.log(`Alert acknowledged: ${alertId} by ${userId}`);
      return true;

    } catch (error) {
      this.logger.error(`Error acknowledging alert: ${alertId}`, error);
      return false;
    }
  }

  // Dashboard Management
  async createDashboard(config: Omit<DashboardConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const dashboardId = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dashboard: DashboardConfig = {
      id: dashboardId,
      ...config,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dashboards.set(dashboardId, dashboard);

    this.logger.log(`Dashboard created: ${dashboardId} (${config.name})`);
    return dashboardId;
  }

  async getDashboard(dashboardId: string): Promise<DashboardConfig | null> {
    return this.dashboards.get(dashboardId) || null;
  }

  async updateDashboard(dashboardId: string, updates: Partial<DashboardConfig>): Promise<boolean> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    Object.assign(dashboard, updates, { updatedAt: new Date() });
    this.dashboards.set(dashboardId, dashboard);

    this.logger.log(`Dashboard updated: ${dashboardId}`);
    return true;
  }

  async deleteDashboard(dashboardId: string): Promise<boolean> {
    const deleted = this.dashboards.delete(dashboardId);
    if (deleted) {
      this.logger.log(`Dashboard deleted: ${dashboardId}`);
    }
    return deleted;
  }

  // Private methods
  private async collectMetrics(
    category: string,
    timeRange: string,
    tenantId?: string,
  ): Promise<DashboardMetric[]> {
    switch (category) {
      case 'logistics':
        return this.getLogisticsMetrics(timeRange as any, tenantId);
      case 'fleet':
        return this.getFleetMetrics(timeRange as any, tenantId);
      case 'inventory':
        return this.getInventoryMetrics(timeRange as any, tenantId);
      default:
        return [];
    }
  }

  private getStartDate(timeRange: '1h' | '24h' | '7d' | '30d'): Date {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private async createDefaultDashboards(): Promise<void> {
    const defaultDashboards: Omit<DashboardConfig, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Logistics Overview',
        widgets: [
          {
            id: 'logistics_metrics',
            type: 'metric',
            title: 'Key Logistics Metrics',
            data: {},
            refreshInterval: 30,
            lastUpdated: new Date(),
            config: { metrics: ['active_shipments', 'total_orders', 'avg_delivery_time'] },
          },
        ],
        alerts: [],
        refreshInterval: 30,
        permissions: ['logistics.read'],
        tenantId: 'global',
      },
      {
        name: 'Fleet Management',
        widgets: [
          {
            id: 'fleet_metrics',
            type: 'metric',
            title: 'Fleet Performance',
            data: {},
            refreshInterval: 30,
            lastUpdated: new Date(),
            config: { metrics: ['active_vehicles', 'online_drivers', 'total_distance'] },
          },
        ],
        alerts: [],
        refreshInterval: 30,
        permissions: ['fleet.read'],
        tenantId: 'global',
      },
    ];

    for (const dashboard of defaultDashboards) {
      await this.createDashboard(dashboard);
    }
  }

  private startMetricsCollection(): void {
    // Event-driven metrics updates instead of periodic polling
    this.setupEventListeners();
    this.logger.log('Event-driven metrics collection started');
  }

  private setupEventListeners(): void {
    // Listen for shipment status changes
    this.eventService.on('shipment.status_changed', async (data) => {
      this.updateLogisticsMetrics();
    });

    // Listen for new orders
    this.eventService.on('order.created', async (data) => {
      this.updateLogisticsMetrics();
    });

    // Listen for vehicle status changes
    this.eventService.on('vehicle.status_changed', async (data) => {
      this.updateFleetMetrics();
    });

    // Listen for driver status changes
    this.eventService.on('driver.status_changed', async (data) => {
      this.updateFleetMetrics();
    });

    // Listen for inventory changes
    this.eventService.on('inventory.updated', async (data) => {
      this.updateInventoryMetrics();
    });

    // Listen for delivery completions
    this.eventService.on('shipment.delivered', async (data) => {
      this.updateLogisticsMetrics();
    });

    // Listen for new trips
    this.eventService.on('trip.started', async (data) => {
      this.updateFleetMetrics();
    });

    this.logger.log('Event listeners for metrics updates configured');
  }

  private async updateLogisticsMetrics(): Promise<void> {
    try {
      const metrics = await this.getMetrics('logistics', '1h');
      this.websocketGateway.broadcastToAll('metrics_update', {
        category: 'logistics',
        metrics,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug('Logistics metrics updated');
    } catch (error) {
      this.logger.error('Error updating logistics metrics:', error);
    }
  }

  private async updateFleetMetrics(): Promise<void> {
    try {
      const metrics = await this.getMetrics('fleet', '1h');
      this.websocketGateway.broadcastToAll('metrics_update', {
        category: 'fleet',
        metrics,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug('Fleet metrics updated');
    } catch (error) {
      this.logger.error('Error updating fleet metrics:', error);
    }
  }

  private async updateInventoryMetrics(): Promise<void> {
    try {
      const metrics = await this.getMetrics('inventory', '1h');
      this.websocketGateway.broadcastToAll('metrics_update', {
        category: 'inventory',
        metrics,
        timestamp: new Date().toISOString(),
      });
      this.logger.debug('Inventory metrics updated');
    } catch (error) {
      this.logger.error('Error updating inventory metrics:', error);
    }
  }

  // Public methods for external access
  async broadcastMetricsUpdate(category: string, metrics: DashboardMetric[], tenantId?: string): Promise<void> {
    const eventData = {
      category,
      metrics,
      timestamp: new Date().toISOString(),
    };

    if (tenantId) {
      this.websocketGateway.broadcastToTenant(tenantId, 'metrics_update', eventData);
    } else {
      this.websocketGateway.broadcastToAll('metrics_update', eventData);
    }

    // Also emit event for logging
    this.eventService.emit('dashboard.metrics_updated', eventData);
  }

  async broadcastAlert(alert: DashboardAlert, tenantId?: string): Promise<void> {
    if (tenantId) {
      this.websocketGateway.broadcastToTenant(tenantId, 'dashboard_alert', alert);
    } else {
      this.websocketGateway.broadcastToAll('dashboard_alert', alert);
    }

    this.eventService.emit('dashboard.alert_broadcast', { alert, tenantId });
  }

  getDashboardCount(): number {
    return this.dashboards.size;
  }

  getActiveUsersCount(): number {
    return this.websocketGateway.getConnectedUsers().length;
  }
}
