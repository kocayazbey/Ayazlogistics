import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface ForecastModel {
  id: string;
  name: string;
  type: 'lstm' | 'arima' | 'exponential_smoothing' | 'linear_regression' | 'random_forest' | 'xgboost';
  parameters: any;
  performance: {
    mse: number;
    mae: number;
    rmse: number;
    mape: number;
    rSquared: number;
  };
  weight: number;
  lastTrained: Date;
  status: 'ready' | 'training' | 'failed' | 'outdated';
}

interface EnsembleMethod {
  type: 'simple_average' | 'weighted_average' | 'stacking' | 'blending' | 'bagging' | 'boosting';
  parameters: {
    weights?: number[];
    metaLearner?: string;
    baggingRatio?: number;
    boostingIterations?: number;
    stackingLevels?: number;
  };
  performance: {
    mse: number;
    mae: number;
    rmse: number;
    mape: number;
    rSquared: number;
  };
}

interface EnsembleForecast {
  productId: string;
  sku: string;
  ensembleId: string;
  forecast: EnsembleForecastPoint[];
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
  modelContributions: ModelContribution[];
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

interface EnsembleForecastPoint {
  date: Date;
  value: number;
  confidence: number;
  modelPredictions: {
    [modelId: string]: number;
  };
  uncertainty: number;
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

interface ModelContribution {
  modelId: string;
  modelName: string;
  weight: number;
  contribution: number;
  accuracy: number;
  reliability: number;
}

interface EnsembleResult {
  ensembleId: string;
  method: EnsembleMethod;
  models: ForecastModel[];
  performance: {
    mse: number;
    mae: number;
    rmse: number;
    mape: number;
    rSquared: number;
  };
  diversity: {
    average: number;
    minimum: number;
    maximum: number;
  };
  stability: {
    variance: number;
    coefficient: number;
  };
  recommendations: string[];
}

@Injectable()
export class EnsembleForecastingMethodsService {
  private readonly logger = new Logger(EnsembleForecastingMethodsService.name);
  private ensembles: Map<string, EnsembleResult> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createEnsemble(
    models: ForecastModel[],
    method: EnsembleMethod,
    options: {
      includeDiversity: boolean;
      includeStability: boolean;
      includeRobustness: boolean;
      maxModels: number;
      minAccuracy: number;
    },
  ): Promise<EnsembleResult> {
    this.logger.log(`Creating ensemble with ${models.length} models using ${method.type} method`);

    // Filter models based on criteria
    const eligibleModels = this.filterEligibleModels(models, options);
    
    if (eligibleModels.length < 2) {
      throw new Error('At least 2 models are required for ensemble');
    }
    
    // Select best models
    const selectedModels = this.selectBestModels(eligibleModels, options.maxModels);
    
    // Calculate ensemble weights
    const weights = this.calculateEnsembleWeights(selectedModels, method);
    
    // Create ensemble
    const ensemble = this.createEnsembleResult(selectedModels, method, weights);
    
    // Calculate ensemble performance
    const performance = this.calculateEnsemblePerformance(ensemble);
    
    // Calculate diversity and stability
    const diversity = this.calculateDiversity(selectedModels);
    const stability = this.calculateStability(selectedModels);
    
    // Generate recommendations
    const recommendations = this.generateEnsembleRecommendations(ensemble, performance, diversity, stability);
    
    // Update ensemble
    ensemble.performance = performance;
    ensemble.diversity = diversity;
    ensemble.stability = stability;
    ensemble.recommendations = recommendations;
    
    // Save ensemble
    await this.saveEnsemble(ensemble);
    this.ensembles.set(ensemble.ensembleId, ensemble);
    
    await this.eventBus.emit('ensemble.created', { ensemble });

    return ensemble;
  }

