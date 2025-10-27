import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface SensorDataPoint {
  deviceId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: Date;
  quality: 'good' | 'fair' | 'poor';
  metadata?: Record<string, any>;
}

interface AnalyticsReport {
  deviceId: string;
  period: { start: Date; end: Date };
  sensorType: string;
  statistics: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
    dataPoints: number;
  };
  trends: Array<{ timestamp: Date; value: number; trend: 'increasing' | 'decreasing' | 'stable' }>;
  anomalies: Array<{ timestamp: Date; value: number; severity: 'low' | 'medium' | 'high' }>;
  predictions: Array<{ timestamp: Date; predictedValue: number; confidence: number }>;
}

interface DeviceHealth {
  deviceId: string;
  overallScore: number;
  components: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    lastCheck: Date;
    issues: string[];
  }>;
  recommendations: string[];
  nextMaintenanceDate: Date;
}

@Injectable()
export class IoTAnalyticsService {
  private readonly logger = new Logger(IoTAnalyticsService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async analyzeSensorData(
    deviceId: string,
    sensorType: string,
    period: { start: Date; end: Date },
  ): Promise<AnalyticsReport> {
    this.logger.log(`Analyzing sensor data for device ${deviceId} (${sensorType})`);

    const data = await this.fetchSensorData(deviceId, sensorType, period);

    if (data.length === 0) {
      throw new Error('No sensor data available for analysis');
    }

    const values = data.map(d => d.value);
    const statistics = this.calculateStatistics(values);
    const trends = this.analyzeTrends(data);
    const anomalies = this.detectAnomalies(data);
    const predictions = this.generatePredictions(data, 24);

    return {
      deviceId,
      period,
      sensorType,
      statistics,
      trends,
      anomalies,
      predictions,
    };
  }

  private async fetchSensorData(
    deviceId: string,
    sensorType: string,
    period: { start: Date; end: Date },
  ): Promise<SensorDataPoint[]> {
    const result = await this.db.execute(
      `SELECT * FROM iot_sensor_data 
       WHERE device_id = $1 AND sensor_type = $2 
       AND timestamp BETWEEN $3 AND $4
       ORDER BY timestamp ASC`,
      [deviceId, sensorType, period.start, period.end]
    );

    return result.rows.map(row => ({
      deviceId: row.device_id,
      sensorType: row.sensor_type,
      value: parseFloat(row.value),
      unit: row.unit,
      timestamp: new Date(row.timestamp),
      quality: row.quality || 'good',
      metadata: row.metadata || {},
    }));
  }

  private calculateStatistics(values: number[]): AnalyticsReport['statistics'] {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    const variance = values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg,
      median,
      stdDev,
      dataPoints: values.length,
    };
  }

  private analyzeTrends(data: SensorDataPoint[]): AnalyticsReport['trends'] {
    const trends: AnalyticsReport['trends'] = [];
    const windowSize = Math.min(10, Math.floor(data.length / 10));

    for (let i = windowSize; i < data.length; i++) {
      const currentWindow = data.slice(i - windowSize, i).map(d => d.value);
      const previousWindow = data.slice(i - windowSize * 2, i - windowSize).map(d => d.value);

      if (previousWindow.length === 0) continue;

      const currentAvg = currentWindow.reduce((a, b) => a + b, 0) / currentWindow.length;
      const previousAvg = previousWindow.reduce((a, b) => a + b, 0) / previousWindow.length;

      const change = ((currentAvg - previousAvg) / previousAvg) * 100;

      trends.push({
        timestamp: data[i].timestamp,
        value: data[i].value,
        trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      });
    }

    return trends;
  }

  private detectAnomalies(data: SensorDataPoint[]): AnalyticsReport['anomalies'] {
    const anomalies: AnalyticsReport['anomalies'] = [];
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length);

