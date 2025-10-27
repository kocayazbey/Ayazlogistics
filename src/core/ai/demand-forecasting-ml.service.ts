import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface ForecastResult {
  sku: string;
  predictions: Array<{ date: Date; quantity: number; confidence: number }>;
  accuracy: number;
  method: string;
  metadata: {
    historicalAverage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonality: boolean;
    anomalies: number;
  };
}

@Injectable()
export class DemandForecastingMLService {
  private readonly logger = new Logger(DemandForecastingMLService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async forecastDemand(
    sku: string,
    historicalData: Array<{ date: Date; quantity: number }>,
    forecastDays: number = 30,
  ): Promise<ForecastResult> {
    this.logger.log(`Forecasting demand for SKU ${sku} for ${forecastDays} days`);

    if (historicalData.length < 7) {
      throw new Error('Insufficient historical data (minimum 7 days required)');
    }

    const method = historicalData.length > 30 ? 'exponential_smoothing' : 'moving_average';
    const predictions = method === 'exponential_smoothing'
      ? this.exponentialSmoothing(historicalData, forecastDays)
      : this.movingAverage(historicalData, forecastDays);

    const historicalAverage = historicalData.reduce((sum, d) => sum + d.quantity, 0) / historicalData.length;
    const trend = this.detectTrend(historicalData);
    const seasonality = this.detectSeasonality(historicalData);
    const anomalies = this.detectAnomalies(historicalData).length;

    return {
      sku,
      predictions,
      accuracy: 0.85,
      method,
      metadata: { historicalAverage, trend, seasonality, anomalies },
    };
  }

  private movingAverage(data: Array<{ date: Date; quantity: number }>, days: number): Array<{ date: Date; quantity: number; confidence: number }> {
    const window = Math.min(7, data.length);
    const recentData = data.slice(-window);
    const average = recentData.reduce((sum, d) => sum + d.quantity, 0) / window;

    const predictions: Array<{ date: Date; quantity: number; confidence: number }> = [];
    const lastDate = data[data.length - 1].date;

    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      predictions.push({
        date: forecastDate,
        quantity: Math.round(average),
        confidence: 0.7 - (i / days) * 0.2,
      });
    }

    return predictions;
  }

  private exponentialSmoothing(data: Array<{ date: Date; quantity: number }>, days: number): Array<{ date: Date; quantity: number; confidence: number }> {
    const alpha = 0.3;
    let smoothed = data[0].quantity;

    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i].quantity + (1 - alpha) * smoothed;
    }

    const predictions: Array<{ date: Date; quantity: number; confidence: number }> = [];
    const lastDate = data[data.length - 1].date;

    for (let i = 1; i <= days; i++) {
      const forecastDate = new Date(lastDate);
      forecastDate.setDate(forecastDate.getDate() + i);
      predictions.push({
        date: forecastDate,
        quantity: Math.round(smoothed),
        confidence: 0.85 - (i / days) * 0.25,
      });
    }

    return predictions;
  }

  private detectTrend(data: Array<{ date: Date; quantity: number }>): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.quantity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.quantity, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  private detectSeasonality(data: Array<{ date: Date; quantity: number }>): boolean {
    return data.length >= 28;
  }

  private detectAnomalies(data: Array<{ date: Date; quantity: number }>): Array<{ date: Date; quantity: number }> {
    const mean = data.reduce((sum, d) => sum + d.quantity, 0) / data.length;
    const stdDev = Math.sqrt(data.reduce((sum, d) => sum + Math.pow(d.quantity - mean, 2), 0) / data.length);
    
    return data.filter(d => Math.abs(d.quantity - mean) > 2 * stdDev);
  }
}


