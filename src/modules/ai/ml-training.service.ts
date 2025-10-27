import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../core/events/event-bus.service';

// TensorFlow is optional
let tf: any = null;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (error) {
  console.warn('TensorFlow.js not available - ML training features will be limited');
}

interface TrainingData {
  features: number[][];
  labels: number[];
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  loss: number;
}

@Injectable()
export class MLTrainingService {
  private readonly logger = new Logger(MLTrainingService.name);
  private models: Map<string, tf.LayersModel> = new Map();

  constructor(private readonly eventBus: EventBusService) {}

  // Churn Prediction Model
  async trainChurnModel(trainingData: TrainingData): Promise<ModelMetrics> {
    this.logger.log('Starting churn prediction model training...');

    const { features, labels } = trainingData;

    // Create tensors
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels.map(l => [l]));

    // Define model architecture
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [features[0].length], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall'],
    });

    // Train model
    const history = await model.fit(xs, ys, {
      epochs: 100,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            this.logger.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}`);
          }
        },
      },
    });

    // Save model
    await model.save('file://./models/churn-prediction');
    this.models.set('churn', model);

    // Calculate metrics
    const finalLogs = history.history;
    const metrics: ModelMetrics = {
      accuracy: finalLogs.acc[finalLogs.acc.length - 1] as number,
      precision: finalLogs.precision ? finalLogs.precision[finalLogs.precision.length - 1] as number : 0,
      recall: finalLogs.recall ? finalLogs.recall[finalLogs.recall.length - 1] as number : 0,
      f1Score: 0,
      loss: finalLogs.loss[finalLogs.loss.length - 1] as number,
    };

    metrics.f1Score = (2 * metrics.precision * metrics.recall) / (metrics.precision + metrics.recall);

    // Clean up
    xs.dispose();
    ys.dispose();

    await this.eventBus.emit('ml.model.trained', {
      modelType: 'churn',
      metrics,
    });

    this.logger.log(`Churn model training complete. Accuracy: ${(metrics.accuracy * 100).toFixed(2)}%`);

    return metrics;
  }

  // Fraud Detection Model
  async trainFraudDetectionModel(trainingData: TrainingData): Promise<ModelMetrics> {
    this.logger.log('Starting fraud detection model training...');

    const { features, labels } = trainingData;

    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels.map(l => [l]));

    // Model for imbalanced data (fraud detection)
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [features[0].length], units: 128, activation: 'relu' }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.4 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall'],
    });

    // Train with class weights for imbalanced data
    const history = await model.fit(xs, ys, {
      epochs: 150,
      batchSize: 64,
      validationSplit: 0.2,
      classWeight: { 0: 1, 1: 10 }, // Higher weight for fraud class
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 20 === 0) {
            this.logger.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}`);
          }
        },
      },
    });

    await model.save('file://./models/fraud-detection');
    this.models.set('fraud', model);

    const finalLogs = history.history;
    const metrics: ModelMetrics = {
      accuracy: finalLogs.acc[finalLogs.acc.length - 1] as number,
      precision: finalLogs.precision ? finalLogs.precision[finalLogs.precision.length - 1] as number : 0,
      recall: finalLogs.recall ? finalLogs.recall[finalLogs.recall.length - 1] as number : 0,
      f1Score: 0,
      loss: finalLogs.loss[finalLogs.loss.length - 1] as number,
    };

    metrics.f1Score = (2 * metrics.precision * metrics.recall) / (metrics.precision + metrics.recall);

    xs.dispose();
    ys.dispose();

    await this.eventBus.emit('ml.model.trained', {
      modelType: 'fraud',
      metrics,
    });

    this.logger.log(`Fraud detection model training complete. F1-Score: ${(metrics.f1Score * 100).toFixed(2)}%`);

    return metrics;
  }

  // Load pre-trained model
  async loadModel(modelType: 'churn' | 'fraud'): Promise<tf.LayersModel> {
    if (this.models.has(modelType)) {
      return this.models.get(modelType)!;
    }

    try {
      const model = await tf.loadLayersModel(`file://./models/${modelType}-prediction/model.json`);
      this.models.set(modelType, model);
      this.logger.log(`Loaded ${modelType} model successfully`);
      return model;
    } catch (error) {
      this.logger.error(`Failed to load ${modelType} model:`, error);
      throw error;
    }
  }

  // Predict churn probability
  async predictChurn(customerFeatures: number[]): Promise<number> {
    const model = await this.loadModel('churn');
    const input = tf.tensor2d([customerFeatures]);
    const prediction = model.predict(input) as tf.Tensor;
    const probability = (await prediction.data())[0];

    input.dispose();
    prediction.dispose();

    return probability;
  }

  // Predict fraud probability
  async predictFraud(transactionFeatures: number[]): Promise<number> {
    const model = await this.loadModel('fraud');
    const input = tf.tensor2d([transactionFeatures]);
    const prediction = model.predict(input) as tf.Tensor;
    const probability = (await prediction.data())[0];

    input.dispose();
    prediction.dispose();

    return probability;
  }

  // Feature engineering for churn prediction
  extractChurnFeatures(customer: any): number[] {
    return [
      customer.accountAge || 0, // days since registration
      customer.totalOrders || 0,
      customer.totalRevenue || 0,
      customer.avgOrderValue || 0,
      customer.daysSinceLastOrder || 0,
      customer.supportTickets || 0,
      customer.cancelledOrders || 0,
      customer.avgDeliveryTime || 0,
      customer.contractValue || 0,
      customer.paymentDelays || 0,
      customer.loginFrequency || 0,
      customer.appUsageMinutes || 0,
    ];
  }

  // Feature engineering for fraud detection
  extractFraudFeatures(transaction: any): number[] {
    return [
      transaction.amount || 0,
      transaction.hour || 0, // Hour of day (0-23)
      transaction.dayOfWeek || 0, // Day of week (0-6)
      transaction.isWeekend ? 1 : 0,
      transaction.customerAge || 0, // days since first transaction
      transaction.transactionCount24h || 0,
      transaction.amountDeviation || 0, // deviation from customer's average
      transaction.locationChange ? 1 : 0, // unusual location
      transaction.deviceChange ? 1 : 0, // new device
      transaction.velocityCheck || 0, // transactions per hour
      transaction.accountBalance || 0,
      transaction.failedAttempts || 0,
    ];
  }

  // Batch prediction
  async batchPredict(modelType: 'churn' | 'fraud', features: number[][]): Promise<number[]> {
    const model = await this.loadModel(modelType);
    const input = tf.tensor2d(features);
    const predictions = model.predict(input) as tf.Tensor;
    const results = await predictions.data();

    input.dispose();
    predictions.dispose();

    return Array.from(results);
  }

  // Model evaluation
  async evaluateModel(modelType: 'churn' | 'fraud', testData: TrainingData): Promise<ModelMetrics> {
    const model = await this.loadModel(modelType);
    const xs = tf.tensor2d(testData.features);
    const ys = tf.tensor2d(testData.labels.map(l => [l]));

    const evaluation = await model.evaluate(xs, ys) as tf.Tensor[];
    const loss = await evaluation[0].data();
    const accuracy = await evaluation[1].data();

    const predictions = model.predict(xs) as tf.Tensor;
    const predData = await predictions.data();
    const predLabels = Array.from(predData).map(p => (p > 0.5 ? 1 : 0));

    // Calculate precision, recall, F1
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (let i = 0; i < testData.labels.length; i++) {
      if (predLabels[i] === 1 && testData.labels[i] === 1) tp++;
      if (predLabels[i] === 1 && testData.labels[i] === 0) fp++;
      if (predLabels[i] === 0 && testData.labels[i] === 1) fn++;
      if (predLabels[i] === 0 && testData.labels[i] === 0) tn++;
    }

    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    const f1Score = (2 * precision * recall) / (precision + recall);

    xs.dispose();
    ys.dispose();
    predictions.dispose();
    evaluation.forEach(t => t.dispose());

    return {
      accuracy: accuracy[0],
      precision,
      recall,
      f1Score,
      loss: loss[0],
    };
  }

  // Retrain model periodically
  async retrainModel(modelType: 'churn' | 'fraud', newData: TrainingData): Promise<ModelMetrics> {
    this.logger.log(`Retraining ${modelType} model with ${newData.features.length} new samples...`);

    if (modelType === 'churn') {
      return await this.trainChurnModel(newData);
    } else {
      return await this.trainFraudDetectionModel(newData);
    }
  }
}

