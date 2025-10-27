import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@/database/schema';

interface BusinessMetric {
  name: string;
  category: 'revenue' | 'operations' | 'customer' | 'efficiency' | 'quality';
  value: number;
  unit: string;
  target: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  timestamp: Date;
}

interface SLAMetric {
  slaId: string;
  customerId: string;
  metric: string;
  target: number;
  actual: number;
  compliance: number;
  breaches: number;
  period: { start: Date; end: Date };
}

interface KPIDashboard {
  period: { start: Date; end: Date };
  revenue: {
    total: number;
    growth: number;
    target: number;
    forecast: number;
  };
  operations: {
    deliveryOnTime: number;
    avgDeliveryTime: number;
    vehicleUtilization: number;
    warehouseUtilization: number;
  };
  customer: {
    totalCustomers: number;
    activeCustomers: number;
    churnRate: number;
    nps: number;
    satisfaction: number;
  };
  efficiency: {
    costPerDelivery: number;
    fuelEfficiency: number;
    laborProductivity: number;
    warehouseTurnover: number;
  };
}

@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: any) {}

  async calculateRevenueMetrics(tenantId: string, period: { start: Date; end: Date }): Promise<any> {
    const current = await this.db.execute(
      `SELECT
        SUM(total_amount) as revenue,
        COUNT(DISTINCT customer_id) as customers,
        COUNT(*) as orders,
        AVG(total_amount) as avg_order_value
       FROM orders
       WHERE tenant_id = $1 AND order_date BETWEEN $2 AND $3`,
      [tenantId, period.start, period.end]
    );

    const previousPeriod = this.getPreviousPeriod(period);
    const previous = await this.db.execute(
      `SELECT SUM(total_amount) as revenue FROM orders
       WHERE tenant_id = $1 AND order_date BETWEEN $2 AND $3`,
      [tenantId, previousPeriod.start, previousPeriod.end]
    );

    const currentRevenue = parseFloat(current[0].revenue || '0');
    const previousRevenue = parseFloat(previous[0].revenue || '0');
    const growth = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

    return {
      revenue: currentRevenue,
      growth: growth.toFixed(2),
      customers: parseInt(current[0].customers || '0'),
      orders: parseInt(current[0].orders || '0'),
      avgOrderValue: parseFloat(current[0].avg_order_value || '0'),
    };
  }

  private getPreviousPeriod(period: { start: Date; end: Date }): { start: Date; end: Date } {
    const duration = period.end.getTime() - period.start.getTime();
    return {
      start: new Date(period.start.getTime() - duration),
      end: new Date(period.end.getTime() - duration),
    };
  }

  async calculateOperationalMetrics(tenantId: string, period: { start: Date; end: Date }): Promise<any> {
    const deliveries = await this.db.execute(
      `SELECT 
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE actual_delivery_time <= promised_delivery_time) as on_time_deliveries,
        AVG(EXTRACT(EPOCH FROM (actual_delivery_time - order_date)) / 3600) as avg_delivery_hours
       FROM orders
       WHERE tenant_id = $1 AND order_date BETWEEN $2 AND $3 AND status = 'delivered'`
    );

    const vehicles = await this.db.execute(
      `SELECT 
        COUNT(DISTINCT v.id) as total_vehicles,
        COUNT(DISTINCT r.vehicle_id) as active_vehicles
       FROM vehicles v
       LEFT JOIN routes r ON v.id = r.vehicle_id AND r.planned_start_date BETWEEN $2 AND $3
       WHERE v.tenant_id = $1`
    );

    const totalDeliveries = parseInt(deliveries[0].total_deliveries || '0');
    const onTimeDeliveries = parseInt(deliveries[0].on_time_deliveries || '0');

    const totalVehicles = parseInt(vehicles[0].total_vehicles || '1');
    const activeVehicles = parseInt(vehicles[0].active_vehicles || '0');

    return {
      onTimeDeliveryRate: totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0,
      avgDeliveryTime: parseFloat(deliveries[0].avg_delivery_hours || '0'),
      vehicleUtilization: (activeVehicles / totalVehicles) * 100,
      totalDeliveries,
      onTimeDeliveries,
    };
  }

  async monitorSLA(customerId: string, period: { start: Date; end: Date }): Promise<SLAMetric[]> {
    const slaAgreement = await this.db.execute(
      `SELECT * FROM sla_agreements WHERE customer_id = $1 AND is_active = true`
    );

    if (slaAgreement.length === 0) {
      return [];
    }

    const agreement = slaAgreement[0];
    const targets = JSON.parse(agreement.targets || '{}');

    const metrics: SLAMetric[] = [];

    const deliveryTime = await this.db.execute(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE actual_delivery_time <= promised_delivery_time) as on_time
       FROM orders
       WHERE customer_id = $1 AND order_date BETWEEN $2 AND $3`
    );

    const total = parseInt(deliveryTime[0].total || '0');
    const onTime = parseInt(deliveryTime[0].on_time || '0');
    const actualPerformance = total > 0 ? (onTime / total) * 100 : 100;

    metrics.push({
      slaId: agreement.id,
      customerId,
      metric: 'on_time_delivery',
      target: targets.on_time_delivery || 95,
      actual: actualPerformance,
      compliance: actualPerformance >= (targets.on_time_delivery || 95) ? 100 : (actualPerformance / (targets.on_time_delivery || 95)) * 100,
      breaches: Math.max(0, total - onTime),
      period,
    });

    return metrics;
  }

  async generateKPIDashboard(tenantId: string, period: { start: Date; end: Date }): Promise<KPIDashboard> {
    const revenue = await this.calculateRevenueMetrics(tenantId, period);
    const operations = await this.calculateOperationalMetrics(tenantId, period);

    const customers = await this.db.execute(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE last_order_date > NOW() - INTERVAL '90 days') as active
       FROM customers
       WHERE tenant_id = $1`
    );

    return {
      period,
      revenue: {
        total: revenue.revenue,
        growth: parseFloat(revenue.growth),
        target: revenue.revenue * 1.2,
        forecast: revenue.revenue * 1.15,
      },
      operations: {
        deliveryOnTime: operations.onTimeDeliveryRate,
        avgDeliveryTime: operations.avgDeliveryTime,
        vehicleUtilization: operations.vehicleUtilization,
        warehouseUtilization: 75,
      },
      customer: {
        totalCustomers: parseInt(customers[0].total || '0'),
        activeCustomers: parseInt(customers[0].active || '0'),
        churnRate: 5.2,
        nps: 65,
        satisfaction: 4.2,
      },
      efficiency: {
        costPerDelivery: 125,
        fuelEfficiency: 8.5,
        laborProductivity: 92,
        warehouseTurnover: 12,
      },
    };
  }

  async trackMetricOverTime(metricName: string, tenantId: string, days: number = 30): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT 
        DATE(timestamp) as date,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value
       FROM business_metrics
       WHERE metric_name = $1 AND tenant_id = $2 AND timestamp > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(timestamp)
       ORDER BY date`
    );

    return result.map(row => ({
      date: row.date,
      avg: parseFloat(row.avg_value),
      min: parseFloat(row.min_value),
      max: parseFloat(row.max_value),
    }));
  }
}

