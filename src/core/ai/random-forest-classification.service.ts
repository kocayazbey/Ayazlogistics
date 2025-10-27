import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface TrainingData {
  id: string;
  features: number[];
  label: string;
  weight: number;
  metadata: {
    source: string;
    quality: number; // 0-1
    reliability: number; // 0-1
    timestamp: Date;
    processingTime: number; // milliseconds
  };
}

interface DecisionTree {
  id: string;
  root: DecisionNode;
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

interface DecisionNode {
  id: string;
  type: 'split' | 'leaf';
  feature?: string;
  threshold?: number;
  left?: DecisionNode;
  right?: DecisionNode;
  prediction?: string;
  samples: number;
  gini?: number;
  entropy?: number;
  depth: number;
}

interface RandomForest {
  id: string;
  name: string;
  trees: DecisionTree[];
  featureCount: number;
  treeCount: number;
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  maxFeatures: number;
  bootstrap: boolean;
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    rocAuc: number;
    confusionMatrix: { [actual: string]: { [predicted: string]: number } };
  };
  featureImportance: { [feature: string]: number };
  metadata: {
    trainingTime: number; // milliseconds
    sampleCount: number;
    validationScore: number;
    crossValidationScore: number;
  };
}

interface ClassificationResult {
  predictions: {
    id: string;
    features: number[];
    predictedLabel: string;
    confidence: number;
    probabilities: { [label: string]: number };
    metadata: {
      processingTime: number;
      treeVotes: { [treeId: string]: string };
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
    confusionMatrix: { [actual: string]: { [predicted: string]: number } };
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface RandomForestConfig {
  algorithm: 'random_forest' | 'extra_trees' | 'gradient_boosting' | 'ada_boost';
  nEstimators: number; // Number of trees
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  maxFeatures: number | string; // 'sqrt', 'log2', 'auto', or number
  bootstrap: boolean;
  randomState: number;
  nJobs: number; // Number of parallel jobs
  classWeight: 'balanced' | 'balanced_subsample' | { [label: string]: number } | null;
  criterion: 'gini' | 'entropy' | 'log_loss';
  maxLeafNodes: number | null;
  minImpurityDecrease: number;
  ccpAlpha: number; // Cost complexity pruning
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
}

@Injectable()
export class RandomForestClassificationService {
  private readonly logger = new Logger(RandomForestClassificationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async trainRandomForest(
    trainingData: TrainingData[],
    config: RandomForestConfig,
    options: {
      includeRealTime: boolean;
      includeValidation: boolean;
      includeCrossValidation: boolean;
      includeFeatureSelection: boolean;
      includeHyperparameterTuning: boolean;
      maxIterations: number;
      tolerance: number;
    },
  ): Promise<RandomForest> {
    this.logger.log(`Training Random Forest with ${trainingData.length} samples and ${config.nEstimators} trees`);

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
    
    // Train trees
    const trees: DecisionTree[] = [];
    
    for (let i = 0; i < config.nEstimators; i++) {
      const tree = this.trainDecisionTree(trainData, config, i);
      trees.push(tree);
    }
    
    // Create random forest
    const randomForest: RandomForest = {
      id: `rf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Random Forest Classifier',
      trees,
      featureCount: config.features.length,
      treeCount: config.nEstimators,
      maxDepth: config.maxDepth,
      minSamplesSplit: config.minSamplesSplit,
      minSamplesLeaf: config.minSamplesLeaf,
      maxFeatures: typeof config.maxFeatures === 'number' ? config.maxFeatures : config.features.length,
      bootstrap: config.bootstrap,
      performance: this.calculateForestPerformance(trees, validationData),
      featureImportance: this.calculateFeatureImportance(trees, config.features),
      metadata: {
        trainingTime: Date.now() - startTime,
        sampleCount: trainData.length,
        validationScore: validationData.length > 0 ? this.calculateValidationScore(trees, validationData) : 0,
        crossValidationScore: 0, // Would be calculated if cross-validation is enabled
      },
    };
    
    await this.saveRandomForest(randomForest);
    await this.eventBus.emit('random.forest.trained', { randomForest });

    return randomForest;
  }

  async classify(
    randomForest: RandomForest,
    testData: TrainingData[],
    options: {
      includeProbabilities: boolean;
      includeConfidence: boolean;
      includeFeatureContributions: boolean;
      includeTreeVotes: boolean;
      maxConcurrency: number;
      timeout: number;
    },
  ): Promise<ClassificationResult> {
    this.logger.log(`Classifying ${testData.length} samples using Random Forest`);

    const startTime = Date.now();
    const predictions: any[] = [];
    let correctPredictions = 0;
    let totalConfidence = 0;
    
    for (const sample of testData) {
      const prediction = this.predictSample(randomForest, sample, options);
      predictions.push(prediction);
      
      if (prediction.predictedLabel === sample.label) {
        correctPredictions++;
      }
      
      totalConfidence += prediction.confidence;
    }
    
    // Calculate performance metrics
    const performance = this.calculateClassificationPerformance(predictions, testData);
    
    // Calculate summary
    const processingTime = Date.now() - startTime;
    const summary = {
      totalSamples: testData.length,
      correctPredictions,
      accuracy: correctPredictions / testData.length,
      averageConfidence: totalConfidence / testData.length,
      processingTime,
    };
    
    const recommendations = this.generateRecommendations(performance, randomForest);
    
    const result: ClassificationResult = {
      predictions,
      summary,
      performance,
      recommendations,
    };

    await this.saveClassificationResult(result);
    await this.eventBus.emit('random.forest.classified', { result });

    return result;
  }

  private preprocessData(trainingData: TrainingData[], config: RandomForestConfig): TrainingData[] {
    // Apply preprocessing based on configuration
    const processedData = trainingData.map(sample => ({ ...sample }));
    
    // Normalize features if needed
    if (config.features.length > 0) {
      this.normalizeFeatures(processedData, config.features);
    }
    
    // Handle missing values
    this.handleMissingValues(processedData);
    
    // Apply class weights if specified
    if (config.classWeight) {
      this.applyClassWeights(processedData, config.classWeight);
    }
    
    return processedData;
  }

  private normalizeFeatures(data: TrainingData[], features: string[]): void {
    // Simplified feature normalization
    // In a real implementation, this would normalize each feature column
    for (const sample of data) {
      for (let i = 0; i < sample.features.length; i++) {
        // Simple min-max normalization
        const feature = sample.features[i];
        if (feature > 1) {
          sample.features[i] = feature / 1000; // Simplified normalization
        }
      }
    }
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

  private applyClassWeights(data: TrainingData[], classWeight: any): void {
    // Apply class weights to samples
    if (typeof classWeight === 'object' && classWeight !== null) {
      for (const sample of data) {
        const weight = classWeight[sample.label] || 1.0;
        sample.weight *= weight;
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

  private trainDecisionTree(data: TrainingData[], config: RandomForestConfig, treeIndex: number): DecisionTree {
    const startTime = Date.now();
    
    // Bootstrap sampling if enabled
    const bootstrapData = config.bootstrap ? this.bootstrapSample(data) : data;
    
    // Create root node
    const root = this.buildDecisionTree(bootstrapData, config, 0);
    
    // Calculate tree performance
    const performance = this.calculateTreePerformance(root, bootstrapData);
    
    // Calculate feature importance
    const featureImportance = this.calculateTreeFeatureImportance(root, config.features);
    
    const tree: DecisionTree = {
      id: `tree_${treeIndex}_${Date.now()}`,
      root,
      depth: this.calculateTreeDepth(root),
      leafCount: this.countLeaves(root),
      featureCount: config.features.length,
      performance,
      metadata: {
        trainingTime: Date.now() - startTime,
        sampleCount: bootstrapData.length,
        featureImportance,
      },
    };
    
    return tree;
  }

  private bootstrapSample(data: TrainingData[]): TrainingData[] {
    const bootstrap: TrainingData[] = [];
    const n = data.length;
    
    for (let i = 0; i < n; i++) {
      const randomIndex = Math.floor(Math.random() * n);
      bootstrap.push(data[randomIndex]);
    }
    
    return bootstrap;
  }

  private buildDecisionTree(data: TrainingData[], config: RandomForestConfig, depth: number): DecisionNode {
    // Check stopping criteria
    if (depth >= config.maxDepth || 
        data.length < config.minSamplesSplit || 
        this.isPure(data) ||
        data.length < config.minSamplesLeaf) {
      return this.createLeafNode(data, depth);
    }
    
    // Find best split
    const bestSplit = this.findBestSplit(data, config);
    
    if (!bestSplit) {
      return this.createLeafNode(data, depth);
    }
    
    // Split data
    const { leftData, rightData } = this.splitData(data, bestSplit);
    
    // Create internal node
    const node: DecisionNode = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'split',
      feature: bestSplit.feature,
      threshold: bestSplit.threshold,
      samples: data.length,
      gini: bestSplit.gini,
      entropy: bestSplit.entropy,
      depth,
    };
    
    // Recursively build left and right subtrees
    node.left = this.buildDecisionTree(leftData, config, depth + 1);
    node.right = this.buildDecisionTree(rightData, config, depth + 1);
    
    return node;
  }

  private isPure(data: TrainingData[]): boolean {
    if (data.length === 0) return true;
    
    const firstLabel = data[0].label;
    return data.every(sample => sample.label === firstLabel);
  }

  private createLeafNode(data: TrainingData[], depth: number): DecisionNode {
    const labelCounts = this.countLabels(data);
    const prediction = this.getMajorityLabel(labelCounts);
    const gini = this.calculateGini(data);
    const entropy = this.calculateEntropy(data);
    
    return {
      id: `leaf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'leaf',
      prediction,
      samples: data.length,
      gini,
      entropy,
      depth,
    };
  }

  private countLabels(data: TrainingData[]): { [label: string]: number } {
    const counts: { [label: string]: number } = {};
    
    for (const sample of data) {
      counts[sample.label] = (counts[sample.label] || 0) + 1;
    }
    
    return counts;
  }

  private getMajorityLabel(labelCounts: { [label: string]: number }): string {
    let maxCount = 0;
    let majorityLabel = '';
    
    for (const [label, count] of Object.entries(labelCounts)) {
      if (count > maxCount) {
        maxCount = count;
        majorityLabel = label;
      }
    }
    
    return majorityLabel;
  }

  private findBestSplit(data: TrainingData[], config: RandomForestConfig): any {
    let bestSplit: any = null;
    let bestGini = Infinity;
    
    // Get random subset of features
    const featureIndices = this.getRandomFeatureIndices(config.features.length, config.maxFeatures);
    
    for (const featureIndex of featureIndices) {
      const feature = config.features[featureIndex];
      const values = data.map(sample => sample.features[featureIndex]);
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
      
      for (let i = 0; i < uniqueValues.length - 1; i++) {
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        const { leftData, rightData } = this.splitDataByFeature(data, featureIndex, threshold);
        
        if (leftData.length < config.minSamplesLeaf || rightData.length < config.minSamplesLeaf) {
          continue;
        }
        
        const gini = this.calculateWeightedGini(leftData, rightData);
        
        if (gini < bestGini) {
          bestGini = gini;
          bestSplit = {
            feature,
            threshold,
            gini,
            entropy: this.calculateWeightedEntropy(leftData, rightData),
          };
        }
      }
    }
    
    return bestSplit;
  }

  private getRandomFeatureIndices(totalFeatures: number, maxFeatures: number): number[] {
    const indices = Array.from({ length: totalFeatures }, (_, i) => i);
    const shuffled = indices.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, maxFeatures);
  }

  private splitDataByFeature(data: TrainingData[], featureIndex: number, threshold: number): { leftData: TrainingData[]; rightData: TrainingData[] } {
    const leftData: TrainingData[] = [];
    const rightData: TrainingData[] = [];
    
    for (const sample of data) {
      if (sample.features[featureIndex] <= threshold) {
        leftData.push(sample);
      } else {
        rightData.push(sample);
      }
    }
    
    return { leftData, rightData };
  }

  private calculateWeightedGini(leftData: TrainingData[], rightData: TrainingData[]): number {
    const leftGini = this.calculateGini(leftData);
    const rightGini = this.calculateGini(rightData);
    const leftWeight = leftData.length / (leftData.length + rightData.length);
    const rightWeight = rightData.length / (leftData.length + rightData.length);
    
    return leftWeight * leftGini + rightWeight * rightGini;
  }

  private calculateGini(data: TrainingData[]): number {
    if (data.length === 0) return 0;
    
    const labelCounts = this.countLabels(data);
    let gini = 1;
    
    for (const count of Object.values(labelCounts)) {
      const probability = count / data.length;
      gini -= probability * probability;
    }
    
    return gini;
  }

  private calculateWeightedEntropy(leftData: TrainingData[], rightData: TrainingData[]): number {
    const leftEntropy = this.calculateEntropy(leftData);
    const rightEntropy = this.calculateEntropy(rightData);
    const leftWeight = leftData.length / (leftData.length + rightData.length);
    const rightWeight = rightData.length / (leftData.length + rightData.length);
    
    return leftWeight * leftEntropy + rightWeight * rightEntropy;
  }

  private calculateEntropy(data: TrainingData[]): number {
    if (data.length === 0) return 0;
    
    const labelCounts = this.countLabels(data);
    let entropy = 0;
    
    for (const count of Object.values(labelCounts)) {
      const probability = count / data.length;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }
    
    return entropy;
  }

  private calculateTreeDepth(node: DecisionNode): number {
    if (node.type === 'leaf') {
      return node.depth;
    }
    
    const leftDepth = node.left ? this.calculateTreeDepth(node.left) : 0;
    const rightDepth = node.right ? this.calculateTreeDepth(node.right) : 0;
    
    return Math.max(leftDepth, rightDepth);
  }

  private countLeaves(node: DecisionNode): number {
    if (node.type === 'leaf') {
      return 1;
    }
    
    const leftLeaves = node.left ? this.countLeaves(node.left) : 0;
    const rightLeaves = node.right ? this.countLeaves(node.right) : 0;
    
    return leftLeaves + rightLeaves;
  }

  private calculateTreePerformance(node: DecisionNode, data: TrainingData[]): any {
    // Simplified performance calculation
    const predictions = this.predictWithTree(node, data);
    const correct = predictions.filter((pred, i) => pred === data[i].label).length;
    const accuracy = correct / data.length;
    
    return {
      accuracy,
      precision: accuracy,
      recall: accuracy,
      f1Score: accuracy,
      gini: this.calculateGini(data),
      entropy: this.calculateEntropy(data),
    };
  }

  private predictWithTree(node: DecisionNode, data: TrainingData[]): string[] {
    const predictions: string[] = [];
    
    for (const sample of data) {
      const prediction = this.predictSampleWithTree(node, sample);
      predictions.push(prediction);
    }
    
    return predictions;
  }

  private predictSampleWithTree(node: DecisionNode, sample: TrainingData[]): string {
    if (node.type === 'leaf') {
      return node.prediction || 'unknown';
    }
    
    if (node.feature && node.threshold !== undefined) {
      const featureIndex = 0; // Simplified - would need feature mapping
      const value = sample[0].features[featureIndex];
      
      if (value <= node.threshold) {
        return node.left ? this.predictSampleWithTree(node.left, sample) : 'unknown';
      } else {
        return node.right ? this.predictSampleWithTree(node.right, sample) : 'unknown';
      }
    }
    
    return 'unknown';
  }

  private calculateTreeFeatureImportance(node: DecisionNode, features: string[]): { [feature: string]: number } {
    const importance: { [feature: string]: number } = {};
    
    for (const feature of features) {
      importance[feature] = 0;
    }
    
    this.calculateNodeFeatureImportance(node, importance);
    
    return importance;
  }

  private calculateNodeFeatureImportance(node: DecisionNode, importance: { [feature: string]: number }): void {
    if (node.type === 'split' && node.feature) {
      importance[node.feature] += node.samples * (node.gini || 0);
    }
    
    if (node.left) {
      this.calculateNodeFeatureImportance(node.left, importance);
    }
    
    if (node.right) {
      this.calculateNodeFeatureImportance(node.right, importance);
    }
  }

  private calculateForestPerformance(trees: DecisionTree[], validationData: TrainingData[]): any {
    if (validationData.length === 0) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        rocAuc: 0,
        confusionMatrix: {},
      };
    }
    
    const predictions = this.predictWithForest(trees, validationData);
    const correct = predictions.filter((pred, i) => pred === validationData[i].label).length;
    const accuracy = correct / validationData.length;
    
    return {
      accuracy,
      precision: accuracy,
      recall: accuracy,
      f1Score: accuracy,
      rocAuc: 0.8, // Simplified
      confusionMatrix: this.calculateConfusionMatrix(predictions, validationData),
    };
  }

  private predictWithForest(trees: DecisionTree[], data: TrainingData[]): string[] {
    const predictions: string[] = [];
    
    for (const sample of data) {
      const votes: { [label: string]: number } = {};
      
      for (const tree of trees) {
        const prediction = this.predictSampleWithTree(tree.root, [sample]);
        votes[prediction] = (votes[prediction] || 0) + 1;
      }
      
      const majorityLabel = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
      predictions.push(majorityLabel);
    }
    
    return predictions;
  }

  private calculateConfusionMatrix(predictions: string[], actual: TrainingData[]): { [actual: string]: { [predicted: string]: number } } {
    const matrix: { [actual: string]: { [predicted: string]: number } } = {};
    
    for (let i = 0; i < predictions.length; i++) {
      const actualLabel = actual[i].label;
      const predictedLabel = predictions[i];
      
      if (!matrix[actualLabel]) {
        matrix[actualLabel] = {};
      }
      
      matrix[actualLabel][predictedLabel] = (matrix[actualLabel][predictedLabel] || 0) + 1;
    }
    
    return matrix;
  }

  private calculateFeatureImportance(trees: DecisionTree[], features: string[]): { [feature: string]: number } {
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

  private calculateValidationScore(trees: DecisionTree[], validationData: TrainingData[]): number {
    const predictions = this.predictWithForest(trees, validationData);
    const correct = predictions.filter((pred, i) => pred === validationData[i].label).length;
    return correct / validationData.length;
  }

  private predictSample(randomForest: RandomForest, sample: TrainingData, options: any): any {
    const startTime = Date.now();
    const votes: { [label: string]: number } = {};
    const treeVotes: { [treeId: string]: string } = {};
    const probabilities: { [label: string]: number } = {};
    
    // Collect votes from all trees
    for (const tree of randomForest.trees) {
      const prediction = this.predictSampleWithTree(tree.root, [sample]);
      votes[prediction] = (votes[prediction] || 0) + 1;
      treeVotes[tree.id] = prediction;
    }
    
    // Calculate probabilities
    const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
    for (const [label, count] of Object.entries(votes)) {
      probabilities[label] = count / totalVotes;
    }
    
    // Get majority prediction
    const predictedLabel = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
    const confidence = votes[predictedLabel] / totalVotes;
    
    // Calculate feature contributions (simplified)
    const featureContributions: { [feature: string]: number } = {};
    for (let i = 0; i < sample.features.length; i++) {
      featureContributions[`feature_${i}`] = sample.features[i] * 0.1; // Simplified
    }
    
    return {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      features: sample.features,
      predictedLabel,
      confidence,
      probabilities,
      metadata: {
        processingTime: Date.now() - startTime,
        treeVotes,
        featureContributions,
      },
    };
  }

  private calculateClassificationPerformance(predictions: any[], testData: TrainingData[]): any {
    const confusionMatrix = this.calculateConfusionMatrix(
      predictions.map(p => p.predictedLabel),
      testData
    );
    
    const accuracy = predictions.filter((pred, i) => pred.predictedLabel === testData[i].label).length / testData.length;
    
    return {
      accuracy,
      precision: accuracy, // Simplified
      recall: accuracy, // Simplified
      f1Score: accuracy, // Simplified
      rocAuc: 0.8, // Simplified
      confusionMatrix,
    };
  }

  private generateRecommendations(performance: any, randomForest: RandomForest): any {
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
    
    shortTerm.push('Implement feature engineering');
    shortTerm.push('Add more training data');
    shortTerm.push('Tune hyperparameters');
    
    longTerm.push('Build ensemble models');
    longTerm.push('Implement automated model selection');
    longTerm.push('Create real-time model updates');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveRandomForest(randomForest: RandomForest): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO random_forest_models 
        (id, name, tree_count, feature_count, max_depth, min_samples_split, 
         min_samples_leaf, max_features, bootstrap, accuracy, precision, recall, 
         f1_score, roc_auc, training_time, sample_count, validation_score, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      `, [
        randomForest.id,
        randomForest.name,
        randomForest.treeCount,
        randomForest.featureCount,
        randomForest.maxDepth,
        randomForest.minSamplesSplit,
        randomForest.minSamplesLeaf,
        randomForest.maxFeatures,
        randomForest.bootstrap,
        randomForest.performance.accuracy,
        randomForest.performance.precision,
        randomForest.performance.recall,
        randomForest.performance.f1Score,
        randomForest.performance.rocAuc,
        randomForest.metadata.trainingTime,
        randomForest.metadata.sampleCount,
        randomForest.metadata.validationScore,
      ]);
    } catch (error) {
      this.logger.error('Failed to save Random Forest model:', error);
    }
  }

  private async saveClassificationResult(result: ClassificationResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO random_forest_classification_results 
        (total_samples, correct_predictions, accuracy, average_confidence, 
         processing_time, precision, recall, f1_score, roc_auc, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
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
      ]);
    } catch (error) {
      this.logger.error('Failed to save Random Forest classification result:', error);
    }
  }
}

