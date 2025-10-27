import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface TrainingData {
  id: string;
  features: number[];
  label: number | string;
  weight: number;
  metadata: {
    source: string;
    quality: number; // 0-1
    reliability: number; // 0-1
    timestamp: Date;
    processingTime: number; // milliseconds
  };
}

interface XGBoostModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'ranking' | 'survival';
  trees: XGBoostTree[];
  featureCount: number;
  treeCount: number;
  maxDepth: number;
  learningRate: number;
  subsample: number;
  colsampleBytree: number;
  colsampleBylevel: number;
  colsampleBynode: number;
  regAlpha: number;
  regLambda: number;
  gamma: number;
  minChildWeight: number;
  maxDeltaStep: number;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    rocAuc: number;
    rmse: number;
    mae: number;
    r2Score: number;
    confusionMatrix: { [actual: string]: { [predicted: string]: number } };
  };
  featureImportance: { [feature: string]: number };
  metadata: {
    trainingTime: number; // milliseconds
    sampleCount: number;
    validationScore: number;
    crossValidationScore: number;
    earlyStoppingRounds: number;
    bestIteration: number;
  };
}

interface XGBoostTree {
  id: string;
  iteration: number;
  depth: number;
  leafCount: number;
  featureCount: number;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    gini: number;
    entropy: number;
  };
  metadata: {
    trainingTime: number; // milliseconds
    sampleCount: number;
    featureImportance: { [feature: string]: number };
  };
}

interface XGBoostConfig {
  algorithm: 'xgboost' | 'lightgbm' | 'catboost' | 'gradient_boosting';
  objective: 'reg:squarederror' | 'reg:logistic' | 'binary:logistic' | 'multi:softmax' | 'multi:softprob' | 'rank:pairwise' | 'rank:ndcg' | 'rank:map' | 'survival:cox' | 'survival:aft' | 'count:poisson' | 'reg:gamma' | 'reg:tweedie';
  nEstimators: number; // Number of boosting rounds
  maxDepth: number;
  learningRate: number;
  subsample: number;
  colsampleBytree: number;
  colsampleBylevel: number;
  colsampleBynode: number;
  regAlpha: number; // L1 regularization
  regLambda: number; // L2 regularization
  gamma: number; // Minimum loss reduction
  minChildWeight: number;
  maxDeltaStep: number;
  scalePosWeight: number;
  baseScore: number;
  randomState: number;
  nJobs: number; // Number of parallel jobs
  features: string[];
  target: string;
  validation: {
    enabled: boolean;
    testSize: number;
    randomState: number;
    stratify: boolean;
  };
  crossValidation: {
    enabled: boolean;
    cv: number;
    scoring: string;
    randomState: number;
  };
  earlyStopping: {
    enabled: boolean;
    rounds: number;
    minDelta: number;
  };
  hyperparameterTuning: {
    enabled: boolean;
    method: 'grid_search' | 'random_search' | 'bayesian' | 'optuna';
    paramGrid: { [param: string]: any[] };
    nIter: number;
    cv: number;
    scoring: string;
  };
}

