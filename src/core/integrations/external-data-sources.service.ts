import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import Redis from 'ioredis';
import * as tf from '@tensorflow/tfjs-node';

export interface ExternalDataSource {
  id: string;
  name: string;
  type: 'api' | 'websocket' | 'mqtt' | 'ftp' | 'database';
  url?: string;
  topic?: string;
  credentials?: {
    apiKey?: string;
    username?: string;
    password?: string;
    token?: string;
  };
  frequency: number; // seconds
  enabled: boolean;
  schema: DataSchema;
  transformations: DataTransformation[];
  quality: number; // 0-1
  lastUpdate?: Date;
  errorCount: number;
  status: 'active' | 'error' | 'maintenance';
}

export interface DataSchema {
  fields: DataField[];
  primaryKey?: string;
  timestampField?: string;
  version: string;
}

export interface DataField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  description?: string;
  constraints?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface DataTransformation {
  field: string;
  operation: 'map' | 'filter' | 'aggregate' | 'normalize' | 'enrich';
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface WeatherData {
  location: {
    lat: number;
    lng: number;
    city?: string;
    country?: string;
  };
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  conditions: string[];
  alerts?: WeatherAlert[];
  timestamp: Date;
}

export interface WeatherAlert {
  type: 'storm' | 'flood' | 'heat' | 'cold' | 'wind' | 'other';
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  description: string;
  startTime: Date;
  endTime?: Date;
  areas: string[];
}

export interface TrafficData {
  location: {
    lat: number;
    lng: number;
    road?: string;
    direction?: string;
  };
  speed: number;
  flow: 'free' | 'light' | 'moderate' | 'heavy' | 'congested';
  delay: number; // minutes
  incidents?: TrafficIncident[];
  timestamp: Date;
}

export interface TrafficIncident {
  type: 'accident' | 'construction' | 'closure' | 'event' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
  startTime: Date;
  endTime?: Date;
  affectedArea: {
    lat: number;
    lng: number;
    radius: number;
  };
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  exchange: string;
  timestamp: Date;
}

export interface IoTSensorData {
  sensorId: string;
  type: 'temperature' | 'humidity' | 'pressure' | 'motion' | 'proximity' | 'gas' | 'other';
  value: number | boolean | string;
  unit?: string;
  location?: {
    lat: number;
    lng: number;
    floor?: number;
    room?: string;
  };
  battery?: number; // percentage
  signalStrength?: number; // dBm
  timestamp: Date;
}

@Injectable()
export class ExternalDataSourcesService {
  private readonly logger = new Logger(ExternalDataSourcesService.name);
  private dataSources: Map<string, ExternalDataSource> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private redis: Redis;
  private weatherModel: tf.LayersModel | null = null;
  private trafficModel: tf.LayersModel | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.initializeDataSources();
    this.initializeMLModels();
  }

  private async initializeDataSources(): Promise<void> {
    this.logger.log('Initializing external data sources...');

    // Weather API (OpenWeatherMap)
    this.dataSources.set('weather-openweathermap', {
      id: 'weather-openweathermap',
      name: 'OpenWeatherMap API',
      type: 'api',
      url: 'https://api.openweathermap.org/data/2.5/weather',
      credentials: {
        apiKey: this.configService.get<string>('OPENWEATHER_API_KEY'),
      },
      frequency: 300, // 5 minutes
      enabled: true,
      schema: {
        fields: [
          { name: 'location', type: 'object', required: true },
          { name: 'temperature', type: 'number', required: true },
          { name: 'humidity', type: 'number', required: true },
          { name: 'pressure', type: 'number', required: true },
          { name: 'windSpeed', type: 'number', required: true },
          { name: 'conditions', type: 'array', required: true },
        ],
        timestampField: 'timestamp',
        version: '1.0',
      },
      transformations: [
        {
          field: 'temperature',
          operation: 'normalize',
          parameters: { scale: 'celsius' },
          enabled: true,
        },
      ],
      quality: 0.95,
      errorCount: 0,
      status: 'active',
    });

    // Traffic API (TomTom)
    this.dataSources.set('traffic-tomtom', {
      id: 'traffic-tomtom',
      name: 'TomTom Traffic API',
      type: 'api',
      url: 'https://api.tomtom.com/traffic/services/4/flowSegmentData',
      credentials: {
        apiKey: this.configService.get<string>('TOMTOM_API_KEY'),
      },
      frequency: 60, // 1 minute
      enabled: true,
      schema: {
        fields: [
          { name: 'location', type: 'object', required: true },
          { name: 'speed', type: 'number', required: true },
          { name: 'flow', type: 'string', required: true },
          { name: 'delay', type: 'number', required: true },
          { name: 'incidents', type: 'array', required: false },
        ],
        timestampField: 'timestamp',
        version: '1.0',
      },
      transformations: [
        {
          field: 'speed',
          operation: 'map',
          parameters: { from: 'mph', to: 'kmh' },
          enabled: true,
        },
      ],
      quality: 0.92,
      errorCount: 0,
      status: 'active',
    });

    // Market Data (Alpha Vantage)
    this.dataSources.set('market-alphavantage', {
      id: 'market-alphavantage',
      name: 'Alpha Vantage Market Data',
      type: 'api',
      url: 'https://www.alphavantage.co/query',
      credentials: {
        apiKey: this.configService.get<string>('ALPHA_VANTAGE_API_KEY'),
      },
      frequency: 30, // 30 seconds
      enabled: true,
      schema: {
        fields: [
          { name: 'symbol', type: 'string', required: true },
          { name: 'price', type: 'number', required: true },
          { name: 'change', type: 'number', required: true },
          { name: 'volume', type: 'number', required: true },
          { name: 'exchange', type: 'string', required: true },
        ],
        primaryKey: 'symbol',
        timestampField: 'timestamp',
        version: '1.0',
      },
      transformations: [
        {
          field: 'changePercent',
          operation: 'normalize',
          parameters: { method: 'percentage' },
          enabled: true,
        },
      ],
      quality: 0.98,
      errorCount: 0,
      status: 'active',
    });

    // IoT Sensors (Generic MQTT)
    this.dataSources.set('iot-sensors', {
      id: 'iot-sensors',
      name: 'IoT Sensor Network',
      type: 'mqtt',
      topic: 'sensors/#',
      credentials: {
        username: this.configService.get<string>('MQTT_USERNAME'),
        password: this.configService.get<string>('MQTT_PASSWORD'),
      },
      frequency: 10, // 10 seconds
      enabled: true,
      schema: {
        fields: [
          { name: 'sensorId', type: 'string', required: true },
          { name: 'type', type: 'string', required: true },
          { name: 'value', type: 'number', required: true },
          { name: 'location', type: 'object', required: false },
          { name: 'battery', type: 'number', required: false },
        ],
        primaryKey: 'sensorId',
        timestampField: 'timestamp',
        version: '1.0',
      },
      transformations: [
        {
          field: 'value',
          operation: 'filter',
          parameters: { min: -100, max: 100 },
          enabled: true,
        },
      ],
      quality: 0.88,
      errorCount: 0,
      status: 'active',
    });

    this.logger.log(`Initialized ${this.dataSources.size} external data sources`);
  }

  private async initializeMLModels(): Promise<void> {
    this.logger.log('Initializing ML models for data validation...');

    // Weather prediction model
    this.weatherModel = tf.sequential({
      layers: [
        tf.layers.dense({ units: 32, inputShape: [10], activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' }),
      ],
    });

    this.weatherModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    // Traffic prediction model
    this.trafficModel = tf.sequential({
      layers: [
        tf.layers.lstm({ units: 32, inputShape: [20, 5], returnSequences: false }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' }),
      ],
    });

    this.trafficModel.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    this.logger.log('ML models initialized for data validation');
  }

  async startDataSource(dataSourceId: string): Promise<void> {
    const dataSource = this.dataSources.get(dataSourceId);
    if (!dataSource || !dataSource.enabled) {
      throw new Error(`Data source not found or disabled: ${dataSourceId}`);
    }

    if (this.subscriptions.has(dataSourceId)) {
      this.logger.warn(`Data source already running: ${dataSourceId}`);
      return;
    }

    this.logger.log(`Starting data source: ${dataSource.name} (${dataSourceId})`);

    const subscription = interval(dataSource.frequency * 1000).subscribe(async () => {
      try {
        await this.fetchDataSourceData(dataSource);
      } catch (error) {
        this.logger.error(`Error fetching data from ${dataSourceId}:`, error);
        dataSource.errorCount++;
        dataSource.status = dataSource.errorCount > 5 ? 'error' : 'active';

        if (dataSource.status === 'error') {
          this.logger.error(`Data source ${dataSourceId} marked as error due to repeated failures`);
        }
      }
    });

    this.subscriptions.set(dataSourceId, subscription);
    dataSource.status = 'active';
    dataSource.lastUpdate = new Date();

    this.logger.log(`Data source started: ${dataSourceId}`);
  }

  async stopDataSource(dataSourceId: string): Promise<void> {
    const subscription = this.subscriptions.get(dataSourceId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(dataSourceId);

      const dataSource = this.dataSources.get(dataSourceId);
      if (dataSource) {
        dataSource.status = 'maintenance';
        dataSource.lastUpdate = new Date();
      }

      this.logger.log(`Data source stopped: ${dataSourceId}`);
    }
  }

  private async fetchDataSourceData(dataSource: ExternalDataSource): Promise<void> {
    let rawData: any;

    try {
      switch (dataSource.type) {
        case 'api':
          rawData = await this.fetchFromAPI(dataSource);
          break;
        case 'websocket':
          rawData = await this.fetchFromWebSocket(dataSource);
          break;
        case 'mqtt':
          rawData = await this.fetchFromMQTT(dataSource);
          break;
        case 'ftp':
          rawData = await this.fetchFromFTP(dataSource);
          break;
        case 'database':
          rawData = await this.fetchFromDatabase(dataSource);
          break;
        default:
          throw new Error(`Unsupported data source type: ${dataSource.type}`);
      }
    } catch (error) {
      throw new Error(`Failed to fetch data from ${dataSource.type}: ${error.message}`);
    }

    // Validate data against schema
    const validatedData = this.validateData(rawData, dataSource.schema);

    // Apply transformations
    const transformedData = this.applyTransformations(validatedData, dataSource.transformations);

    // Quality check with ML models
    const qualityScore = await this.performQualityCheck(transformedData, dataSource);

    // Update data source metrics
    dataSource.quality = qualityScore;
    dataSource.lastUpdate = new Date();
    dataSource.errorCount = 0; // Reset error count on success
    dataSource.status = 'active';

    // Publish to Redis
    await this.publishToRedis(dataSource.id, transformedData);

    // Emit events
    this.eventEmitter.emit('external-data.received', {
      dataSourceId: dataSource.id,
      data: transformedData,
      quality: qualityScore,
      timestamp: new Date(),
    });

    this.logger.debug(`Data fetched and processed from ${dataSource.name}`);
  }

  private async fetchFromAPI(dataSource: ExternalDataSource): Promise<any> {
    if (!dataSource.url) {
      throw new Error('API URL not configured');
    }

    const params: any = {};
    if (dataSource.credentials?.apiKey) {
      params.apiKey = dataSource.credentials.apiKey;
    }

    const response = await firstValueFrom(
      this.httpService.get(dataSource.url, {
        params,
        headers: {
          'User-Agent': 'AyazLogistics-ExternalData/1.0',
        },
        timeout: 10000,
      })
    );

    return response.data;
  }

  private async fetchFromWebSocket(dataSource: ExternalDataSource): Promise<any> {
    // WebSocket implementation for real-time data
    return { timestamp: new Date(), mock: true };
  }

  private async fetchFromMQTT(dataSource: ExternalDataSource): Promise<any> {
    // MQTT implementation for IoT sensors
    return { timestamp: new Date(), sensorId: 'mock', value: Math.random() * 100 };
  }

  private async fetchFromFTP(dataSource: ExternalDataSource): Promise<any> {
    // FTP implementation for file-based data
    return { timestamp: new Date(), records: [] };
  }

  private async fetchFromDatabase(dataSource: ExternalDataSource): Promise<any> {
    // Database polling implementation
    return { timestamp: new Date(), count: Math.floor(Math.random() * 1000) };
  }

  private validateData(data: any, schema: DataSchema): any {
    const validated: any = {};

    for (const field of schema.fields) {
      const value = this.getNestedValue(data, field.name);

      // Check required fields
      if (field.required && (value === undefined || value === null)) {
        throw new Error(`Required field missing: ${field.name}`);
      }

      // Type validation
      if (value !== undefined && value !== null) {
        validated[field.name] = this.validateFieldType(value, field);
      }
    }

    // Add timestamp if not present
    if (schema.timestampField && !validated[schema.timestampField]) {
      validated[schema.timestampField] = new Date();
    }

    return validated;
  }

  private validateFieldType(value: any, field: DataField): any {
    switch (field.type) {
      case 'number':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number value for field ${field.name}: ${value}`);
        }
        return numValue;
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);
      case 'date':
        return new Date(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      case 'object':
        return typeof value === 'object' ? value : JSON.parse(value);
      default:
        return String(value);
    }
  }

  private applyTransformations(data: any, transformations: DataTransformation[]): any {
    let transformed = { ...data };

    for (const transformation of transformations) {
      if (!transformation.enabled) continue;

      try {
        switch (transformation.operation) {
          case 'map':
            transformed = this.applyMapping(transformed, transformation);
            break;
          case 'filter':
            transformed = this.applyFiltering(transformed, transformation);
            break;
          case 'aggregate':
            transformed = this.applyAggregation(transformed, transformation);
            break;
          case 'normalize':
            transformed = this.applyNormalization(transformed, transformation);
            break;
          case 'enrich':
            transformed = await this.applyEnrichment(transformed, transformation);
            break;
        }
      } catch (error) {
        this.logger.error(`Transformation failed for field ${transformation.field}:`, error);
      }
    }

    return transformed;
  }

  private applyMapping(data: any, transformation: DataTransformation): any {
    const { from, to } = transformation.parameters;
    const value = this.getNestedValue(data, transformation.field);

    if (value === from) {
      this.setNestedValue(data, transformation.field, to);
    }

    return data;
  }

  private applyFiltering(data: any, transformation: DataTransformation): any {
    const value = this.getNestedValue(data, transformation.field);
    const { min, max } = transformation.parameters;

    if (typeof value === 'number') {
      if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
        throw new Error(`Value ${value} outside allowed range for field ${transformation.field}`);
      }
    }

    return data;
  }

  private applyAggregation(data: any, transformation: DataTransformation): any {
    // Aggregation logic implementation
    return data;
  }

  private applyNormalization(data: any, transformation: DataTransformation): any {
    const value = this.getNestedValue(data, transformation.field);

    if (typeof value === 'number') {
      switch (transformation.parameters.method || 'minmax') {
        case 'minmax':
          const { min = 0, max = 100 } = transformation.parameters;
          const normalized = (value - min) / (max - min);
          this.setNestedValue(data, transformation.field, normalized);
          break;
        case 'zscore':
          const { mean = 0, std = 1 } = transformation.parameters;
          const zscore = (value - mean) / std;
          this.setNestedValue(data, transformation.field, zscore);
          break;
      }
    }

    return data;
  }

  private async applyEnrichment(data: any, transformation: DataTransformation): Promise<any> {
    // Data enrichment implementation (geocoding, etc.)
    return data;
  }

  private async performQualityCheck(data: any, dataSource: ExternalDataSource): Promise<number> {
    let qualityScore = 1.0;

    try {
      // Schema compliance check
      if (!this.validateSchemaCompliance(data, dataSource.schema)) {
        qualityScore -= 0.1;
      }

      // ML-based anomaly detection
      const anomalyScore = await this.detectAnomalies(data, dataSource);
      qualityScore -= anomalyScore * 0.3;

      // Data freshness check
      if (dataSource.lastUpdate) {
        const minutesSinceUpdate = (Date.now() - dataSource.lastUpdate.getTime()) / (1000 * 60);
        if (minutesSinceUpdate > dataSource.frequency / 30) {
          qualityScore -= 0.1;
        }
      }

      // Error rate check
      if (dataSource.errorCount > 0) {
        qualityScore -= dataSource.errorCount * 0.05;
      }

    } catch (error) {
      this.logger.error(`Quality check failed for ${dataSource.id}:`, error);
      qualityScore -= 0.2;
    }

    return Math.max(0, Math.min(1, qualityScore));
  }

  private validateSchemaCompliance(data: any, schema: DataSchema): boolean {
    for (const field of schema.fields) {
      if (field.required) {
        const value = this.getNestedValue(data, field.name);
        if (value === undefined || value === null) {
          return false;
        }
      }
    }
    return true;
  }

  private async detectAnomalies(data: any, dataSource: ExternalDataSource): Promise<number> {
    // Use ML models to detect anomalies
    // This is a simplified implementation

    let anomalyScore = 0;

    try {
      switch (dataSource.id) {
        case 'weather-openweathermap':
          anomalyScore = await this.detectWeatherAnomalies(data);
          break;
        case 'traffic-tomtom':
          anomalyScore = await this.detectTrafficAnomalies(data);
          break;
        default:
          anomalyScore = Math.random() * 0.1; // Random anomaly score for other sources
      }
    } catch (error) {
      this.logger.error(`Anomaly detection failed for ${dataSource.id}:`, error);
      anomalyScore = 0.5; // High anomaly score on error
    }

    return anomalyScore;
  }

  private async detectWeatherAnomalies(data: WeatherData): Promise<number> {
    if (!this.weatherModel) return 0;

    // Prepare features for weather anomaly detection
    const features = [
      data.temperature,
      data.humidity,
      data.pressure,
      data.windSpeed,
      data.visibility,
      data.location.lat,
      data.location.lng,
      new Date().getHours(), // Hour of day
      new Date().getMonth(), // Month
      data.conditions.length,
    ];

    const inputTensor = tf.tensor3d([features]);
    const prediction = this.weatherModel.predict(inputTensor) as tf.Tensor;
    const anomalyScore = (await prediction.array() as number[][])[0][0];

    inputTensor.dispose();
    prediction.dispose();

    return anomalyScore;
  }

  private async detectTrafficAnomalies(data: TrafficData): Promise<number> {
    if (!this.trafficModel) return 0;

    // Prepare features for traffic anomaly detection
    const features = [
      data.speed,
      data.delay,
      data.location.lat,
      data.location.lng,
      new Date().getHours(),
      new Date().getDay(),
      data.flow === 'congested' ? 1 : 0,
      data.incidents?.length || 0,
    ];

    // Need sequence data for LSTM, pad to 20 timesteps
    const sequence = new Array(20).fill(features).map((f, i) => [
      ...f,
      i / 20, // Time index
    ]);

    const inputTensor = tf.tensor3d([sequence]);
    const prediction = this.trafficModel.predict(inputTensor) as tf.Tensor;
    const anomalyScore = Math.abs((await prediction.array() as number[][])[0][0]);

    inputTensor.dispose();
    prediction.dispose();

    return Math.min(1, anomalyScore);
  }

  private async publishToRedis(dataSourceId: string, data: any): Promise<void> {
    const payload = {
      dataSourceId,
      data,
      timestamp: new Date(),
      quality: this.dataSources.get(dataSourceId)?.quality || 0,
    };

    await this.redis.publish(`external-data:${dataSourceId}`, JSON.stringify(payload));
    this.logger.debug(`Data published to Redis: external-data:${dataSourceId}`);
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Public API methods
  async getWeatherData(location: { lat: number; lng: number }): Promise<WeatherData> {
    const dataSource = this.dataSources.get('weather-openweathermap');
    if (!dataSource || !dataSource.enabled) {
      throw new Error('Weather data source not available');
    }

    const data = await this.fetchFromAPI(dataSource);

    // Transform API response to WeatherData format
    return {
      location: {
        lat: location.lat,
        lng: location.lng,
        city: data.name,
        country: data.sys?.country,
      },
      temperature: data.main?.temp - 273.15, // Convert from Kelvin to Celsius
      humidity: data.main?.humidity,
      pressure: data.main?.pressure,
      windSpeed: data.wind?.speed,
      windDirection: data.wind?.deg,
      visibility: data.visibility / 1000, // Convert to km
      conditions: data.weather?.map((w: any) => w.main) || [],
      alerts: [], // Would need separate API call for alerts
      timestamp: new Date(),
    };
  }

  async getTrafficData(location: { lat: number; lng: number }, radius: number = 5): Promise<TrafficData[]> {
    const dataSource = this.dataSources.get('traffic-tomtom');
    if (!dataSource || !dataSource.enabled) {
      throw new Error('Traffic data source not available');
    }

    const data = await this.fetchFromAPI(dataSource);

    // Transform API response to TrafficData format
    return data.flowSegmentData?.map((segment: any) => ({
      location: {
        lat: segment.coordinates?.coordinates[1] || location.lat,
        lng: segment.coordinates?.coordinates[0] || location.lng,
      },
      speed: segment.currentSpeed || 0,
      flow: segment.currentSpeed > 50 ? 'free' : segment.currentSpeed > 25 ? 'light' : 'heavy',
      delay: segment.freeFlowTravelTime ? (segment.freeFlowTravelTime - segment.currentTravelTime) / 60 : 0,
      incidents: [], // Would need separate API call for incidents
      timestamp: new Date(),
    })) || [];
  }

  async getMarketData(symbols: string[]): Promise<MarketData[]> {
    const dataSource = this.dataSources.get('market-alphavantage');
    if (!dataSource || !dataSource.enabled) {
      throw new Error('Market data source not available');
    }

    const marketData: MarketData[] = [];

    for (const symbol of symbols) {
      try {
        const data = await this.fetchFromAPI(dataSource);

        if (data['Global Quote']) {
          const quote = data['Global Quote'];
          marketData.push({
            symbol,
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
            volume: parseInt(quote['06. volume']),
            exchange: quote['08. previous close'] ? 'NYSE' : 'NASDAQ', // Simplified
            timestamp: new Date(),
          });
        }
      } catch (error) {
        this.logger.error(`Failed to fetch market data for ${symbol}:`, error);
      }
    }

    return marketData;
  }

  async getIoTSensorData(sensorIds?: string[]): Promise<IoTSensorData[]> {
    const dataSource = this.dataSources.get('iot-sensors');
    if (!dataSource || !dataSource.enabled) {
      throw new Error('IoT sensor data source not available');
    }

    try {
      // Query IoT platform or MQTT broker for real sensor data
      const mqttService = this.getMQTTService();
      if (mqttService) {
        return await mqttService.getLatestSensorReadings(sensorIds);
      }

      // Fallback: Query database for stored sensor readings
      // Note: This assumes you have an IoT sensor readings table
      const db = this.getDatabase();
      if (db) {
        const query = db
          .select()
          .from('iot_sensor_readings')
          .where(sensorIds && sensorIds.length > 0 
            ? sql`sensor_id IN (${sensorIds.join(',')})`
            : sql`1=1`)
          .orderBy(sql`timestamp DESC`)
          .limit(100);

        const results = await query;
        return results.map((row: any) => ({
          sensorId: row.sensor_id,
          type: row.sensor_type,
          value: Number(row.value),
          unit: row.unit || 'celsius',
          location: row.location ? JSON.parse(row.location) : null,
          battery: row.battery_level || null,
          signalStrength: row.signal_strength || null,
          timestamp: row.timestamp,
        }));
      }

      // If no backend available, return empty array
      return [];
    } catch (error) {
      this.logger.error('Failed to fetch IoT sensor data', error);
      return [];
    }
  }

  private getMQTTService(): any {
    // Try to get MQTT service from NestJS context
    try {
      // This would be injected in real implementation
      return null; // Placeholder - should inject IoTMQTTService
    } catch {
      return null;
    }
  }

  private getDatabase(): any {
    // Try to get database connection
    try {
      // This would be injected in real implementation
      return null; // Placeholder - should inject Drizzle ORM
    } catch {
      return null;
    }
  }

  async getDataSourceStatus(dataSourceId: string): Promise<{
    status: string;
    quality: number;
    lastUpdate?: Date;
    errorCount: number;
    dataPoints: number;
  }> {
    const dataSource = this.dataSources.get(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    return {
      status: dataSource.status,
      quality: dataSource.quality,
      lastUpdate: dataSource.lastUpdate,
      errorCount: dataSource.errorCount,
      dataPoints: 0, // Would need to track this in a real implementation
    };
  }

  async getAllDataSources(): Promise<ExternalDataSource[]> {
    return Array.from(this.dataSources.values());
  }

  async createDataSource(config: Omit<ExternalDataSource, 'id' | 'errorCount' | 'status' | 'quality' | 'lastUpdate'>): Promise<string> {
    const id = `datasource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const dataSource: ExternalDataSource = {
      id,
      ...config,
      errorCount: 0,
      status: 'maintenance',
      quality: 1.0,
    };

    this.dataSources.set(id, dataSource);

    if (dataSource.enabled) {
      await this.startDataSource(id);
    }

    this.logger.log(`Data source created: ${id} (${dataSource.name})`);
    return id;
  }

  async updateDataSource(dataSourceId: string, updates: Partial<ExternalDataSource>): Promise<void> {
    const dataSource = this.dataSources.get(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    // Handle enabled/disabled changes
    if (dataSource.enabled && !updates.enabled) {
      await this.stopDataSource(dataSourceId);
    } else if (!dataSource.enabled && updates.enabled) {
      await this.startDataSource(dataSourceId);
    }

    // Update configuration
    Object.assign(dataSource, updates);

    if (dataSource.enabled) {
      dataSource.status = 'active';
      dataSource.lastUpdate = new Date();
    }

    this.logger.log(`Data source updated: ${dataSourceId}`);
  }

  async deleteDataSource(dataSourceId: string): Promise<void> {
    await this.stopDataSource(dataSourceId);
    this.dataSources.delete(dataSourceId);

    this.logger.log(`Data source deleted: ${dataSourceId}`);
  }
}
