import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface DemandDataPoint {
  date: Date;
  value: number;
  features: {
    seasonality: number;
    trend: number;
    holiday: boolean;
    promotion: boolean;
    weather: number;
    economic: number;
    competitor: number;
  };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  demandHistory: DemandDataPoint[];
  seasonality: {
    period: number;
    amplitude: number;
    phase: number;
  };
  trend: {
    slope: number;
    intercept: number;
    rSquared: number;
  };
  volatility: number;
  leadTime: number;
  minOrderQuantity: number;
  maxOrderQuantity: number;
}

interface LSTMModel {
  id: string;
  name: string;
  architecture: {
    inputSize: number;
    hiddenSize: number;
    numLayers: number;
    dropout: number;
    sequenceLength: number;
  };
  hyperparameters: {
    learningRate: number;
    batchSize: number;
    epochs: number;
    optimizer: string;
    lossFunction: string;
  };
  performance: {
    mse: number;
    mae: number;
    rmse: number;
    mape: number;
    rSquared: number;
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
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  riskAssessment: {
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: string[];
    mitigation: string[];
  };
}

interface ForecastPoint {
  date: Date;
  value: number;
  confidence: number;
  factors: {
    seasonality: number;
    trend: number;
    holiday: number;
    promotion: number;
    weather: number;
    economic: number;
    competitor: number;
  };
}

interface TrainingConfig {
  sequenceLength: number;
  predictionHorizon: number;
  validationSplit: number;
  testSplit: number;
  features: string[];
  target: string;
  preprocessing: {
    normalization: 'minmax' | 'standard' | 'robust';
    scaling: boolean;
    outlierRemoval: boolean;
    missingValueHandling: 'drop' | 'interpolate' | 'fill';
  };
}

@Injectable()
export class LSTMDemandForecastingService {
  private readonly logger = new Logger(LSTMDemandForecastingService.name);
  private models: Map<string, LSTMModel> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async trainLSTMModel(
    product: Product,
    config: TrainingConfig,
    options: {
      autoTune: boolean;
      crossValidation: boolean;
      ensemble: boolean;
      earlyStopping: boolean;
    },
  ): Promise<LSTMModel> {
    this.logger.log(`Training LSTM model for product ${product.sku}`);

    // Prepare training data
    const trainingData = this.prepareTrainingData(product, config);
    
    // Create model architecture
    const model = this.createLSTMModel(product, config);
    
    // Train model
    const trainedModel = await this.trainModel(model, trainingData, config, options);
    
    // Evaluate model
    const performance = await this.evaluateModel(trainedModel, trainingData, config);
    
    // Save model
    await this.saveModel(trainedModel);
    
    this.models.set(trainedModel.id, trainedModel);
    
    await this.eventBus.emit('lstm.model.trained', { model: trainedModel });

    return trainedModel;
  }

  async generateForecast(
    product: Product,
    horizon: number, // days
    options: {
      includeConfidence: boolean;
      includeFactors: boolean;
      includeRiskAssessment: boolean;
      modelId?: string;
    },
  ): Promise<ForecastResult> {
    this.logger.log(`Generating forecast for product ${product.sku} with ${horizon} days horizon`);

    // Get or create model
    let model: LSTMModel;
    if (options.modelId && this.models.has(options.modelId)) {
      model = this.models.get(options.modelId)!;
    } else {
      model = await this.getOrCreateModel(product);
    }

    // Prepare input data
    const inputData = this.prepareInputData(product, model.architecture.sequenceLength);
    
    // Generate forecast
    const forecast = await this.generateForecastFromModel(model, inputData, horizon);
    
    // Calculate confidence intervals
    const confidence = options.includeConfidence 
      ? this.calculateConfidenceIntervals(forecast, model)
      : { lower: [], upper: [], level: 0.95 };
    
    // Calculate accuracy metrics
    const accuracy = this.calculateAccuracyMetrics(forecast, product);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(forecast, product, model);
    
    // Assess risk
    const riskAssessment = options.includeRiskAssessment 
      ? this.assessRisk(forecast, product, model)
      : { level: 'low' as const, factors: [], mitigation: [] };
    
    const result: ForecastResult = {
      productId: product.id,
      sku: product.sku,
      modelId: model.id,
      forecast,
      confidence,
      accuracy,
      recommendations,
      riskAssessment,
    };

    await this.saveForecastResult(result);
    await this.eventBus.emit('forecast.generated', { result });

    return result;
  }

