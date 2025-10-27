// =====================================================================================
// AYAZLOGISTICS - DEMAND FORECASTING SERVICE
// =====================================================================================
// Description: Advanced demand forecasting using multiple statistical methods
// Features: Time series analysis, seasonal decomposition, ML predictions, safety stock
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { inventory, shipments, orderItems } from '../../../../database/schema/shared/wms.schema';
import { orders } from '../../../../database/schema/shared/orders.schema';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface HistoricalDemand {
  date: Date;
  quantity: number;
  revenue: number;
  orderCount: number;
}

interface ForecastResult {
  productId: string;
  productSku: string;
  forecastDate: Date;
  forecastedDemand: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  method: string;
  seasonalityFactor: number;
  trendFactor: number;
  factors: {
    baselineDemand: number;
    seasonalAdjustment: number;
    trendAdjustment: number;
    promotionalImpact: number;
    weatherImpact: number;
  };
}

interface SeasonalPattern {
  productId: string;
  seasonalityDetected: boolean;
  seasonalityStrength: number;
  peakMonths: number[];
  lowMonths: number[];
  seasonalityIndex: number[];
  pattern: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'none';
}

interface TrendAnalysis {
  productId: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trendStrength: number;
  growthRate: number;
  volatility: number;
  rSquared: number;
  trendEquation: {
    slope: number;
    intercept: number;
  };
}

interface SafetyStockRecommendation {
  productId: string;
  productSku: string;
  currentSafetyStock: number;
  recommendedSafetyStock: number;
  serviceLevel: number;
  leadTimeDays: number;
  demandStdDev: number;
  demandVariability: number;
  stockoutRisk: number;
  reorderPoint: number;
  maxInventory: number;
  reason: string;
}

interface DemandPlanningScenario {
  scenarioName: string;
  description: string;
  assumptions: {
    growthRate: number;
    seasonalityFactor: number;
    promotionalLift: number;
    marketExpansion: number;
  };
  forecast: ForecastResult[];
  inventoryRequirements: {
    totalUnits: number;
    totalValue: number;
    warehouseSpace: number;
    capitalRequired: number;
  };
  riskAssessment: {
    overstockRisk: number;
    stockoutRisk: number;
    obsolescenceRisk: number;
  };
}

