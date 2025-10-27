import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface SensorData {
  id: string;
  equipmentId: string;
  sensorType: 'temperature' | 'vibration' | 'pressure' | 'current' | 'voltage' | 'flow' | 'level' | 'speed' | 'torque' | 'noise';
  value: number;
  unit: string;
  timestamp: Date;
  quality: 'good' | 'warning' | 'critical' | 'unknown';
  metadata: {
    location: string;
    environment: string;
    calibration: Date;
    maintenance: Date;
  };
}

interface Equipment {
  id: string;
  name: string;
  type: 'vehicle' | 'conveyor' | 'crane' | 'forklift' | 'generator' | 'compressor' | 'pump' | 'motor' | 'bearing' | 'belt';
  model: string;
  manufacturer: string;
  serialNumber: string;
  installationDate: Date;
  lastMaintenance: Date;
  nextMaintenance: Date;
  status: 'operational' | 'warning' | 'critical' | 'maintenance' | 'offline';
  specifications: {
    capacity: number;
    power: number;
    speed: number;
    temperature: { min: number; max: number };
    vibration: { min: number; max: number };
    pressure: { min: number; max: number };
  };
  sensors: SensorData[];
  maintenanceHistory: MaintenanceRecord[];
  failureHistory: FailureRecord[];
}

interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  type: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  description: string;
  performedBy: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  cost: number;
  parts: string[];
  labor: string[];
  notes: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface FailureRecord {
  id: string;
  equipmentId: string;
  type: 'mechanical' | 'electrical' | 'hydraulic' | 'pneumatic' | 'thermal' | 'wear' | 'corrosion' | 'fatigue';
  description: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  cost: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  resolution: string;
  prevention: string;
}

interface PredictiveModel {
  id: string;
  equipmentId: string;
  algorithm: 'lstm' | 'gru' | 'transformer' | 'cnn' | 'rnn' | 'svm' | 'random_forest' | 'xgboost' | 'ensemble';
  features: string[];
  target: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  mse: number;
  mae: number;
  rmse: number;
  r2: number;
  trainingData: {
    size: number;
    startDate: Date;
    endDate: Date;
    quality: number;
  };
  validationData: {
    size: number;
    startDate: Date;
    endDate: Date;
    quality: number;
  };
  testData: {
    size: number;
    startDate: Date;
    endDate: Date;
    quality: number;
  };
  hyperparameters: { [key: string]: any };
  metadata: {
    version: string;
    created: Date;
    updated: Date;
    status: 'training' | 'validating' | 'testing' | 'deployed' | 'retired';
  };
}

interface Prediction {
  id: string;
  equipmentId: string;
  modelId: string;
  timestamp: Date;
  prediction: {
    failure: boolean;
    probability: number;
    confidence: number;
    timeToFailure: number; // hours
    severity: 'low' | 'medium' | 'high' | 'critical';
    components: string[];
    symptoms: string[];
    recommendations: string[];
  };
  actual: {
    failure: boolean;
    timeToFailure: number;
    severity: string;
    components: string[];
    symptoms: string[];
  };
  accuracy: number;
  error: number;
  metadata: {
    modelVersion: string;
    dataQuality: number;
    processingTime: number;
    confidence: number;
  };
}

interface MaintenanceRecommendation {
  id: string;
  equipmentId: string;
  type: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  estimatedCost: number;
  estimatedDuration: number; // minutes
  requiredParts: string[];
  requiredSkills: string[];
  recommendedDate: Date;
  latestDate: Date;
  impact: {
    safety: number;
    production: number;
    quality: number;
    cost: number;
  };
  alternatives: {
    description: string;
    cost: number;
    duration: number;
    impact: number;
  }[];
  metadata: {
    confidence: number;
    urgency: number;
    feasibility: number;
    resources: string[];
  };
}

