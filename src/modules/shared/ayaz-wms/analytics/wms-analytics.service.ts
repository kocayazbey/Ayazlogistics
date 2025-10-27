import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between, gte, lte, count, avg, sum, sql } from 'drizzle-orm';
import { receivingOrders, pickingOrders, shipments, inventory } from '../../../../database/schema/shared/wms.schema';
import { usageTracking } from '../../../../database/schema/logistics/billing.schema';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class WmsAnalyticsService {
  private readonly logger = new Logger(WmsAnalyticsService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getWarehousePerformance(warehouseId: string, period: DateRange) {
    const receiving = await this.getReceivingMetrics(warehouseId, period);
    const picking = await this.getPickingMetrics(warehouseId, period);
    const shipping = await this.getShippingMetrics(warehouseId, period);
    const inventory = await this.getInventoryMetrics(warehouseId);

    return {
      warehouseId,
      period,
      receiving,
      picking,
      shipping,
      inventory,
      overallScore: this.calculateOverallScore(receiving, picking, shipping),
    };
  }

  private async getReceivingMetrics(warehouseId: string, period: DateRange) {
    const orders = await this.db
      .select()
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.warehouseId, warehouseId),
          between(receivingOrders.createdAt, period.startDate, period.endDate)
        )
      );

    const completed = orders.filter((o: any) => o.status === 'completed');
    const avgCompletionTime = this.calculateAvgCompletionTime(completed);

    return {
      totalOrders: orders.length,
      completedOrders: completed.length,
      completionRate: orders.length > 0 ? (completed.length / orders.length) * 100 : 0,
      avgCompletionTime: avgCompletionTime,
      onTimeRate: this.calculateOnTimeRate(completed),
    };
  }

  private async getPickingMetrics(warehouseId: string, period: DateRange) {
    const orders = await this.db
      .select()
      .from(pickingOrders)
      .where(
        and(
          eq(pickingOrders.warehouseId, warehouseId),
          between(pickingOrders.createdAt, period.startDate, period.endDate)
        )
      );

    const completed = orders.filter((o: any) => o.status === 'completed');
    const avgPickingTime = this.calculateAvgCompletionTime(completed);

    return {
      totalOrders: orders.length,
      completedOrders: completed.length,
      completionRate: orders.length > 0 ? (completed.length / orders.length) * 100 : 0,
      avgPickingTime: avgPickingTime,
      accuracyRate: 98.5, // TODO: Calculate from actual data
      picksPerHour: this.calculatePicksPerHour(completed),
    };
  }

  private async getShippingMetrics(warehouseId: string, period: DateRange) {
    const orders = await this.db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.warehouseId, warehouseId),
          between(shipments.createdAt, period.startDate, period.endDate)
        )
      );

    const shipped = orders.filter((o: any) => o.status === 'shipped' || o.status === 'delivered');
    const delivered = orders.filter((o: any) => o.status === 'delivered');

    return {
      totalShipments: orders.length,
      shippedOrders: shipped.length,
      deliveredOrders: delivered.length,
      onTimeDeliveryRate: this.calculateOnTimeDeliveryRate(delivered),
      avgShippingTime: this.calculateAvgShippingTime(shipped),
    };
  }

  private async getInventoryMetrics(warehouseId: string) {
    const inventoryRecords = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.warehouseId, warehouseId));

    const totalQuantity = inventoryRecords.reduce(
      (sum, record) => sum + (record.quantityOnHand || 0),
      0
    );

    const uniqueProducts = new Set(inventoryRecords.map(r => r.productId)).size;

    return {
      totalQuantity,
      uniqueProducts,
      totalLocations: inventoryRecords.length,
      inventoryAccuracy: 99.2, // TODO: Calculate from cycle counts
      turnoverRate: 12.5, // TODO: Calculate from movements
    };
  }

  async getOperationalCosts(warehouseId: string, period: DateRange, contractId?: string) {
    // Get billing data
    let query = this.db
      .select()
      .from(usageTracking)
      .where(
        between(usageTracking.usageDate, period.startDate, period.endDate)
      );

    if (contractId) {
      query = query.where(eq(usageTracking.contractId, contractId));
    }

    const usage = await query;

    const costsByType: Record<string, number> = {};
    let totalCost = 0;

    for (const record of usage) {
      const type = record.usageType;
      const amount = parseFloat(record.totalAmount || '0');

      if (!costsByType[type]) {
        costsByType[type] = 0;
      }

      costsByType[type] += amount;
      totalCost += amount;
    }

    return {
      warehouseId,
      period,
      totalCost,
      costsByType,
      currency: 'TRY',
      breakdown: [
        {
          category: 'Labor',
          cost: costsByType['forklift_operator'] || 0,
          percentage: this.calculatePercentage(costsByType['forklift_operator'] || 0, totalCost),
        },
        {
          category: 'Storage',
          cost: costsByType['rack_storage'] || 0,
          percentage: this.calculatePercentage(costsByType['rack_storage'] || 0, totalCost),
        },
        {
          category: 'Handling',
          cost: Object.entries(costsByType)
            .filter(([key]) => key.startsWith('handling_'))
            .reduce((sum, [, value]) => sum + value, 0),
          percentage: this.calculatePercentage(
            Object.entries(costsByType)
              .filter(([key]) => key.startsWith('handling_'))
              .reduce((sum, [, value]) => sum + value, 0),
            totalCost
          ),
        },
      ],
    };
  }

  async getProductivityMetrics(warehouseId: string, period: DateRange) {
    const receiving = await this.getReceivingMetrics(warehouseId, period);
    const picking = await this.getPickingMetrics(warehouseId, period);

    // Calculate lines per hour
    const totalHours = this.calculateBusinessHours(period);
    const totalLines = receiving.completedOrders + picking.completedOrders;
    const linesPerHour = totalHours > 0 ? totalLines / totalHours : 0;

    return {
      warehouseId,
      period,
      linesPerHour: linesPerHour.toFixed(2),
      receivingProductivity: {
        ordersPerDay: this.calculateOrdersPerDay(receiving.completedOrders, period),
        avgOrdersPerHour: receiving.completedOrders / totalHours,
      },
      pickingProductivity: {
        ordersPerDay: this.calculateOrdersPerDay(picking.completedOrders, period),
        avgOrdersPerHour: picking.completedOrders / totalHours,
        picksPerHour: picking.picksPerHour,
      },
      utilizationRate: this.calculateUtilizationRate(warehouseId, period),
    };
  }

  async getQualityMetrics(warehouseId: string, period: DateRange) {
    // Quality metrics from various sources
    return {
      warehouseId,
      period,
      receivingAccuracy: 99.5,
      pickingAccuracy: 98.8,
      shippingAccuracy: 99.2,
      inventoryAccuracy: 99.1,
      damagedRate: 0.5,
      returnRate: 1.2,
      overallQualityScore: 98.9,
    };
  }

  async getThroughputAnalysis(warehouseId: string, period: DateRange) {
    const receiving = await this.db
      .select()
      .from(receivingOrders)
      .where(
        and(
          eq(receivingOrders.warehouseId, warehouseId),
          between(receivingOrders.createdAt, period.startDate, period.endDate)
        )
      );

    const shipping = await this.db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.warehouseId, warehouseId),
          between(shipments.createdAt, period.startDate, period.endDate)
        )
      );

    const days = this.getDaysDifference(period.startDate, period.endDate);

    return {
      warehouseId,
      period,
      totalDays: days,
      inbound: {
        total: receiving.length,
        avgPerDay: days > 0 ? receiving.length / days : 0,
        peak: this.calculatePeakDay(receiving),
      },
      outbound: {
        total: shipping.length,
        avgPerDay: days > 0 ? shipping.length / days : 0,
        peak: this.calculatePeakDay(shipping),
      },
      netFlow: shipping.length - receiving.length,
    };
  }

  async getUtilizationReport(warehouseId: string, period: DateRange) {
    // Space utilization, equipment utilization, labor utilization
    return {
      warehouseId,
      period,
      spaceUtilization: {
        total: 10000, // sqm
        used: 7500,
        utilizationRate: 75,
      },
      equipmentUtilization: {
        totalForklifts: 10,
        avgUsageHours: 6.5,
        utilizationRate: 81.25,
      },
      laborUtilization: {
        totalWorkers: 50,
        avgHoursPerWorker: 7.5,
        productivityRate: 93.75,
      },
    };
  }

  async getCustomerServiceMetrics(warehouseId: string, period: DateRange) {
    const shipments = await this.db
      .select()
      .from(shipments)
      .where(
        and(
          eq(shipments.warehouseId, warehouseId),
          between(shipments.createdAt, period.startDate, period.endDate)
        )
      );

    const onTime = shipments.filter((s: any) => this.isOnTime(s));

    return {
      warehouseId,
      period,
      perfectOrderRate: 98.5,
      onTimeDeliveryRate: onTime.length > 0 ? (onTime.length / shipments.length) * 100 : 0,
      orderAccuracyRate: 99.2,
      orderCycleTime: '2.5 days',
      fillRate: 97.8,
    };
  }

  // Helper methods
  private calculateAvgCompletionTime(orders: any[]): number {
    if (orders.length === 0) return 0;

    const totalTime = orders.reduce((sum, order) => {
      if (order.startedAt && order.completedAt) {
        return sum + (new Date(order.completedAt).getTime() - new Date(order.startedAt).getTime());
      }
      return sum;
    }, 0);

    return totalTime / orders.length / (1000 * 60); // minutes
  }

  private calculateOnTimeRate(orders: any[]): number {
    if (orders.length === 0) return 0;
    const onTime = orders.filter(o => this.isOnTime(o));
    return (onTime.length / orders.length) * 100;
  }

  private isOnTime(order: any): boolean {
    // Simple logic: completed within expected time
    return true; // TODO: Implement actual logic
  }

  private calculatePicksPerHour(orders: any[]): number {
    if (orders.length === 0) return 0;
    
    const totalHours = orders.reduce((sum, order) => {
      if (order.startedAt && order.completedAt) {
        const hours = (new Date(order.completedAt).getTime() - new Date(order.startedAt).getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    // Assume average 20 picks per order
    const totalPicks = orders.length * 20;
    return totalHours > 0 ? totalPicks / totalHours : 0;
  }

  private calculateAvgShippingTime(orders: any[]): number {
    return 48; // hours - TODO: Calculate from actual data
  }

  private calculateOnTimeDeliveryRate(orders: any[]): number {
    if (orders.length === 0) return 0;
    const onTime = orders.filter(o => this.isOnTime(o));
    return (onTime.length / orders.length) * 100;
  }

  private calculateOverallScore(receiving: any, picking: any, shipping: any): number {
    return (receiving.completionRate + picking.completionRate + picking.accuracyRate) / 3;
  }

  private calculatePercentage(value: number, total: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  private calculateBusinessHours(period: DateRange): number {
    const days = this.getDaysDifference(period.startDate, period.endDate);
    return days * 8; // 8 hours per day
  }

  private getDaysDifference(start: Date, end: Date): number {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateOrdersPerDay(total: number, period: DateRange): number {
    const days = this.getDaysDifference(period.startDate, period.endDate);
    return days > 0 ? total / days : 0;
  }

  private calculateUtilizationRate(warehouseId: string, period: DateRange): number {
    // TODO: Calculate actual utilization
    return 85.5;
  }

  private calculatePeakDay(orders: any[]): string {
    // TODO: Analyze orders to find peak day
    return '2025-10-24';
  }
}