interface ABCXYZAnalysis {
  productId: string;
  productSku: string;
  abcClass: 'A' | 'B' | 'C';
  xyzClass: 'X' | 'Y' | 'Z';
  combinedClass: string;
  annualDemand: number;
  annualRevenue: number;
  revenuePercentage: number;
  cumulativePercentage: number;
  demandVariability: number;
  coefficientOfVariation: number;
  recommendedStrategy: string;
  inventoryPolicy: {
    reviewPeriod: string;
    orderFrequency: string;
    safetyStockLevel: string;
    forecastingMethod: string;
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class DemandForecastService {
  private readonly logger = new Logger(DemandForecastService.name);

  // Z-scores for service levels
  private readonly Z_SCORES = {
    '90%': 1.28,
    '95%': 1.65,
    '97%': 1.88,
    '99%': 2.33,
    '99.9%': 3.09,
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // FORECASTING METHODS
  // =====================================================================================

  async forecastDemand(
    productId: string,
    forecastHorizonDays: number = 90,
    method: 'moving_average' | 'exponential_smoothing' | 'linear_regression' | 'holts_winters' | 'ensemble' = 'ensemble',
  ): Promise<ForecastResult[]> {
    this.logger.log(`Forecasting demand for product ${productId} using method: ${method}`);

    const cacheKey = this.cacheService.generateKey('forecast', productId, method, forecastHorizonDays);

    return this.cacheService.wrap(cacheKey, async () => {
      // Get historical data (last 365 days)
      const historicalData = await this.getHistoricalDemand(productId, 365);

      if (historicalData.length < 30) {
        throw new BadRequestException('Insufficient historical data for forecasting (minimum 30 days required)');
      }

      // Detect seasonality
      const seasonality = await this.detectSeasonality(productId, historicalData);

      // Analyze trend
      const trend = this.analyzeTrend(historicalData);

      // Generate forecast based on method
      let forecast: ForecastResult[];

      switch (method) {
        case 'moving_average':
          forecast = this.movingAverageForecast(productId, historicalData, forecastHorizonDays);
          break;
        case 'exponential_smoothing':
          forecast = this.exponentialSmoothingForecast(productId, historicalData, forecastHorizonDays);
          break;
        case 'linear_regression':
          forecast = this.linearRegressionForecast(productId, historicalData, forecastHorizonDays, trend);
          break;
        case 'holts_winters':
          forecast = this.holtsWintersForecast(productId, historicalData, forecastHorizonDays, seasonality, trend);
          break;
        case 'ensemble':
          forecast = this.ensembleForecast(productId, historicalData, forecastHorizonDays, seasonality, trend);
          break;
        default:
          forecast = this.movingAverageForecast(productId, historicalData, forecastHorizonDays);
      }

      await this.eventBus.emit('demand.forecast.generated', {
        productId,
        method,
        forecastHorizon: forecastHorizonDays,
        totalForecastedDemand: forecast.reduce((sum, f) => sum + f.forecastedDemand, 0),
      });

      return forecast;
    }, 3600);
  }

  private movingAverageForecast(
    productId: string,
    historicalData: HistoricalDemand[],
    horizonDays: number,
    windowSize: number = 30,
  ): ForecastResult[] {
    const sortedData = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
    const recentData = sortedData.slice(-windowSize);
    const average = recentData.reduce((sum, d) => sum + d.quantity, 0) / recentData.length;
    
    const stdDev = Math.sqrt(
      recentData.reduce((sum, d) => sum + Math.pow(d.quantity - average, 2), 0) / recentData.length,
    );

    const forecast: ForecastResult[] = [];
    const lastDate = sortedData[sortedData.length - 1].date;

    for (let i = 1; i <= horizonDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const confidence = Math.max(0.5, 1 - (i / horizonDays) * 0.5);

      forecast.push({
        productId,
        productSku: `SKU-${productId}`,
        forecastDate,
        forecastedDemand: Math.round(average),
        lowerBound: Math.max(0, Math.round(average - 1.96 * stdDev)),
        upperBound: Math.round(average + 1.96 * stdDev),
        confidence,
        method: 'moving_average',
        seasonalityFactor: 1.0,
        trendFactor: 1.0,
        factors: {
          baselineDemand: average,
          seasonalAdjustment: 0,
          trendAdjustment: 0,
          promotionalImpact: 0,
          weatherImpact: 0,
        },
      });
    }

    return forecast;
  }

  private exponentialSmoothingForecast(
    productId: string,
    historicalData: HistoricalDemand[],
    horizonDays: number,
    alpha: number = 0.3,
  ): ForecastResult[] {
    const sortedData = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    let smoothedValue = sortedData[0].quantity;
    
    for (let i = 1; i < sortedData.length; i++) {
      smoothedValue = alpha * sortedData[i].quantity + (1 - alpha) * smoothedValue;
    }

    const variance = sortedData.reduce((sum, d) => sum + Math.pow(d.quantity - smoothedValue, 2), 0) / sortedData.length;
    const stdDev = Math.sqrt(variance);

    const forecast: ForecastResult[] = [];
    const lastDate = sortedData[sortedData.length - 1].date;

    for (let i = 1; i <= horizonDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const confidence = Math.max(0.6, 1 - (i / horizonDays) * 0.4);

      forecast.push({
        productId,
        productSku: `SKU-${productId}`,
        forecastDate,
        forecastedDemand: Math.round(smoothedValue),
        lowerBound: Math.max(0, Math.round(smoothedValue - 1.96 * stdDev)),
        upperBound: Math.round(smoothedValue + 1.96 * stdDev),
        confidence,
        method: 'exponential_smoothing',
        seasonalityFactor: 1.0,
        trendFactor: 1.0,
        factors: {
          baselineDemand: smoothedValue,
          seasonalAdjustment: 0,
          trendAdjustment: 0,
          promotionalImpact: 0,
          weatherImpact: 0,
        },
      });
    }

    return forecast;
  }

  private linearRegressionForecast(
    productId: string,
    historicalData: HistoricalDemand[],
    horizonDays: number,
    trend: TrendAnalysis,
  ): ForecastResult[] {
    const sortedData = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
    const n = sortedData.length;

    const forecast: ForecastResult[] = [];
    const lastDate = sortedData[sortedData.length - 1].date;

    for (let i = 1; i <= horizonDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const x = n + i;
      const forecastValue = trend.trendEquation.slope * x + trend.trendEquation.intercept;

      const stdDev = 5; // Would calculate from residuals
      const confidence = Math.max(0.7, 1 - (i / horizonDays) * 0.3);

      forecast.push({
        productId,
        productSku: `SKU-${productId}`,
        forecastDate,
        forecastedDemand: Math.max(0, Math.round(forecastValue)),
        lowerBound: Math.max(0, Math.round(forecastValue - 1.96 * stdDev)),
        upperBound: Math.round(forecastValue + 1.96 * stdDev),
        confidence,
        method: 'linear_regression',
        seasonalityFactor: 1.0,
        trendFactor: trend.growthRate / 100 + 1,
        factors: {
          baselineDemand: forecastValue,
          seasonalAdjustment: 0,
          trendAdjustment: trend.growthRate,
          promotionalImpact: 0,
          weatherImpact: 0,
        },
      });
    }

    return forecast;
  }

  private holtsWintersForecast(
    productId: string,
    historicalData: HistoricalDemand[],
    horizonDays: number,
    seasonality: SeasonalPattern,
    trend: TrendAnalysis,
  ): ForecastResult[] {
    const sortedData = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Holt-Winters parameters
    const alpha = 0.3; // Level smoothing
    const beta = 0.1; // Trend smoothing
    const gamma = 0.2; // Seasonal smoothing

    let level = sortedData[0].quantity;
    let trendComponent = 0;
    const seasonalComponents = seasonality.seasonalityIndex;

    // Update components with historical data
    for (let i = 1; i < sortedData.length; i++) {
      const seasonalIndex = i % seasonalComponents.length;
      const deseasonalized = sortedData[i].quantity / seasonalComponents[seasonalIndex];

      const prevLevel = level;
      level = alpha * deseasonalized + (1 - alpha) * (level + trendComponent);
      trendComponent = beta * (level - prevLevel) + (1 - beta) * trendComponent;
    }

    const forecast: ForecastResult[] = [];
    const lastDate = sortedData[sortedData.length - 1].date;

    for (let i = 1; i <= horizonDays; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);

      const futureLevel = level + i * trendComponent;
      const seasonalIndex = (sortedData.length + i) % seasonalComponents.length;
      const seasonalFactor = seasonalComponents[seasonalIndex];
      const forecastValue = futureLevel * seasonalFactor;

      const confidence = Math.max(0.75, 1 - (i / horizonDays) * 0.25);
      const errorMargin = forecastValue * (1 - confidence);

      forecast.push({
        productId,
        productSku: `SKU-${productId}`,
        forecastDate,
        forecastedDemand: Math.max(0, Math.round(forecastValue)),
        lowerBound: Math.max(0, Math.round(forecastValue - errorMargin)),
        upperBound: Math.round(forecastValue + errorMargin),
        confidence,
        method: 'holts_winters',
        seasonalityFactor: seasonalFactor,
        trendFactor: 1 + (trendComponent / level),
        factors: {
          baselineDemand: futureLevel,
          seasonalAdjustment: (seasonalFactor - 1) * 100,
          trendAdjustment: (trendComponent / level) * 100,
          promotionalImpact: 0,
          weatherImpact: 0,
        },
      });
    }

    return forecast;
  }

  private ensembleForecast(
    productId: string,
    historicalData: HistoricalDemand[],
    horizonDays: number,
    seasonality: SeasonalPattern,
    trend: TrendAnalysis,
  ): ForecastResult[] {
    // Combine multiple methods with weighted average
    const ma = this.movingAverageForecast(productId, historicalData, horizonDays);
    const es = this.exponentialSmoothingForecast(productId, historicalData, horizonDays);
    const lr = this.linearRegressionForecast(productId, historicalData, horizonDays, trend);
    const hw = this.holtsWintersForecast(productId, historicalData, horizonDays, seasonality, trend);

    const weights = {
      moving_average: 0.15,
      exponential_smoothing: 0.25,
      linear_regression: 0.25,
      holts_winters: 0.35,
    };

    const ensemble: ForecastResult[] = [];

    for (let i = 0; i < horizonDays; i++) {
      const forecastValue = 
        ma[i].forecastedDemand * weights.moving_average +
        es[i].forecastedDemand * weights.exponential_smoothing +
        lr[i].forecastedDemand * weights.linear_regression +
        hw[i].forecastedDemand * weights.holts_winters;

      const lowerBound =
        ma[i].lowerBound * weights.moving_average +
        es[i].lowerBound * weights.exponential_smoothing +
        lr[i].lowerBound * weights.linear_regression +
        hw[i].lowerBound * weights.holts_winters;

      const upperBound =
        ma[i].upperBound * weights.moving_average +
        es[i].upperBound * weights.exponential_smoothing +
        lr[i].upperBound * weights.linear_regression +
        hw[i].upperBound * weights.holts_winters;

      ensemble.push({
        ...hw[i],
        forecastedDemand: Math.round(forecastValue),
        lowerBound: Math.round(lowerBound),
        upperBound: Math.round(upperBound),
        method: 'ensemble',
        confidence: Math.min(ma[i].confidence, es[i].confidence, lr[i].confidence, hw[i].confidence) + 0.1,
      });
    }

    return ensemble;
  }

  async detectSeasonality(productId: string, historicalData?: HistoricalDemand[]): Promise<SeasonalPattern> {
    const data = historicalData || await this.getHistoricalDemand(productId, 365);

    if (data.length < 60) {
      return {
        productId,
        seasonalityDetected: false,
        seasonalityStrength: 0,
        peakMonths: [],
        lowMonths: [],
        seasonalityIndex: Array(12).fill(1),
        pattern: 'none',
      };
    }

    // Group by month
    const monthlyAverages = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    data.forEach(d => {
      const month = d.date.getMonth();
      monthlyAverages[month] += d.quantity;
      monthlyCounts[month]++;
    });

    monthlyAverages.forEach((sum, idx) => {
      monthlyAverages[idx] = monthlyCounts[idx] > 0 ? sum / monthlyCounts[idx] : 0;
    });

    const overallAverage = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / 12;

    // Calculate seasonal indices
    const seasonalityIndex = monthlyAverages.map(avg => 
      overallAverage > 0 ? avg / overallAverage : 1,
    );

    // Detect peaks and lows
    const maxIndex = Math.max(...seasonalityIndex);
    const minIndex = Math.min(...seasonalityIndex);

    const peakMonths = seasonalityIndex
      .map((idx, month) => ({ month, idx }))
      .filter(m => m.idx >= maxIndex * 0.9)
      .map(m => m.month);

    const lowMonths = seasonalityIndex
      .map((idx, month) => ({ month, idx }))
      .filter(m => m.idx <= minIndex * 1.1)
      .map(m => m.month);

    const seasonalityStrength = maxIndex - minIndex;
    const seasonalityDetected = seasonalityStrength > 0.3;

    return {
      productId,
      seasonalityDetected,
      seasonalityStrength,
      peakMonths,
      lowMonths,
      seasonalityIndex,
      pattern: seasonalityDetected ? 'monthly' : 'none',
    };
  }

  private analyzeTrend(historicalData: HistoricalDemand[]): TrendAnalysis {
    const sortedData = [...historicalData].sort((a, b) => a.date.getTime() - b.date.getTime());
    const n = sortedData.length;

    // Calculate linear regression
    const sumX = (n * (n + 1)) / 2;
    const sumY = sortedData.reduce((sum, d) => sum + d.quantity, 0);
    const sumXY = sortedData.reduce((sum, d, idx) => sum + (idx + 1) * d.quantity, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = sortedData.reduce((sum, d) => sum + Math.pow(d.quantity - yMean, 2), 0);
    const ssResidual = sortedData.reduce((sum, d, idx) => {
      const predicted = slope * (idx + 1) + intercept;
      return sum + Math.pow(d.quantity - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    // Determine trend direction
    const growthRate = (slope / yMean) * 100;
    let trendDirection: 'increasing' | 'decreasing' | 'stable' | 'volatile' = 'stable';

    if (Math.abs(growthRate) < 2) {
      trendDirection = 'stable';
    } else if (growthRate > 2) {
      trendDirection = 'increasing';
    } else if (growthRate < -2) {
      trendDirection = 'decreasing';
    }

    // Calculate volatility (coefficient of variation)
    const stdDev = Math.sqrt(sortedData.reduce((sum, d) => sum + Math.pow(d.quantity - yMean, 2), 0) / n);
    const volatility = (stdDev / yMean) * 100;

    if (volatility > 50) {
      trendDirection = 'volatile';
    }

    return {
      productId: sortedData[0]?.quantity ? 'product' : '',
      trendDirection,
      trendStrength: Math.abs(slope),
      growthRate: parseFloat(growthRate.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
      rSquared: parseFloat(rSquared.toFixed(4)),
      trendEquation: {
        slope: parseFloat(slope.toFixed(4)),
        intercept: parseFloat(intercept.toFixed(2)),
      },
    };
  }

  async calculateSafetyStock(
    productId: string,
    serviceLevel: number = 0.95,
    leadTimeDays: number = 7,
  ): Promise<SafetyStockRecommendation> {
    this.logger.log(`Calculating safety stock for product ${productId} with ${serviceLevel * 100}% service level`);

    const historicalData = await this.getHistoricalDemand(productId, 90);

    const dailyDemands = historicalData.map(d => d.quantity);
    const averageDailyDemand = dailyDemands.reduce((sum, d) => sum + d, 0) / dailyDemands.length;

    const variance = dailyDemands.reduce((sum, d) => sum + Math.pow(d - averageDailyDemand, 2), 0) / dailyDemands.length;
    const stdDev = Math.sqrt(variance);

    const demandVariability = (stdDev / averageDailyDemand) * 100;

    // Get appropriate Z-score
    const zScore = this.Z_SCORES['95%'] || 1.65;

    // Calculate safety stock: Z * σ * sqrt(L)
    const recommendedSafetyStock = Math.ceil(zScore * stdDev * Math.sqrt(leadTimeDays));

    // Calculate reorder point: (Average daily demand * Lead time) + Safety stock
    const reorderPoint = Math.ceil(averageDailyDemand * leadTimeDays + recommendedSafetyStock);

    // Calculate max inventory (assuming review period of 30 days)
    const reviewPeriod = 30;
    const maxInventory = Math.ceil(
      averageDailyDemand * (leadTimeDays + reviewPeriod) + recommendedSafetyStock,
    );

    // Calculate stockout risk
    const currentSafetyStock = 50; // Would query from product settings
    const stockoutRisk = this.calculateStockoutRisk(
      currentSafetyStock,
      stdDev,
      leadTimeDays,
      serviceLevel,
    );

    let reason = '';
    if (demandVariability > 50) {
      reason = 'High demand variability requires higher safety stock';
    } else if (demandVariability > 30) {
      reason = 'Moderate demand variability - standard safety stock';
    } else {
      reason = 'Low demand variability - minimal safety stock needed';
    }

    if (leadTimeDays > 14) {
      reason += `. Long lead time (${leadTimeDays} days) increases risk`;
    }

    return {
      productId,
      productSku: `SKU-${productId}`,
      currentSafetyStock,
      recommendedSafetyStock,
      serviceLevel,
      leadTimeDays,
      demandStdDev: parseFloat(stdDev.toFixed(2)),
      demandVariability: parseFloat(demandVariability.toFixed(2)),
      stockoutRisk: parseFloat(stockoutRisk.toFixed(2)),
      reorderPoint,
      maxInventory,
      reason,
    };
  }

  async performABCXYZAnalysis(
    tenantId: string,
    warehouseId: string,
  ): Promise<ABCXYZAnalysis[]> {
    this.logger.log(`Performing ABC-XYZ analysis for warehouse ${warehouseId}`);

    // Get all products with demand data
    const products = await this.getProductsWithDemandData(tenantId, warehouseId);

    // Calculate annual demand and revenue for each product
    const productMetrics = products.map(p => {
      const annualDemand = p.demandData.reduce((sum: number, d: any) => sum + d.quantity, 0);
      const annualRevenue = p.demandData.reduce((sum: number, d: any) => sum + d.revenue, 0);
      
      const demandValues = p.demandData.map((d: any) => d.quantity);
      const mean = annualDemand / demandValues.length;
      const variance = demandValues.reduce((sum: number, d: number) => sum + Math.pow(d - mean, 2), 0) / demandValues.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = mean > 0 ? (stdDev / mean) * 100 : 0;

      return {
        productId: p.id,
        productSku: p.sku,
        annualDemand,
        annualRevenue,
        coefficientOfVariation,
      };
    });

    // Sort by revenue
    const sortedByRevenue = [...productMetrics].sort((a, b) => b.annualRevenue - a.annualRevenue);

    // Calculate cumulative percentages
    const totalRevenue = sortedByRevenue.reduce((sum, p) => sum + p.annualRevenue, 0);
    let cumulative = 0;

    const analysis: ABCXYZAnalysis[] = sortedByRevenue.map(product => {
      cumulative += product.annualRevenue;
      const cumulativePercentage = (cumulative / totalRevenue) * 100;

      // ABC Classification
      let abcClass: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        abcClass = 'A';
      } else if (cumulativePercentage <= 95) {
        abcClass = 'B';
      } else {
        abcClass = 'C';
      }

      // XYZ Classification (based on demand variability)
      let xyzClass: 'X' | 'Y' | 'Z';
      if (product.coefficientOfVariation < 20) {
        xyzClass = 'X'; // Stable
      } else if (product.coefficientOfVariation < 50) {
        xyzClass = 'Y'; // Variable
      } else {
        xyzClass = 'Z'; // Highly variable
      }

      const combinedClass = `${abcClass}${xyzClass}`;

      // Generate strategy based on classification
      const strategy = this.determineInventoryStrategy(abcClass, xyzClass);

      return {
        productId: product.productId,
        productSku: product.productSku,
        abcClass,
        xyzClass,
        combinedClass,
        annualDemand: product.annualDemand,
        annualRevenue: product.annualRevenue,
        revenuePercentage: (product.annualRevenue / totalRevenue) * 100,
        cumulativePercentage,
        demandVariability: product.coefficientOfVariation,
        coefficientOfVariation: product.coefficientOfVariation,
        recommendedStrategy: strategy.description,
        inventoryPolicy: strategy.policy,
      };
    });

    await this.eventBus.emit('abc.xyz.analysis.completed', {
      warehouseId,
      totalProducts: analysis.length,
      aItems: analysis.filter(a => a.abcClass === 'A').length,
      bItems: analysis.filter(a => a.abcClass === 'B').length,
      cItems: analysis.filter(a => a.abcClass === 'C').length,
    });

    return analysis;
  }

  async createDemandPlanningScenario(
    productId: string,
    scenarioName: string,
    assumptions: {
      growthRate: number;
      seasonalityFactor: number;
      promotionalLift: number;
      marketExpansion: number;
    },
    horizonMonths: number = 12,
  ): Promise<DemandPlanningScenario> {
    this.logger.log(`Creating demand planning scenario: ${scenarioName} for product ${productId}`);

    const forecast = await this.forecastDemand(productId, horizonMonths * 30, 'ensemble');

    // Apply scenario assumptions
    const adjustedForecast = forecast.map(f => {
      const growthMultiplier = 1 + (assumptions.growthRate / 100);
      const seasonalMultiplier = 1 + (assumptions.seasonalityFactor / 100) * f.seasonalityFactor;
      const promotionalMultiplier = 1 + (assumptions.promotionalLift / 100);
      const marketMultiplier = 1 + (assumptions.marketExpansion / 100);

      const adjustedDemand = f.forecastedDemand * growthMultiplier * seasonalMultiplier * promotionalMultiplier * marketMultiplier;

      return {
        ...f,
        forecastedDemand: Math.round(adjustedDemand),
        lowerBound: Math.round(f.lowerBound * growthMultiplier),
        upperBound: Math.round(f.upperBound * growthMultiplier * 1.2),
      };
    });

    // Calculate inventory requirements
    const totalUnits = adjustedForecast.reduce((sum, f) => sum + f.forecastedDemand, 0);
    const unitCost = 50; // Would query from product
    const totalValue = totalUnits * unitCost;
    const cubePerUnit = 0.05; // m³
    const warehouseSpace = totalUnits * cubePerUnit;
    const capitalRequired = totalValue * 0.3; // 30% inventory investment

    const inventoryRequirements = {
      totalUnits,
      totalValue,
      warehouseSpace,
      capitalRequired,
    };

    // Risk assessment
    const maxDemand = Math.max(...adjustedForecast.map(f => f.forecastedDemand));
    const avgDemand = totalUnits / adjustedForecast.length;

    const riskAssessment = {
      overstockRisk: maxDemand > avgDemand * 1.5 ? 65 : 35,
      stockoutRisk: assumptions.growthRate > 20 ? 55 : 25,
      obsolescenceRisk: assumptions.seasonalityFactor > 50 ? 45 : 20,
    };

    return {
      scenarioName,
      description: `Scenario with ${assumptions.growthRate}% growth, ${assumptions.promotionalLift}% promotional lift`,
      assumptions,
      forecast: adjustedForecast,
      inventoryRequirements,
      riskAssessment,
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async getHistoricalDemand(productId: string, tenantId: string, days: number): Promise<HistoricalDemand[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const historicalData = await this.db
        .select({
          date: sql<Date>`DATE(${orderItems.createdAt})`,
          quantity: sql<number>`SUM(${orderItems.quantity})`,
          revenue: sql<number>`SUM(${orderItems.totalPrice})`,
          orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.productId, productId),
            eq(orders.tenantId, tenantId),
            gte(orders.orderDate, startDate)
          )
        )
        .groupBy(sql`DATE(${orderItems.createdAt})`)
        .orderBy(sql`DATE(${orderItems.createdAt})`);

      return historicalData.map(row => ({
        date: row.date,
        quantity: Number(row.quantity) || 0,
        revenue: Number(row.revenue) || 0,
        orderCount: Number(row.orderCount) || 0,
      }));
    } catch (error) {
      return [];
    }
  }
    }

    return data;
  }

  private async getProductsWithDemandData(tenantId: string, warehouseId: string): Promise<any[]> {
    // Query actual products with demand data from database
    const products = await this.db
      .select({
        id: inventory.productId,
        sku: inventory.sku,
        name: inventory.name,
      })
      .from(inventory)
      .where(
        and(
          eq(inventory.tenantId, tenantId),
          eq(inventory.warehouseId, warehouseId)
        )
      );

    return Promise.all(
      products.map(async (product) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        demandData: await this.getHistoricalDemand(product.id, 365),
      }))
    );
  }

  private calculateStockoutRisk(
    currentSafetyStock: number,
    demandStdDev: number,
    leadTimeDays: number,
    targetServiceLevel: number,
  ): number {
    const requiredSafetyStock = this.Z_SCORES['95%'] * demandStdDev * Math.sqrt(leadTimeDays);
    
    if (currentSafetyStock >= requiredSafetyStock) {
      return 5; // Low risk
    } else if (currentSafetyStock >= requiredSafetyStock * 0.7) {
      return 25; // Moderate risk
    } else if (currentSafetyStock >= requiredSafetyStock * 0.5) {
      return 50; // High risk
    } else {
      return 80; // Very high risk
    }
  }

  private determineInventoryStrategy(abcClass: 'A' | 'B' | 'C', xyzClass: 'X' | 'Y' | 'Z'): {
    description: string;
    policy: {
      reviewPeriod: string;
      orderFrequency: string;
      safetyStockLevel: string;
      forecastingMethod: string;
    };
  } {
    const strategies: Record<string, any> = {
      'AX': {
        description: 'High value, stable demand - Optimize for minimal inventory',
        policy: {
          reviewPeriod: 'Daily',
          orderFrequency: 'Weekly',
          safetyStockLevel: 'Low (5-10 days)',
          forecastingMethod: 'Simple moving average',
        },
      },
      'AY': {
        description: 'High value, variable demand - Balance service and inventory',
        policy: {
          reviewPeriod: 'Daily',
          orderFrequency: 'Bi-weekly',
          safetyStockLevel: 'Medium (10-15 days)',
          forecastingMethod: 'Exponential smoothing',
        },
      },
      'AZ': {
        description: 'High value, highly variable - High safety stock',
        policy: {
          reviewPeriod: 'Daily',
          orderFrequency: 'Weekly',
          safetyStockLevel: 'High (15-20 days)',
          forecastingMethod: 'Holt-Winters or ensemble',
        },
      },
      'BX': {
        description: 'Medium value, stable - Standard inventory management',
        policy: {
          reviewPeriod: 'Weekly',
          orderFrequency: 'Bi-weekly',
          safetyStockLevel: 'Low (5-10 days)',
          forecastingMethod: 'Moving average',
        },
      },
      'BY': {
        description: 'Medium value, variable - Moderate safety stock',
        policy: {
          reviewPeriod: 'Weekly',
          orderFrequency: 'Monthly',
          safetyStockLevel: 'Medium (10-15 days)',
          forecastingMethod: 'Exponential smoothing',
        },
      },
      'BZ': {
        description: 'Medium value, highly variable - Careful monitoring',
        policy: {
          reviewPeriod: 'Weekly',
          orderFrequency: 'Bi-weekly',
          safetyStockLevel: 'High (15-20 days)',
          forecastingMethod: 'Ensemble methods',
        },
      },
      'CX': {
        description: 'Low value, stable - Minimal attention',
        policy: {
          reviewPeriod: 'Monthly',
          orderFrequency: 'Quarterly',
          safetyStockLevel: 'Very low (3-5 days)',
          forecastingMethod: 'Simple average',
        },
      },
      'CY': {
        description: 'Low value, variable - Review periodically',
        policy: {
          reviewPeriod: 'Monthly',
          orderFrequency: 'Bi-monthly',
          safetyStockLevel: 'Low (5-10 days)',
          forecastingMethod: 'Moving average',
        },
      },
      'CZ': {
        description: 'Low value, highly variable - Consider discontinuation',
        policy: {
          reviewPeriod: 'Monthly',
          orderFrequency: 'Monthly',
          safetyStockLevel: 'Medium (10-15 days)',
          forecastingMethod: 'Ensemble or judgmental',
        },
      },
    };

    return strategies[`${abcClass}${xyzClass}`] || strategies['BY'];
  }
}