  async generateEnsembleForecast(
    ensemble: EnsembleResult,
    data: any[],
    horizon: number,
    options: {
      includeConfidence: boolean;
      includeModelContributions: boolean;
      includeRiskAssessment: boolean;
      includeFactors: boolean;
    },
  ): Promise<EnsembleForecast> {
    this.logger.log(`Generating ensemble forecast with ${horizon} periods horizon`);

    // Generate individual model forecasts
    const modelForecasts = await this.generateIndividualForecasts(ensemble.models, data, horizon);
    
    // Combine forecasts using ensemble method
    const ensembleForecast = this.combineForecasts(modelForecasts, ensemble.method, ensemble.models);
    
    // Calculate confidence intervals
    const confidence = options.includeConfidence 
      ? this.calculateEnsembleConfidence(ensembleForecast, ensemble)
      : { lower: [], upper: [], level: 0.95 };
    
    // Calculate accuracy metrics
    const accuracy = this.calculateEnsembleAccuracy(ensembleForecast, ensemble);
    
    // Calculate model contributions
    const modelContributions = options.includeModelContributions 
      ? this.calculateModelContributions(ensembleForecast, ensemble.models)
      : [];
    
    // Generate recommendations
    const recommendations = this.generateForecastRecommendations(ensembleForecast, ensemble);
    
    // Assess risk
    const riskAssessment = options.includeRiskAssessment 
      ? this.assessEnsembleRisk(ensembleForecast, ensemble)
      : { level: 'low' as const, factors: [], mitigation: [] };
    
    const result: EnsembleForecast = {
      productId: ensemble.ensembleId.split('_')[1] || 'unknown',
      sku: ensemble.ensembleId.split('_')[2] || 'unknown',
      ensembleId: ensemble.ensembleId,
      forecast: ensembleForecast,
      confidence,
      accuracy,
      modelContributions,
      recommendations,
      riskAssessment,
    };

    await this.saveEnsembleForecast(result);
    await this.eventBus.emit('ensemble.forecast.generated', { result });

    return result;
  }

  private filterEligibleModels(models: ForecastModel[], options: any): ForecastModel[] {
    return models.filter(model => {
      // Check status
      if (model.status !== 'ready') return false;
      
      // Check accuracy
      if (model.performance.rSquared < options.minAccuracy) return false;
      
      // Check training recency
      const daysSinceTraining = (Date.now() - model.lastTrained.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceTraining > 30) return false;
      
      return true;
    });
  }

  private selectBestModels(models: ForecastModel[], maxModels: number): ForecastModel[] {
    // Sort by performance (R-squared)
    const sortedModels = models.sort((a, b) => b.performance.rSquared - a.performance.rSquared);
    
    // Select top models
    return sortedModels.slice(0, maxModels);
  }

  private calculateEnsembleWeights(models: ForecastModel[], method: EnsembleMethod): number[] {
    const weights: number[] = [];
    
    switch (method.type) {
      case 'simple_average':
        // Equal weights
        for (let i = 0; i < models.length; i++) {
          weights.push(1 / models.length);
        }
        break;
        
      case 'weighted_average':
        // Weight by performance
        const totalPerformance = models.reduce((sum, model) => sum + model.performance.rSquared, 0);
        for (const model of models) {
          weights.push(model.performance.rSquared / totalPerformance);
        }
        break;
        
      case 'stacking':
        // Weight by meta-learner performance
        for (let i = 0; i < models.length; i++) {
          weights.push(1 / models.length); // Simplified
        }
        break;
        
      case 'blending':
        // Weight by validation performance
        for (const model of models) {
          weights.push(model.weight);
        }
        break;
        
      case 'bagging':
        // Weight by bagging ratio
        const baggingRatio = method.parameters.baggingRatio || 0.8;
        for (let i = 0; i < models.length; i++) {
          weights.push(baggingRatio / models.length);
        }
        break;
        
      case 'boosting':
        // Weight by boosting iterations
        const boostingIterations = method.parameters.boostingIterations || 10;
        for (let i = 0; i < models.length; i++) {
          weights.push(1 / boostingIterations);
        }
        break;
        
      default:
        // Default to equal weights
        for (let i = 0; i < models.length; i++) {
          weights.push(1 / models.length);
        }
    }
    
    return weights;
  }

