import { registerAs } from '@nestjs/config';

export default registerAs('ai-ml', () => ({
  // Framework configuration
  framework: {
    enableMonitoring: process.env.AI_ENABLE_MONITORING !== 'false',
    monitoringInterval: parseInt(process.env.AI_MONITORING_INTERVAL || '30', 10), // seconds
    enableAutoTraining: process.env.AI_ENABLE_AUTO_TRAINING === 'true',
    autoTrainingInterval: parseInt(process.env.AI_AUTO_TRAINING_INTERVAL || '3600', 10), // seconds (1 hour)
    maxConcurrentTrainings: parseInt(process.env.AI_MAX_CONCURRENT_TRAININGS || '3', 10),
    enableModelVersioning: process.env.AI_ENABLE_MODEL_VERSIONING !== 'false',
    modelRegistryPath: process.env.AI_MODEL_REGISTRY_PATH || './models',
  },

  // Model configurations
  models: {
    demandForecasting: {
      type: 'forecasting',
      algorithm: 'lstm',
      version: '1.0.0',
      accuracy: 0.85,
      performance: {
        latency: 150, // ms
        throughput: 100, // requests per second
        memoryUsage: 512, // MB
      },
      endpoints: {
        inference: process.env.AI_DEMAND_FORECASTING_ENDPOINT || 'http://localhost:8001/predict',
        training: process.env.AI_DEMAND_FORECASTING_TRAINING_ENDPOINT || 'http://localhost:8001/train',
        health: process.env.AI_DEMAND_FORECASTING_HEALTH_ENDPOINT || 'http://localhost:8001/health',
      },
    },
    routeOptimization: {
      type: 'optimization',
      algorithm: 'genetic',
      version: '2.1.0',
      accuracy: 0.92,
      performance: {
        latency: 300, // ms
        throughput: 50, // requests per second
        memoryUsage: 1024, // MB
      },
      endpoints: {
        inference: process.env.AI_ROUTE_OPTIMIZATION_ENDPOINT || 'http://localhost:8002/optimize',
        health: process.env.AI_ROUTE_OPTIMIZATION_HEALTH_ENDPOINT || 'http://localhost:8002/health',
      },
    },
    fraudDetection: {
      type: 'classification',
      algorithm: 'random_forest',
      version: '1.5.0',
      accuracy: 0.95,
      performance: {
        latency: 50, // ms
        throughput: 200, // requests per second
        memoryUsage: 256, // MB
      },
      endpoints: {
        inference: process.env.AI_FRAUD_DETECTION_ENDPOINT || 'http://localhost:8003/detect',
        health: process.env.AI_FRAUD_DETECTION_HEALTH_ENDPOINT || 'http://localhost:8003/health',
      },
    },
    churnPrediction: {
      type: 'classification',
      algorithm: 'xgboost',
      version: '1.2.0',
      accuracy: 0.88,
      performance: {
        latency: 75, // ms
        throughput: 150, // requests per second
        memoryUsage: 384, // MB
      },
      endpoints: {
        inference: process.env.AI_CHURN_PREDICTION_ENDPOINT || 'http://localhost:8004/predict',
        health: process.env.AI_CHURN_PREDICTION_HEALTH_ENDPOINT || 'http://localhost:8004/health',
      },
    },
    dynamicPricing: {
      type: 'regression',
      algorithm: 'neural_network',
      version: '1.0.0',
      accuracy: 0.82,
      performance: {
        latency: 100, // ms
        throughput: 120, // requests per second
        memoryUsage: 768, // MB
      },
      endpoints: {
        inference: process.env.AI_DYNAMIC_PRICING_ENDPOINT || 'http://localhost:8005/price',
        health: process.env.AI_DYNAMIC_PRICING_HEALTH_ENDPOINT || 'http://localhost:8005/health',
      },
    },
  },

  // Training configuration
  training: {
    defaultBatchSize: parseInt(process.env.AI_DEFAULT_BATCH_SIZE || '32', 10),
    defaultEpochs: parseInt(process.env.AI_DEFAULT_EPOCHS || '100', 10),
    defaultLearningRate: parseFloat(process.env.AI_DEFAULT_LEARNING_RATE || '0.001'),
    validationSplit: parseFloat(process.env.AI_VALIDATION_SPLIT || '0.2'),
    earlyStoppingPatience: parseInt(process.env.AI_EARLY_STOPPING_PATIENCE || '10', 10),
    enableGPU: process.env.AI_ENABLE_GPU === 'true',
    maxTrainingTime: parseInt(process.env.AI_MAX_TRAINING_TIME || '3600', 10), // seconds (1 hour)
    enableCheckpointing: process.env.AI_ENABLE_CHECKPOINTING !== 'false',
    checkpointInterval: parseInt(process.env.AI_CHECKPOINT_INTERVAL || '300', 10), // seconds
  },

  // Inference configuration
  inference: {
    maxBatchSize: parseInt(process.env.AI_MAX_BATCH_SIZE || '100', 10),
    timeout: parseInt(process.env.AI_INFERENCE_TIMEOUT || '30', 10), // seconds
    retryAttempts: parseInt(process.env.AI_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.AI_RETRY_DELAY || '1000', 10), // milliseconds
    enableCaching: process.env.AI_ENABLE_CACHING !== 'false',
    cacheTTL: parseInt(process.env.AI_CACHE_TTL || '300', 10), // seconds (5 minutes)
    fallbackToMock: process.env.AI_FALLBACK_TO_MOCK === 'true',
  },

  // Data configuration
  data: {
    maxDatasetSize: parseInt(process.env.AI_MAX_DATASET_SIZE || '1000000', 10), // 1M records
    enableDataValidation: process.env.AI_ENABLE_DATA_VALIDATION !== 'false',
    enableDataPreprocessing: process.env.AI_ENABLE_DATA_PREPROCESSING !== 'false',
    enableFeatureEngineering: process.env.AI_ENABLE_FEATURE_ENGINEERING !== 'false',
    missingValueStrategy: process.env.AI_MISSING_VALUE_STRATEGY || 'mean', // mean, median, mode, drop
    outlierDetectionMethod: process.env.AI_OUTLIER_DETECTION_METHOD || 'iqr', // iqr, zscore, isolation_forest
    featureScaling: process.env.AI_FEATURE_SCALING === 'false' ? false : true,
    scalingMethod: process.env.AI_SCALING_METHOD || 'standard', // standard, min_max, robust
  },

  // Performance monitoring
  monitoring: {
    enablePerformanceTracking: process.env.AI_ENABLE_PERFORMANCE_TRACKING !== 'false',
    enableAccuracyTracking: process.env.AI_ENABLE_ACCURACY_TRACKING !== 'false',
    enableLatencyTracking: process.env.AI_ENABLE_LATENCY_TRACKING !== 'false',
    enableThroughputTracking: process.env.AI_ENABLE_THROUGHPUT_TRACKING !== 'false',
    metricsRetentionDays: parseInt(process.env.AI_METRICS_RETENTION_DAYS || '90', 10),
    alertThresholds: {
      accuracyDrop: parseFloat(process.env.AI_ACCURACY_DROP_THRESHOLD || '0.05'), // 5% drop
      latencyIncrease: parseFloat(process.env.AI_LATENCY_INCREASE_THRESHOLD || '0.2'), // 20% increase
      errorRate: parseFloat(process.env.AI_ERROR_RATE_THRESHOLD || '0.1'), // 10% error rate
    },
  },

  // Security configuration
  security: {
    enableModelEncryption: process.env.AI_ENABLE_MODEL_ENCRYPTION === 'true',
    enableDataEncryption: process.env.AI_ENABLE_DATA_ENCRYPTION === 'true',
    enableAccessLogging: process.env.AI_ENABLE_ACCESS_LOGGING !== 'false',
    allowedIPs: process.env.AI_ALLOWED_IPS ? process.env.AI_ALLOWED_IPS.split(',') : [],
    rateLimit: {
      requestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_REQUESTS_PER_MINUTE || '100', 10),
      burstLimit: parseInt(process.env.AI_RATE_LIMIT_BURST_LIMIT || '10', 10),
    },
  },

  // Integration configuration
  integrations: {
    enableExternalServices: process.env.AI_ENABLE_EXTERNAL_SERVICES === 'true',
    externalProviders: {
      aws: {
        enabled: process.env.AI_AWS_ENABLED === 'true',
        region: process.env.AI_AWS_REGION || 'us-east-1',
        sagemaker: {
          enabled: process.env.AI_SAGEMAKER_ENABLED === 'true',
          endpoint: process.env.AI_SAGEMAKER_ENDPOINT,
        },
      },
      google: {
        enabled: process.env.AI_GOOGLE_ENABLED === 'true',
        projectId: process.env.AI_GOOGLE_PROJECT_ID,
        vertexAI: {
          enabled: process.env.AI_VERTEX_AI_ENABLED === 'true',
          endpoint: process.env.AI_VERTEX_AI_ENDPOINT,
        },
      },
      azure: {
        enabled: process.env.AI_AZURE_ENABLED === 'true',
        subscriptionId: process.env.AI_AZURE_SUBSCRIPTION_ID,
        ml: {
          enabled: process.env.AI_AZURE_ML_ENABLED === 'true',
          workspace: process.env.AI_AZURE_ML_WORKSPACE,
        },
      },
    },
  },

  // Feature flags
  features: {
    enableABTesting: process.env.AI_ENABLE_AB_TESTING === 'true',
    enableModelComparison: process.env.AI_ENABLE_MODEL_COMPARISON !== 'false',
    enableEnsembleMethods: process.env.AI_ENABLE_ENSEMBLE_METHODS !== 'false',
    enableAutoML: process.env.AI_ENABLE_AUTOML === 'true',
    enableExplainableAI: process.env.AI_ENABLE_EXPLAINABLE_AI !== 'false',
    enableModelDriftDetection: process.env.AI_ENABLE_MODEL_DRIFT_DETECTION !== 'false',
    enableContinuousLearning: process.env.AI_ENABLE_CONTINUOUS_LEARNING === 'true',
  },

  // Environment settings
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
}));