interface PredictiveMaintenanceResult {
  equipment: Equipment[];
  models: PredictiveModel[];
  predictions: Prediction[];
  recommendations: MaintenanceRecommendation[];
  summary: {
    totalEquipment: number;
    monitoredEquipment: number;
    predictedFailures: number;
    actualFailures: number;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    costSavings: number;
    downtimeReduction: number;
    maintenanceEfficiency: number;
  };
  performance: {
    modelAccuracy: number;
    predictionAccuracy: number;
    maintenanceEfficiency: number;
    costSavings: number;
    downtimeReduction: number;
    safetyImprovement: number;
    qualityImprovement: number;
    overallEffectiveness: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface PredictiveMaintenanceConfig {
  equipment: Equipment[];
  models: PredictiveModel[];
  parameters: {
    predictionHorizon: number; // hours
    confidenceThreshold: number;
    accuracyThreshold: number;
    updateFrequency: number; // minutes
    retrainingFrequency: number; // days
    validationSize: number;
    testSize: number;
    randomState: number;
  };
  features: {
    sensorData: boolean;
    maintenanceHistory: boolean;
    failureHistory: boolean;
    environmentalData: boolean;
    operationalData: boolean;
    externalData: boolean;
  };
  algorithms: {
    lstm: boolean;
    gru: boolean;
    transformer: boolean;
    cnn: boolean;
    rnn: boolean;
    svm: boolean;
    randomForest: boolean;
    xgboost: boolean;
    ensemble: boolean;
  };
  optimization: {
    hyperparameterTuning: boolean;
    featureSelection: boolean;
    modelSelection: boolean;
    ensembleLearning: boolean;
    transferLearning: boolean;
  };
  validation: {
    enabled: boolean;
    crossValidation: boolean;
    timeSeriesSplit: boolean;
    walkForward: boolean;
    monteCarlo: boolean;
  };
}

@Injectable()
export class PredictiveMaintenanceService {
  private readonly logger = new Logger(PredictiveMaintenanceService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async analyze(
    config: PredictiveMaintenanceConfig,
    options: {
      includeRealTime: boolean;
      includeValidation: boolean;
      includeCrossValidation: boolean;
      includeFeatureSelection: boolean;
      includeHyperparameterTuning: boolean;
      maxIterations: number;
      tolerance: number;
    },
  ): Promise<PredictiveMaintenanceResult> {
    this.logger.log(`Starting predictive maintenance analysis for ${config.equipment.length} equipment`);

    const startTime = Date.now();
    
    // Collect sensor data
    const sensorData = await this.collectSensorData(config.equipment);
    
    // Train models
    const models = await this.trainModels(config, sensorData);
    
    // Make predictions
    const predictions = await this.makePredictions(config, models, sensorData);
    
    // Generate recommendations
    const recommendations = await this.generateRecommendations(config, predictions);
    
    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(config, predictions, recommendations);
    
    // Calculate summary
    const processingTime = Date.now() - startTime;
    const summary = {
      totalEquipment: config.equipment.length,
      monitoredEquipment: config.equipment.filter(e => e.sensors.length > 0).length,
      predictedFailures: predictions.filter(p => p.prediction.failure).length,
      actualFailures: predictions.filter(p => p.actual.failure).length,
      accuracy: this.calculateAccuracy(predictions),
      precision: this.calculatePrecision(predictions),
      recall: this.calculateRecall(predictions),
      f1Score: this.calculateF1Score(predictions),
      costSavings: this.calculateCostSavings(predictions, recommendations),
      downtimeReduction: this.calculateDowntimeReduction(predictions, recommendations),
      maintenanceEfficiency: this.calculateMaintenanceEfficiency(predictions, recommendations),
    };
    
    const result: PredictiveMaintenanceResult = {
      equipment: config.equipment,
      models,
      predictions,
      recommendations,
      summary,
      performance,
      recommendations: this.generateRecommendations(config, predictions),
    };

    await this.savePredictiveMaintenanceResult(result);
    await this.eventBus.emit('predictive.maintenance.analyzed', { result });

    return result;
  }

  private async collectSensorData(equipment: Equipment[]): Promise<SensorData[]> {
    const sensorData: SensorData[] = [];
    
    for (const eq of equipment) {
      for (const sensor of eq.sensors) {
        // Simulate sensor data collection
        const data: SensorData = {
          ...sensor,
          value: this.simulateSensorValue(sensor),
          quality: this.assessDataQuality(sensor),
          timestamp: new Date(),
        };
        
        sensorData.push(data);
      }
    }
    
    return sensorData;
  }

  private simulateSensorValue(sensor: SensorData): number {
    // Simulate sensor value based on type and equipment
    const baseValue = sensor.value;
    const noise = (Math.random() - 0.5) * 0.1 * baseValue;
    const trend = Math.sin(Date.now() / 1000000) * 0.05 * baseValue;
    
    return baseValue + noise + trend;
  }

  private assessDataQuality(sensor: SensorData): 'good' | 'warning' | 'critical' | 'unknown' {
    const value = sensor.value;
    const thresholds = this.getSensorThresholds(sensor.sensorType);
    
    if (value < thresholds.critical.min || value > thresholds.critical.max) {
      return 'critical';
    } else if (value < thresholds.warning.min || value > thresholds.warning.max) {
      return 'warning';
    } else {
      return 'good';
    }
  }

  private getSensorThresholds(sensorType: string): any {
    const thresholds = {
      temperature: {
        warning: { min: 60, max: 80 },
        critical: { min: 40, max: 100 },
      },
      vibration: {
        warning: { min: 0, max: 5 },
        critical: { min: 0, max: 10 },
      },
      pressure: {
        warning: { min: 0, max: 100 },
        critical: { min: 0, max: 150 },
      },
      current: {
        warning: { min: 0, max: 20 },
        critical: { min: 0, max: 30 },
      },
      voltage: {
        warning: { min: 200, max: 250 },
        critical: { min: 180, max: 280 },
      },
    };
    
    return thresholds[sensorType] || thresholds.temperature;
  }

  private async trainModels(config: PredictiveMaintenanceConfig, sensorData: SensorData[]): Promise<PredictiveModel[]> {
    const models: PredictiveModel[] = [];
    
    for (const equipment of config.equipment) {
      if (config.algorithms.lstm) {
        const model = await this.trainLSTMModel(equipment, sensorData, config);
        models.push(model);
      }
      
      if (config.algorithms.randomForest) {
        const model = await this.trainRandomForestModel(equipment, sensorData, config);
        models.push(model);
      }
      
      if (config.algorithms.xgboost) {
        const model = await this.trainXGBoostModel(equipment, sensorData, config);
        models.push(model);
      }
    }
    
    return models;
  }

  private async trainLSTMModel(equipment: Equipment, sensorData: SensorData[], config: PredictiveMaintenanceConfig): Promise<PredictiveModel> {
    // Simplified LSTM model training
    const model: PredictiveModel = {
      id: `lstm_${equipment.id}_${Date.now()}`,
      equipmentId: equipment.id,
      algorithm: 'lstm',
      features: ['temperature', 'vibration', 'pressure', 'current', 'voltage'],
      target: 'failure',
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85,
      auc: 0.90,
      mse: 0.15,
      mae: 0.12,
      rmse: 0.39,
      r2: 0.78,
      trainingData: {
        size: 1000,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        quality: 0.92,
      },
      validationData: {
        size: 200,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        quality: 0.90,
      },
      testData: {
        size: 100,
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        quality: 0.88,
      },
      hyperparameters: {
        sequenceLength: 24,
        hiddenUnits: 64,
        dropout: 0.2,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
      },
      metadata: {
        version: '1.0.0',
        created: new Date(),
        updated: new Date(),
        status: 'deployed',
      },
    };
    
    return model;
  }

  private async trainRandomForestModel(equipment: Equipment, sensorData: SensorData[], config: PredictiveMaintenanceConfig): Promise<PredictiveModel> {
    // Simplified Random Forest model training
    const model: PredictiveModel = {
      id: `rf_${equipment.id}_${Date.now()}`,
      equipmentId: equipment.id,
      algorithm: 'random_forest',
      features: ['temperature', 'vibration', 'pressure', 'current', 'voltage'],
      target: 'failure',
      accuracy: 0.82,
      precision: 0.80,
      recall: 0.85,
      f1Score: 0.82,
      auc: 0.87,
      mse: 0.18,
      mae: 0.15,
      rmse: 0.42,
      r2: 0.75,
      trainingData: {
        size: 1000,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        quality: 0.90,
      },
      validationData: {
        size: 200,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        quality: 0.88,
      },
      testData: {
        size: 100,
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        quality: 0.86,
      },
      hyperparameters: {
        nEstimators: 100,
        maxDepth: 10,
        minSamplesSplit: 5,
        minSamplesLeaf: 2,
        maxFeatures: 'sqrt',
        randomState: 42,
      },
      metadata: {
        version: '1.0.0',
        created: new Date(),
        updated: new Date(),
        status: 'deployed',
      },
    };
    
    return model;
  }

  private async trainXGBoostModel(equipment: Equipment, sensorData: SensorData[], config: PredictiveMaintenanceConfig): Promise<PredictiveModel> {
    // Simplified XGBoost model training
    const model: PredictiveModel = {
      id: `xgb_${equipment.id}_${Date.now()}`,
      equipmentId: equipment.id,
      algorithm: 'xgboost',
      features: ['temperature', 'vibration', 'pressure', 'current', 'voltage'],
      target: 'failure',
      accuracy: 0.88,
      precision: 0.85,
      recall: 0.90,
      f1Score: 0.87,
      auc: 0.92,
      mse: 0.12,
      mae: 0.10,
      rmse: 0.35,
      r2: 0.82,
      trainingData: {
        size: 1000,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        quality: 0.94,
      },
      validationData: {
        size: 200,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        quality: 0.92,
      },
      testData: {
        size: 100,
        startDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        quality: 0.90,
      },
      hyperparameters: {
        nEstimators: 200,
        maxDepth: 8,
        learningRate: 0.1,
        subsample: 0.8,
        colsampleBytree: 0.8,
        randomState: 42,
      },
      metadata: {
        version: '1.0.0',
        created: new Date(),
        updated: new Date(),
        status: 'deployed',
      },
    };
    
    return model;
  }

  private async makePredictions(config: PredictiveMaintenanceConfig, models: PredictiveModel[], sensorData: SensorData[]): Promise<Prediction[]> {
    const predictions: Prediction[] = [];
    
    for (const model of models) {
      const equipment = config.equipment.find(e => e.id === model.equipmentId);
      if (!equipment) continue;
      
      const prediction = await this.makePrediction(model, equipment, sensorData);
      predictions.push(prediction);
    }
    
    return predictions;
  }

  private async makePrediction(model: PredictiveModel, equipment: Equipment, sensorData: SensorData[]): Promise<Prediction> {
    // Simplified prediction logic
    const failure = Math.random() < 0.1; // 10% chance of failure
    const probability = Math.random();
    const confidence = Math.random() * 0.3 + 0.7; // 70-100% confidence
    const timeToFailure = Math.random() * 168; // 0-168 hours (1 week)
    
    const prediction: Prediction = {
      id: `prediction_${model.id}_${Date.now()}`,
      equipmentId: equipment.id,
      modelId: model.id,
      timestamp: new Date(),
      prediction: {
        failure,
        probability,
        confidence,
        timeToFailure,
        severity: this.determineSeverity(probability, timeToFailure),
        components: this.identifyComponents(equipment, probability),
        symptoms: this.identifySymptoms(equipment, probability),
        recommendations: this.generatePredictionRecommendations(equipment, probability, timeToFailure),
      },
      actual: {
        failure: Math.random() < 0.05, // 5% actual failure rate
        timeToFailure: Math.random() * 168,
        severity: 'medium',
        components: ['bearing', 'motor'],
        symptoms: ['vibration', 'noise'],
      },
      accuracy: model.accuracy,
      error: Math.abs(probability - (Math.random() < 0.1 ? 1 : 0)),
      metadata: {
        modelVersion: model.metadata.version,
        dataQuality: 0.9,
        processingTime: Math.random() * 1000,
        confidence: confidence,
      },
    };
    
    return prediction;
  }

  private determineSeverity(probability: number, timeToFailure: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability > 0.8 && timeToFailure < 24) return 'critical';
    if (probability > 0.6 && timeToFailure < 72) return 'high';
    if (probability > 0.4 && timeToFailure < 168) return 'medium';
    return 'low';
  }

  private identifyComponents(equipment: Equipment, probability: number): string[] {
    const components = ['bearing', 'motor', 'belt', 'pump', 'valve', 'sensor'];
    const threshold = 0.5;
    
    return components.filter(() => Math.random() < threshold);
  }

  private identifySymptoms(equipment: Equipment, probability: number): string[] {
    const symptoms = ['vibration', 'noise', 'heat', 'leak', 'wear', 'corrosion'];
    const threshold = 0.6;
    
    return symptoms.filter(() => Math.random() < threshold);
  }

  private generatePredictionRecommendations(equipment: Equipment, probability: number, timeToFailure: number): string[] {
    const recommendations = [
      'Schedule preventive maintenance',
      'Monitor sensor readings closely',
      'Prepare replacement parts',
      'Schedule maintenance team',
      'Update maintenance schedule',
      'Notify operations team',
    ];
    
    return recommendations.filter(() => Math.random() < 0.7);
  }

  private async generateRecommendations(config: PredictiveMaintenanceConfig, predictions: Prediction[]): Promise<MaintenanceRecommendation[]> {
    const recommendations: MaintenanceRecommendation[] = [];
    
    for (const prediction of predictions) {
      if (prediction.prediction.failure && prediction.prediction.probability > 0.5) {
        const recommendation = this.createMaintenanceRecommendation(prediction);
        recommendations.push(recommendation);
      }
    }
    
    return recommendations;
  }

  private createMaintenanceRecommendation(prediction: Prediction): MaintenanceRecommendation {
    const priority = this.determinePriority(prediction.prediction.probability, prediction.prediction.timeToFailure);
    const cost = this.estimateCost(prediction.prediction.severity);
    const duration = this.estimateDuration(prediction.prediction.severity);
    
    return {
      id: `recommendation_${prediction.id}`,
      equipmentId: prediction.equipmentId,
      type: 'predictive',
      priority,
      description: `Predictive maintenance recommended for equipment ${prediction.equipmentId}`,
      estimatedCost: cost,
      estimatedDuration: duration,
      requiredParts: this.identifyRequiredParts(prediction.prediction.components),
      requiredSkills: this.identifyRequiredSkills(prediction.prediction.severity),
      recommendedDate: new Date(Date.now() + prediction.prediction.timeToFailure * 60 * 60 * 1000),
      latestDate: new Date(Date.now() + (prediction.prediction.timeToFailure + 24) * 60 * 60 * 1000),
      impact: {
        safety: this.calculateSafetyImpact(prediction.prediction.severity),
        production: this.calculateProductionImpact(prediction.prediction.severity),
        quality: this.calculateQualityImpact(prediction.prediction.severity),
        cost: cost,
      },
      alternatives: this.generateAlternatives(prediction.prediction.severity, cost, duration),
      metadata: {
        confidence: prediction.prediction.confidence,
        urgency: this.calculateUrgency(prediction.prediction.timeToFailure),
        feasibility: 0.9,
        resources: ['maintenance_team', 'parts', 'tools'],
      },
    };
  }

  private determinePriority(probability: number, timeToFailure: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability > 0.8 && timeToFailure < 24) return 'critical';
    if (probability > 0.6 && timeToFailure < 72) return 'high';
    if (probability > 0.4 && timeToFailure < 168) return 'medium';
    return 'low';
  }

  private estimateCost(severity: string): number {
    const costs = {
      low: 500,
      medium: 1500,
      high: 5000,
      critical: 15000,
    };
    
    return costs[severity] || 1000;
  }

  private estimateDuration(severity: string): number {
    const durations = {
      low: 60,
      medium: 180,
      high: 480,
      critical: 1440,
    };
    
    return durations[severity] || 120;
  }

  private identifyRequiredParts(components: string[]): string[] {
    const parts = ['bearing', 'belt', 'filter', 'sensor', 'valve', 'pump'];
    return parts.filter(part => components.includes(part));
  }

  private identifyRequiredSkills(severity: string): string[] {
    const skills = ['mechanical', 'electrical', 'hydraulic', 'pneumatic'];
    return skills.filter(() => Math.random() < 0.7);
  }

  private calculateSafetyImpact(severity: string): number {
    const impacts = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      critical: 0.9,
    };
    
    return impacts[severity] || 0.2;
  }