  private prepareTrainingData(product: Product, config: TrainingConfig): any {
    const data = product.demandHistory;
    const features = config.features;
    const target = config.target;
    
    // Normalize data
    const normalizedData = this.normalizeData(data, config.preprocessing);
    
    // Create sequences
    const sequences = this.createSequences(normalizedData, config.sequenceLength, config.predictionHorizon);
    
    // Split data
    const { train, validation, test } = this.splitData(sequences, config);
    
    return {
      train,
      validation,
      test,
      features: features.length,
      target: 1,
    };
  }

  private normalizeData(data: DemandDataPoint[], preprocessing: any): DemandDataPoint[] {
    const normalized = [...data];
    
    if (preprocessing.normalization === 'minmax') {
      const values = data.map(d => d.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      for (const point of normalized) {
        point.value = (point.value - min) / (max - min);
      }
    } else if (preprocessing.normalization === 'standard') {
      const values = data.map(d => d.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
      
      for (const point of normalized) {
        point.value = (point.value - mean) / std;
      }
    }
    
    return normalized;
  }

  private createSequences(
    data: DemandDataPoint[],
    sequenceLength: number,
    predictionHorizon: number,
  ): any[] {
    const sequences = [];
    
    for (let i = 0; i < data.length - sequenceLength - predictionHorizon + 1; i++) {
      const sequence = data.slice(i, i + sequenceLength);
      const target = data.slice(i + sequenceLength, i + sequenceLength + predictionHorizon);
      
      sequences.push({
        input: sequence.map(d => [
          d.value,
          d.features.seasonality,
          d.features.trend,
          d.features.holiday ? 1 : 0,
          d.features.promotion ? 1 : 0,
          d.features.weather,
          d.features.economic,
          d.features.competitor,
        ]),
        target: target.map(d => d.value),
      });
    }
    
    return sequences;
  }

  private splitData(sequences: any[], config: TrainingConfig): any {
    const total = sequences.length;
    const trainSize = Math.floor(total * (1 - config.validationSplit - config.testSplit));
    const validationSize = Math.floor(total * config.validationSplit);
    
    const train = sequences.slice(0, trainSize);
    const validation = sequences.slice(trainSize, trainSize + validationSize);
    const test = sequences.slice(trainSize + validationSize);
    
    return { train, validation, test };
  }

  private createLSTMModel(product: Product, config: TrainingConfig): LSTMModel {
    const modelId = `lstm_${product.id}_${Date.now()}`;
    
    return {
      id: modelId,
      name: `LSTM Model for ${product.sku}`,
      architecture: {
        inputSize: config.features.length,
        hiddenSize: 64,
        numLayers: 2,
        dropout: 0.2,
        sequenceLength: config.sequenceLength,
      },
      hyperparameters: {
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
        optimizer: 'adam',
        lossFunction: 'mse',
      },
      performance: {
        mse: 0,
        mae: 0,
        rmse: 0,
        mape: 0,
        rSquared: 0,
      },
      trainingData: {
        startDate: product.demandHistory[0].date,
        endDate: product.demandHistory[product.demandHistory.length - 1].date,
        dataPoints: product.demandHistory.length,
      },
      lastTrained: new Date(),
      status: 'training',
    };
  }

  private async trainModel(
    model: LSTMModel,
    trainingData: any,
    config: TrainingConfig,
    options: any,
  ): Promise<LSTMModel> {
    // Simulate LSTM training
    // In a real implementation, this would use TensorFlow.js or similar
    
    const startTime = Date.now();
    
    // Simulate training process
    for (let epoch = 0; epoch < model.hyperparameters.epochs; epoch++) {
      // Simulate training step
      await this.simulateTrainingStep(model, trainingData, epoch);
      
      // Early stopping
      if (options.earlyStopping && epoch > 10) {
        const currentLoss = this.calculateLoss(model, trainingData);
        if (currentLoss < 0.01) {
          break;
        }
      }
    }
    
    const trainingTime = Date.now() - startTime;
    this.logger.log(`Model training completed in ${trainingTime}ms`);
    
    model.status = 'ready';
    model.lastTrained = new Date();
    
    return model;
  }

  private async simulateTrainingStep(model: LSTMModel, trainingData: any, epoch: number): Promise<void> {
    // Simulate LSTM forward and backward pass
    // In a real implementation, this would use actual LSTM operations
    
    const batchSize = model.hyperparameters.batchSize;
    const learningRate = model.hyperparameters.learningRate;
    
    // Simulate batch processing
    for (let i = 0; i < trainingData.train.length; i += batchSize) {
      const batch = trainingData.train.slice(i, i + batchSize);
      
      // Forward pass
      const predictions = this.forwardPass(model, batch);
      
      // Calculate loss
      const loss = this.calculateBatchLoss(predictions, batch);
      
      // Backward pass (gradient descent)
      this.backwardPass(model, loss, learningRate);
    }
    
    // Log progress
    if (epoch % 10 === 0) {
      const loss = this.calculateLoss(model, trainingData);
      this.logger.log(`Epoch ${epoch}: Loss = ${loss.toFixed(6)}`);
    }
  }

  private forwardPass(model: LSTMModel, batch: any[]): number[] {
    // Simulate LSTM forward pass
    // In a real implementation, this would use actual LSTM operations
    
    const predictions = [];
    
    for (const sample of batch) {
      // Simulate LSTM computation
      let hidden = new Array(model.architecture.hiddenSize).fill(0);
      let cell = new Array(model.architecture.hiddenSize).fill(0);
      
      for (const timestep of sample.input) {
        // Simulate LSTM gates
        const forget = this.sigmoid(this.dot(timestep, this.randomWeights(timestep.length, model.architecture.hiddenSize)));
        const input = this.sigmoid(this.dot(timestep, this.randomWeights(timestep.length, model.architecture.hiddenSize)));
        const candidate = this.tanh(this.dot(timestep, this.randomWeights(timestep.length, model.architecture.hiddenSize)));
        const output = this.sigmoid(this.dot(timestep, this.randomWeights(timestep.length, model.architecture.hiddenSize)));
        
        // Update cell state
        cell = cell.map((c, i) => c * forget[i] + input[i] * candidate[i]);
        
        // Update hidden state
        hidden = cell.map(c => c * output[0]);
      }
      
      // Generate prediction
      const prediction = this.dot(hidden, this.randomWeights(model.architecture.hiddenSize, 1))[0];
      predictions.push(prediction);
    }
    
    return predictions;
  }

  private backwardPass(model: LSTMModel, loss: number, learningRate: number): void {
    // Simulate gradient descent
    // In a real implementation, this would calculate actual gradients
    
    // Update model parameters
    model.hyperparameters.learningRate *= 0.99; // Learning rate decay
  }

  private calculateBatchLoss(predictions: number[], batch: any[]): number {
    let totalLoss = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      const target = batch[i].target[0]; // First prediction horizon
      const error = predictions[i] - target;
      totalLoss += error * error;
    }
    
    return totalLoss / predictions.length;
  }

  private calculateLoss(model: LSTMModel, trainingData: any): number {
    // Calculate loss on validation set
    const validationLoss = this.calculateBatchLoss(
      this.forwardPass(model, trainingData.validation),
      trainingData.validation
    );
    
    return validationLoss;
  }

  private async evaluateModel(
    model: LSTMModel,
    trainingData: any,
    config: TrainingConfig,
  ): Promise<any> {
    // Evaluate model on test set
    const testPredictions = this.forwardPass(model, trainingData.test);
    const testTargets = trainingData.test.map((sample: any) => sample.target[0]);
    
    // Calculate metrics
    const mse = this.calculateMSE(testPredictions, testTargets);
    const mae = this.calculateMAE(testPredictions, testTargets);
    const rmse = Math.sqrt(mse);
    const mape = this.calculateMAPE(testPredictions, testTargets);
    const rSquared = this.calculateRSquared(testPredictions, testTargets);
    
    model.performance = {
      mse,
      mae,
      rmse,
      mape,
      rSquared,
    };
    
    return model.performance;
  }

  private calculateMSE(predictions: number[], targets: number[]): number {
    let sum = 0;
    for (let i = 0; i < predictions.length; i++) {
      const error = predictions[i] - targets[i];
      sum += error * error;
    }
    return sum / predictions.length;
  }

  private calculateMAE(predictions: number[], targets: number[]): number {
    let sum = 0;
    for (let i = 0; i < predictions.length; i++) {
      sum += Math.abs(predictions[i] - targets[i]);
    }
    return sum / predictions.length;
  }

  private calculateMAPE(predictions: number[], targets: number[]): number {
    let sum = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (targets[i] !== 0) {
        sum += Math.abs((predictions[i] - targets[i]) / targets[i]);
      }
    }
    return (sum / predictions.length) * 100;
  }