  private createEnsembleResult(
    models: ForecastModel[],
    method: EnsembleMethod,
    weights: number[],
  ): EnsembleResult {
    const ensembleId = `ensemble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      ensembleId,
      method,
      models,
      performance: {
        mse: 0,
        mae: 0,
        rmse: 0,
        mape: 0,
        rSquared: 0,
      },
      diversity: {
        average: 0,
        minimum: 0,
        maximum: 0,
      },
      stability: {
        variance: 0,
        coefficient: 0,
      },
      recommendations: [],
    };
  }

  private calculateEnsemblePerformance(ensemble: EnsembleResult): any {
    // Calculate weighted average performance
    const totalWeight = ensemble.models.reduce((sum, model) => sum + model.weight, 0);
    
    const mse = ensemble.models.reduce((sum, model) => 
      sum + model.performance.mse * model.weight, 0) / totalWeight;
    
    const mae = ensemble.models.reduce((sum, model) => 
      sum + model.performance.mae * model.weight, 0) / totalWeight;
    
    const rmse = ensemble.models.reduce((sum, model) => 
      sum + model.performance.rmse * model.weight, 0) / totalWeight;
    
    const mape = ensemble.models.reduce((sum, model) => 
      sum + model.performance.mape * model.weight, 0) / totalWeight;
    
    const rSquared = ensemble.models.reduce((sum, model) => 
      sum + model.performance.rSquared * model.weight, 0) / totalWeight;
    
    return { mse, mae, rmse, mape, rSquared };
  }

  private calculateDiversity(models: ForecastModel[]): any {
    // Calculate diversity between models
    const diversities: number[] = [];
    
    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const diversity = this.calculateModelDiversity(models[i], models[j]);
        diversities.push(diversity);
      }
    }
    
    return {
      average: diversities.reduce((sum, d) => sum + d, 0) / diversities.length,
      minimum: Math.min(...diversities),
      maximum: Math.max(...diversities),
    };
  }

  private calculateModelDiversity(model1: ForecastModel, model2: ForecastModel): number {
    // Calculate diversity based on performance differences
    const performanceDiff = Math.abs(model1.performance.rSquared - model2.performance.rSquared);
    const typeDiff = model1.type === model2.type ? 0 : 1;
    
    return (performanceDiff + typeDiff) / 2;
  }

  private calculateStability(models: ForecastModel[]): any {
    // Calculate stability based on performance variance
    const performances = models.map(model => model.performance.rSquared);
    const mean = performances.reduce((sum, p) => sum + p, 0) / performances.length;
    const variance = performances.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / performances.length;
    const coefficient = Math.sqrt(variance) / mean;
    
    return {
      variance,
      coefficient,
    };
  }

  private generateEnsembleRecommendations(
    ensemble: EnsembleResult,
    performance: any,
    diversity: any,
    stability: any,
  ): string[] {
    const recommendations: string[] = [];
    
    if (performance.rSquared < 0.7) {
      recommendations.push('Ensemble accuracy is low - consider adding more models');
    }
    
    if (diversity.average < 0.3) {
      recommendations.push('Low model diversity - consider adding different model types');
    }
    
    if (stability.coefficient > 0.2) {
      recommendations.push('High performance variance - consider model selection');
    }
    
    if (ensemble.models.length < 3) {
      recommendations.push('Consider adding more models for better ensemble performance');
    }
    
    return recommendations;
  }

  private async generateIndividualForecasts(
    models: ForecastModel[],
    data: any[],
    horizon: number,
  ): Promise<{ [modelId: string]: number[] }> {
    const forecasts: { [modelId: string]: number[] } = {};
    
    for (const model of models) {
      try {
        const forecast = await this.generateModelForecast(model, data, horizon);
        forecasts[model.id] = forecast;
      } catch (error) {
        this.logger.error(`Failed to generate forecast for model ${model.id}:`, error);
        // Use default forecast
        forecasts[model.id] = new Array(horizon).fill(0);
      }
    }
    
    return forecasts;
  }

  private async generateModelForecast(model: ForecastModel, data: any[], horizon: number): Promise<number[]> {
    // Simulate model forecast generation
    // In a real implementation, this would call the actual model
    
    const forecast: number[] = [];
    const baseValue = data[data.length - 1] || 0;
    
    for (let i = 0; i < horizon; i++) {
      // Simulate forecast with some randomness
      const trend = Math.sin(i * 0.1) * 0.1; // Seasonal component
      const noise = (Math.random() - 0.5) * 0.2; // Random noise
      const forecastValue = baseValue * (1 + trend + noise);
      
      forecast.push(Math.max(0, forecastValue));
    }
    
    return forecast;
  }

  private combineForecasts(
    modelForecasts: { [modelId: string]: number[] },
    method: EnsembleMethod,
    models: ForecastModel[],
  ): EnsembleForecastPoint[] {
    const horizon = modelForecasts[Object.keys(modelForecasts)[0]].length;
    const ensembleForecast: EnsembleForecastPoint[] = [];
    
    for (let i = 0; i < horizon; i++) {
      let combinedValue = 0;
      const modelPredictions: { [modelId: string]: number } = {};
      
      // Calculate weighted average
      for (const model of models) {
        const prediction = modelForecasts[model.id][i];
        const weight = this.getModelWeight(model, method);
        
        combinedValue += prediction * weight;
        modelPredictions[model.id] = prediction;
      }
      
      // Calculate uncertainty
      const uncertainty = this.calculateUncertainty(modelPredictions, models);
      
      // Calculate factors
      const factors = this.calculateFactors(i, horizon);
      
      const forecastPoint: EnsembleForecastPoint = {
        date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        value: combinedValue,
        confidence: this.calculateConfidence(combinedValue, uncertainty),
        modelPredictions,
        uncertainty,
        factors,
      };
      
      ensembleForecast.push(forecastPoint);
    }
    
    return ensembleForecast;
  }

  private getModelWeight(model: ForecastModel, method: EnsembleMethod): number {
    switch (method.type) {
      case 'simple_average':
        return 1 / method.parameters.weights.length;
        
      case 'weighted_average':
        return model.weight;
        
      case 'stacking':
        return 1 / method.parameters.weights.length; // Simplified
        
      case 'blending':
        return model.weight;
        
      case 'bagging':
        return method.parameters.baggingRatio / method.parameters.weights.length;
        
      case 'boosting':
        return 1 / method.parameters.boostingIterations;
        
      default:
        return 1 / method.parameters.weights.length;
    }
  }

  private calculateUncertainty(
    modelPredictions: { [modelId: string]: number },
    models: ForecastModel[],
  ): number {
    const predictions = Object.values(modelPredictions);
    const mean = predictions.reduce((sum, pred) => sum + pred, 0) / predictions.length;
    const variance = predictions.reduce((sum, pred) => sum + Math.pow(pred - mean, 2), 0) / predictions.length;
    
    return Math.sqrt(variance);
  }

  private calculateFactors(period: number, horizon: number): any {
    return {
      seasonality: Math.sin((period * 2 * Math.PI) / 365) * 0.1,
      trend: period * 0.01,
      holiday: Math.random() > 0.9 ? 0.2 : 0,
      promotion: Math.random() > 0.95 ? 0.3 : 0,
      weather: (Math.random() - 0.5) * 0.1,
      economic: (Math.random() - 0.5) * 0.05,
      competitor: (Math.random() - 0.5) * 0.08,
    };
  }

  private calculateConfidence(value: number, uncertainty: number): number {
    // Calculate confidence based on value and uncertainty
    const baseConfidence = 0.8;
    const uncertaintyPenalty = uncertainty / value;
    return Math.max(0, Math.min(1, baseConfidence - uncertaintyPenalty));
  }

  private calculateEnsembleConfidence(
    forecast: EnsembleForecastPoint[],
    ensemble: EnsembleResult,
  ): { lower: number[]; upper: number[]; level: number } {
    const level = 0.95;
    const zScore = 1.96;
    
    const lower: number[] = [];
    const upper: number[] = [];
    
    for (const point of forecast) {
      const uncertainty = point.uncertainty;
      const margin = uncertainty * zScore;
      
      lower.push(Math.max(0, point.value - margin));
      upper.push(point.value + margin);
    }
    
    return { lower, upper, level };
  }

  private calculateEnsembleAccuracy(
    forecast: EnsembleForecastPoint[],
    ensemble: EnsembleResult,
  ): any {
    // Use ensemble performance as accuracy metrics
    return ensemble.performance;
  }

  private calculateModelContributions(
    forecast: EnsembleForecastPoint[],
    models: ForecastModel[],
  ): ModelContribution[] {
    const contributions: ModelContribution[] = [];
    
    for (const model of models) {
      const contribution = this.calculateModelContribution(forecast, model);
      contributions.push(contribution);
    }
    
    return contributions;
  }

  private calculateModelContribution(
    forecast: EnsembleForecastPoint[],
    model: ForecastModel,
  ): ModelContribution {
    // Calculate model contribution to ensemble
    const totalWeight = forecast.reduce((sum, point) => sum + point.value, 0);
    const modelWeight = forecast.reduce((sum, point) => sum + point.modelPredictions[model.id], 0);
    
    return {
      modelId: model.id,
      modelName: model.name,
      weight: model.weight,
      contribution: modelWeight / totalWeight,
      accuracy: model.performance.rSquared,
      reliability: model.performance.rSquared,
    };
  }

  private generateForecastRecommendations(
    forecast: EnsembleForecastPoint[],
    ensemble: EnsembleResult,
  ): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    // Analyze forecast trends
    const avgForecast = forecast.reduce((sum, point) => sum + point.value, 0) / forecast.length;
    const avgUncertainty = forecast.reduce((sum, point) => sum + point.uncertainty, 0) / forecast.length;
    
    if (avgUncertainty > avgForecast * 0.2) {
      immediate.push('High forecast uncertainty - consider additional data sources');
    }
    
    if (ensemble.performance.rSquared < 0.7) {
      shortTerm.push('Ensemble accuracy is low - consider model retraining');
    }
    
    longTerm.push('Implement automated ensemble retraining');
    longTerm.push('Consider dynamic ensemble weighting');
    longTerm.push('Integrate real-time model performance monitoring');
    
    return { immediate, shortTerm, longTerm };
  }

  private assessEnsembleRisk(
    forecast: EnsembleForecastPoint[],
    ensemble: EnsembleResult,
  ): any {
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const factors: string[] = [];
    const mitigation: string[] = [];
    
    // Assess forecast uncertainty
    const avgUncertainty = forecast.reduce((sum, point) => sum + point.uncertainty, 0) / forecast.length;
    const avgValue = forecast.reduce((sum, point) => sum + point.value, 0) / forecast.length;
    
    if (avgUncertainty > avgValue * 0.3) {
      riskLevel = 'high';
      factors.push('High forecast uncertainty');
      mitigation.push('Implement uncertainty reduction strategies');
    }
    
    // Assess ensemble stability
    if (ensemble.stability.coefficient > 0.3) {
      riskLevel = riskLevel === 'high' ? 'critical' : 'medium';
      factors.push('High ensemble instability');
      mitigation.push('Stabilize ensemble with more consistent models');
    }
    
    // Assess model diversity
    if (ensemble.diversity.average < 0.2) {
      riskLevel = riskLevel === 'critical' ? 'critical' : 'medium';
      factors.push('Low model diversity');
      mitigation.push('Add diverse model types to ensemble');
    }
    
    return { level: riskLevel, factors, mitigation };
  }

  private async saveEnsemble(ensemble: EnsembleResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO ensemble_models 
        (ensemble_id, method_type, method_parameters, models, performance, 
         diversity, stability, recommendations, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        ensemble.ensembleId,
        ensemble.method.type,
        JSON.stringify(ensemble.method.parameters),
        JSON.stringify(ensemble.models.map(m => m.id)),
        JSON.stringify(ensemble.performance),
        JSON.stringify(ensemble.diversity),
        JSON.stringify(ensemble.stability),
        JSON.stringify(ensemble.recommendations),
      ]);
    } catch (error) {
      this.logger.error('Failed to save ensemble:', error);
    }
  }

  private async saveEnsembleForecast(result: EnsembleForecast): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO ensemble_forecast_results 
        (product_id, sku, ensemble_id, forecast, confidence, accuracy, 
         model_contributions, recommendations, risk_assessment, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        result.productId,
        result.sku,
        result.ensembleId,
        JSON.stringify(result.forecast),
        JSON.stringify(result.confidence),
        JSON.stringify(result.accuracy),
        JSON.stringify(result.modelContributions),
        JSON.stringify(result.recommendations),
        JSON.stringify(result.riskAssessment),
      ]);
    } catch (error) {
      this.logger.error('Failed to save ensemble forecast:', error);
    }
  }
}