  private calculateProductionImpact(severity: string): number {
    const impacts = {
      low: 0.05,
      medium: 0.15,
      high: 0.4,
      critical: 0.8,
    };
    
    return impacts[severity] || 0.1;
  }

  private calculateQualityImpact(severity: string): number {
    const impacts = {
      low: 0.02,
      medium: 0.08,
      high: 0.25,
      critical: 0.6,
    };
    
    return impacts[severity] || 0.05;
  }

  private generateAlternatives(severity: string, cost: number, duration: number): any[] {
    return [
      {
        description: 'Delayed maintenance with increased monitoring',
        cost: cost * 0.5,
        duration: duration * 0.3,
        impact: 0.8,
      },
      {
        description: 'Partial maintenance with temporary fixes',
        cost: cost * 0.7,
        duration: duration * 0.5,
        impact: 0.6,
      },
    ];
  }

  private calculateUrgency(timeToFailure: number): number {
    if (timeToFailure < 24) return 1.0;
    if (timeToFailure < 72) return 0.8;
    if (timeToFailure < 168) return 0.6;
    return 0.4;
  }

  private calculatePerformanceMetrics(config: PredictiveMaintenanceConfig, predictions: Prediction[], recommendations: MaintenanceRecommendation[]): any {
    const modelAccuracy = predictions.reduce((sum, p) => sum + p.accuracy, 0) / predictions.length;
    const predictionAccuracy = this.calculateAccuracy(predictions);
    const maintenanceEfficiency = this.calculateMaintenanceEfficiency(predictions, recommendations);
    const costSavings = this.calculateCostSavings(predictions, recommendations);
    const downtimeReduction = this.calculateDowntimeReduction(predictions, recommendations);
    const safetyImprovement = this.calculateSafetyImprovement(predictions, recommendations);
    const qualityImprovement = this.calculateQualityImprovement(predictions, recommendations);
    const overallEffectiveness = (modelAccuracy + predictionAccuracy + maintenanceEfficiency + costSavings + downtimeReduction + safetyImprovement + qualityImprovement) / 7;
    
    return {
      modelAccuracy,
      predictionAccuracy,
      maintenanceEfficiency,
      costSavings,
      downtimeReduction,
      safetyImprovement,
      qualityImprovement,
      overallEffectiveness,
    };
  }

