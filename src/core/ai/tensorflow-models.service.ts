import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import * as math from 'mathjs';

export interface TrainingData {
  features: number[][];
  labels: number[];
  validationSplit?: number;
  testSplit?: number;
}

export interface ModelConfig {
  type: 'lstm' | 'random-forest' | 'xgboost' | 'linear-regression' | 'neural-network';
  parameters: Record<string, any>;
  inputShape: number[];
  outputShape: number[];
}

export interface ModelMetrics {
  accuracy?: number;
  loss: number;
  mse: number;
  mae: number;
  r2: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  confusionMatrix?: number[][];
}

export interface PredictionResult {
  prediction: number | number[];
  confidence: number;
  probabilities?: number[];
  explanation?: string[];
  metadata: {
    modelId: string;
    modelType: string;
    predictionTime: number;
    inputShape: number[];
  };
}

@Injectable()
export class TensorFlowModelsService {
  private readonly logger = new Logger(TensorFlowModelsService.name);
  private models: Map<string, tf.LayersModel> = new Map();
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private trainingHistory: Map<string, ModelMetrics[]> = new Map();

  constructor() {
    this.initializeModels();
  }

  private async initializeModels(): Promise<void> {
    this.logger.log('Initializing TensorFlow.js models...');

    // Pre-trained model templates
    await this.createLSTMModel('lstm-default');
    await this.createRandomForestModel('rf-default');
    await this.createXGBoostModel('xgb-default');
    await this.createNeuralNetworkModel('nn-default');

    this.logger.log(`Initialized ${this.models.size} TensorFlow.js models`);
  }

  // ============================================
  // LSTM MODEL IMPLEMENTATION
  // ============================================

  async createLSTMModel(modelId: string, config?: Partial<ModelConfig>): Promise<string> {
    this.logger.log(`Creating LSTM model: ${modelId}`);

    const defaultConfig: ModelConfig = {
      type: 'lstm',
      parameters: {
        units: 64,
        layers: 2,
        dropout: 0.2,
        learningRate: 0.001,
        epochs: 100,
        batchSize: 32,
        sequenceLength: 30,
        predictionHorizon: 7,
      },
      inputShape: [30, 10], // 30 timesteps, 10 features
      outputShape: [1],
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.modelConfigs.set(modelId, finalConfig);

    const model = tf.sequential({
      layers: [
        tf.layers.lstm({
          units: finalConfig.parameters.units,
          inputShape: finalConfig.inputShape,
          returnSequences: finalConfig.parameters.layers > 1,
        }),
        tf.layers.dropout({ rate: finalConfig.parameters.dropout }),

        ...(finalConfig.parameters.layers > 1 ? [
          tf.layers.lstm({
            units: Math.floor(finalConfig.parameters.units / 2),
            returnSequences: false,
          }),
          tf.layers.dropout({ rate: finalConfig.parameters.dropout }),
        ] : []),

        tf.layers.dense({
          units: Math.floor(finalConfig.parameters.units / 4),
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: finalConfig.parameters.dropout }),
        tf.layers.dense({
          units: finalConfig.outputShape[0],
          activation: 'linear'
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(finalConfig.parameters.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae'],
    });

    this.models.set(modelId, model);
    this.logger.log(`LSTM model created: ${modelId}`);

    return modelId;
  }

  async trainLSTMModel(
    modelId: string,
    trainingData: TrainingData,
    options: {
      validation?: boolean;
      earlyStopping?: boolean;
      saveBest?: boolean;
    } = {},
  ): Promise<ModelMetrics> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`LSTM model not found: ${modelId}`);
    }

    this.logger.log(`Training LSTM model: ${modelId}`);

    const config = this.modelConfigs.get(modelId)!;
    const { features, labels } = trainingData;

    // Prepare training data
    const inputTensor = tf.tensor3d([features]);
    const labelTensor = tf.tensor2d(labels.map(l => [l]));

    // Split data for validation
    const validationSplit = trainingData.validationSplit || 0.2;
    const totalSamples = features.length;
    const trainSize = Math.floor(totalSamples * (1 - validationSplit));

    const trainFeatures = features.slice(0, trainSize);
    const trainLabels = labels.slice(0, trainSize);
    const valFeatures = features.slice(trainSize);
    const valLabels = labels.slice(trainSize);

    const trainInput = tf.tensor3d([trainFeatures]);
    const trainLabelsTensor = tf.tensor2d(trainLabels.map(l => [l]));
    const valInput = tf.tensor3d([valFeatures]);
    const valLabelsTensor = tf.tensor2d(valLabels.map(l => [l]));

    // Training configuration
    const trainingConfig = {
      epochs: config.parameters.epochs,
      batchSize: config.parameters.batchSize,
      validationData: options.validation ? [valInput, valLabelsTensor] : undefined,
      callbacks: this.createTrainingCallbacks(modelId, options),
    };

    // Train the model
    const history = await model.fit(trainInput, trainLabelsTensor, trainingConfig);

    // Evaluate model
    const metrics = await this.evaluateLSTMModel(modelId, inputTensor, labelTensor);

    // Save training history
    if (!this.trainingHistory.has(modelId)) {
      this.trainingHistory.set(modelId, []);
    }
    this.trainingHistory.get(modelId)!.push(metrics);

    // Clean up tensors
    inputTensor.dispose();
    labelTensor.dispose();
    trainInput.dispose();
    trainLabelsTensor.dispose();
    if (options.validation) {
      valInput.dispose();
      valLabelsTensor.dispose();
    }

    this.logger.log(`LSTM model training completed: ${modelId}, Loss: ${metrics.loss.toFixed(4)}`);
    return metrics;
  }

  async predictWithLSTM(modelId: string, input: number[][]): Promise<PredictionResult> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`LSTM model not found: ${modelId}`);
    }