    data.forEach(point => {
      const zScore = Math.abs((point.value - mean) / stdDev);

      if (zScore > 2) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
        });
      }
    });

    return anomalies;
  }

  private generatePredictions(
    data: SensorDataPoint[],
    hoursAhead: number,
  ): AnalyticsReport['predictions'] {
    const predictions: AnalyticsReport['predictions'] = [];
    
    const recentData = data.slice(-24);
    const avg = recentData.reduce((sum, d) => sum + d.value, 0) / recentData.length;
    const trend = this.calculateTrendSlope(recentData);

    for (let i = 1; i <= hoursAhead; i++) {
      const predicted = avg + trend * i;
      const confidence = Math.max(0.5, 1 - (i / hoursAhead) * 0.4);

      predictions.push({
        timestamp: new Date(data[data.length - 1].timestamp.getTime() + i * 60 * 60 * 1000),
        predictedValue: predicted,
        confidence,
      });
    }

    return predictions;
  }

  private calculateTrendSlope(data: SensorDataPoint[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach((point, i) => {
      sumX += i;
      sumY += point.value;
      sumXY += i * point.value;
      sumX2 += i * i;
    });

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  async analyzeDeviceHealth(deviceId: string): Promise<DeviceHealth> {
    this.logger.log(`Analyzing health for device ${deviceId}`);

    const components: DeviceHealth['components'] = [];
    
    const batteryData = await this.fetchSensorData(deviceId, 'battery', {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    if (batteryData.length > 0) {
      const latestBattery = batteryData[batteryData.length - 1].value;
      components.push({
        name: 'Battery',
        status: latestBattery > 50 ? 'healthy' : latestBattery > 20 ? 'warning' : 'critical',
        score: latestBattery,
        lastCheck: batteryData[batteryData.length - 1].timestamp,
        issues: latestBattery < 20 ? ['Low battery level'] : [],
      });
    }

    const temperatureData = await this.fetchSensorData(deviceId, 'temperature', {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
    });

    if (temperatureData.length > 0) {
      const stats = this.calculateStatistics(temperatureData.map(d => d.value));
      const issues: string[] = [];
      
      if (stats.max > 80) issues.push('High temperature detected');
      if (stats.stdDev > 10) issues.push('Temperature fluctuations');

      components.push({
        name: 'Temperature Sensor',
        status: issues.length === 0 ? 'healthy' : issues.length === 1 ? 'warning' : 'critical',
        score: Math.max(0, 100 - issues.length * 30),
        lastCheck: temperatureData[temperatureData.length - 1].timestamp,
        issues,
      });
    }

    const overallScore = components.reduce((sum, c) => sum + c.score, 0) / components.length;

    const recommendations: string[] = [];
    if (overallScore < 70) {
      recommendations.push('Schedule maintenance check');
    }
    components.forEach(c => {
      if (c.status === 'critical') {
        recommendations.push(`Replace ${c.name} immediately`);
      }
    });

    return {
      deviceId,
      overallScore,
      components,
      recommendations,
      nextMaintenanceDate: new Date(Date.now() + (overallScore > 80 ? 90 : 30) * 24 * 60 * 60 * 1000),
    };
  }

  async detectPatternAnomalies(
    deviceId: string,
    sensorType: string,
    windowHours: number = 24,
  ): Promise<any[]> {
    const data = await this.fetchSensorData(deviceId, sensorType, {
      start: new Date(Date.now() - windowHours * 60 * 60 * 1000),
      end: new Date(),
    });

    const hourlyAverages = this.groupByHour(data);
    const expectedPattern = this.learnDailyPattern(hourlyAverages);
    const anomalies: any[] = [];

    hourlyAverages.forEach((avg, hour) => {
      const expected = expectedPattern[hour] || avg;
      const deviation = Math.abs(avg - expected) / expected;

      if (deviation > 0.3) {
        anomalies.push({
          hour,
          actual: avg,
          expected,
          deviation: deviation * 100,
          severity: deviation > 0.5 ? 'high' : 'medium',
        });
      }
    });

    return anomalies;
  }

  private groupByHour(data: SensorDataPoint[]): Map<number, number> {
    const hourlyData = new Map<number, number[]>();

    data.forEach(point => {
      const hour = point.timestamp.getHours();
      const values = hourlyData.get(hour) || [];
      values.push(point.value);
      hourlyData.set(hour, values);
    });

    const hourlyAverages = new Map<number, number>();
    hourlyData.forEach((values, hour) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      hourlyAverages.set(hour, avg);
    });

    return hourlyAverages;
  }

  private learnDailyPattern(hourlyAverages: Map<number, number>): Record<number, number> {
    const pattern: Record<number, number> = {};
    hourlyAverages.forEach((avg, hour) => {
      pattern[hour] = avg;
    });
    return pattern;
  }

  async aggregateSensorData(
    deviceIds: string[],
    sensorType: string,
    interval: '1 hour' | '1 day' | '1 week',
  ): Promise<any[]> {
    const intervalMapping = {
      '1 hour': '1 hour',
      '1 day': '1 day',
      '1 week': '7 days',
    };

    const result = await this.db.execute(
      `SELECT 
        device_id,
        time_bucket($1::interval, timestamp) AS bucket,
        AVG(value) AS avg_value,
        MIN(value) AS min_value,
        MAX(value) AS max_value,
        COUNT(*) AS data_points
       FROM iot_sensor_data
       WHERE device_id = ANY($2) AND sensor_type = $3
       GROUP BY device_id, bucket
       ORDER BY device_id, bucket DESC`,
      [intervalMapping[interval], deviceIds, sensorType]
    );

    return result.rows;
  }

  async detectCrossSensorCorrelations(deviceId: string): Promise<any[]> {
    this.logger.log(`Detecting cross-sensor correlations for device ${deviceId}`);

    const sensorTypes = ['temperature', 'humidity', 'pressure', 'vibration'];
    const correlations: any[] = [];

    for (let i = 0; i < sensorTypes.length; i++) {
      for (let j = i + 1; j < sensorTypes.length; j++) {
        const sensor1 = sensorTypes[i];
        const sensor2 = sensorTypes[j];

        const data1 = await this.fetchSensorData(deviceId, sensor1, {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        });

        const data2 = await this.fetchSensorData(deviceId, sensor2, {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        });

        if (data1.length > 10 && data2.length > 10) {
          const correlation = this.calculateCorrelation(
            data1.map(d => d.value),
            data2.map(d => d.value)
          );

          correlations.push({
            sensor1,
            sensor2,
            correlation,
            strength: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.4 ? 'moderate' : 'weak',
          });
        }
      }
    }

    return correlations.filter(c => Math.abs(c.correlation) > 0.4);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  async predictMaintenanceNeeds(deviceId: string): Promise<any> {
    const health = await this.analyzeDeviceHealth(deviceId);

    const criticalComponents = health.components.filter(c => c.status === 'critical');
    const warningComponents = health.components.filter(c => c.status === 'warning');

    const predictions = [];

    criticalComponents.forEach(comp => {
      predictions.push({
        component: comp.name,
        urgency: 'immediate',
        estimatedDays: 3,
        probability: 0.9,
        estimatedCost: 5000,
      });
    });

    warningComponents.forEach(comp => {
      predictions.push({
        component: comp.name,
        urgency: 'soon',
        estimatedDays: 14,
        probability: 0.7,
        estimatedCost: 3000,
      });
    });

    return {
      deviceId,
      overallHealth: health.overallScore,
      predictions,
      totalEstimatedCost: predictions.reduce((sum, p) => sum + p.estimatedCost, 0),
      recommendedAction: criticalComponents.length > 0 ? 'Schedule immediate maintenance' : 'Continue monitoring',
    };
  }

  async createRealTimeAlert(
    deviceId: string,
    sensorType: string,
    condition: { operator: '>' | '<' | '=' | '>=' | '<='; threshold: number },
    recipients: string[],
  ): Promise<string> {
    const alertId = `ALERT-${Date.now()}`;

    await this.db.execute(
      `INSERT INTO iot_alerts (id, device_id, sensor_type, condition_operator, threshold_value, recipients, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)`,
      [alertId, deviceId, sensorType, condition.operator, condition.threshold, JSON.stringify(recipients)]
    );

    this.logger.log(`Alert created: ${alertId} for ${deviceId}/${sensorType} ${condition.operator} ${condition.threshold}`);

    return alertId;
  }

  async generateEnergyConsumptionReport(deviceIds: string[], period: { start: Date; end: Date }): Promise<any> {
    const consumptionData = await Promise.all(
      deviceIds.map(async deviceId => {
        const data = await this.fetchSensorData(deviceId, 'power', period);
        const totalConsumption = data.reduce((sum, d) => sum + d.value, 0);

        return {
          deviceId,
          consumption: totalConsumption,
          average: totalConsumption / data.length,
          peak: Math.max(...data.map(d => d.value)),
          dataPoints: data.length,
        };
      })
    );

    const totalConsumption = consumptionData.reduce((sum, d) => sum + d.consumption, 0);

    return {
      period,
      devices: consumptionData.sort((a, b) => b.consumption - a.consumption),
      totalConsumption,
      averagePerDevice: totalConsumption / deviceIds.length,
      topConsumers: consumptionData.slice(0, 5),
    };
  }

  async optimizeDataRetention(deviceId: string, retentionDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const aggregateResult = await this.db.execute(
      `INSERT INTO iot_sensor_data_archive 
       SELECT device_id, sensor_type, 
              time_bucket('1 hour', timestamp) as hour,
              AVG(value) as avg_value,
              MIN(value) as min_value,
              MAX(value) as max_value,
              COUNT(*) as data_points
       FROM iot_sensor_data
       WHERE device_id = $1 AND timestamp < $2
       GROUP BY device_id, sensor_type, hour`,
      [deviceId, cutoffDate]
    );

    const deleteResult = await this.db.execute(
      `DELETE FROM iot_sensor_data WHERE device_id = $1 AND timestamp < $2`,
      [deviceId, cutoffDate]
    );

    this.logger.log(`Archived ${deleteResult.rowCount} sensor records for device ${deviceId}`);

    return deleteResult.rowCount || 0;
  }
}