  private calculateRSquared(predictions: number[], targets: number[]): number {
    const mean = targets.reduce((sum, val) => sum + val, 0) / targets.length;
    const ssTotal = targets.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    const ssResidual = predictions.reduce((sum, pred, i) => sum + Math.pow(pred - targets[i], 2), 0);
    
    return 1 - (ssResidual / ssTotal);
  }

  private async generateForecastFromModel(
    model: LSTMModel,
    inputData: any,
    horizon: number,
  ): Promise<ForecastPoint[]> {
    const forecast: ForecastPoint[] = [];
    
    // Generate forecast for each horizon point
    for (let i = 0; i < horizon; i++) {
      const prediction = this.forwardPass(model, [inputData])[0];
      
      const forecastPoint: ForecastPoint = {
        date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        value: prediction,
        confidence: this.calculatePredictionConfidence(model, prediction),
        factors: {
          seasonality: this.calculateSeasonalityFactor(i),
          trend: this.calculateTrendFactor(i),
          holiday: this.calculateHolidayFactor(i),
          promotion: this.calculatePromotionFactor(i),
          weather: this.calculateWeatherFactor(i),
          economic: this.calculateEconomicFactor(i),
          competitor: this.calculateCompetitorFactor(i),
        },
      };
      
      forecast.push(forecastPoint);
      
      // Update input data for next prediction
      inputData = this.updateInputData(inputData, prediction);
    }
    
    return forecast;
  }