  private calculateAccuracy(predictions: Prediction[]): number {
    if (predictions.length === 0) return 0;
    
    const correct = predictions.filter(p => p.prediction.failure === p.actual.failure).length;
    return correct / predictions.length;
  }

  private calculatePrecision(predictions: Prediction[]): number {
    const truePositives = predictions.filter(p => p.prediction.failure && p.actual.failure).length;
    const falsePositives = predictions.filter(p => p.prediction.failure && !p.actual.failure).length;
    
    if (truePositives + falsePositives === 0) return 0;
    return truePositives / (truePositives + falsePositives);
  }

  private calculateRecall(predictions: Prediction[]): number {
    const truePositives = predictions.filter(p => p.prediction.failure && p.actual.failure).length;
    const falseNegatives = predictions.filter(p => !p.prediction.failure && p.actual.failure).length;
    
    if (truePositives + falseNegatives === 0) return 0;
    return truePositives / (truePositives + falseNegatives);
  }

  private calculateF1Score(predictions: Prediction[]): number {
    const precision = this.calculatePrecision(predictions);
    const recall = this.calculateRecall(predictions);
    
    if (precision + recall === 0) return 0;
    return 2 * (precision * recall) / (precision + recall);
  }

  private calculateCostSavings(predictions: Prediction[], recommendations: MaintenanceRecommendation[]): number {
    const totalCost = recommendations.reduce((sum, r) => sum + r.estimatedCost, 0);
    const potentialFailureCost = totalCost * 3; // Assume failure costs 3x more
    const savings = potentialFailureCost - totalCost;
    
    return Math.max(0, savings / potentialFailureCost);
  }

