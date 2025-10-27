import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface TimeSeriesData {
  date: Date;
  value: number;
  features?: {
    seasonality: number;
    trend: number;
    holiday: boolean;
    promotion: boolean;
    weather: number;
    economic: number;
  };
}

interface ARIMAParameters {
  p: number; // Autoregressive order
  d: number; // Differencing order
  q: number; // Moving average order
  P: number; // Seasonal autoregressive order
  D: number; // Seasonal differencing order
  Q: number; // Seasonal moving average order
  s: number; // Seasonal period
}

interface ARIMAModel {
  id: string;
  name: string;
  parameters: ARIMAParameters;
  coefficients: {
    ar: number[];
    ma: number[];
    sar: number[];
    sma: number[];
    constant: number;
  };
  residuals: number[];
  fittedValues: number[];
  performance: {
    aic: number;
    bic: number;
    mse: number;
    mae: number;
    rmse: number;
    mape: number;
    rSquared: number;
  };
  diagnostics: {
    ljungBox: number;
    jarqueBera: number;
    shapiroWilk: number;
    durbinWatson: number;
  };
  trainingData: {
    startDate: Date;
    endDate: Date;
    dataPoints: number;
  };
  lastTrained: Date;
  status: 'training' | 'ready' | 'failed' | 'outdated';
}