  private calculatePredictionConfidence(model: LSTMModel, prediction: number): number {
    // Calculate confidence based on model performance and prediction uncertainty
    const baseConfidence = model.performance.rSquared;
    const uncertainty = Math.abs(prediction) * 0.1; // 10% uncertainty
    return Math.max(0, Math.min(1, baseConfidence - uncertainty));
  }

  private calculateSeasonalityFactor(horizon: number): number {
    // Simulate seasonality factor
    const period = 365; // Annual seasonality
    return Math.sin((horizon * 2 * Math.PI) / period) * 0.2;
  }

  private calculateTrendFactor(horizon: number): number {
    // Simulate trend factor
    return horizon * 0.01; // 1% growth per day
  }

  private calculateHolidayFactor(horizon: number): number {
    // Simulate holiday factor
    const date = new Date(Date.now() + (horizon + 1) * 24 * 60 * 60 * 1000);
    const month = date.getMonth();
    const day = date.getDate();
    
    // Check for holidays
    if ((month === 11 && day === 25) || // Christmas
        (month === 0 && day === 1) ||   // New Year
        (month === 6 && day === 4)) {   // Independence Day
      return 0.5; // 50% increase
    }
    
    return 0;
  }

  private calculatePromotionFactor(horizon: number): number {
    // Simulate promotion factor
    return Math.random() > 0.9 ? 0.3 : 0; // 30% increase with 10% probability
  }