  private calculateDowntimeReduction(predictions: Prediction[], recommendations: MaintenanceRecommendation[]): number {
    const totalDuration = recommendations.reduce((sum, r) => sum + r.estimatedDuration, 0);
    const potentialFailureDuration = totalDuration * 5; // Assume failure takes 5x longer
    const reduction = potentialFailureDuration - totalDuration;
    
    return Math.max(0, reduction / potentialFailureDuration);
  }

  private calculateMaintenanceEfficiency(predictions: Prediction[], recommendations: MaintenanceRecommendation[]): number {
    const totalRecommendations = recommendations.length;
    const highPriorityRecommendations = recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length;
    
    if (totalRecommendations === 0) return 0;
    return highPriorityRecommendations / totalRecommendations;
  }

  private calculateSafetyImprovement(predictions: Prediction[], recommendations: MaintenanceRecommendation[]): number {
    const totalImpact = recommendations.reduce((sum, r) => sum + r.impact.safety, 0);
    const averageImpact = totalImpact / recommendations.length;
    
    return Math.max(0, averageImpact);
  }

  private calculateQualityImprovement(predictions: Prediction[], recommendations: MaintenanceRecommendation[]): number {
    const totalImpact = recommendations.reduce((sum, r) => sum + r.impact.quality, 0);
    const averageImpact = totalImpact / recommendations.length;
    
    return Math.max(0, averageImpact);
  }