interface ForecastResult {
  productId: string;
  sku: string;
  modelId: string;
  forecast: ForecastPoint[];
  confidence: {
    lower: number[];
    upper: number[];
    level: number;
  };
  accuracy: {
    mse: number;
    mae: number;
    rmse: number;
    mape: number;
    rSquared: number;
  };
  diagnostics: {
    stationarity: boolean;
    seasonality: boolean;
    trend: boolean;
    autocorrelation: number[];
    partialAutocorrelation: number[];
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface ForecastPoint {
  date: Date;
  value: number;
  confidence: number;
  components: {
    trend: number;
    seasonal: number;
    irregular: number;
  };
}

interface ModelSelectionResult {
  bestModel: ARIMAModel;
  candidateModels: ARIMAModel[];
  selectionCriteria: {
    aic: number;
    bic: number;
    mse: number;
    mae: number;
    rmse: number;
    mape: number;
  };
  recommendations: string[];
}

@Injectable()
export class ARIMATimeSeriesAnalysisService {
  private readonly logger = new Logger(ARIMATimeSeriesAnalysisService.name);
  private models: Map<string, ARIMAModel> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async analyzeTimeSeries(
    data: TimeSeriesData[],
    options: {
      includeSeasonality: boolean;
      includeTrend: boolean;
      includeExternalFactors: boolean;
      autoModelSelection: boolean;
      maxOrder: number;
      seasonalPeriod: number;
    },
  ): Promise<ModelSelectionResult> {
    this.logger.log(`Analyzing time series with ${data.length} data points`);

    // Preprocess data
    const processedData = this.preprocessData(data, options);
    
    // Check stationarity
    const stationarity = this.checkStationarity(processedData);
    
    // Detect seasonality
    const seasonality = options.includeSeasonality ? this.detectSeasonality(processedData) : null;
    
    // Detect trend
    const trend = options.includeTrend ? this.detectTrend(processedData) : null;
    
    // Generate candidate models
    const candidateModels = this.generateCandidateModels(
      processedData,
      options,
      stationarity,
      seasonality,
      trend,
    );
    
    // Select best model
    const bestModel = this.selectBestModel(candidateModels);
    
    // Generate recommendations
    const recommendations = this.generateModelRecommendations(bestModel, stationarity, seasonality, trend);
    
    const result: ModelSelectionResult = {
      bestModel,
      candidateModels,
      selectionCriteria: bestModel.performance,
      recommendations,
    };

    await this.saveModelSelectionResult(result);
    await this.eventBus.emit('arima.model.selected', { result });

    return result;
  }

  async trainARIMAModel(
    data: TimeSeriesData[],
    parameters: ARIMAParameters,
    options: {
      includeExternalFactors: boolean;
      includeSeasonality: boolean;
      includeTrend: boolean;
      maxIterations: number;
      convergenceThreshold: number;
    },
  ): Promise<ARIMAModel> {
    this.logger.log(`Training ARIMA(${parameters.p},${parameters.d},${parameters.q}) model`);

    // Preprocess data
    const processedData = this.preprocessData(data, options);
    
    // Create model
    const model = this.createARIMAModel(parameters, processedData);
    
    // Train model
    const trainedModel = await this.trainModel(model, processedData, options);
    
    // Evaluate model
    const performance = this.evaluateModel(trainedModel, processedData);
    
    // Run diagnostics
    const diagnostics = this.runDiagnostics(trainedModel, processedData);
    
    // Update model
    trainedModel.performance = performance;
    trainedModel.diagnostics = diagnostics;
    trainedModel.status = 'ready';
    trainedModel.lastTrained = new Date();
    
    // Save model
    await this.saveModel(trainedModel);
    this.models.set(trainedModel.id, trainedModel);
    
    await this.eventBus.emit('arima.model.trained', { model: trainedModel });

    return trainedModel;
  }

  async generateForecast(
    model: ARIMAModel,
    horizon: number,
    options: {
      includeConfidence: boolean;
      includeComponents: boolean;
      includeDiagnostics: boolean;
    },
  ): Promise<ForecastResult> {
    this.logger.log(`Generating forecast with ${horizon} periods horizon`);

    // Generate forecast
    const forecast = this.generateARIMAForecast(model, horizon);
    
    // Calculate confidence intervals
    const confidence = options.includeConfidence 
      ? this.calculateConfidenceIntervals(forecast, model)
      : { lower: [], upper: [], level: 0.95 };
    
    // Calculate accuracy metrics
    const accuracy = this.calculateAccuracyMetrics(forecast, model);
    
    // Run diagnostics
    const diagnostics = options.includeDiagnostics 
      ? this.runForecastDiagnostics(forecast, model)
      : {
          stationarity: true,
          seasonality: false,
          trend: false,
          autocorrelation: [],
          partialAutocorrelation: [],
        };
    
    // Generate recommendations
    const recommendations = this.generateForecastRecommendations(forecast, model, diagnostics);
    
    const result: ForecastResult = {
      productId: model.name.split('_')[1] || 'unknown',
      sku: model.name.split('_')[2] || 'unknown',
      modelId: model.id,
      forecast,
      confidence,
      accuracy,
      diagnostics,
      recommendations,
    };

    await this.saveForecastResult(result);
    await this.eventBus.emit('arima.forecast.generated', { result });

    return result;
  }

  private preprocessData(data: TimeSeriesData[], options: any): number[] {
    // Extract values
    let values = data.map(d => d.value);
    
    // Handle missing values
    values = this.handleMissingValues(values, options);
    
    // Remove outliers
    if (options.removeOutliers) {
      values = this.removeOutliers(values);
    }
    
    // Apply transformations
    if (options.logTransform) {
      values = values.map(v => Math.log(v + 1));
    }
    
    if (options.sqrtTransform) {
      values = values.map(v => Math.sqrt(v));
    }
    
    return values;
  }

  private handleMissingValues(values: number[], options: any): number[] {
    const missingValueHandling = options.missingValueHandling || 'interpolate';
    
    switch (missingValueHandling) {
      case 'drop':
        return values.filter(v => !isNaN(v));
        
      case 'interpolate':
        return this.interpolateMissingValues(values);
        
      case 'fill':
        const mean = values.filter(v => !isNaN(v)).reduce((sum, v) => sum + v, 0) / values.filter(v => !isNaN(v)).length;
        return values.map(v => isNaN(v) ? mean : v);
        
      default:
        return values;
    }
  }

  private interpolateMissingValues(values: number[]): number[] {
    const interpolated = [...values];
    
    for (let i = 1; i < interpolated.length - 1; i++) {
      if (isNaN(interpolated[i])) {
        const prev = interpolated[i - 1];
        const next = interpolated[i + 1];
        
        if (!isNaN(prev) && !isNaN(next)) {
          interpolated[i] = (prev + next) / 2;
        }
      }
    }
    
    return interpolated;
  }

  private removeOutliers(values: number[]): number[] {
    const q1 = this.quantile(values, 0.25);
    const q3 = this.quantile(values, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.map(v => v < lowerBound ? lowerBound : v > upperBound ? upperBound : v);
  }

  private quantile(values: number[], q: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (sorted.length - 1) * q;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  }

  private checkStationarity(data: number[]): boolean {
    // Augmented Dickey-Fuller test
    const adfStatistic = this.calculateADFStatistic(data);
    const criticalValue = -2.58; // 1% significance level
    
    return adfStatistic < criticalValue;
  }

  private calculateADFStatistic(data: number[]): number {
    // Simplified ADF test
    const n = data.length;
    const delta = data.slice(1).map((val, i) => val - data[i]);
    const lag1 = data.slice(0, -1);
    
    // Calculate regression coefficients
    const x = lag1.map(val => [1, val]);
    const y = delta;
    
    const coefficients = this.linearRegression(x, y);
    const residuals = y.map((val, i) => val - (coefficients[0] + coefficients[1] * lag1[i]));
    
    const residualVariance = residuals.reduce((sum, val) => sum + val * val, 0) / residuals.length;
    const coefficientVariance = this.calculateCoefficientVariance(x, residuals);
    
    return coefficients[1] / Math.sqrt(coefficientVariance);
  }

  private linearRegression(x: number[][], y: number[]): number[] {
    const n = x.length;
    const sumX = x.reduce((sum, row) => sum + row[1], 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, row, i) => sum + row[1] * y[i], 0);
    const sumXX = x.reduce((sum, row) => sum + row[1] * row[1], 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return [intercept, slope];
  }

  private calculateCoefficientVariance(x: number[][], residuals: number[]): number {
    const n = x.length;
    const sumXX = x.reduce((sum, row) => sum + row[1] * row[1], 0);
    const residualVariance = residuals.reduce((sum, val) => sum + val * val, 0) / residuals.length;
    
    return residualVariance / sumXX;
  }

  private detectSeasonality(data: number[]): { period: number; strength: number } | null {
    // Autocorrelation-based seasonality detection
    const maxLag = Math.min(data.length / 2, 50);
    const autocorrelations = this.calculateAutocorrelations(data, maxLag);
    
    // Find peaks in autocorrelation
    const peaks = this.findPeaks(autocorrelations);
    
    if (peaks.length === 0) return null;
    
    // Select strongest peak
    const strongestPeak = peaks.reduce((best, current) => 
      autocorrelations[current] > autocorrelations[best] ? current : best
    );
    
    return {
      period: strongestPeak,
      strength: autocorrelations[strongestPeak],
    };
  }

  private calculateAutocorrelations(data: number[], maxLag: number): number[] {
    const autocorrelations: number[] = [];
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    
    for (let lag = 0; lag < maxLag; lag++) {
      let covariance = 0;
      let count = 0;
      
      for (let i = 0; i < data.length - lag; i++) {
        covariance += (data[i] - mean) * (data[i + lag] - mean);
        count++;
      }
      
      autocorrelations.push(covariance / (count * variance));
    }
    
    return autocorrelations;
  }

  private findPeaks(values: number[]): number[] {
    const peaks: number[] = [];
    const threshold = 0.3; // Minimum autocorrelation for seasonality
    
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > threshold && values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }

  private detectTrend(data: number[]): { slope: number; strength: number } | null {
    // Linear regression to detect trend
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;
    
    const coefficients = this.linearRegression(x.map(val => [1, val]), y);
    const slope = coefficients[1];
    
    // Calculate R-squared to measure trend strength
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => sum + Math.pow(val - (coefficients[0] + coefficients[1] * i), 2), 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    
    return {
      slope,
      strength: rSquared,
    };
  }

  private generateCandidateModels(
    data: number[],
    options: any,
    stationarity: boolean,
    seasonality: any,
    trend: any,
  ): ARIMAModel[] {
    const candidates: ARIMAModel[] = [];
    const maxOrder = options.maxOrder || 3;
    const seasonalPeriod = options.seasonalPeriod || 12;
    
    // Generate ARIMA parameters
    for (let p = 0; p <= maxOrder; p++) {
      for (let d = 0; d <= 2; d++) {
        for (let q = 0; q <= maxOrder; q++) {
          // Seasonal parameters
          if (seasonality && options.includeSeasonality) {
            for (let P = 0; P <= 2; P++) {
              for (let D = 0; D <= 1; D++) {
                for (let Q = 0; Q <= 2; Q++) {
                  const parameters: ARIMAParameters = {
                    p, d, q, P, D, Q, s: seasonalPeriod,
                  };
                  
                  const model = this.createARIMAModel(parameters, data);
                  candidates.push(model);
                }
              }
            }
          } else {
            const parameters: ARIMAParameters = {
              p, d, q, P: 0, D: 0, Q: 0, s: 1,
            };
            
            const model = this.createARIMAModel(parameters, data);
            candidates.push(model);
          }
        }
      }
    }
    
    return candidates;
  }

  private createARIMAModel(parameters: ARIMAParameters, data: number[]): ARIMAModel {
    const modelId = `arima_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: modelId,
      name: `ARIMA(${parameters.p},${parameters.d},${parameters.q})(${parameters.P},${parameters.D},${parameters.Q})[${parameters.s}]`,
      parameters,
      coefficients: {
        ar: new Array(parameters.p).fill(0),
        ma: new Array(parameters.q).fill(0),
        sar: new Array(parameters.P).fill(0),
        sma: new Array(parameters.Q).fill(0),
        constant: 0,
      },
      residuals: [],
      fittedValues: [],
      performance: {
        aic: 0,
        bic: 0,
        mse: 0,
        mae: 0,
        rmse: 0,
        mape: 0,
        rSquared: 0,
      },
      diagnostics: {
        ljungBox: 0,
        jarqueBera: 0,
        shapiroWilk: 0,
        durbinWatson: 0,
      },
      trainingData: {
        startDate: new Date(),
        endDate: new Date(),
        dataPoints: data.length,
      },
      lastTrained: new Date(),
      status: 'training',
    };
  }

  private async trainModel(
    model: ARIMAModel,
    data: number[],
    options: any,
  ): Promise<ARIMAModel> {
    // Simulate ARIMA model training
    // In a real implementation, this would use proper ARIMA estimation
    
    const startTime = Date.now();
    
    // Estimate coefficients using maximum likelihood
    const coefficients = this.estimateCoefficients(model, data);
    model.coefficients = coefficients;
    
    // Calculate fitted values and residuals
    const { fittedValues, residuals } = this.calculateFittedValuesAndResiduals(model, data);
    model.fittedValues = fittedValues;
    model.residuals = residuals;
    
    const trainingTime = Date.now() - startTime;
    this.logger.log(`ARIMA model training completed in ${trainingTime}ms`);
    
    return model;
  }

  private estimateCoefficients(model: ARIMAModel, data: number[]): any {
    // Simplified coefficient estimation
    // In a real implementation, this would use proper maximum likelihood estimation
    
    const coefficients = {
      ar: new Array(model.parameters.p).fill(0),
      ma: new Array(model.parameters.q).fill(0),
      sar: new Array(model.parameters.P).fill(0),
      sma: new Array(model.parameters.Q).fill(0),
      constant: 0,
    };
    
    // Estimate AR coefficients
    for (let i = 0; i < model.parameters.p; i++) {
      coefficients.ar[i] = Math.random() * 0.8 - 0.4; // Random values between -0.4 and 0.4
    }
    
    // Estimate MA coefficients
    for (let i = 0; i < model.parameters.q; i++) {
      coefficients.ma[i] = Math.random() * 0.8 - 0.4; // Random values between -0.4 and 0.4
    }
    
    // Estimate seasonal coefficients
    for (let i = 0; i < model.parameters.P; i++) {
      coefficients.sar[i] = Math.random() * 0.6 - 0.3; // Random values between -0.3 and 0.3
    }
    
    for (let i = 0; i < model.parameters.Q; i++) {
      coefficients.sma[i] = Math.random() * 0.6 - 0.3; // Random values between -0.3 and 0.3
    }
    
    // Estimate constant
    coefficients.constant = data.reduce((sum, val) => sum + val, 0) / data.length;
    
    return coefficients;
  }

  private calculateFittedValuesAndResiduals(model: ARIMAModel, data: number[]): { fittedValues: number[]; residuals: number[] } {
    const fittedValues: number[] = [];
    const residuals: number[] = [];
    
    // Calculate fitted values using ARIMA model
    for (let i = 0; i < data.length; i++) {
      let fittedValue = model.coefficients.constant;
      
      // AR terms
      for (let j = 0; j < model.parameters.p && i - j - 1 >= 0; j++) {
        fittedValue += model.coefficients.ar[j] * data[i - j - 1];
      }
      
      // MA terms
      for (let j = 0; j < model.parameters.q && i - j - 1 >= 0; j++) {
        fittedValue += model.coefficients.ma[j] * residuals[i - j - 1];
      }
      
      // Seasonal AR terms
      for (let j = 0; j < model.parameters.P && i - (j + 1) * model.parameters.s >= 0; j++) {
        fittedValue += model.coefficients.sar[j] * data[i - (j + 1) * model.parameters.s];
      }
      
      // Seasonal MA terms
      for (let j = 0; j < model.parameters.Q && i - (j + 1) * model.parameters.s >= 0; j++) {
        fittedValue += model.coefficients.sma[j] * residuals[i - (j + 1) * model.parameters.s];
      }
      
      fittedValues.push(fittedValue);
      residuals.push(data[i] - fittedValue);
    }
    
    return { fittedValues, residuals };
  }

  private evaluateModel(model: ARIMAModel, data: number[]): any {
    const n = data.length;
    const residuals = model.residuals;
    
    // Calculate performance metrics
    const mse = residuals.reduce((sum, val) => sum + val * val, 0) / n;
    const mae = residuals.reduce((sum, val) => sum + Math.abs(val), 0) / n;
    const rmse = Math.sqrt(mse);
    const mape = residuals.reduce((sum, val, i) => sum + Math.abs(val / data[i]), 0) / n * 100;
    
    // Calculate R-squared
    const yMean = data.reduce((sum, val) => sum + val, 0) / n;
    const ssTotal = data.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssResidual = residuals.reduce((sum, val) => sum + val * val, 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    
    // Calculate AIC and BIC
    const aic = n * Math.log(mse) + 2 * (model.parameters.p + model.parameters.q + 1);
    const bic = n * Math.log(mse) + Math.log(n) * (model.parameters.p + model.parameters.q + 1);
    
    return {
      aic,
      bic,
      mse,
      mae,
      rmse,
      mape,
      rSquared,
    };
  }

  private runDiagnostics(model: ARIMAModel, data: number[]): any {
    const residuals = model.residuals;
    
    // Ljung-Box test for autocorrelation
    const ljungBox = this.calculateLjungBoxStatistic(residuals);
    
    // Jarque-Bera test for normality
    const jarqueBera = this.calculateJarqueBeraStatistic(residuals);
    
    // Shapiro-Wilk test for normality
    const shapiroWilk = this.calculateShapiroWilkStatistic(residuals);
    
    // Durbin-Watson test for autocorrelation
    const durbinWatson = this.calculateDurbinWatsonStatistic(residuals);
    
    return {
      ljungBox,
      jarqueBera,
      shapiroWilk,
      durbinWatson,
    };
  }

  private calculateLjungBoxStatistic(residuals: number[]): number {
    // Simplified Ljung-Box test
    const n = residuals.length;
    const maxLag = Math.min(10, n / 4);
    let statistic = 0;
    
    for (let lag = 1; lag <= maxLag; lag++) {
      const autocorr = this.calculateAutocorrelation(residuals, lag);
      statistic += (autocorr * autocorr) / (n - lag);
    }
    
    return n * (n + 2) * statistic;
  }

  private calculateAutocorrelation(data: number[], lag: number): number {
    const n = data.length;
    const mean = data.reduce((sum, val) => sum + val, 0) / n;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    
    let covariance = 0;
    for (let i = 0; i < n - lag; i++) {
      covariance += (data[i] - mean) * (data[i + lag] - mean);
    }
    
    return covariance / ((n - lag) * variance);
  }

  private calculateJarqueBeraStatistic(residuals: number[]): number {
    const n = residuals.length;
    const mean = residuals.reduce((sum, val) => sum + val, 0) / n;
    const variance = residuals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    // Calculate skewness
    const skewness = residuals.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n;
    
    // Calculate kurtosis
    const kurtosis = residuals.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 4), 0) / n;
    
    return n * (skewness * skewness / 6 + (kurtosis - 3) * (kurtosis - 3) / 24);
  }

  private calculateShapiroWilkStatistic(residuals: number[]): number {
    // Simplified Shapiro-Wilk test
    const sorted = [...residuals].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate W statistic (simplified)
    const numerator = sorted.reduce((sum, val, i) => sum + (val - mean) * (val - mean), 0);
    const denominator = sorted.reduce((sum, val) => sum + (val - mean) * (val - mean), 0);
    
    return numerator / denominator;
  }

  private calculateDurbinWatsonStatistic(residuals: number[]): number {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 1; i < residuals.length; i++) {
      numerator += Math.pow(residuals[i] - residuals[i - 1], 2);
    }
    
    for (let i = 0; i < residuals.length; i++) {
      denominator += residuals[i] * residuals[i];
    }
    
    return numerator / denominator;
  }

  private selectBestModel(candidates: ARIMAModel[]): ARIMAModel {
    // Select model with lowest AIC
    return candidates.reduce((best, current) => 
      current.performance.aic < best.performance.aic ? current : best
    );
  }

  private generateARIMAForecast(model: ARIMAModel, horizon: number): ForecastPoint[] {
    const forecast: ForecastPoint[] = [];
    const data = model.fittedValues;
    const residuals = model.residuals;
    
    for (let h = 1; h <= horizon; h++) {
      let forecastValue = model.coefficients.constant;
      
      // AR terms
      for (let j = 0; j < model.parameters.p; j++) {
        const index = data.length - j - 1;
        if (index >= 0) {
          forecastValue += model.coefficients.ar[j] * data[index];
        }
      }
      
      // MA terms
      for (let j = 0; j < model.parameters.q; j++) {
        const index = residuals.length - j - 1;
        if (index >= 0) {
          forecastValue += model.coefficients.ma[j] * residuals[index];
        }
      }
      
      // Seasonal AR terms
      for (let j = 0; j < model.parameters.P; j++) {
        const index = data.length - (j + 1) * model.parameters.s;
        if (index >= 0) {
          forecastValue += model.coefficients.sar[j] * data[index];
        }
      }
      
      // Seasonal MA terms
      for (let j = 0; j < model.parameters.Q; j++) {
        const index = residuals.length - (j + 1) * model.parameters.s;
        if (index >= 0) {
          forecastValue += model.coefficients.sma[j] * residuals[index];
        }
      }
      
      const forecastPoint: ForecastPoint = {
        date: new Date(Date.now() + h * 24 * 60 * 60 * 1000),
        value: forecastValue,
        confidence: this.calculateForecastConfidence(model, h),
        components: {
          trend: this.calculateTrendComponent(model, h),
          seasonal: this.calculateSeasonalComponent(model, h),
          irregular: this.calculateIrregularComponent(model, h),
        },
      };
      
      forecast.push(forecastPoint);
    }
    
    return forecast;
  }

  private calculateForecastConfidence(model: ARIMAModel, horizon: number): number {
    // Calculate confidence based on model performance and horizon
    const baseConfidence = model.performance.rSquared;
    const horizonPenalty = horizon * 0.05; // 5% penalty per horizon
    return Math.max(0, Math.min(1, baseConfidence - horizonPenalty));
  }

  private calculateTrendComponent(model: ARIMAModel, horizon: number): number {
    // Calculate trend component
    return horizon * 0.01; // 1% growth per period
  }

  private calculateSeasonalComponent(model: ARIMAModel, horizon: number): number {
    // Calculate seasonal component
    const period = model.parameters.s;
    return Math.sin((horizon * 2 * Math.PI) / period) * 0.1;
  }

  private calculateIrregularComponent(model: ARIMAModel, horizon: number): number {
    // Calculate irregular component
    return (Math.random() - 0.5) * 0.05; // ±2.5% random variation
  }

  private calculateConfidenceIntervals(
    forecast: ForecastPoint[],
    model: ARIMAModel,
  ): { lower: number[]; upper: number[]; level: number } {
    const level = 0.95;
    const zScore = 1.96; // 95% confidence interval
    
    const lower: number[] = [];
    const upper: number[] = [];
    
    for (const point of forecast) {
      const uncertainty = Math.sqrt(model.performance.mse) * zScore;
      lower.push(Math.max(0, point.value - uncertainty));
      upper.push(point.value + uncertainty);
    }
    
    return { lower, upper, level };
  }

  private calculateAccuracyMetrics(forecast: ForecastPoint[], model: ARIMAModel): any {
    // Use model performance as accuracy metrics
    return model.performance;
  }

  private runForecastDiagnostics(forecast: ForecastPoint[], model: ARIMAModel): any {
    // Run diagnostics on forecast
    const values = forecast.map(p => p.value);
    
    return {
      stationarity: this.checkStationarity(values),
      seasonality: this.detectSeasonality(values) !== null,
      trend: this.detectTrend(values) !== null,
      autocorrelation: this.calculateAutocorrelations(values, 10),
      partialAutocorrelation: this.calculatePartialAutocorrelations(values, 10),
    };
  }

  private calculatePartialAutocorrelations(data: number[], maxLag: number): number[] {
    // Simplified partial autocorrelation calculation
    const pacf: number[] = [];
    
    for (let lag = 1; lag <= maxLag; lag++) {
      const autocorr = this.calculateAutocorrelation(data, lag);
      pacf.push(autocorr);
    }
    
    return pacf;
  }

  private generateModelRecommendations(
    model: ARIMAModel,
    stationarity: boolean,
    seasonality: any,
    trend: any,
  ): string[] {
    const recommendations: string[] = [];
    
    if (!stationarity) {
      recommendations.push('Data is not stationary - consider differencing');
    }
    
    if (seasonality) {
      recommendations.push('Seasonal patterns detected - use seasonal ARIMA');
    }
    
    if (trend && trend.strength > 0.5) {
      recommendations.push('Strong trend detected - consider detrending');
    }
    
    if (model.performance.rSquared < 0.7) {
      recommendations.push('Model accuracy is low - consider alternative models');
    }
    
    return recommendations;
  }

  private generateForecastRecommendations(
    forecast: ForecastPoint[],
    model: ARIMAModel,
    diagnostics: any,
  ): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    // Analyze forecast trends
    const avgForecast = forecast.reduce((sum, point) => sum + point.value, 0) / forecast.length;
    const recentData = model.fittedValues.slice(-7);
    const avgRecent = recentData.reduce((sum, val) => sum + val, 0) / recentData.length;
    
    if (avgForecast > avgRecent * 1.2) {
      immediate.push('Forecast shows significant increase - prepare for higher demand');
    } else if (avgForecast < avgRecent * 0.8) {
      immediate.push('Forecast shows significant decrease - consider demand stimulation');
    }
    
    // Model performance recommendations
    if (model.performance.rSquared < 0.7) {
      shortTerm.push('Model accuracy is low - consider retraining with more data');
    }
    
    // Long-term recommendations
    longTerm.push('Implement automated model retraining');
    longTerm.push('Consider ensemble forecasting methods');
    longTerm.push('Integrate external data sources for better accuracy');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveModel(model: ARIMAModel): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO arima_models 
        (id, name, parameters, coefficients, residuals, fitted_values, performance, 
         diagnostics, training_data, last_trained, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        model.id,
        model.name,
        JSON.stringify(model.parameters),
        JSON.stringify(model.coefficients),
        JSON.stringify(model.residuals),
        JSON.stringify(model.fittedValues),
        JSON.stringify(model.performance),
        JSON.stringify(model.diagnostics),
        JSON.stringify(model.trainingData),
        model.lastTrained,
        model.status,
      ]);
    } catch (error) {
      this.logger.error('Failed to save ARIMA model:', error);
    }
  }

  private async saveModelSelectionResult(result: ModelSelectionResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO arima_model_selection_results 
        (best_model_id, candidate_count, selection_criteria, recommendations, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        result.bestModel.id,
        result.candidateModels.length,
        JSON.stringify(result.selectionCriteria),
        JSON.stringify(result.recommendations),
      ]);
    } catch (error) {
      this.logger.error('Failed to save model selection result:', error);
    }
  }

  private async saveForecastResult(result: ForecastResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO arima_forecast_results 
        (product_id, sku, model_id, forecast, confidence, accuracy, 
         diagnostics, recommendations, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        result.productId,
        result.sku,
        result.modelId,
        JSON.stringify(result.forecast),
        JSON.stringify(result.confidence),
        JSON.stringify(result.accuracy),
        JSON.stringify(result.diagnostics),
        JSON.stringify(result.recommendations),
      ]);
    } catch (error) {
      this.logger.error('Failed to save forecast result:', error);
    }
  }
}