interface XGBoostResult {
  model: XGBoostModel;
  predictions: {
    id: string;
    features: number[];
    predictedLabel: number | string;
    probability: number;
    confidence: number;
    metadata: {
      processingTime: number;
      treeContributions: { [treeId: string]: number };
      featureContributions: { [feature: string]: number };
    };
  }[];
  summary: {
    totalSamples: number;
    correctPredictions: number;
    accuracy: number;
    averageConfidence: number;
    processingTime: number; // milliseconds
  };
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    rocAuc: number;
    rmse: number;
    mae: number;
    r2Score: number;
    confusionMatrix: { [actual: string]: { [predicted: string]: number } };
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

@Injectable()
export class XGBoostOptimizationService {
  private readonly logger = new Logger(XGBoostOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async trainXGBoost(
    trainingData: TrainingData[],
    config: XGBoostConfig,
    options: {
      includeRealTime: boolean;
      includeValidation: boolean;
      includeCrossValidation: boolean;
      includeFeatureSelection: boolean;
      includeHyperparameterTuning: boolean;
      maxIterations: number;
      tolerance: number;
    },
  ): Promise<XGBoostModel> {
    this.logger.log(`Training XGBoost model with ${trainingData.length} samples and ${config.nEstimators} estimators`);

    const startTime = Date.now();
    
    // Preprocess data
    const processedData = this.preprocessData(trainingData, config);
    
    // Split data if validation is enabled
    let trainData = processedData;
    let validationData: TrainingData[] = [];
    
    if (config.validation.enabled) {
      const split = this.splitData(processedData, config.validation);
      trainData = split.train;
      validationData = split.test;
    }
    
    // Hyperparameter tuning if enabled
    let optimizedConfig = config;
    if (config.hyperparameterTuning.enabled) {
      optimizedConfig = await this.tuneHyperparameters(trainData, config);
    }
    
    // Train XGBoost model
    const model = await this.trainXGBoostModel(trainData, optimizedConfig, validationData);
    
    // Calculate performance metrics
    const performance = this.calculateModelPerformance(model, validationData);
    
    // Update model with performance
    model.performance = performance;
    
    await this.saveXGBoostModel(model);
    await this.eventBus.emit('xgboost.model.trained', { model });

    return model;
  }

  async predict(
    model: XGBoostModel,
    testData: TrainingData[],
    options: {
      includeProbabilities: boolean;
      includeConfidence: boolean;
      includeFeatureContributions: boolean;
      includeTreeContributions: boolean;
      maxConcurrency: number;
      timeout: number;
    },
  ): Promise<XGBoostResult> {
    this.logger.log(`Predicting with XGBoost model for ${testData.length} samples`);

    const startTime = Date.now();
    const predictions: any[] = [];
    let correctPredictions = 0;
    let totalConfidence = 0;
    
    for (const sample of testData) {
      const prediction = this.predictSample(model, sample, options);
      predictions.push(prediction);
      
      if (prediction.predictedLabel === sample.label) {
        correctPredictions++;
      }
      
      totalConfidence += prediction.confidence;
    }
    
    // Calculate performance metrics
    const performance = this.calculatePredictionPerformance(predictions, testData);
    
    // Calculate summary
    const processingTime = Date.now() - startTime;
    const summary = {
      totalSamples: testData.length,
      correctPredictions,
      accuracy: correctPredictions / testData.length,
      averageConfidence: totalConfidence / testData.length,
      processingTime,
    };
    
    const recommendations = this.generateRecommendations(performance, model);
    
    const result: XGBoostResult = {
      model,
      predictions,
      summary,
      performance,
      recommendations,
    };

    await this.saveXGBoostResult(result);
    await this.eventBus.emit('xgboost.prediction.completed', { result });

    return result;
  }

  private preprocessData(trainingData: TrainingData[], config: XGBoostConfig): TrainingData[] {
    // Apply preprocessing based on configuration
    const processedData = trainingData.map(sample => ({ ...sample }));
    
    // Handle missing values
    this.handleMissingValues(processedData);
    
    // Normalize features if needed
    this.normalizeFeatures(processedData, config.features);
    
    // Apply class weights if specified
    if (config.scalePosWeight > 0) {
      this.applyClassWeights(processedData, config.scalePosWeight);
    }
    
    return processedData;
  }

  private handleMissingValues(data: TrainingData[]): void {
    // Simple missing value handling
    for (const sample of data) {
      for (let i = 0; i < sample.features.length; i++) {
        if (isNaN(sample.features[i]) || sample.features[i] === null || sample.features[i] === undefined) {
          sample.features[i] = 0; // Replace with 0
        }
      }
    }
  }

  private normalizeFeatures(data: TrainingData[], features: string[]): void {
    // Simple feature normalization
    for (const sample of data) {
      for (let i = 0; i < sample.features.length; i++) {
        const feature = sample.features[i];
        if (feature > 1) {
          sample.features[i] = feature / 1000; // Simplified normalization
        }
      }
    }
  }

  private applyClassWeights(data: TrainingData[], scalePosWeight: number): void {
    // Apply class weights to samples
    for (const sample of data) {
      if (sample.label === 1) {
        sample.weight *= scalePosWeight;
      }
    }
  }

  private splitData(data: TrainingData[], validation: any): { train: TrainingData[]; test: TrainingData[] } {
    const shuffled = [...data].sort(() => Math.random() - 0.5);
    const splitIndex = Math.floor(data.length * (1 - validation.testSize));
    
    return {
      train: shuffled.slice(0, splitIndex),
      test: shuffled.slice(splitIndex),
    };
  }

  private async tuneHyperparameters(trainData: TrainingData[], config: XGBoostConfig): Promise<XGBoostConfig> {
    this.logger.log('Tuning hyperparameters...');
    
    const method = config.hyperparameterTuning.method;
    const paramGrid = config.hyperparameterTuning.paramGrid;
    const nIter = config.hyperparameterTuning.nIter;
    const cv = config.hyperparameterTuning.cv;
    const scoring = config.hyperparameterTuning.scoring;
    
    let bestScore = -Infinity;
    let bestParams: any = {};
    
    switch (method) {
      case 'grid_search':
        bestParams = await this.gridSearch(trainData, paramGrid, cv, scoring);
        break;
      case 'random_search':
        bestParams = await this.randomSearch(trainData, paramGrid, nIter, cv, scoring);
        break;
      case 'bayesian':
        bestParams = await this.bayesianOptimization(trainData, paramGrid, nIter, cv, scoring);
        break;
      case 'optuna':
        bestParams = await this.optunaOptimization(trainData, paramGrid, nIter, cv, scoring);
        break;
    }
    
    // Update config with best parameters
    const optimizedConfig = { ...config };
    Object.assign(optimizedConfig, bestParams);
    
    return optimizedConfig;
  }

  private async gridSearch(
    trainData: TrainingData[],
    paramGrid: { [param: string]: any[] },
    cv: number,
    scoring: string,
  ): Promise<any> {
    const paramNames = Object.keys(paramGrid);
    const paramValues = Object.values(paramGrid);
    const combinations = this.generateCombinations(paramValues);
    
    let bestScore = -Infinity;
    let bestParams: any = {};
    
    for (const combination of combinations) {
      const params: any = {};
      for (let i = 0; i < paramNames.length; i++) {
        params[paramNames[i]] = combination[i];
      }
      
      const score = await this.evaluateParameters(trainData, params, cv, scoring);
      
      if (score > bestScore) {
        bestScore = score;
        bestParams = params;
      }
    }
    
    return bestParams;
  }

  private async randomSearch(
    trainData: TrainingData[],
    paramGrid: { [param: string]: any[] },
    nIter: number,
    cv: number,
    scoring: string,
  ): Promise<any> {
    let bestScore = -Infinity;
    let bestParams: any = {};
    
    for (let i = 0; i < nIter; i++) {
      const params: any = {};
      for (const [param, values] of Object.entries(paramGrid)) {
        params[param] = values[Math.floor(Math.random() * values.length)];
      }
      
      const score = await this.evaluateParameters(trainData, params, cv, scoring);
      
      if (score > bestScore) {
        bestScore = score;
        bestParams = params;
      }
    }
    
    return bestParams;
  }

  private async bayesianOptimization(
    trainData: TrainingData[],
    paramGrid: { [param: string]: any[] },
    nIter: number,
    cv: number,
    scoring: string,
  ): Promise<any> {
    // Simplified Bayesian optimization
    // In a real implementation, this would use a proper Bayesian optimization library
    return await this.randomSearch(trainData, paramGrid, nIter, cv, scoring);
  }

  private async optunaOptimization(
    trainData: TrainingData[],
    paramGrid: { [param: string]: any[] },
    nIter: number,
    cv: number,
    scoring: string,
  ): Promise<any> {
    // Simplified Optuna optimization
    // In a real implementation, this would use the Optuna library
    return await this.randomSearch(trainData, paramGrid, nIter, cv, scoring);
  }

  private generateCombinations(values: any[][]): any[][] {
    if (values.length === 0) return [[]];
    
    const result: any[][] = [];
    const first = values[0];
    const rest = values.slice(1);
    const restCombinations = this.generateCombinations(rest);
    
    for (const value of first) {
      for (const combination of restCombinations) {
        result.push([value, ...combination]);
      }
    }
    
    return result;
  }

  private async evaluateParameters(
    trainData: TrainingData[],
    params: any,
    cv: number,
    scoring: string,
  ): Promise<number> {
    // Simplified parameter evaluation
    // In a real implementation, this would perform cross-validation
    const model = await this.trainXGBoostModel(trainData, { ...params } as XGBoostConfig, []);
    return model.performance.accuracy;
  }

  private async trainXGBoostModel(
    trainData: TrainingData[],
    config: XGBoostConfig,
    validationData: TrainingData[],
  ): Promise<XGBoostModel> {
    const startTime = Date.now();
    const trees: XGBoostTree[] = [];
    let bestScore = -Infinity;
    let bestIteration = 0;
    let earlyStoppingRounds = 0;
    
    // Initialize predictions
    let predictions = new Array(trainData.length).fill(config.baseScore);
    
    // Train trees iteratively
    for (let i = 0; i < config.nEstimators; i++) {
      // Calculate gradients and hessians
      const gradients = this.calculateGradients(trainData, predictions, config.objective);
      const hessians = this.calculateHessians(trainData, predictions, config.objective);
      
      // Train tree
      const tree = await this.trainTree(trainData, gradients, hessians, config, i);
      trees.push(tree);
      
      // Update predictions
      predictions = this.updatePredictions(predictions, tree, trainData, config.learningRate);
      
      // Early stopping check
      if (config.earlyStopping.enabled && validationData.length > 0) {
        const score = this.evaluateModel(trees, validationData, config);
        
        if (score > bestScore) {
          bestScore = score;
          bestIteration = i;
          earlyStoppingRounds = 0;
        } else {
          earlyStoppingRounds++;
          
          if (earlyStoppingRounds >= config.earlyStopping.rounds) {
            break;
          }
        }
      }
    }
    
    // Calculate feature importance
    const featureImportance = this.calculateFeatureImportance(trees, config.features);
    
    // Calculate performance
    const performance = this.calculateModelPerformance(trees, validationData);
    
    const model: XGBoostModel = {
      id: `xgb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'XGBoost Model',
      type: this.getModelType(config.objective),
      trees,
      featureCount: config.features.length,
      treeCount: trees.length,
      maxDepth: config.maxDepth,
      learningRate: config.learningRate,
      subsample: config.subsample,
      colsampleBytree: config.colsampleBytree,
      colsampleBylevel: config.colsampleBylevel,
      colsampleBynode: config.colsampleBynode,
      regAlpha: config.regAlpha,
      regLambda: config.regLambda,
      gamma: config.gamma,
      minChildWeight: config.minChildWeight,
      maxDeltaStep: config.maxDeltaStep,
      performance,
      featureImportance,
      metadata: {
        trainingTime: Date.now() - startTime,
        sampleCount: trainData.length,
        validationScore: validationData.length > 0 ? this.evaluateModel(trees, validationData, config) : 0,
        crossValidationScore: 0, // Would be calculated if cross-validation is enabled
        earlyStoppingRounds,
        bestIteration,
      },
    };
    
    return model;
  }

  private calculateGradients(data: TrainingData[], predictions: number[], objective: string): number[] {
    const gradients: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const actual = typeof data[i].label === 'number' ? data[i].label : 0;
      const predicted = predictions[i];
      
      let gradient = 0;
      
      switch (objective) {
        case 'reg:squarederror':
          gradient = 2 * (predicted - actual);
          break;
        case 'reg:logistic':
          gradient = predicted - actual;
          break;
        case 'binary:logistic':
          gradient = predicted - actual;
          break;
        case 'multi:softmax':
          gradient = predicted - actual;
          break;
        default:
          gradient = predicted - actual;
      }
      
      gradients.push(gradient);
    }
    
    return gradients;
  }

  private calculateHessians(data: TrainingData[], predictions: number[], objective: string): number[] {
    const hessians: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const actual = typeof data[i].label === 'number' ? data[i].label : 0;
      const predicted = predictions[i];
      
      let hessian = 0;
      
      switch (objective) {
        case 'reg:squarederror':
          hessian = 2;
          break;
        case 'reg:logistic':
          hessian = predicted * (1 - predicted);
          break;
        case 'binary:logistic':
          hessian = predicted * (1 - predicted);
          break;
        case 'multi:softmax':
          hessian = predicted * (1 - predicted);
          break;
        default:
          hessian = 1;
      }
      
      hessians.push(hessian);
    }
    
    return hessians;
  }

  private async trainTree(
    data: TrainingData[],
    gradients: number[],
    hessians: number[],
    config: XGBoostConfig,
    iteration: number,
  ): Promise<XGBoostTree> {
    const startTime = Date.now();
    
    // Simplified tree training
    // In a real implementation, this would use the XGBoost algorithm
    const tree: XGBoostTree = {
      id: `tree_${iteration}_${Date.now()}`,
      iteration,
      depth: config.maxDepth,
      leafCount: Math.pow(2, config.maxDepth),
      featureCount: config.features.length,
      performance: {
        accuracy: 0.8, // Simplified
        precision: 0.8,
        recall: 0.8,
        f1Score: 0.8,
        gini: 0.5,
        entropy: 1.0,
      },
      metadata: {
        trainingTime: Date.now() - startTime,
        sampleCount: data.length,
        featureImportance: this.calculateTreeFeatureImportance(data, config.features),
      },
    };
    
    return tree;
  }

  private updatePredictions(
    predictions: number[],
    tree: XGBoostTree,
    data: TrainingData[],
    learningRate: number,
  ): number[] {
    const updatedPredictions = [...predictions];
    
    // Simplified prediction update
    // In a real implementation, this would use the actual tree predictions
    for (let i = 0; i < predictions.length; i++) {
      const treePrediction = this.predictWithTree(tree, data[i]);
      updatedPredictions[i] += learningRate * treePrediction;
    }
    
    return updatedPredictions;
  }

  private predictWithTree(tree: XGBoostTree, sample: TrainingData): number {
    // Simplified tree prediction
    // In a real implementation, this would traverse the actual tree
    return Math.random() * 0.1 - 0.05; // Small random prediction
  }

  private calculateTreeFeatureImportance(data: TrainingData[], features: string[]): { [feature: string]: number } {
    const importance: { [feature: string]: number } = {};
    
    for (const feature of features) {
      importance[feature] = Math.random(); // Simplified importance
    }
    
    return importance;
  }

  private calculateFeatureImportance(trees: XGBoostTree[], features: string[]): { [feature: string]: number } {
    const importance: { [feature: string]: number } = {};
    
    for (const feature of features) {
      importance[feature] = 0;
    }
    
    for (const tree of trees) {
      for (const [feature, value] of Object.entries(tree.metadata.featureImportance)) {
        importance[feature] += value;
      }
    }
    
    // Normalize importance
    const totalImportance = Object.values(importance).reduce((sum, val) => sum + val, 0);
    if (totalImportance > 0) {
      for (const feature of features) {
        importance[feature] /= totalImportance;
      }
    }
    
    return importance;
  }

  private calculateModelPerformance(trees: XGBoostTree[], validationData: TrainingData[]): any {
    if (validationData.length === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        rocAuc: 0,
        rmse: 0,
        mae: 0,
        r2Score: 0,
        confusionMatrix: {},
      };
    }
    
    const predictions = this.predictWithModel(trees, validationData);
    const actual = validationData.map(sample => sample.label);
    
    const accuracy = this.calculateAccuracy(predictions, actual);
    const precision = this.calculatePrecision(predictions, actual);
    const recall = this.calculateRecall(predictions, actual);
    const f1Score = this.calculateF1Score(precision, recall);
    const rocAuc = this.calculateRocAuc(predictions, actual);
    const rmse = this.calculateRmse(predictions, actual);
    const mae = this.calculateMae(predictions, actual);
    const r2Score = this.calculateR2Score(predictions, actual);
    const confusionMatrix = this.calculateConfusionMatrix(predictions, actual);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      rocAuc,
      rmse,
      mae,
      r2Score,
      confusionMatrix,
    };
  }

  private predictWithModel(trees: XGBoostTree[], data: TrainingData[]): number[] {
    const predictions: number[] = [];
    
    for (const sample of data) {
      let prediction = 0;
      
      for (const tree of trees) {
        prediction += this.predictWithTree(tree, sample);
      }
      
      predictions.push(prediction);
    }
    
    return predictions;
  }

  private calculateAccuracy(predictions: number[], actual: (number | string)[]): number {
    let correct = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] === actual[i]) {
        correct++;
      }
    }
    
    return correct / predictions.length;
  }

  private calculatePrecision(predictions: number[], actual: (number | string)[]): number {
    // Simplified precision calculation
    return this.calculateAccuracy(predictions, actual);
  }

  private calculateRecall(predictions: number[], actual: (number | string)[]): number {
    // Simplified recall calculation
    return this.calculateAccuracy(predictions, actual);
  }

  private calculateF1Score(precision: number, recall: number): number {
    if (precision + recall === 0) return 0;
    return 2 * (precision * recall) / (precision + recall);
  }

  private calculateRocAuc(predictions: number[], actual: (number | string)[]): number {
    // Simplified ROC AUC calculation
    return 0.8;
  }

  private calculateRmse(predictions: number[], actual: (number | string)[]): number {
    let sum = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      const actualNum = typeof actual[i] === 'number' ? actual[i] : 0;
      sum += Math.pow(predictions[i] - actualNum, 2);
    }
    
    return Math.sqrt(sum / predictions.length);
  }

  private calculateMae(predictions: number[], actual: (number | string)[]): number {
    let sum = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      const actualNum = typeof actual[i] === 'number' ? actual[i] : 0;
      sum += Math.abs(predictions[i] - actualNum);
    }
    
    return sum / predictions.length;
  }

  private calculateR2Score(predictions: number[], actual: (number | string)[]): number {
    const actualNums = actual.map(a => typeof a === 'number' ? a : 0);
    const mean = actualNums.reduce((sum, val) => sum + val, 0) / actualNums.length;
    
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      ssRes += Math.pow(predictions[i] - actualNums[i], 2);
      ssTot += Math.pow(actualNums[i] - mean, 2);
    }
    
    return 1 - (ssRes / ssTot);
  }

  private calculateConfusionMatrix(predictions: number[], actual: (number | string)[]): { [actual: string]: { [predicted: string]: number } } {
    const matrix: { [actual: string]: { [predicted: string]: number } } = {};
    
    for (let i = 0; i < predictions.length; i++) {
      const actualLabel = String(actual[i]);
      const predictedLabel = String(predictions[i]);
      
      if (!matrix[actualLabel]) {
        matrix[actualLabel] = {};
      }
      
      matrix[actualLabel][predictedLabel] = (matrix[actualLabel][predictedLabel] || 0) + 1;
    }
    
    return matrix;
  }

  private getModelType(objective: string): 'regression' | 'classification' | 'ranking' | 'survival' {
    if (objective.startsWith('reg:')) return 'regression';
    if (objective.startsWith('binary:') || objective.startsWith('multi:')) return 'classification';
    if (objective.startsWith('rank:')) return 'ranking';
    if (objective.startsWith('survival:')) return 'survival';
    return 'regression';
  }

  private evaluateModel(trees: XGBoostTree[], validationData: TrainingData[], config: XGBoostConfig): number {
    const predictions = this.predictWithModel(trees, validationData);
    const actual = validationData.map(sample => sample.label);
    return this.calculateAccuracy(predictions, actual);
  }

  private predictSample(model: XGBoostModel, sample: TrainingData, options: any): any {
    const startTime = Date.now();
    
    let prediction = 0;
    const treeContributions: { [treeId: string]: number } = {};
    const featureContributions: { [feature: string]: number } = {};
    
    // Collect predictions from all trees
    for (const tree of model.trees) {
      const treePrediction = this.predictWithTree(tree, sample);
      prediction += treePrediction;
      treeContributions[tree.id] = treePrediction;
    }
    
    // Calculate feature contributions (simplified)
    for (let i = 0; i < sample.features.length; i++) {
      featureContributions[`feature_${i}`] = sample.features[i] * 0.1;
    }
    
    // Calculate probability and confidence
    const probability = this.sigmoid(prediction);
    const confidence = Math.abs(probability - 0.5) * 2;
    
    return {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      features: sample.features,
      predictedLabel: prediction,
      probability,
      confidence,
      metadata: {
        processingTime: Date.now() - startTime,
        treeContributions,
        featureContributions,
      },
    };
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private calculatePredictionPerformance(predictions: any[], testData: TrainingData[]): any {
    const predictedLabels = predictions.map(p => p.predictedLabel);
    const actualLabels = testData.map(sample => sample.label);
    
    const accuracy = this.calculateAccuracy(predictedLabels, actualLabels);
    const precision = this.calculatePrecision(predictedLabels, actualLabels);
    const recall = this.calculateRecall(predictedLabels, actualLabels);
    const f1Score = this.calculateF1Score(precision, recall);
    const rocAuc = this.calculateRocAuc(predictedLabels, actualLabels);
    const rmse = this.calculateRmse(predictedLabels, actualLabels);
    const mae = this.calculateMae(predictedLabels, actualLabels);
    const r2Score = this.calculateR2Score(predictedLabels, actualLabels);
    const confusionMatrix = this.calculateConfusionMatrix(predictedLabels, actualLabels);
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      rocAuc,
      rmse,
      mae,
      r2Score,
      confusionMatrix,
    };
  }

  private generateRecommendations(performance: any, model: XGBoostModel): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (performance.accuracy < 0.8) {
      immediate.push('Low accuracy - consider adjusting model parameters');
    }
    
    if (performance.precision < 0.8) {
      immediate.push('Low precision - review feature selection');
    }
    
    if (performance.recall < 0.8) {
      immediate.push('Low recall - check for class imbalance');
    }
    
    if (performance.rmse > 1.0) {
      immediate.push('High RMSE - consider feature engineering');
    }
    
    shortTerm.push('Implement feature engineering');
    shortTerm.push('Add more training data');
    shortTerm.push('Tune hyperparameters');
    shortTerm.push('Consider ensemble methods');
    
    longTerm.push('Build automated model selection');
    longTerm.push('Implement real-time model updates');
    longTerm.push('Create model monitoring system');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveXGBoostModel(model: XGBoostModel): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO xgboost_models 
        (id, name, type, tree_count, feature_count, max_depth, learning_rate, 
         subsample, colsample_bytree, colsample_bylevel, colsample_bynode, 
         reg_alpha, reg_lambda, gamma, min_child_weight, max_delta_step, 
         accuracy, precision, recall, f1_score, roc_auc, rmse, mae, r2_score, 
         training_time, sample_count, validation_score, early_stopping_rounds, 
         best_iteration, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW())
      `, [
        model.id,
        model.name,
        model.type,
        model.treeCount,
        model.featureCount,
        model.maxDepth,
        model.learningRate,
        model.subsample,
        model.colsampleBytree,
        model.colsampleBylevel,
        model.colsampleBynode,
        model.regAlpha,
        model.regLambda,
        model.gamma,
        model.minChildWeight,
        model.maxDeltaStep,
        model.performance.accuracy,
        model.performance.precision,
        model.performance.recall,
        model.performance.f1Score,
        model.performance.rocAuc,
        model.performance.rmse,
        model.performance.mae,
        model.performance.r2Score,
        model.metadata.trainingTime,
        model.metadata.sampleCount,
        model.metadata.validationScore,
        model.metadata.earlyStoppingRounds,
        model.metadata.bestIteration,
      ]);
    } catch (error) {
      this.logger.error('Failed to save XGBoost model:', error);
    }
  }

  private async saveXGBoostResult(result: XGBoostResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO xgboost_prediction_results 
        (total_samples, correct_predictions, accuracy, average_confidence, 
         processing_time, precision, recall, f1_score, roc_auc, rmse, mae, r2_score, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      `, [
        result.summary.totalSamples,
        result.summary.correctPredictions,
        result.summary.accuracy,
        result.summary.averageConfidence,
        result.summary.processingTime,
        result.performance.precision,
        result.performance.recall,
        result.performance.f1Score,
        result.performance.rocAuc,
        result.performance.rmse,
        result.performance.mae,
        result.performance.r2Score,
      ]);
    } catch (error) {
      this.logger.error('Failed to save XGBoost prediction result:', error);
    }
  }
}