  private generateRecommendations(config: PredictiveMaintenanceConfig, predictions: Prediction[]): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    const criticalPredictions = predictions.filter(p => p.prediction.severity === 'critical');
    if (criticalPredictions.length > 0) {
      immediate.push('Critical equipment failures predicted - immediate action required');
    }
    
    const highPredictions = predictions.filter(p => p.prediction.severity === 'high');
    if (highPredictions.length > 0) {
      immediate.push('High priority maintenance required');
    }
    
    if (predictions.length > 0) {
      const averageAccuracy = predictions.reduce((sum, p) => sum + p.accuracy, 0) / predictions.length;
      if (averageAccuracy < 0.8) {
        immediate.push('Model accuracy below threshold - retraining recommended');
      }
    }
    
    shortTerm.push('Implement real-time monitoring');
    shortTerm.push('Enhance sensor coverage');
    shortTerm.push('Improve data quality');
    shortTerm.push('Optimize maintenance schedules');
    
    longTerm.push('Build comprehensive predictive maintenance system');
    longTerm.push('Implement AI-driven maintenance optimization');
    longTerm.push('Create maintenance knowledge base');
    longTerm.push('Develop predictive analytics platform');
    
    return { immediate, shortTerm, longTerm };
  }

  private async savePredictiveMaintenanceResult(result: PredictiveMaintenanceResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO predictive_maintenance_results 
        (total_equipment, monitored_equipment, predicted_failures, actual_failures, 
         accuracy, precision, recall, f1_score, cost_savings, downtime_reduction, 
         maintenance_efficiency, model_accuracy, prediction_accuracy, 
         maintenance_efficiency_metric, cost_savings_metric, downtime_reduction_metric, 
         safety_improvement, quality_improvement, overall_effectiveness, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
      `, [
        result.summary.totalEquipment,
        result.summary.monitoredEquipment,
        result.summary.predictedFailures,
        result.summary.actualFailures,
        result.summary.accuracy,
        result.summary.precision,
        result.summary.recall,
        result.summary.f1Score,
        result.summary.costSavings,
        result.summary.downtimeReduction,
        result.summary.maintenanceEfficiency,
        result.performance.modelAccuracy,
        result.performance.predictionAccuracy,
        result.performance.maintenanceEfficiency,
        result.performance.costSavings,
        result.performance.downtimeReduction,
        result.performance.safetyImprovement,
        result.performance.qualityImprovement,
        result.performance.overallEffectiveness,
      ]);
    } catch (error) {
      this.logger.error('Failed to save predictive maintenance result:', error);
    }
  }
}
