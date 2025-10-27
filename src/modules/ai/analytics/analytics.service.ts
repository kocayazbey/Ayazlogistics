import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface DemandForecast {
  id: string;
  tenantId: string;
  productId: string;
  forecastType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  period: Date;
  predictedDemand: number;
  confidence: number;
  factors: string[];
  accuracy?: number;
  createdAt: Date;
}

export interface ETAEstimate {
  id: string;
  tenantId: string;
  shipmentId: string;
  routeId: string;
  estimatedArrival: Date;
  confidence: number;
  factors: ETAFactor[];
  lastUpdated: Date;
  actualArrival?: Date;
  accuracy?: number;
}

export interface ETAFactor {
  type: 'traffic' | 'weather' | 'route' | 'vehicle' | 'driver' | 'historical';
  impact: number; // -1 to 1
  description: string;
  value: any;
}

export interface AnomalyDetection {
  id: string;
  tenantId: string;
  metric: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'drop' | 'pattern' | 'outlier';
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
}

export interface DynamicPricing {
  id: string;
  tenantId: string;
  routeId: string;
  basePrice: number;
  adjustedPrice: number;
  factors: PricingFactor[];
  demandLevel: 'low' | 'medium' | 'high' | 'peak';
  capacityUtilization: number;
  competitorPricing?: number;
  effectiveFrom: Date;
  effectiveTo: Date;
  isActive: boolean;
}

export interface PricingFactor {
  type: 'demand' | 'capacity' | 'weather' | 'fuel' | 'competition' | 'seasonal';
  impact: number; // percentage
  description: string;
  value: any;
}

export interface MetricsLayer {
  id: string;
  tenantId: string;
  metricName: string;
  category: 'operational' | 'financial' | 'customer' | 'sustainability';
  value: number;
  unit: string;
  dimensions: Record<string, any>;
  timestamp: Date;
  source: string;
  quality: number; // 0-1
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createDemandForecast(forecast: Omit<DemandForecast, 'id' | 'createdAt'>): Promise<DemandForecast> {
    const id = `DF-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO demand_forecasts (id, tenant_id, product_id, forecast_type, period,
                                   predicted_demand, confidence, factors, accuracy, created_at)
      VALUES (${id}, ${forecast.tenantId}, ${forecast.productId}, ${forecast.forecastType},
              ${forecast.period}, ${forecast.predictedDemand}, ${forecast.confidence},
              ${JSON.stringify(forecast.factors)}, ${forecast.accuracy || null}, ${now})
    `);

    this.logger.log(`Demand forecast created: ${id} for tenant ${forecast.tenantId}`);

