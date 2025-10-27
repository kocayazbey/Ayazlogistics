import { Injectable, Logger } from '@nestjs/common';

interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  threshold: number;
  type?: 'spike' | 'drop' | 'pattern' | 'statistical';
  details?: string;
}

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);
  private readonly Z_SCORE_THRESHOLD = 3;

  async detectAnomalies(data: DataPoint[]): Promise<Array<{ point: DataPoint; anomaly: AnomalyResult }>> {
    if (data.length < 10) {
      throw new Error('Insufficient data for anomaly detection (minimum 10 points required)');
    }

    const results: Array<{ point: DataPoint; anomaly: AnomalyResult }> = [];
    const values = data.map(d => d.value);
    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values, mean);

    for (const point of data) {
      const zScore = Math.abs((point.value - mean) / stdDev);
      const isAnomaly = zScore > this.Z_SCORE_THRESHOLD;

      let type: AnomalyResult['type'] | undefined;
      if (isAnomaly) {
        if (point.value > mean + stdDev * 2) type = 'spike';
        else if (point.value < mean - stdDev * 2) type = 'drop';
        else type = 'statistical';
      }

      results.push({
        point,
        anomaly: {
          isAnomaly,
          score: zScore,
          threshold: this.Z_SCORE_THRESHOLD,
          type,
          details: isAnomaly ? `Value ${point.value} deviates ${zScore.toFixed(2)} standard deviations from mean ${mean.toFixed(2)}` : undefined,
        },
      });
    }

    const anomalyCount = results.filter(r => r.anomaly.isAnomaly).length;
    this.logger.log(`Detected ${anomalyCount} anomalies out of ${data.length} data points`);

    return results;
  }

  async detectFraud(transaction: any): Promise<{ isFraud: boolean; confidence: number; reasons: string[] }> {
    const reasons: string[] = [];
    let suspicionScore = 0;

    if (transaction.amount > 100000) {
      reasons.push('Unusually high transaction amount');
      suspicionScore += 30;
    }

    if (transaction.timestamp && this.isUnusualTime(new Date(transaction.timestamp))) {
      reasons.push('Transaction at unusual time');
      suspicionScore += 20;
    }

    if (transaction.frequency && transaction.frequency > 10) {
      reasons.push('High frequency of transactions');
      suspicionScore += 25;
    }

    const isFraud = suspicionScore >= 50;
    const confidence = Math.min(suspicionScore / 100, 0.95);

    return { isFraud, confidence, reasons };
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private isUnusualTime(date: Date): boolean {
    const hour = date.getHours();
    return hour < 6 || hour > 22;
  }
}


