import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import * as tf from '@tensorflow/tfjs-node';
import Redis from 'ioredis';

export interface DataStreamConfig {
  id: string;
  name: string;
  source: 'api' | 'websocket' | 'iot' | 'database' | 'file';
  url?: string;
  topic?: string;
  frequency: number; // seconds
  enabled: boolean;
  filters: DataFilter[];
  transformations: DataTransformation[];
  destinations: string[];
}

export interface DataFilter {
  type: 'range' | 'threshold' | 'pattern' | 'geofence' | 'time-window';
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'contains' | 'regex' | 'within';
  value: any;
  enabled: boolean;
}

export interface DataTransformation {
  type: 'normalize' | 'scale' | 'aggregate' | 'smooth' | 'enrich';
  field: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface StreamDataPoint {
  id: string;
  timestamp: Date;
  source: string;
  data: Record<string, any>;
  filtered: boolean;
  transformed: boolean;
  anomalies: string[];
  quality: number; // 0-1
}

export interface AnomalyDetection {
  id: string;
  timestamp: Date;
  dataPointId: string;
  type: 'spike' | 'drop' | 'pattern' | 'outlier';
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  value: number;
  expectedValue: number;
  deviation: number;
}

@Injectable()
export class RealTimeStreamProcessingService {
  private readonly logger = new Logger(RealTimeStreamProcessingService.name);
  private lastCheckTimes = new Map<string, Date>();
  private streams: Map<string, DataStreamConfig> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private redis: Redis;
  private anomalyDetector: tf.LayersModel | null = null;
  private dataBuffer: Map<string, StreamDataPoint[]> = new Map();
  private anomalyHistory: AnomalyDetection[] = [];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    });

    this.initializeAnomalyDetection();
    this.loadStreamConfigurations();
    this.startAllStreams();
  }

  private async initializeAnomalyDetection(): Promise<void> {
    this.logger.log('Initializing anomaly detection model...');

    try {
      // Create a simple LSTM-based anomaly detection model
      this.anomalyDetector = tf.sequential({
        layers: [
          tf.layers.lstm({ units: 32, inputShape: [10, 5], returnSequences: false }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' }),
        ],
      });

      this.anomalyDetector.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
      });

      this.logger.log('Anomaly detection model initialized');
    } catch (error) {
      this.logger.error('Failed to initialize anomaly detection model:', error);
    }
  }

  private async loadStreamConfigurations(): Promise<void> {
    this.logger.log('Loading stream configurations...');

    const defaultStreams: DataStreamConfig[] = [
      {
        id: 'weather-api',
        name: 'Weather Data Stream',
        source: 'api',
        url: 'https://api.openweathermap.org/data/2.5/weather',
        frequency: 300, // 5 minutes
        enabled: true,
        filters: [
          {
            type: 'range',
            field: 'temperature',
            operator: 'gt',
            value: -50,
            enabled: true,
          },
        ],
        transformations: [
          {
            type: 'normalize',
            field: 'temperature',
            parameters: { min: -50, max: 50 },
            enabled: true,
          },
        ],
        destinations: ['redis:weather', 'websocket:weather'],
      },
      {
        id: 'traffic-api',
        name: 'Traffic Data Stream',
        source: 'api',
        url: 'https://api.tomtom.com/traffic/1/flow',
        frequency: 60, // 1 minute
        enabled: true,
        filters: [
          {
            type: 'threshold',
            field: 'speed',
            operator: 'lt',
            value: 100,
            enabled: true,
          },
        ],
        transformations: [
          {
            type: 'scale',
            field: 'speed',
            parameters: { factor: 1.60934 }, // Convert mph to kmh
            enabled: true,
          },
        ],
        destinations: ['redis:traffic', 'websocket:traffic'],
      },
      {
        id: 'iot-sensors',
        name: 'IoT Sensor Data',
        source: 'websocket',
        topic: 'sensors/data',
        frequency: 10, // 10 seconds
        enabled: true,
        filters: [
          {
            type: 'geofence',
            field: 'location',
            operator: 'within',
            value: { lat: 40.7128, lng: -74.0060, radius: 50 }, // NYC area
            enabled: true,
          },
        ],
        transformations: [
          {
            type: 'enrich',
            field: 'sensor_data',
            parameters: { addLocation: true, addTimestamp: true },
            enabled: true,
          },
        ],
        destinations: ['redis:sensors', 'websocket:sensors'],
      },
      {
        id: 'market-data',
        name: 'Market Data Stream',
        source: 'api',
        url: 'https://api.marketdata.com/prices',
        frequency: 30, // 30 seconds
        enabled: true,
        filters: [
          {
            type: 'pattern',
            field: 'symbol',
            operator: 'regex',
            value: '^[A-Z]{2,5}$',
            enabled: true,
          },
        ],
        transformations: [
          {
            type: 'normalize',
            field: 'price',
            parameters: { method: 'zscore' },
            enabled: true,
          },
        ],
        destinations: ['redis:market', 'websocket:market'],
      },
    ];

    for (const stream of defaultStreams) {
      this.streams.set(stream.id, stream);
    }

    this.logger.log(`Loaded ${this.streams.size} stream configurations`);
  }

  async startStream(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream || !stream.enabled) {
      throw new Error(`Stream not found or disabled: ${streamId}`);
    }

    if (this.subscriptions.has(streamId)) {
      this.logger.warn(`Stream already running: ${streamId}`);
      return;
    }

    this.logger.log(`Starting stream: ${stream.name} (${streamId})`);

    const subscription = interval(stream.frequency * 1000).subscribe(async () => {
      try {
        await this.processStreamData(stream);
      } catch (error) {
        this.logger.error(`Error processing stream ${streamId}:`, error);
      }
    });

    this.subscriptions.set(streamId, subscription);
    this.logger.log(`Stream started: ${streamId}`);
  }

  async stopStream(streamId: string): Promise<void> {
    const subscription = this.subscriptions.get(streamId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(streamId);
      this.logger.log(`Stream stopped: ${streamId}`);
    }
  }

  async startAllStreams(): Promise<void> {
    this.logger.log('Starting all enabled streams...');

    for (const [streamId, stream] of this.streams) {
      if (stream.enabled) {
        try {
          await this.startStream(streamId);
        } catch (error) {
          this.logger.error(`Failed to start stream ${streamId}:`, error);
        }
      }
    }
  }

  private async processStreamData(stream: DataStreamConfig): Promise<void> {
    let rawData: any;

    try {
      switch (stream.source) {
        case 'api':
          rawData = await this.fetchFromAPI(stream);
          break;
        case 'websocket':
          rawData = await this.fetchFromWebSocket(stream);
          break;
        case 'iot':
          rawData = await this.fetchFromIoT(stream);
          break;
        case 'database':
          rawData = await this.fetchFromDatabase(stream);
          break;
        case 'file':
          rawData = await this.fetchFromFile(stream);
          break;
        default:
          throw new Error(`Unsupported source: ${stream.source}`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch data from ${stream.source}:`, error);
      return;
    }

    // Process data through filters and transformations
    const dataPoint = await this.processDataPoint(stream, rawData);

    // Store in buffer for analysis
    this.addToBuffer(stream.id, dataPoint);

    // Detect anomalies
    const anomalies = await this.detectAnomalies(stream.id, dataPoint);
    dataPoint.anomalies = anomalies.map(a => a.id);

    // Send to destinations
    await this.sendToDestinations(stream, dataPoint, anomalies);

    // Emit events
    this.eventEmitter.emit('stream.data.processed', {
      streamId: stream.id,
      dataPoint,
      anomalies,
    });
  }

  private async fetchFromAPI(stream: DataStreamConfig): Promise<any> {
    if (!stream.url) {
      throw new Error('API URL not configured');
    }

    const response = await firstValueFrom(
      this.httpService.get(stream.url, {
        headers: {
          'User-Agent': 'AyazLogistics-StreamProcessor/1.0',
        },
        timeout: 10000,
      })
    );

    return response.data;
  }

  private async fetchFromWebSocket(stream: DataStreamConfig): Promise<any> {
    try {
      // Get WebSocket service instance
      const wsService = this.getWebSocketService();
      if (wsService) {
        // Subscribe to the stream topic if not already subscribed
        const topic = stream.sourceUrl || stream.endpoint || 'default-stream';
        const message = await wsService.waitForMessage(topic, 5000); // Wait max 5 seconds
        return message || { timestamp: new Date(), error: 'No message received' };
      }

      // Fallback: Try direct WebSocket connection
      if (stream.sourceUrl) {
        return await this.connectWebSocket(stream.sourceUrl);
      }

      return { timestamp: new Date(), error: 'WebSocket service not available' };
    } catch (error) {
      this.logger.error('Failed to fetch from WebSocket', error);
      return { timestamp: new Date(), error: error.message };
    }
  }

  private async fetchFromIoT(stream: DataStreamConfig): Promise<any> {
    try {
      // Get IoT MQTT service instance
      const iotService = this.getIoTService();
      if (iotService) {
        const topic = stream.endpoint || stream.sourceUrl || 'ayaz/devices/+';
        const readings = await iotService.getLatestReadings(topic);
        return readings.length > 0 ? readings[0] : { timestamp: new Date(), deviceId: 'no-data' };
      }

      // Fallback: Query database for latest IoT readings
      const db = this.getDatabase();
      if (db) {
        const [latest] = await db
          .select()
          .from('iot_sensor_readings')
          .orderBy(sql`timestamp DESC`)
          .limit(1);
        
        return latest || { timestamp: new Date(), deviceId: 'no-data' };
      }

      return { timestamp: new Date(), error: 'IoT service not available' };
    } catch (error) {
      this.logger.error('Failed to fetch from IoT', error);
      return { timestamp: new Date(), error: error.message };
    }
  }

  private getWebSocketService(): any {
    // Should inject WebSocket service - placeholder
    return null;
  }

  private getIoTService(): any {
    // Should inject IoT MQTT service - placeholder
    return null;
  }

  private getDatabase(): any {
    return this.db;
  }

  private async connectWebSocket(url: string): Promise<any> {
    // Direct WebSocket connection implementation
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      ws.onmessage = (event) => {
        clearTimeout(timeout);
        ws.close();
        resolve(JSON.parse(event.data));
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  private async fetchFromDatabase(stream: DataStreamConfig): Promise<any> {
    try {
      const db = this.getDatabase();
      if (!db) {
        return { timestamp: new Date(), error: 'Database not available' };
      }

      // Query for new records based on stream configuration
      const tableName = stream.sourceUrl || 'events';
      const lastCheck = this.lastCheckTimes.get(stream.id) || new Date(Date.now() - 60000); // Default: last minute
      
      const query = db
        .select()
        .from(sql.raw(tableName))
        .where(sql`created_at > ${lastCheck.toISOString()}`)
        .orderBy(sql`created_at DESC`)
        .limit(100);

      const results = await query;
      this.lastCheckTimes.set(stream.id, new Date());

      return {
        timestamp: new Date(),
        recordCount: results.length,
        records: results,
      };
    } catch (error) {
      this.logger.error('Failed to fetch from database', error);
      return { timestamp: new Date(), error: error.message };
    }
  }

  private async fetchFromFile(stream: DataStreamConfig): Promise<any> {
    // File monitoring implementation
    // In a real implementation, this would watch files for changes
    return { timestamp: new Date(), fileSize: Math.floor(Math.random() * 10000) };
  }

  private async processDataPoint(stream: DataStreamConfig, rawData: any): Promise<StreamDataPoint> {
    const dataPoint: StreamDataPoint = {
      id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      source: stream.id,
      data: rawData,
      filtered: false,
      transformed: false,
      anomalies: [],
      quality: 1.0,
    };

    // Apply filters
    dataPoint.filtered = await this.applyFilters(stream, dataPoint);

    // Apply transformations
    if (dataPoint.filtered) {
      dataPoint.transformed = await this.applyTransformations(stream, dataPoint);
    }

    return dataPoint;
  }

  private async applyFilters(stream: DataStreamConfig, dataPoint: StreamDataPoint): Promise<boolean> {
    for (const filter of stream.filters) {
      if (!filter.enabled) continue;

      const fieldValue = this.getNestedValue(dataPoint.data, filter.field);

      switch (filter.type) {
        case 'range':
          if (!this.checkRange(fieldValue, filter.operator, filter.value)) {
            return false;
          }
          break;
        case 'threshold':
          if (!this.checkThreshold(fieldValue, filter.operator, filter.value)) {
            return false;
          }
          break;
        case 'pattern':
          if (!this.checkPattern(fieldValue, filter.operator, filter.value)) {
            return false;
          }
          break;
        case 'geofence':
          if (!this.checkGeofence(fieldValue, filter.value)) {
            return false;
          }
          break;
        case 'time-window':
          if (!this.checkTimeWindow(dataPoint.timestamp, filter.value)) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  private async applyTransformations(stream: DataStreamConfig, dataPoint: StreamDataPoint): Promise<boolean> {
    let transformed = false;

    for (const transformation of stream.transformations) {
      if (!transformation.enabled) continue;

      switch (transformation.type) {
        case 'normalize':
          this.applyNormalization(dataPoint.data, transformation.field, transformation.parameters);
          transformed = true;
          break;
        case 'scale':
          this.applyScaling(dataPoint.data, transformation.field, transformation.parameters);
          transformed = true;
          break;
        case 'aggregate':
          this.applyAggregation(dataPoint.data, transformation.field, transformation.parameters);
          transformed = true;
          break;
        case 'smooth':
          this.applySmoothing(dataPoint.data, transformation.field, transformation.parameters);
          transformed = true;
          break;
        case 'enrich':
          await this.applyEnrichment(dataPoint.data, transformation.parameters);
          transformed = true;
          break;
      }
    }

    return transformed;
  }

  private async detectAnomalies(streamId: string, dataPoint: StreamDataPoint): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    if (!this.anomalyDetector) {
      return anomalies;
    }

    try {
      // Prepare data for anomaly detection
      const buffer = this.dataBuffer.get(streamId) || [];
      if (buffer.length < 10) {
        return anomalies; // Need more data for detection
      }

      // Extract features from recent data points
      const features = this.extractFeatures(buffer.slice(-10));

      // Make prediction
      const inputTensor = tf.tensor3d([features]);
      const prediction = this.anomalyDetector.predict(inputTensor) as tf.Tensor;
      const anomalyScore = (await prediction.array() as number[][])[0][0];

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      // Check if anomaly detected
      if (anomalyScore > 0.7) {
        const anomaly: AnomalyDetection = {
          id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          dataPointId: dataPoint.id,
          type: this.classifyAnomalyType(anomalyScore, features),
          severity: this.calculateSeverity(anomalyScore),
          confidence: anomalyScore,
          description: this.generateAnomalyDescription(anomalyScore, features),
          value: features[features.length - 1] || 0,
          expectedValue: this.calculateExpectedValue(buffer),
          deviation: this.calculateDeviation(features, buffer),
        };

        anomalies.push(anomaly);
        this.anomalyHistory.push(anomaly);

        // Emit anomaly event
        this.eventEmitter.emit('stream.anomaly.detected', {
          streamId,
          anomaly,
          dataPoint,
        });

        this.logger.warn(`Anomaly detected in stream ${streamId}:`, anomaly.description);
      }
    } catch (error) {
      this.logger.error(`Error detecting anomalies for stream ${streamId}:`, error);
    }

    return anomalies;
  }

  private async sendToDestinations(stream: DataStreamConfig, dataPoint: StreamDataPoint, anomalies: AnomalyDetection[]): Promise<void> {
    const payload = {
      dataPoint,
      anomalies,
      streamId: stream.id,
      timestamp: new Date().toISOString(),
    };

    for (const destination of stream.destinations) {
      try {
        if (destination.startsWith('redis:')) {
          await this.sendToRedis(destination, payload);
        } else if (destination.startsWith('websocket:')) {
          await this.sendToWebSocket(destination, payload);
        } else if (destination.startsWith('webhook:')) {
          await this.sendToWebhook(destination, payload);
        }
      } catch (error) {
        this.logger.error(`Failed to send to destination ${destination}:`, error);
      }
    }
  }

  private async sendToRedis(destination: string, payload: any): Promise<void> {
    const channel = destination.replace('redis:', '');
    await this.redis.publish(`stream:${channel}`, JSON.stringify(payload));
  }

  private async sendToWebSocket(destination: string, payload: any): Promise<void> {
    const channel = destination.replace('websocket:', '');
    await this.redis.publish(`websocket:stream:${channel}`, JSON.stringify(payload));
  }

  private async sendToWebhook(destination: string, payload: any): Promise<void> {
    const url = destination.replace('webhook:', '');
    await firstValueFrom(
      this.httpService.post(url, payload, {
        timeout: 5000,
      })
    );
  }

  // Utility methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private checkRange(value: any, operator: string, target: any): boolean {
    if (typeof value !== 'number' || typeof target !== 'number') return true;

    switch (operator) {
      case 'gt': return value > target;
      case 'lt': return value < target;
      case 'eq': return value === target;
      default: return true;
    }
  }

  private checkThreshold(value: any, operator: string, threshold: any): boolean {
    return this.checkRange(value, operator, threshold);
  }

  private checkPattern(value: any, operator: string, pattern: any): boolean {
    if (typeof value !== 'string') return true;

    switch (operator) {
      case 'contains': return value.includes(pattern);
      case 'regex': return new RegExp(pattern).test(value);
      default: return true;
    }
  }

  private checkGeofence(location: any, geofence: any): boolean {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') return true;

    const distance = this.calculateDistance(
      location.lat, location.lng,
      geofence.lat, geofence.lng
    );

    return distance <= geofence.radius;
  }

  private checkTimeWindow(timestamp: Date, window: any): boolean {
    const now = new Date();
    const start = new Date(window.start);
    const end = new Date(window.end);

    return timestamp >= start && timestamp <= end;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private applyNormalization(data: any, field: string, parameters: any): void {
    const value = this.getNestedValue(data, field);
    if (typeof value !== 'number') return;

    switch (parameters.method || 'minmax') {
      case 'minmax':
        const min = parameters.min || 0;
        const max = parameters.max || 1;
        const actualMin = parameters.actualMin || -100;
        const actualMax = parameters.actualMax || 100;
        this.setNestedValue(data, field, min + (value - actualMin) * (max - min) / (actualMax - actualMin));
        break;
      case 'zscore':
        const mean = parameters.mean || 0;
        const std = parameters.std || 1;
        this.setNestedValue(data, field, (value - mean) / std);
        break;
    }
  }

  private applyScaling(data: any, field: string, parameters: any): void {
    const value = this.getNestedValue(data, field);
    if (typeof value !== 'number') return;

    this.setNestedValue(data, field, value * (parameters.factor || 1));
  }

  private applyAggregation(data: any, field: string, parameters: any): void {
    // Aggregation logic implementation
  }

  private applySmoothing(data: any, field: string, parameters: any): void {
    // Smoothing logic implementation
  }

  private async applyEnrichment(data: any, parameters: any): Promise<void> {
    // Data enrichment implementation (geocoding, weather, etc.)
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

  private extractFeatures(buffer: StreamDataPoint[]): number[] {
    // Extract numerical features from data points for anomaly detection
    const features: number[] = [];

    for (const point of buffer) {
      // Extract numeric values from data
      const values = this.extractNumericValues(point.data);
      features.push(...values.slice(0, 5)); // Take first 5 numeric features

      // Pad if less than 5 features
      while (features.length % 5 !== 0) {
        features.push(0);
      }
    }

    return features.slice(-50); // Return last 50 features (10 points * 5 features)
  }

  private extractNumericValues(data: any): number[] {
    const values: number[] = [];

    const extract = (obj: any) => {
      if (typeof obj === 'number') {
        values.push(obj);
      } else if (typeof obj === 'object' && obj !== null) {
        for (const value of Object.values(obj)) {
          extract(value);
        }
      }
    };

    extract(data);
    return values;
  }

  private classifyAnomalyType(score: number, features: number[]): AnomalyDetection['type'] {
    if (score > 0.9) return 'spike';
    if (score > 0.8) return 'drop';
    if (score > 0.7) return 'pattern';
    return 'outlier';
  }

  private calculateSeverity(score: number): AnomalyDetection['severity'] {
    if (score > 0.9) return 'critical';
    if (score > 0.8) return 'high';
    if (score > 0.7) return 'medium';
    return 'low';
  }

  private generateAnomalyDescription(score: number, features: number[]): string {
    const type = this.classifyAnomalyType(score, features);
    return `Anomaly detected: ${type} with confidence ${(score * 100).toFixed(1)}%`;
  }

  private calculateExpectedValue(buffer: StreamDataPoint[]): number {
    const values = this.extractNumericValues(buffer[buffer.length - 1].data);
    return values.length > 0 ? values[0] : 0;
  }

  private calculateDeviation(features: number[], buffer: StreamDataPoint[]): number {
    const current = features[features.length - 1] || 0;
    const expected = this.calculateExpectedValue(buffer);
    return Math.abs(current - expected);
  }

  private addToBuffer(streamId: string, dataPoint: StreamDataPoint): void {
    if (!this.dataBuffer.has(streamId)) {
      this.dataBuffer.set(streamId, []);
    }

    const buffer = this.dataBuffer.get(streamId)!;
    buffer.push(dataPoint);

    // Keep only last 100 data points
    if (buffer.length > 100) {
      buffer.shift();
    }
  }

  // Public API methods
  async getStreamStatus(streamId: string): Promise<{
    status: 'running' | 'stopped' | 'error';
    dataPoints: number;
    anomalies: number;
    lastUpdate: Date | null;
  }> {
    const subscription = this.subscriptions.get(streamId);
    const buffer = this.dataBuffer.get(streamId) || [];
    const streamAnomalies = this.anomalyHistory.filter(a => a.dataPointId.startsWith(`dp_${streamId}`));

    return {
      status: subscription ? 'running' : 'stopped',
      dataPoints: buffer.length,
      anomalies: streamAnomalies.length,
      lastUpdate: buffer.length > 0 ? buffer[buffer.length - 1].timestamp : null,
    };
  }

  async getAnomalyHistory(streamId?: string, limit: number = 50): Promise<AnomalyDetection[]> {
    let anomalies = this.anomalyHistory;

    if (streamId) {
      anomalies = anomalies.filter(a => a.dataPointId.includes(streamId));
    }

    return anomalies
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getStreamAnalytics(): Promise<{
    totalStreams: number;
    runningStreams: number;
    totalDataPoints: number;
    totalAnomalies: number;
    streams: Array<{
      id: string;
      name: string;
      status: string;
      dataPoints: number;
      anomalies: number;
    }>;
  }> {
    const totalStreams = this.streams.size;
    const runningStreams = this.subscriptions.size;
    const totalDataPoints = Array.from(this.dataBuffer.values()).reduce((sum, buffer) => sum + buffer.length, 0);
    const totalAnomalies = this.anomalyHistory.length;

    const streams = Array.from(this.streams.entries()).map(([id, stream]) => ({
      id,
      name: stream.name,
      status: this.subscriptions.has(id) ? 'running' : 'stopped',
      dataPoints: (this.dataBuffer.get(id) || []).length,
      anomalies: this.anomalyHistory.filter(a => a.dataPointId.includes(id)).length,
    }));

    return {
      totalStreams,
      runningStreams,
      totalDataPoints,
      totalAnomalies,
      streams,
    };
  }

  async createCustomStream(config: Omit<DataStreamConfig, 'id'>): Promise<string> {
    const streamId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stream: DataStreamConfig = {
      id: streamId,
      ...config,
    };

    this.streams.set(streamId, stream);
    this.logger.log(`Custom stream created: ${streamId} (${stream.name})`);

    if (stream.enabled) {
      await this.startStream(streamId);
    }

    return streamId;
  }

  async updateStream(streamId: string, updates: Partial<DataStreamConfig>): Promise<void> {
    const stream = this.streams.get(streamId);
    if (!stream) {
      throw new Error(`Stream not found: ${streamId}`);
    }

    // Stop stream if running and disabled
    if (stream.enabled && !updates.enabled) {
      await this.stopStream(streamId);
    }

    // Update configuration
    Object.assign(stream, updates);

    // Start stream if enabled and not running
    if (stream.enabled && !this.subscriptions.has(streamId)) {
      await this.startStream(streamId);
    }

    this.logger.log(`Stream updated: ${streamId}`);
  }

  async deleteStream(streamId: string): Promise<void> {
    await this.stopStream(streamId);
    this.streams.delete(streamId);
    this.dataBuffer.delete(streamId);

    this.logger.log(`Stream deleted: ${streamId}`);
  }
}