    return {
      id,
      ...forecast,
      createdAt: now,
    };
  }

  async getDemandForecasts(tenantId: string, productId?: string): Promise<DemandForecast[]> {
    let query = sql`SELECT * FROM demand_forecasts WHERE tenant_id = ${tenantId}`;
    
    if (productId) {
      query = sql`SELECT * FROM demand_forecasts WHERE tenant_id = ${tenantId} AND product_id = ${productId}`;
    }

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      productId: row.product_id as string,
      forecastType: row.forecast_type as DemandForecast['forecastType'],
      period: new Date(row.period as string),
      predictedDemand: parseFloat(row.predicted_demand as string),
      confidence: parseFloat(row.confidence as string),
      factors: JSON.parse(row.factors as string),
      accuracy: row.accuracy ? parseFloat(row.accuracy as string) : undefined,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async createETAEstimate(estimate: Omit<ETAEstimate, 'id' | 'lastUpdated'>): Promise<ETAEstimate> {
    const id = `ETA-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO eta_estimates (id, tenant_id, shipment_id, route_id, estimated_arrival,
                                confidence, factors, last_updated, actual_arrival, accuracy)
      VALUES (${id}, ${estimate.tenantId}, ${estimate.shipmentId}, ${estimate.routeId},
              ${estimate.estimatedArrival}, ${estimate.confidence}, ${JSON.stringify(estimate.factors)},
              ${now}, ${estimate.actualArrival || null}, ${estimate.accuracy || null})
    `);

    this.logger.log(`ETA estimate created: ${id} for shipment ${estimate.shipmentId}`);

    return {
      id,
      ...estimate,
      lastUpdated: now,
    };
  }

  async updateETAEstimate(id: string, estimate: Partial<ETAEstimate>): Promise<void> {
    await this.db.execute(sql`
      UPDATE eta_estimates SET 
        estimated_arrival = ${estimate.estimatedArrival || null},
        confidence = ${estimate.confidence || null},
        factors = ${estimate.factors ? JSON.stringify(estimate.factors) : null},
        last_updated = NOW(),
        actual_arrival = ${estimate.actualArrival || null},
        accuracy = ${estimate.accuracy || null}
      WHERE id = ${id}
    `);

    this.logger.log(`ETA estimate updated: ${id}`);
  }

  async detectAnomaly(anomaly: Omit<AnomalyDetection, 'id' | 'detectedAt'>): Promise<AnomalyDetection> {
    const id = `AD-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO anomaly_detections (id, tenant_id, metric, value, expected_value, deviation,
                                    severity, type, description, detected_at, resolved_at, status)
      VALUES (${id}, ${anomaly.tenantId}, ${anomaly.metric}, ${anomaly.value},
              ${anomaly.expectedValue}, ${anomaly.deviation}, ${anomaly.severity}, ${anomaly.type},
              ${anomaly.description}, ${now}, ${anomaly.resolvedAt || null}, ${anomaly.status})
    `);

    this.logger.log(`Anomaly detected: ${id} for metric ${anomaly.metric}`);

    return {
      id,
      ...anomaly,
      detectedAt: now,
    };
  }

  async getAnomalies(tenantId: string, status?: string): Promise<AnomalyDetection[]> {
    let query = sql`SELECT * FROM anomaly_detections WHERE tenant_id = ${tenantId}`;
    
    if (status) {
      query = sql`SELECT * FROM anomaly_detections WHERE tenant_id = ${tenantId} AND status = ${status}`;
    }

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      metric: row.metric as string,
      value: parseFloat(row.value as string),
      expectedValue: parseFloat(row.expected_value as string),
      deviation: parseFloat(row.deviation as string),
      severity: row.severity as AnomalyDetection['severity'],
      type: row.type as AnomalyDetection['type'],
      description: row.description as string,
      detectedAt: new Date(row.detected_at as string),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
      status: row.status as AnomalyDetection['status'],
    }));
  }

  async createDynamicPricing(pricing: Omit<DynamicPricing, 'id'>): Promise<DynamicPricing> {
    const id = `DP-${Date.now()}`;

    await this.db.execute(sql`
      INSERT INTO dynamic_pricing (id, tenant_id, route_id, base_price, adjusted_price,
                                  factors, demand_level, capacity_utilization, competitor_pricing,
                                  effective_from, effective_to, is_active)
      VALUES (${id}, ${pricing.tenantId}, ${pricing.routeId}, ${pricing.basePrice},
              ${pricing.adjustedPrice}, ${JSON.stringify(pricing.factors)}, ${pricing.demandLevel},
              ${pricing.capacityUtilization}, ${pricing.competitorPricing || null},
              ${pricing.effectiveFrom}, ${pricing.effectiveTo}, ${pricing.isActive})
    `);

    this.logger.log(`Dynamic pricing created: ${id} for route ${pricing.routeId}`);

    return {
      id,
      ...pricing,
    };
  }

  async getDynamicPricing(tenantId: string, routeId?: string): Promise<DynamicPricing[]> {
    let query = sql`SELECT * FROM dynamic_pricing WHERE tenant_id = ${tenantId} AND is_active = true`;
    
    if (routeId) {
      query = sql`SELECT * FROM dynamic_pricing WHERE tenant_id = ${tenantId} AND route_id = ${routeId} AND is_active = true`;
    }

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      routeId: row.route_id as string,
      basePrice: parseFloat(row.base_price as string),
      adjustedPrice: parseFloat(row.adjusted_price as string),
      factors: JSON.parse(row.factors as string),
      demandLevel: row.demand_level as DynamicPricing['demandLevel'],
      capacityUtilization: parseFloat(row.capacity_utilization as string),
      competitorPricing: row.competitor_pricing ? parseFloat(row.competitor_pricing as string) : undefined,
      effectiveFrom: new Date(row.effective_from as string),
      effectiveTo: new Date(row.effective_to as string),
      isActive: row.is_active as boolean,
    }));
  }

  async createMetricsLayer(metric: Omit<MetricsLayer, 'id' | 'timestamp'>): Promise<MetricsLayer> {
    const id = `ML-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO metrics_layer (id, tenant_id, metric_name, category, value, unit,
                               dimensions, timestamp, source, quality)
      VALUES (${id}, ${metric.tenantId}, ${metric.metricName}, ${metric.category},
              ${metric.value}, ${metric.unit}, ${JSON.stringify(metric.dimensions)},
              ${now}, ${metric.source}, ${metric.quality})
    `);

    this.logger.log(`Metrics layer entry created: ${id} for metric ${metric.metricName}`);

    return {
      id,
      ...metric,
      timestamp: now,
    };
  }

  async getAnalyticsDashboard(tenantId: string, period: { start: Date; end: Date }): Promise<any> {
    const forecasts = await this.getDemandForecasts(tenantId);
    const anomalies = await this.getAnomalies(tenantId, 'open');
    const pricing = await this.getDynamicPricing(tenantId);

    const metricsResult = await this.db.execute(sql`
      SELECT 
        category,
        COUNT(*) as metric_count,
        AVG(value) as avg_value,
        AVG(quality) as avg_quality
      FROM metrics_layer
      WHERE tenant_id = ${tenantId}
      AND timestamp BETWEEN ${period.start} AND ${period.end}
      GROUP BY category
    `);

    const etaAccuracyResult = await this.db.execute(sql`
      SELECT 
        AVG(accuracy) as avg_accuracy,
        COUNT(*) as total_estimates,
        COUNT(CASE WHEN accuracy >= 0.8 THEN 1 END) as accurate_estimates
      FROM eta_estimates
      WHERE tenant_id = ${tenantId}
      AND last_updated BETWEEN ${period.start} AND ${period.end}
    `);

    const etaStats = etaAccuracyResult[0];
    const avgAccuracy = parseFloat(etaStats?.avg_accuracy as string) || 0;
    const totalEstimates = parseInt(etaStats?.total_estimates as string) || 0;
    const accurateEstimates = parseInt(etaStats?.accurate_estimates as string) || 0;

    return {
      summary: {
        totalForecasts: forecasts.length,
        openAnomalies: anomalies.length,
        activePricingRules: pricing.length,
        totalMetrics: metricsResult.reduce((sum, row) => sum + parseInt(row.metric_count as string), 0),
        etaAccuracy: avgAccuracy,
        etaReliability: totalEstimates > 0 ? (accurateEstimates / totalEstimates) * 100 : 0,
      },
      forecasts: forecasts.slice(0, 10),
      anomalies: anomalies.slice(0, 10),
      pricing: pricing.slice(0, 10),
      metrics: metricsResult.map(row => ({
        category: row.category as string,
        count: parseInt(row.metric_count as string),
        avgValue: parseFloat(row.avg_value as string),
        avgQuality: parseFloat(row.avg_quality as string),
      })),
      insights: this.generateInsights(forecasts, anomalies, pricing),
    };
  }

  private generateInsights(forecasts: DemandForecast[], anomalies: AnomalyDetection[], pricing: DynamicPricing[]): string[] {
    const insights: string[] = [];

    // Demand insights
    const highDemandProducts = forecasts.filter(f => f.predictedDemand > 1000);
    if (highDemandProducts.length > 0) {
      insights.push(`High demand predicted for ${highDemandProducts.length} products`);
    }

    // Anomaly insights
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
    if (criticalAnomalies.length > 0) {
      insights.push(`${criticalAnomalies.length} critical anomalies require immediate attention`);
    }

    // Pricing insights
    const peakPricing = pricing.filter(p => p.demandLevel === 'peak');
    if (peakPricing.length > 0) {
      insights.push(`${peakPricing.length} routes are experiencing peak demand with dynamic pricing`);
    }

    return insights;
  }

  async calculateDemandForecast(
    tenantId: string,
    productId: string,
    historicalData: Array<{ date: Date; demand: number }>,
    factors: string[]
  ): Promise<DemandForecast> {
    // Simple moving average forecast (in production, use ML models)
    const recentData = historicalData.slice(-30); // Last 30 days
    const avgDemand = recentData.reduce((sum, data) => sum + data.demand, 0) / recentData.length;
    
    // Apply seasonal factors
    const seasonalFactor = this.calculateSeasonalFactor(historicalData);
    const predictedDemand = avgDemand * seasonalFactor;

    // Calculate confidence based on data quality
    const confidence = Math.min(0.95, Math.max(0.5, recentData.length / 30));

    return this.createDemandForecast({
      tenantId,
      productId,
      forecastType: 'daily',
      period: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      predictedDemand: Math.round(predictedDemand),
      confidence,
      factors,
    });
  }

  private calculateSeasonalFactor(historicalData: Array<{ date: Date; demand: number }>): number {
    const currentMonth = new Date().getMonth();
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    historicalData.forEach(data => {
      const month = data.date.getMonth();
      monthlyAverages[month] += data.demand;
      monthlyCounts[month]++;
    });

    for (let i = 0; i < 12; i++) {
      if (monthlyCounts[i] > 0) {
        monthlyAverages[i] /= monthlyCounts[i];
      }
    }

    const overallAverage = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / 12;
    return monthlyAverages[currentMonth] / overallAverage;
  }
}