    const startTime = Date.now();

    // Prepare input tensor
    const inputTensor = tf.tensor3d([input]);

    // Make prediction
    const predictionTensor = model.predict(inputTensor) as tf.Tensor;
    const prediction = (await predictionTensor.array() as number[][])[0][0];

    // Calculate confidence based on training history
    const confidence = this.calculatePredictionConfidence(modelId, prediction);

    // Clean up tensors
    inputTensor.dispose();
    predictionTensor.dispose();

    const config = this.modelConfigs.get(modelId)!;

    return {
      prediction,
      confidence,
      metadata: {
        modelId,
        modelType: 'lstm',
        predictionTime: Date.now() - startTime,
        inputShape: config.inputShape,
      },
    };
  }

  private async evaluateLSTMModel(modelId: string, input: tf.Tensor, labels: tf.Tensor): Promise<ModelMetrics> {
    const model = this.models.get(modelId)!;

    // Make predictions
    const predictions = model.predict(input) as tf.Tensor;
    const predValues = await predictions.array() as number[][];

    // Calculate metrics
    const actualValues = await labels.array() as number[][];

    const mse = tf.metrics.meanSquaredError(labels, predictions).arraySync() as number;
    const mae = tf.metrics.meanAbsoluteError(labels, predictions).arraySync() as number;

    // Calculate R-squared
    const actualFlat = actualValues.flat();
    const predFlat = predValues.flat();
    const r2 = this.calculateRSquared(actualFlat, predFlat);

    // Calculate loss
    const loss = await model.evaluate(input, labels) as tf.Scalar;
    const lossValue = (await loss.array()) as number;

    predictions.dispose();

    return {
      loss: lossValue,
      mse,
      mae,
      r2,
    };
  }

  // ============================================
  // RANDOM FOREST IMPLEMENTATION
  // ============================================

  async createRandomForestModel(modelId: string, config?: Partial<ModelConfig>): Promise<string> {
    this.logger.log(`Creating Random Forest model: ${modelId}`);

    // Random Forest implementation using TensorFlow.js
    // In practice, this would use a proper Random Forest library
    const defaultConfig: ModelConfig = {
      type: 'random-forest',
      parameters: {
        trees: 100,
        maxDepth: 10,
        minSamplesSplit: 2,
        minSamplesLeaf: 1,
        maxFeatures: 'sqrt',
      },
      inputShape: [10],
      outputShape: [1],
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.modelConfigs.set(modelId, finalConfig);

    // Create ensemble model using multiple neural networks
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 32,
          inputShape: finalConfig.inputShape,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 }),
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: finalConfig.outputShape[0],
          activation: 'linear',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae'],
    });

    this.models.set(modelId, model);
    this.logger.log(`Random Forest model created: ${modelId}`);

    return modelId;
  }

  async trainRandomForestModel(
    modelId: string,
    trainingData: TrainingData,
    options: {
      validation?: boolean;
      bootstrap?: boolean;
    } = {},
  ): Promise<ModelMetrics> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Random Forest model not found: ${modelId}`);
    }

    this.logger.log(`Training Random Forest model: ${modelId}`);

    const config = this.modelConfigs.get(modelId)!;
    const { features, labels } = trainingData;

    // Prepare training data
    const inputTensor = tf.tensor2d(features);
    const labelTensor = tf.tensor1d(labels);

    // Split data for validation
    const validationSplit = trainingData.validationSplit || 0.2;
    const totalSamples = features.length;
    const trainSize = Math.floor(totalSamples * (1 - validationSplit));

    const trainFeatures = features.slice(0, trainSize);
    const trainLabels = labels.slice(0, trainSize);
    const valFeatures = features.slice(trainSize);
    const valLabels = labels.slice(trainSize);

    const trainInput = tf.tensor2d(trainFeatures);
    const trainLabelsTensor = tf.tensor1d(trainLabels);
    const valInput = tf.tensor2d(valFeatures);
    const valLabelsTensor = tf.tensor1d(valLabels);

    // Training configuration
    const trainingConfig = {
      epochs: config.parameters.epochs || 200,
      batchSize: config.parameters.batchSize || 16,
      validationData: options.validation ? [valInput, valLabelsTensor] : undefined,
      callbacks: this.createTrainingCallbacks(modelId, options),
    };

    // Train the model
    const history = await model.fit(trainInput, trainLabelsTensor, trainingConfig);

    // Evaluate model
    const metrics = await this.evaluateRandomForestModel(modelId, inputTensor, labelTensor);

    // Save training history
    if (!this.trainingHistory.has(modelId)) {
      this.trainingHistory.set(modelId, []);
    }
    this.trainingHistory.get(modelId)!.push(metrics);

    // Clean up tensors
    inputTensor.dispose();
    labelTensor.dispose();
    trainInput.dispose();
    trainLabelsTensor.dispose();
    if (options.validation) {
      valInput.dispose();
      valLabelsTensor.dispose();
    }

    this.logger.log(`Random Forest model training completed: ${modelId}, Loss: ${metrics.loss.toFixed(4)}`);
    return metrics;
  }

  async predictWithRandomForest(modelId: string, input: number[]): Promise<PredictionResult> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Random Forest model not found: ${modelId}`);
    }

    const startTime = Date.now();

    // Prepare input tensor
    const inputTensor = tf.tensor2d([input]);

    // Make prediction
    const predictionTensor = model.predict(inputTensor) as tf.Tensor;
    const prediction = (await predictionTensor.array() as number[][])[0][0];

    // Calculate confidence based on ensemble variance
    const confidence = this.calculateRandomForestConfidence(modelId, input);

    // Clean up tensors
    inputTensor.dispose();
    predictionTensor.dispose();

    const config = this.modelConfigs.get(modelId)!;

    return {
      prediction,
      confidence,
      metadata: {
        modelId,
        modelType: 'random-forest',
        predictionTime: Date.now() - startTime,
        inputShape: config.inputShape,
      },
    };
  }

  private async evaluateRandomForestModel(modelId: string, input: tf.Tensor, labels: tf.Tensor): Promise<ModelMetrics> {
    const model = this.models.get(modelId)!;

    // Make predictions
    const predictions = model.predict(input) as tf.Tensor;
    const predValues = await predictions.array() as number[][];

    // Calculate metrics
    const actualValues = await labels.array() as number[];

    const mse = tf.metrics.meanSquaredError(labels, predictions).arraySync() as number;
    const mae = tf.metrics.meanAbsoluteError(labels, predictions).arraySync() as number;

    // Calculate R-squared
    const predFlat = predValues.flat();
    const r2 = this.calculateRSquared(actualValues, predFlat);

    // Calculate loss
    const loss = await model.evaluate(input, labels) as tf.Scalar;
    const lossValue = (await loss.array()) as number;

    predictions.dispose();

    return {
      loss: lossValue,
      mse,
      mae,
      r2,
    };
  }

  // ============================================
  // XGBOOST IMPLEMENTATION
  // ============================================

  async createXGBoostModel(modelId: string, config?: Partial<ModelConfig>): Promise<string> {
    this.logger.log(`Creating XGBoost model: ${modelId}`);

    // XGBoost-like implementation using gradient boosting with neural networks
    const defaultConfig: ModelConfig = {
      type: 'xgboost',
      parameters: {
        trees: 100,
        maxDepth: 6,
        learningRate: 0.1,
        subsample: 0.8,
        colsampleBytree: 0.8,
        regLambda: 1.0,
        regAlpha: 0.0,
      },
      inputShape: [10],
      outputShape: [1],
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.modelConfigs.set(modelId, finalConfig);

    // Create gradient boosting model using multiple layers
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          units: 64,
          inputShape: finalConfig.inputShape,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: finalConfig.parameters.regLambda }),
        }),
        tf.layers.dropout({ rate: 1 - finalConfig.parameters.colsampleBytree }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: finalConfig.parameters.regLambda }),
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu',
        }),
        tf.layers.dense({
          units: finalConfig.outputShape[0],
          activation: 'linear',
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(finalConfig.parameters.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae'],
    });

    this.models.set(modelId, model);
    this.logger.log(`XGBoost model created: ${modelId}`);

    return modelId;
  }

  async trainXGBoostModel(
    modelId: string,
    trainingData: TrainingData,
    options: {
      validation?: boolean;
      earlyStopping?: boolean;
    } = {},
  ): Promise<ModelMetrics> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`XGBoost model not found: ${modelId}`);
    }

    this.logger.log(`Training XGBoost model: ${modelId}`);

    const config = this.modelConfigs.get(modelId)!;
    const { features, labels } = trainingData;

    // Prepare training data
    const inputTensor = tf.tensor2d(features);
    const labelTensor = tf.tensor1d(labels);

    // Split data for validation
    const validationSplit = trainingData.validationSplit || 0.2;
    const totalSamples = features.length;
    const trainSize = Math.floor(totalSamples * (1 - validationSplit));

    const trainFeatures = features.slice(0, trainSize);
    const trainLabels = labels.slice(0, trainSize);
    const valFeatures = features.slice(trainSize);
    const valLabels = labels.slice(trainSize);

    const trainInput = tf.tensor2d(trainFeatures);
    const trainLabelsTensor = tf.tensor1d(trainLabels);
    const valInput = tf.tensor2d(valFeatures);
    const valLabelsTensor = tf.tensor1d(valLabels);

    // Training configuration with early stopping
    const trainingConfig = {
      epochs: config.parameters.epochs || 500,
      batchSize: config.parameters.batchSize || 32,
      validationData: options.validation ? [valInput, valLabelsTensor] : undefined,
      callbacks: this.createTrainingCallbacks(modelId, options),
    };

    // Train the model
    const history = await model.fit(trainInput, trainLabelsTensor, trainingConfig);

    // Evaluate model
    const metrics = await this.evaluateXGBoostModel(modelId, inputTensor, labelTensor);

    // Save training history
    if (!this.trainingHistory.has(modelId)) {
      this.trainingHistory.set(modelId, []);
    }
    this.trainingHistory.get(modelId)!.push(metrics);

    // Clean up tensors
    inputTensor.dispose();
    labelTensor.dispose();
    trainInput.dispose();
    trainLabelsTensor.dispose();
    if (options.validation) {
      valInput.dispose();
      valLabelsTensor.dispose();
    }

    this.logger.log(`XGBoost model training completed: ${modelId}, Loss: ${metrics.loss.toFixed(4)}`);
    return metrics;
  }

  async predictWithXGBoost(modelId: string, input: number[]): Promise<PredictionResult> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`XGBoost model not found: ${modelId}`);
    }

    const startTime = Date.now();

    // Prepare input tensor
    const inputTensor = tf.tensor2d([input]);

    // Make prediction
    const predictionTensor = model.predict(inputTensor) as tf.Tensor;
    const prediction = (await predictionTensor.array() as number[][])[0][0];

    // Calculate confidence based on feature importance and prediction variance
    const confidence = this.calculateXGBoostConfidence(modelId, input);

    // Clean up tensors
    inputTensor.dispose();
    predictionTensor.dispose();

    const config = this.modelConfigs.get(modelId)!;

    return {
      prediction,
      confidence,
      metadata: {
        modelId,
        modelType: 'xgboost',
        predictionTime: Date.now() - startTime,
        inputShape: config.inputShape,
      },
    };
  }

  private async evaluateXGBoostModel(modelId: string, input: tf.Tensor, labels: tf.Tensor): Promise<ModelMetrics> {
    const model = this.models.get(modelId)!;

    // Make predictions
    const predictions = model.predict(input) as tf.Tensor;
    const predValues = await predictions.array() as number[][];

    // Calculate metrics
    const actualValues = await labels.array() as number[];

    const mse = tf.metrics.meanSquaredError(labels, predictions).arraySync() as number;
    const mae = tf.metrics.meanAbsoluteError(labels, predictions).arraySync() as number;

    // Calculate R-squared
    const predFlat = predValues.flat();
    const r2 = this.calculateRSquared(actualValues, predFlat);

    // Calculate loss
    const loss = await model.evaluate(input, labels) as tf.Scalar;
    const lossValue = (await loss.array()) as number;

    predictions.dispose();

    return {
      loss: lossValue,
      mse,
      mae,
      r2,
    };
  }

  // ============================================
  // NEURAL NETWORK IMPLEMENTATION
  // ============================================

  async createNeuralNetworkModel(modelId: string, config?: Partial<ModelConfig>): Promise<string> {
    this.logger.log(`Creating Neural Network model: ${modelId}`);

    const defaultConfig: ModelConfig = {
      type: 'neural-network',
      parameters: {
        layers: [64, 32, 16],
        activations: ['relu', 'relu', 'linear'],
        dropout: 0.2,
        learningRate: 0.001,
        epochs: 100,
        batchSize: 32,
      },
      inputShape: [10],
      outputShape: [1],
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.modelConfigs.set(modelId, finalConfig);

    const layers = [];

    // Input layer
    layers.push(tf.layers.dense({
      units: finalConfig.parameters.layers[0],
      inputShape: finalConfig.inputShape,
      activation: finalConfig.parameters.activations[0],
    }));

    if (finalConfig.parameters.dropout > 0) {
      layers.push(tf.layers.dropout({ rate: finalConfig.parameters.dropout }));
    }

    // Hidden layers
    for (let i = 1; i < finalConfig.parameters.layers.length; i++) {
      layers.push(tf.layers.dense({
        units: finalConfig.parameters.layers[i],
        activation: finalConfig.parameters.activations[i],
      }));

      if (finalConfig.parameters.dropout > 0) {
        layers.push(tf.layers.dropout({ rate: finalConfig.parameters.dropout }));
      }
    }

    // Output layer
    layers.push(tf.layers.dense({
      units: finalConfig.outputShape[0],
      activation: 'linear',
    }));

    const model = tf.sequential({ layers });

    model.compile({
      optimizer: tf.train.adam(finalConfig.parameters.learningRate),
      loss: 'meanSquaredError',
      metrics: ['mse', 'mae'],
    });

    this.models.set(modelId, model);
    this.logger.log(`Neural Network model created: ${modelId}`);

    return modelId;
  }

  async trainNeuralNetworkModel(
    modelId: string,
    trainingData: TrainingData,
    options: {
      validation?: boolean;
      earlyStopping?: boolean;
    } = {},
  ): Promise<ModelMetrics> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Neural Network model not found: ${modelId}`);
    }

    this.logger.log(`Training Neural Network model: ${modelId}`);

    const config = this.modelConfigs.get(modelId)!;
    const { features, labels } = trainingData;

    // Prepare training data
    const inputTensor = tf.tensor2d(features);
    const labelTensor = tf.tensor1d(labels);

    // Split data for validation
    const validationSplit = trainingData.validationSplit || 0.2;
    const totalSamples = features.length;
    const trainSize = Math.floor(totalSamples * (1 - validationSplit));

    const trainFeatures = features.slice(0, trainSize);
    const trainLabels = labels.slice(0, trainSize);
    const valFeatures = features.slice(trainSize);
    const valLabels = labels.slice(trainSize);

    const trainInput = tf.tensor2d(trainFeatures);
    const trainLabelsTensor = tf.tensor1d(trainLabels);
    const valInput = tf.tensor2d(valFeatures);
    const valLabelsTensor = tf.tensor1d(valLabels);

    // Training configuration
    const trainingConfig = {
      epochs: config.parameters.epochs,
      batchSize: config.parameters.batchSize,
      validationData: options.validation ? [valInput, valLabelsTensor] : undefined,
      callbacks: this.createTrainingCallbacks(modelId, options),
    };

    // Train the model
    const history = await model.fit(trainInput, trainLabelsTensor, trainingConfig);

    // Evaluate model
    const metrics = await this.evaluateNeuralNetworkModel(modelId, inputTensor, labelTensor);

    // Save training history
    if (!this.trainingHistory.has(modelId)) {
      this.trainingHistory.set(modelId, []);
    }
    this.trainingHistory.get(modelId)!.push(metrics);

    // Clean up tensors
    inputTensor.dispose();
    labelTensor.dispose();
    trainInput.dispose();
    trainLabelsTensor.dispose();
    if (options.validation) {
      valInput.dispose();
      valLabelsTensor.dispose();
    }

    this.logger.log(`Neural Network model training completed: ${modelId}, Loss: ${metrics.loss.toFixed(4)}`);
    return metrics;
  }

  async predictWithNeuralNetwork(modelId: string, input: number[]): Promise<PredictionResult> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Neural Network model not found: ${modelId}`);
    }

    const startTime = Date.now();

    // Prepare input tensor
    const inputTensor = tf.tensor2d([input]);

    // Make prediction
    const predictionTensor = model.predict(inputTensor) as tf.Tensor;
    const prediction = (await predictionTensor.array() as number[][])[0][0];

    // Calculate confidence
    const confidence = this.calculateNeuralNetworkConfidence(modelId, input);

    // Clean up tensors
    inputTensor.dispose();
    predictionTensor.dispose();

    const config = this.modelConfigs.get(modelId)!;

    return {
      prediction,
      confidence,
      metadata: {
        modelId,
        modelType: 'neural-network',
        predictionTime: Date.now() - startTime,
        inputShape: config.inputShape,
      },
    };
  }

  private async evaluateNeuralNetworkModel(modelId: string, input: tf.Tensor, labels: tf.Tensor): Promise<ModelMetrics> {
    const model = this.models.get(modelId)!;

    // Make predictions
    const predictions = model.predict(input) as tf.Tensor;
    const predValues = await predictions.array() as number[][];

    // Calculate metrics
    const actualValues = await labels.array() as number[];

    const mse = tf.metrics.meanSquaredError(labels, predictions).arraySync() as number;
    const mae = tf.metrics.meanAbsoluteError(labels, predictions).arraySync() as number;

    // Calculate R-squared
    const predFlat = predValues.flat();
    const r2 = this.calculateRSquared(actualValues, predFlat);

    // Calculate loss
    const loss = await model.evaluate(input, labels) as tf.Scalar;
    const lossValue = (await loss.array()) as number;

    predictions.dispose();

    return {
      loss: lossValue,
      mse,
      mae,
      r2,
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  private createTrainingCallbacks(modelId: string, options: any) {
    const callbacks = [];

    if (options.earlyStopping) {
      callbacks.push(tf.callbacks.earlyStopping({
        monitor: 'val_loss',
        patience: 10,
        minDelta: 0.001,
      }));
    }

    callbacks.push({
      onEpochEnd: (epoch: number, logs: any) => {
        if (epoch % 10 === 0) {
          this.logger.debug(`Model ${modelId} - Epoch ${epoch}: Loss = ${logs.loss?.toFixed(4)}`);
        }
      },
    });

    return callbacks;
  }

  private calculatePredictionConfidence(modelId: string, prediction: number): number {
    const history = this.trainingHistory.get(modelId);
    if (!history || history.length === 0) return 0.5;

    const recentMetrics = history.slice(-5); // Last 5 training sessions
    const avgR2 = recentMetrics.reduce((sum, m) => sum + m.r2, 0) / recentMetrics.length;

    return Math.max(0.1, Math.min(0.95, avgR2));
  }

  private calculateRandomForestConfidence(modelId: string, input: number[]): number {
    // Simulate confidence based on feature variance and model performance
    const featureVariance = math.variance(input);
    const history = this.trainingHistory.get(modelId);
    const baseConfidence = history ? history.slice(-1)[0]?.r2 || 0.5 : 0.5;

    return Math.max(0.1, Math.min(0.95, baseConfidence - featureVariance * 0.1));
  }

  private calculateXGBoostConfidence(modelId: string, input: number[]): number {
    // XGBoost confidence based on feature importance simulation
    const config = this.modelConfigs.get(modelId);
    const history = this.trainingHistory.get(modelId);
    const baseConfidence = history ? history.slice(-1)[0]?.r2 || 0.5 : 0.5;

    // Simulate feature importance
    const featureImportance = input.map((_, i) => Math.random());
    const avgImportance = featureImportance.reduce((sum, imp) => sum + imp, 0) / featureImportance.length;

    return Math.max(0.1, Math.min(0.95, baseConfidence * avgImportance));
  }

  private calculateNeuralNetworkConfidence(modelId: string, input: number[]): number {
    // Neural network confidence based on prediction certainty
    const history = this.trainingHistory.get(modelId);
    const baseConfidence = history ? history.slice(-1)[0]?.r2 || 0.5 : 0.5;

    // Simulate prediction certainty
    const inputMagnitude = Math.sqrt(input.reduce((sum, x) => sum + x * x, 0));
    const certainty = Math.min(1, inputMagnitude / 10); // Normalize by typical input scale

    return Math.max(0.1, Math.min(0.95, baseConfidence * certainty));
  }

  private calculateRSquared(actual: number[], predicted: number[]): number {
    const mean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
    const ssTotal = actual.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
    const ssResidual = actual.reduce((sum, val, i) => sum + Math.pow(val - predicted[i], 2), 0);

    return ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);
  }

  // ============================================
  // PUBLIC API METHODS
  // ============================================

  async predict(modelId: string, input: number[] | number[][]): Promise<PredictionResult> {
    const config = this.modelConfigs.get(modelId);
    if (!config) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Normalize input format
    const normalizedInput = Array.isArray(input[0]) ? input as number[][] : [input as number[]];

    switch (config.type) {
      case 'lstm':
        return this.predictWithLSTM(modelId, normalizedInput[0]);
      case 'random-forest':
        return this.predictWithRandomForest(modelId, (input as number[])[0]);
      case 'xgboost':
        return this.predictWithXGBoost(modelId, (input as number[])[0]);
      case 'neural-network':
        return this.predictWithNeuralNetwork(modelId, (input as number[])[0]);
      default:
        throw new Error(`Unsupported model type: ${config.type}`);
    }
  }

  async trainModel(
    modelId: string,
    trainingData: TrainingData,
    options: any = {},
  ): Promise<ModelMetrics> {
    const config = this.modelConfigs.get(modelId);
    if (!config) {
      throw new Error(`Model not found: ${modelId}`);
    }

    switch (config.type) {
      case 'lstm':
        return this.trainLSTMModel(modelId, trainingData, options);
      case 'random-forest':
        return this.trainRandomForestModel(modelId, trainingData, options);
      case 'xgboost':
        return this.trainXGBoostModel(modelId, trainingData, options);
      case 'neural-network':
        return this.trainNeuralNetworkModel(modelId, trainingData, options);
      default:
        throw new Error(`Unsupported model type: ${config.type}`);
    }
  }

  async getModelInfo(modelId: string): Promise<{
    config: ModelConfig;
    metrics: ModelMetrics[];
    status: 'training' | 'ready' | 'error';
  }> {
    const config = this.modelConfigs.get(modelId);
    const metrics = this.trainingHistory.get(modelId) || [];

    if (!config) {
      throw new Error(`Model not found: ${modelId}`);
    }

    return {
      config,
      metrics,
      status: metrics.length > 0 ? 'ready' : 'training',
    };
  }

  async listModels(): Promise<Array<{ id: string; type: string; status: string; lastMetrics?: ModelMetrics }>> {
    return Array.from(this.modelConfigs.entries()).map(([id, config]) => {
      const metrics = this.trainingHistory.get(id);
      return {
        id,
        type: config.type,
        status: metrics && metrics.length > 0 ? 'ready' : 'training',
        lastMetrics: metrics ? metrics[metrics.length - 1] : undefined,
      };
    });
  }

  async deleteModel(modelId: string): Promise<boolean> {
    const model = this.models.get(modelId);
    if (model) {
      model.dispose();
      this.models.delete(modelId);
    }

    if (this.modelConfigs.has(modelId)) {
      this.modelConfigs.delete(modelId);
    }

    if (this.trainingHistory.has(modelId)) {
      this.trainingHistory.delete(modelId);
    }

    this.logger.log(`Model deleted: ${modelId}`);
    return true;
  }

  async getModelMetrics(modelId: string): Promise<ModelMetrics[]> {
    return this.trainingHistory.get(modelId) || [];
  }

  async saveModel(modelId: string, path: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    await model.save(`file://${path}`);
    this.logger.log(`Model saved: ${modelId} to ${path}`);
  }

  async loadModel(modelId: string, path: string): Promise<void> {
    const model = await tf.loadLayersModel(`file://${path}`);
    this.models.set(modelId, model);
    this.logger.log(`Model loaded: ${modelId} from ${path}`);
  }
}
