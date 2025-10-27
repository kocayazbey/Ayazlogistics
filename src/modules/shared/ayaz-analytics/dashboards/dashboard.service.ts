import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { dashboards } from '../../../../database/schema/shared/analytics.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { vehicles, orders, inventory, warehouses } from '../../../../database/schema';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  async createDashboard(data: {
    name: string;
    description?: string;
    dashboardType?: string;
    widgets?: any;
    config?: any;
  }, tenantId: string) {
    const [dashboard] = await this.db
      .insert(dashboards)
      .values({
        tenantId,
        name: data.name,
        description: data.description,
        dashboardType: data.dashboardType,
        config: data.config,
        widgets: data.widgets || [],
      })
      .returning();

    await this.eventBus.emit('dashboard.created', { dashboardId: dashboard.id, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('dashboards', tenantId));

    return dashboard;
  }

  async getDashboards(tenantId: string) {
    const cacheKey = this.cacheService.generateKey('dashboards', tenantId);

    return this.cacheService.wrap(cacheKey, async () => {
      return await this.db
        .select()
        .from(dashboards)
        .where(eq(dashboards.tenantId, tenantId));
    }, 600);
  }

  async getDashboardById(dashboardId: string, tenantId: string) {
    const [dashboard] = await this.db
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, dashboardId))
      .limit(1);

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    return dashboard;
  }

  async updateDashboard(dashboardId: string, data: any, tenantId: string) {
    const [updated] = await this.db
      .update(dashboards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dashboards.id, dashboardId))
      .returning();

    await this.eventBus.emit('dashboard.updated', { dashboardId, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('dashboards', tenantId));

    return updated;
  }

  async getOperationalDashboard(tenantId: string) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get active vehicles count
    const [activeVehiclesResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.tenantId, tenantId),
          eq(vehicles.status, 'active')
        )
      );

    // Get ongoing deliveries count
    const [ongoingDeliveriesResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.status, 'in_transit')
        )
      );

    // Get pending orders count
    const [pendingOrdersResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.status, 'pending')
        )
      );

    // Get warehouse utilization
    const [warehouseUtilizationResult] = await this.db
      .select({ 
        utilization: sql<number>`AVG(COALESCE(${inventory.quantityOnHand}::float / NULLIF(${inventory.maxCapacity}, 0), 0)) * 100`
      })
      .from(inventory)
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(
        and(
          eq(warehouses.tenantId, tenantId),
          eq(warehouses.status, 'active')
        )
      );

    // Get today's revenue
    const [todayRevenueResult] = await this.db
      .select({ 
        revenue: sql<number>`COALESCE(SUM(${orders.totalAmount}), 0)`
      })
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.status, 'completed'),
          gte(orders.updatedAt, startOfDay),
          lte(orders.updatedAt, endOfDay)
        )
      );

    return {
      timestamp: new Date(),
      metrics: {
        activeVehicles: activeVehiclesResult?.count || 0,
        ongoingDeliveries: ongoingDeliveriesResult?.count || 0,
        pendingOrders: pendingOrdersResult?.count || 0,
        warehouseUtilization: Math.round(warehouseUtilizationResult?.utilization || 0),
        todayRevenue: todayRevenueResult?.revenue || 0,
      },
    };
  }
}