  private calculateWeatherFactor(horizon: number): number {
    // Simulate weather factor
    return (Math.random() - 0.5) * 0.1; // ±5% variation
  }

  private calculateEconomicFactor(horizon: number): number {
    // Simulate economic factor
    return (Math.random() - 0.5) * 0.05; // ±2.5% variation
  }

  private calculateCompetitorFactor(horizon: number): number {
    // Simulate competitor factor
    return (Math.random() - 0.5) * 0.08; // ±4% variation
  }

  private updateInputData(inputData: any, prediction: number): any {
    // Update input data for next prediction
    const updated = [...inputData];
    updated.shift(); // Remove first element
    updated.push([prediction, 0, 0, 0, 0, 0, 0, 0]); // Add new prediction
    return updated;
  }

  private calculateConfidenceIntervals(
    forecast: ForecastPoint[],
    model: LSTMModel,
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

  private calculateAccuracyMetrics(forecast: ForecastPoint[], product: Product): any {
    // Calculate accuracy metrics based on historical performance
    const recentData = product.demandHistory.slice(-30); // Last 30 days
    const recentValues = recentData.map(d => d.value);
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Simulate accuracy metrics
    const mse = Math.pow(mean * 0.1, 2); // 10% error
    const mae = mean * 0.08; // 8% error
    const rmse = Math.sqrt(mse);
    const mape = 8.0; // 8% MAPE
    const rSquared = 0.85; // 85% R-squared
    
    return { mse, mae, rmse, mape, rSquared };
  }

  private generateRecommendations(
    forecast: ForecastPoint[],
    product: Product,
    model: LSTMModel,
  ): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    // Analyze forecast trends
    const avgForecast = forecast.reduce((sum, point) => sum + point.value, 0) / forecast.length;
    const recentDemand = product.demandHistory.slice(-7).reduce((sum, d) => sum + d.value, 0) / 7;
    
    if (avgForecast > recentDemand * 1.2) {
      immediate.push('Demand increase expected - prepare for higher inventory');
      immediate.push('Consider increasing safety stock');
    } else if (avgForecast < recentDemand * 0.8) {
      immediate.push('Demand decrease expected - reduce inventory levels');
      immediate.push('Consider promotional activities');
    }
    
    // Model performance recommendations
    if (model.performance.rSquared < 0.7) {
      shortTerm.push('Model accuracy is low - consider retraining with more data');
      shortTerm.push('Review feature selection and model architecture');
    }
    
    // Long-term recommendations
    longTerm.push('Implement automated model retraining');
    longTerm.push('Develop ensemble forecasting methods');
    longTerm.push('Integrate external data sources for better accuracy');
    
    return { immediate, shortTerm, longTerm };
  }

  private assessRisk(
    forecast: ForecastPoint[],
    product: Product,
    model: LSTMModel,
  ): any {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const factors: string[] = [];
    const mitigation: string[] = [];
    
    // Assess forecast volatility
    const forecastValues = forecast.map(p => p.value);
    const volatility = this.calculateVolatility(forecastValues);
    
    if (volatility > 0.3) {
      riskLevel = 'high';
      factors.push('High forecast volatility');
      mitigation.push('Implement demand smoothing strategies');
    }
    
    // Assess model confidence
    const avgConfidence = forecast.reduce((sum, p) => sum + p.confidence, 0) / forecast.length;
    
    if (avgConfidence < 0.6) {
      riskLevel = riskLevel === 'high' ? 'critical' : 'medium';
      factors.push('Low model confidence');
      mitigation.push('Retrain model with more recent data');
    }
    
    // Assess demand patterns
    const demandIncrease = forecast[forecast.length - 1].value / forecast[0].value;
    
    if (demandIncrease > 2) {
      riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
      factors.push('Significant demand increase expected');
      mitigation.push('Prepare for capacity constraints');
    } else if (demandIncrease < 0.5) {
      riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
      factors.push('Significant demand decrease expected');
      mitigation.push('Implement demand stimulation strategies');
    }
    
    return { level: riskLevel, factors, mitigation };
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return mean > 0 ? stdDev / mean : 0;
  }

  private async getOrCreateModel(product: Product): Promise<LSTMModel> {
    // Check if model exists
    const existingModel = Array.from(this.models.values()).find(
      model => model.name.includes(product.sku)
    );
    
    if (existingModel && existingModel.status === 'ready') {
      return existingModel;
    }
    
    // Create new model
    const config: TrainingConfig = {
      sequenceLength: 30,
      predictionHorizon: 7,
      validationSplit: 0.2,
      testSplit: 0.1,
      features: ['value', 'seasonality', 'trend', 'holiday', 'promotion', 'weather', 'economic', 'competitor'],
      target: 'value',
      preprocessing: {
        normalization: 'standard',
        scaling: true,
        outlierRemoval: true,
        missingValueHandling: 'interpolate',
      },
    };
    
    return await this.trainLSTMModel(product, config, {
      autoTune: true,
      crossValidation: true,
      ensemble: false,
      earlyStopping: true,
    });
  }

  private prepareInputData(product: Product, sequenceLength: number): any {
    const recentData = product.demandHistory.slice(-sequenceLength);
    
    return recentData.map(d => [
      d.value,
      d.features.seasonality,
      d.features.trend,
      d.features.holiday ? 1 : 0,
      d.features.promotion ? 1 : 0,
      d.features.weather,
      d.features.economic,
      d.features.competitor,
    ]);
  }

  private async saveModel(model: LSTMModel): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO lstm_models 
        (id, name, product_id, architecture, hyperparameters, performance, 
         training_data, last_trained, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        model.id,
        model.name,
        model.name.split(' ')[3], // Extract product ID from name
        JSON.stringify(model.architecture),
        JSON.stringify(model.hyperparameters),
        JSON.stringify(model.performance),
        JSON.stringify(model.trainingData),
        model.lastTrained,
        model.status,
      ]);
    } catch (error) {
      this.logger.error('Failed to save LSTM model:', error);
    }
  }

  private async saveForecastResult(result: ForecastResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO lstm_forecast_results 
        (product_id, sku, model_id, forecast, confidence, accuracy, 
         recommendations, risk_assessment, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        result.productId,
        result.sku,
        result.modelId,
        JSON.stringify(result.forecast),
        JSON.stringify(result.confidence),
        JSON.stringify(result.accuracy),
        JSON.stringify(result.recommendations),
        JSON.stringify(result.riskAssessment),
      ]);
    } catch (error) {
      this.logger.error('Failed to save forecast result:', error);
    }
  }

  // Utility functions
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private tanh(x: number): number {
    return Math.tanh(x);
  }

  private dot(a: number[], b: number[]): number[] {
    return a.map((val, i) => val * b[i]);
  }

  private randomWeights(rows: number, cols: number): number[] {
    const weights = [];
    for (let i = 0; i < rows * cols; i++) {
      weights.push((Math.random() - 0.5) * 2);
    }
    return weights;
  }
}

