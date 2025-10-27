import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';
// MQTT is optional
let mqtt: any = null;
try {
  mqtt = require('mqtt');
} catch (error) {
  console.warn('MQTT not available - Edge computing features will be limited');
}

interface IoTDevice {
  id: string;
  name: string;
  type: 'sensor' | 'actuator' | 'gateway' | 'controller' | 'monitor' | 'tracker' | 'scanner' | 'camera';
  category: 'environmental' | 'motion' | 'position' | 'temperature' | 'humidity' | 'pressure' | 'light' | 'sound' | 'vibration' | 'proximity' | 'rfid' | 'barcode' | 'camera' | 'gps' | 'accelerometer' | 'gyroscope' | 'magnetometer';
  location: {
    zone: string;
    section: string;
    position: { x: number; y: number; z: number };
    coordinates: { lat: number; lon: number; alt: number };
  };
  specifications: {
    power: {
      type: 'battery' | 'solar' | 'wired' | 'wireless';
      capacity: number; // mAh
      consumption: number; // mW
      voltage: number; // V
      current: number; // mA
    };
    communication: {
      protocol: 'wifi' | 'bluetooth' | 'zigbee' | 'lora' | 'nbiot' | 'cellular' | 'ethernet' | 'rs485' | 'modbus' | 'mqtt' | 'coap' | 'http';
      frequency: number; // Hz
      range: number; // meters
      bandwidth: number; // bps
      latency: number; // ms
    };
    sensors: {
      type: string;
      range: { min: number; max: number };
      accuracy: number;
      resolution: number;
      samplingRate: number; // Hz
      calibration: {
        offset: number;
        scale: number;
        drift: number;
      };
    }[];
    processing: {
      cpu: string;
      memory: number; // MB
      storage: number; // MB
      os: string;
      capabilities: string[];
    };
  };
  status: 'online' | 'offline' | 'maintenance' | 'error' | 'sleeping' | 'battery_low';
  connectivity: {
    signal: number; // dBm
    quality: number; // 0-1
    uptime: number; // seconds
    lastSeen: Date;
    retryCount: number;
  };
  data: {
    current: any;
    history: any[];
    trends: any;
    anomalies: any[];
  };
  configuration: {
    samplingInterval: number; // seconds
    transmissionInterval: number; // seconds
    thresholds: { [key: string]: number };
    alerts: { [key: string]: boolean };
    filters: { [key: string]: any };
  };
}

interface EdgeNode {
  id: string;
  name: string;
  type: 'gateway' | 'controller' | 'processor' | 'storage' | 'analytics' | 'actuator';
  location: {
    zone: string;
    section: string;
    position: { x: number; y: number; z: number };
    coordinates: { lat: number; lon: number; alt: number };
  };
  specifications: {
    hardware: {
      cpu: string;
      cores: number;
      memory: number; // GB
      storage: number; // GB
      gpu: string;
      network: string[];
    };
    software: {
      os: string;
      runtime: string;
      frameworks: string[];
      libraries: string[];
    };
    connectivity: {
      protocols: string[];
      bandwidth: number; // Mbps
      latency: number; // ms
      reliability: number; // 0-1
    };
    power: {
      type: 'mains' | 'battery' | 'solar' | 'generator';
      capacity: number; // Wh
      consumption: number; // W
      backup: number; // hours
    };
  };
  status: 'online' | 'offline' | 'maintenance' | 'error' | 'overloaded';
  performance: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    storageUsage: number; // percentage
    networkUsage: number; // percentage
    temperature: number; // Celsius
    uptime: number; // seconds
  };
  devices: string[]; // Device IDs
  capabilities: {
    processing: string[];
    storage: string[];
    communication: string[];
    analytics: string[];
    control: string[];
  };
  configuration: {
    processingMode: 'real_time' | 'batch' | 'stream' | 'hybrid';
    dataRetention: number; // days
    compression: boolean;
    encryption: boolean;
    backup: boolean;
    monitoring: boolean;
  };
}

interface SensorData {
  id: string;
  deviceId: string;
  timestamp: Date;
  type: string;
  value: any;
  unit: string;
  quality: number; // 0-1
  reliability: number; // 0-1
  metadata: {
    sensor: string;
    calibration: any;
    environment: any;
    processing: any;
  };
}

interface EdgeProcessingResult {
  processedData: SensorData[];
  summary: {
    totalDevices: number;
    activeDevices: number;
    totalDataPoints: number;
    processedDataPoints: number;
    averageLatency: number;
    throughput: number;
    errorRate: number;
  };
  performance: {
    processingTime: number; // milliseconds
    memoryUsage: number; // MB
    cpuUsage: number; // percentage
    networkUsage: number; // MB/s
    storageUsage: number; // MB
    powerConsumption: number; // W
  };
  analytics: {
    trends: any;
    anomalies: any[];
    predictions: any[];
    insights: string[];
  };
  alerts: {
    critical: string[];
    warning: string[];
    info: string[];
  };
}

interface EdgeComputingConfig {
  mqtt: {
    broker: string;
    port: number;
    username: string;
    password: string;
    clientId: string;
    keepalive: number;
    reconnectPeriod: number;
  };
  processing: {
    batchSize: number;
    windowSize: number;
    timeout: number;
    retryCount: number;
    parallelProcessing: boolean;
    maxConcurrency: number;
  };
  analytics: {
    enabled: boolean;
    algorithms: string[];
    models: string[];
    thresholds: { [key: string]: number };
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    alertThresholds: {
      latency: number;
      errorRate: number;
      throughput: number;
      powerConsumption: number;
    };
  };
}

@Injectable()
export class EdgeComputingIntegrationService {
  private readonly logger = new Logger(EdgeComputingIntegrationService.name);
  private mqttClient: MqttClient;
  private devices: Map<string, IoTDevice> = new Map();
  private edgeNodes: Map<string, EdgeNode> = new Map();
  private sensorData: Map<string, SensorData[]> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {
    this.initializeMqtt();
  }

  private async initializeMqtt(): Promise<void> {
    if (!mqtt) {
      this.logger.warn('MQTT not available, skipping initialization');
      return;
    }
    try {
      this.mqttClient = mqtt.connect({
        host: process.env.MQTT_BROKER || 'localhost',
        port: parseInt(process.env.MQTT_PORT || '1883'),
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clientId: 'ayaz-logistics-edge-computing',
        keepalive: 60,
        reconnectPeriod: 1000,
      });

      this.mqttClient.on('connect', () => {
        this.logger.log('MQTT client connected');
        this.subscribeToTopics();
      });

      this.mqttClient.on('error', (error) => {
        this.logger.error('MQTT client error:', error);
      });

      this.mqttClient.on('message', (topic, message) => {
        this.handleMqttMessage(topic, message);
      });
    } catch (error) {
      this.logger.error('Failed to initialize MQTT client:', error);
    }
  }

  private subscribeToTopics(): void {
    const topics = [
      'sensors/+/data',
      'sensors/+/status',
      'sensors/+/config',
      'edge/+/status',
      'edge/+/performance',
      'edge/+/alerts',
    ];

    topics.forEach(topic => {
      this.mqttClient.subscribe(topic, (error) => {
        if (error) {
          this.logger.error(`Failed to subscribe to topic ${topic}:`, error);
        } else {
          this.logger.log(`Subscribed to topic: ${topic}`);
        }
      });
    });
  }

  private handleMqttMessage(topic: string, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());
      
      if (topic.startsWith('sensors/')) {
        this.handleSensorMessage(topic, data);
      } else if (topic.startsWith('edge/')) {
        this.handleEdgeNodeMessage(topic, data);
      }
    } catch (error) {
      this.logger.error(`Failed to handle MQTT message from topic ${topic}:`, error);
    }
  }

  private handleSensorMessage(topic: string, data: any): void {
    const deviceId = topic.split('/')[1];
    const messageType = topic.split('/')[2];
    
    switch (messageType) {
      case 'data':
        this.processSensorData(deviceId, data);
        break;
      case 'status':
        this.updateDeviceStatus(deviceId, data);
        break;
      case 'config':
        this.updateDeviceConfiguration(deviceId, data);
        break;
    }
  }

  private handleEdgeNodeMessage(topic: string, data: any): void {
    const nodeId = topic.split('/')[1];
    const messageType = topic.split('/')[2];
    
    switch (messageType) {
      case 'status':
        this.updateEdgeNodeStatus(nodeId, data);
        break;
      case 'performance':
        this.updateEdgeNodePerformance(nodeId, data);
        break;
      case 'alerts':
        this.handleEdgeNodeAlert(nodeId, data);
        break;
    }
  }

  private processSensorData(deviceId: string, data: any): void {
    const sensorData: SensorData = {
      id: `sensor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId,
      timestamp: new Date(data.timestamp || Date.now()),
      type: data.type || 'unknown',
      value: data.value,
      unit: data.unit || '',
      quality: data.quality || 1.0,
      reliability: data.reliability || 1.0,
      metadata: {
        sensor: data.sensor || '',
        calibration: data.calibration || {},
        environment: data.environment || {},
        processing: data.processing || {},
      },
    };

    // Store sensor data
    if (!this.sensorData.has(deviceId)) {
      this.sensorData.set(deviceId, []);
    }
    this.sensorData.get(deviceId)!.push(sensorData);

    // Process data locally if device supports it
    const device = this.devices.get(deviceId);
    if (device && device.specifications.processing.capabilities.includes('local_processing')) {
      this.processDataLocally(device, sensorData);
    }

    // Send to edge node for processing
    this.sendToEdgeNode(deviceId, sensorData);
  }

  private processDataLocally(device: IoTDevice, sensorData: SensorData): void {
    // Local processing on the device
    const processedData = this.applyLocalProcessing(device, sensorData);
    
    // Send processed data to edge node
    this.sendToEdgeNode(device.id, processedData);
  }

  private applyLocalProcessing(device: IoTDevice, sensorData: SensorData): SensorData {
    // Apply local processing based on device capabilities
    const processedData = { ...sensorData };
    
    // Apply filters
    if (device.configuration.filters) {
      for (const [key, filter] of Object.entries(device.configuration.filters)) {
        if (key === 'noise_reduction') {
          processedData.value = this.applyNoiseReduction(processedData.value, filter);
        } else if (key === 'smoothing') {
          processedData.value = this.applySmoothing(processedData.value, filter);
        } else if (key === 'calibration') {
          processedData.value = this.applyCalibration(processedData.value, filter);
        }
      }
    }
    
    // Apply thresholds
    if (device.configuration.thresholds) {
      for (const [key, threshold] of Object.entries(device.configuration.thresholds)) {
        if (Math.abs(processedData.value) > threshold) {
          processedData.metadata.processing = {
            ...processedData.metadata.processing,
            thresholdExceeded: { key, threshold, value: processedData.value },
          };
        }
      }
    }
    
    return processedData;
  }

  private applyNoiseReduction(value: any, filter: any): any {
    // Simplified noise reduction
    if (typeof value === 'number') {
      return value * (1 - filter.factor || 0.1);
    }
    return value;
  }

  private applySmoothing(value: any, filter: any): any {
    // Simplified smoothing
    if (typeof value === 'number') {
      return value * (filter.factor || 0.9);
    }
    return value;
  }

  private applyCalibration(value: any, filter: any): any {
    // Simplified calibration
    if (typeof value === 'number') {
      return (value + filter.offset || 0) * (filter.scale || 1);
    }
    return value;
  }

  private sendToEdgeNode(deviceId: string, sensorData: SensorData): void {
    // Find the nearest edge node
    const device = this.devices.get(deviceId);
    if (!device) return;

    const nearestNode = this.findNearestEdgeNode(device.location);
    if (!nearestNode) return;

    // Send data to edge node
    const topic = `edge/${nearestNode.id}/data`;
    const message = JSON.stringify(sensorData);
    
    this.mqttClient.publish(topic, message, (error) => {
      if (error) {
        this.logger.error(`Failed to send data to edge node ${nearestNode.id}:`, error);
      }
    });
  }

  private findNearestEdgeNode(deviceLocation: any): EdgeNode | null {
    let nearestNode: EdgeNode | null = null;
    let minDistance = Infinity;

    for (const node of this.edgeNodes.values()) {
      const distance = this.calculateDistance(deviceLocation.coordinates, node.location.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }

    return nearestNode;
  }

  private calculateDistance(coord1: any, coord2: any): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLon = this.toRad(coord2.lon - coord1.lon);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(coord1.lat)) * Math.cos(this.toRad(coord2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private updateDeviceStatus(deviceId: string, data: any): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    device.status = data.status || device.status;
    device.connectivity.signal = data.signal || device.connectivity.signal;
    device.connectivity.quality = data.quality || device.connectivity.quality;
    device.connectivity.lastSeen = new Date();
    device.connectivity.retryCount = data.retryCount || device.connectivity.retryCount;

    this.devices.set(deviceId, device);
  }

  private updateDeviceConfiguration(deviceId: string, data: any): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    if (data.samplingInterval) {
      device.configuration.samplingInterval = data.samplingInterval;
    }
    if (data.transmissionInterval) {
      device.configuration.transmissionInterval = data.transmissionInterval;
    }
    if (data.thresholds) {
      device.configuration.thresholds = { ...device.configuration.thresholds, ...data.thresholds };
    }
    if (data.alerts) {
      device.configuration.alerts = { ...device.configuration.alerts, ...data.alerts };
    }
    if (data.filters) {
      device.configuration.filters = { ...device.configuration.filters, ...data.filters };
    }

    this.devices.set(deviceId, device);
  }

  private updateEdgeNodeStatus(nodeId: string, data: any): void {
    const node = this.edgeNodes.get(nodeId);
    if (!node) return;

    node.status = data.status || node.status;
    node.performance.cpuUsage = data.cpuUsage || node.performance.cpuUsage;
    node.performance.memoryUsage = data.memoryUsage || node.performance.memoryUsage;
    node.performance.storageUsage = data.storageUsage || node.performance.storageUsage;
    node.performance.networkUsage = data.networkUsage || node.performance.networkUsage;
    node.performance.temperature = data.temperature || node.performance.temperature;
    node.performance.uptime = data.uptime || node.performance.uptime;

    this.edgeNodes.set(nodeId, node);
  }

  private updateEdgeNodePerformance(nodeId: string, data: any): void {
    const node = this.edgeNodes.get(nodeId);
    if (!node) return;

    node.performance = { ...node.performance, ...data };
    this.edgeNodes.set(nodeId, node);
  }

  private handleEdgeNodeAlert(nodeId: string, data: any): void {
    this.logger.warn(`Edge node ${nodeId} alert: ${data.message}`);
    // In a real implementation, this would send alerts via email, SMS, etc.
  }

  async processEdgeData(
    devices: IoTDevice[],
    edgeNodes: EdgeNode[],
    config: EdgeComputingConfig,
    options: {
      includeRealTime: boolean;
      includeBatch: boolean;
      includeAnalytics: boolean;
      includePredictions: boolean;
      includeAnomalyDetection: boolean;
      maxConcurrency: number;
      timeout: number;
    },
  ): Promise<EdgeProcessingResult> {
    this.logger.log(`Processing edge data for ${devices.length} devices and ${edgeNodes.length} edge nodes`);

    const startTime = Date.now();
    const processedData: SensorData[] = [];
    let totalDevices = devices.length;
    let activeDevices = 0;
    let totalDataPoints = 0;
    let processedDataPoints = 0;
    let totalLatency = 0;

    // Initialize devices and edge nodes
    for (const device of devices) {
      this.devices.set(device.id, device);
      if (device.status === 'online') {
        activeDevices++;
      }
    }

    for (const node of edgeNodes) {
      this.edgeNodes.set(node.id, node);
    }

    // Process data from all devices
    for (const device of devices) {
      if (device.status !== 'online') continue;

      const deviceData = this.sensorData.get(device.id) || [];
      totalDataPoints += deviceData.length;

      for (const sensorData of deviceData) {
        try {
          const processed = await this.processSensorDataAtEdge(device, sensorData, config, options);
          if (processed) {
            processedData.push(processed);
            processedDataPoints++;
            totalLatency += Date.now() - sensorData.timestamp.getTime();
          }
        } catch (error) {
          this.logger.error(`Failed to process data from device ${device.id}: ${error.message}`);
        }
      }
    }

    // Calculate metrics
    const processingTime = Date.now() - startTime;
    const averageLatency = totalLatency / (processedDataPoints || 1);
    const throughput = (processedDataPoints / processingTime) * 1000; // data points per second
    const errorRate = (totalDataPoints - processedDataPoints) / (totalDataPoints || 1);

    const summary = {
      totalDevices,
      activeDevices,
      totalDataPoints,
      processedDataPoints,
      averageLatency,
      throughput,
      errorRate,
    };

    const performance = await this.calculateEdgePerformanceMetrics();
    const analytics = await this.performEdgeAnalytics(processedData, options);
    const alerts = await this.generateEdgeAlerts(summary, performance, analytics);

    const result: EdgeProcessingResult = {
      processedData,
      summary,
      performance,
      analytics,
      alerts,
    };

    await this.saveEdgeProcessingResult(result);
    await this.eventBus.emit('edge.computing.processed', { result });

    return result;
  }

  private async processSensorDataAtEdge(
    device: IoTDevice,
    sensorData: SensorData,
    config: EdgeComputingConfig,
    options: any,
  ): Promise<SensorData | null> {
    try {
      // Find the nearest edge node
      const nearestNode = this.findNearestEdgeNode(device.location);
      if (!nearestNode) return null;

      // Check if edge node can handle the processing
      if (nearestNode.status !== 'online' || nearestNode.performance.cpuUsage > 90) {
        return null;
      }

      // Process data based on edge node capabilities
      let processedData = sensorData;

      if (nearestNode.capabilities.processing.includes('real_time')) {
        processedData = this.processRealTimeData(processedData, nearestNode);
      }

      if (nearestNode.capabilities.analytics.includes('trend_analysis')) {
        processedData = this.analyzeTrends(processedData, device);
      }

      if (nearestNode.capabilities.analytics.includes('anomaly_detection')) {
        processedData = this.detectAnomalies(processedData, device);
      }

      if (nearestNode.capabilities.analytics.includes('prediction')) {
        processedData = this.makePredictions(processedData, device);
      }

      return processedData;
    } catch (error) {
      this.logger.error(`Failed to process sensor data at edge: ${error.message}`);
      return null;
    }
  }

  private processRealTimeData(sensorData: SensorData, edgeNode: EdgeNode): SensorData {
    // Real-time processing on edge node
    const processedData = { ...sensorData };
    
    // Apply real-time filters
    processedData.value = this.applyRealTimeFilters(processedData.value, edgeNode);
    
    // Update metadata
    processedData.metadata.processing = {
      ...processedData.metadata.processing,
      edgeNode: edgeNode.id,
      processingTime: Date.now(),
      realTime: true,
    };
    
    return processedData;
  }

  private applyRealTimeFilters(value: any, edgeNode: EdgeNode): any {
    // Apply real-time filtering based on edge node capabilities
    if (typeof value === 'number') {
      // Simple moving average
      return value * 0.9 + (value * 0.1);
    }
    return value;
  }

  private analyzeTrends(sensorData: SensorData, device: IoTDevice): SensorData {
    // Analyze trends in sensor data
    const processedData = { ...sensorData };
    
    // Get historical data
    const historicalData = this.sensorData.get(device.id) || [];
    const recentData = historicalData.slice(-10); // Last 10 data points
    
    if (recentData.length > 1) {
      const trend = this.calculateTrend(recentData.map(d => d.value));
      processedData.metadata.processing = {
        ...processedData.metadata.processing,
        trend: trend,
        trendDirection: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      };
    }
    
    return processedData;
  }

  private calculateTrend(values: any[]): number {
    if (values.length < 2) return 0;
    
    let trend = 0;
    for (let i = 1; i < values.length; i++) {
      if (typeof values[i] === 'number' && typeof values[i-1] === 'number') {
        trend += values[i] - values[i-1];
      }
    }
    
    return trend / (values.length - 1);
  }

  private detectAnomalies(sensorData: SensorData, device: IoTDevice): SensorData {
    // Detect anomalies in sensor data
    const processedData = { ...sensorData };
    
    // Simple anomaly detection based on thresholds
    const thresholds = device.configuration.thresholds;
    if (thresholds) {
      for (const [key, threshold] of Object.entries(thresholds)) {
        if (Math.abs(processedData.value) > threshold) {
          processedData.metadata.processing = {
            ...processedData.metadata.processing,
            anomaly: {
              type: key,
              threshold: threshold,
              value: processedData.value,
              severity: 'high',
            },
          };
        }
      }
    }
    
    return processedData;
  }

  private makePredictions(sensorData: SensorData, device: IoTDevice): SensorData {
    // Make predictions based on sensor data
    const processedData = { ...sensorData };
    
    // Simple linear prediction
    const historicalData = this.sensorData.get(device.id) || [];
    const recentData = historicalData.slice(-5); // Last 5 data points
    
    if (recentData.length > 1) {
      const prediction = this.linearPrediction(recentData.map(d => d.value));
      processedData.metadata.processing = {
        ...processedData.metadata.processing,
        prediction: {
          value: prediction,
          confidence: 0.8,
          method: 'linear',
        },
      };
    }
    
    return processedData;
  }

  private linearPrediction(values: any[]): number {
    if (values.length < 2) return 0;
    
    const numericValues = values.filter(v => typeof v === 'number');
    if (numericValues.length < 2) return 0;
    
    const lastValue = numericValues[numericValues.length - 1];
    const secondLastValue = numericValues[numericValues.length - 2];
    
    return lastValue + (lastValue - secondLastValue);
  }

  private async calculateEdgePerformanceMetrics(): Promise<any> {
    // Calculate edge computing performance metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      processingTime: 0, // Will be calculated by caller
      memoryUsage: memoryUsage.heapUsed / 1024 / 1024, // MB
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // percentage
      networkUsage: 0, // Would need network monitoring
      storageUsage: 0, // Would need storage monitoring
      powerConsumption: 0, // Would need power monitoring
    };
  }

  private async performEdgeAnalytics(processedData: SensorData[], options: any): Promise<any> {
    const analytics = {
      trends: {},
      anomalies: [],
      predictions: [],
      insights: [],
    };
    
    if (options.includeAnalytics) {
      // Analyze trends
      analytics.trends = this.analyzeDataTrends(processedData);
      
      // Detect anomalies
      if (options.includeAnomalyDetection) {
        analytics.anomalies = this.detectDataAnomalies(processedData);
      }
      
      // Make predictions
      if (options.includePredictions) {
        analytics.predictions = this.generateDataPredictions(processedData);
      }
      
      // Generate insights
      analytics.insights = this.generateDataInsights(processedData);
    }
    
    return analytics;
  }

  private analyzeDataTrends(processedData: SensorData[]): any {
    // Analyze trends across all processed data
    const trends: any = {};
    
    // Group data by type
    const dataByType = processedData.reduce((acc, data) => {
      if (!acc[data.type]) acc[data.type] = [];
      acc[data.type].push(data.value);
      return acc;
    }, {} as any);
    
    // Calculate trends for each type
    for (const [type, values] of Object.entries(dataByType)) {
      const numericValues = (values as any[]).filter(v => typeof v === 'number');
      if (numericValues.length > 1) {
        trends[type] = this.calculateTrend(numericValues);
      }
    }
    
    return trends;
  }

  private detectDataAnomalies(processedData: SensorData[]): any[] {
    // Detect anomalies across all processed data
    const anomalies: any[] = [];
    
    for (const data of processedData) {
      if (data.metadata.processing?.anomaly) {
        anomalies.push({
          id: data.id,
          deviceId: data.deviceId,
          type: data.type,
          value: data.value,
          anomaly: data.metadata.processing.anomaly,
          timestamp: data.timestamp,
        });
      }
    }
    
    return anomalies;
  }

  private generateDataPredictions(processedData: SensorData[]): any[] {
    // Generate predictions based on processed data
    const predictions: any[] = [];
    
    for (const data of processedData) {
      if (data.metadata.processing?.prediction) {
        predictions.push({
          id: data.id,
          deviceId: data.deviceId,
          type: data.type,
          prediction: data.metadata.processing.prediction,
          timestamp: data.timestamp,
        });
      }
    }
    
    return predictions;
  }

  private generateDataInsights(processedData: SensorData[]): string[] {
    // Generate insights based on processed data
    const insights: string[] = [];
    
    // Analyze data quality
    const qualityScores = processedData.map(d => d.quality);
    const averageQuality = qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length;
    
    if (averageQuality < 0.8) {
      insights.push('Data quality is below optimal threshold');
    }
    
    // Analyze data reliability
    const reliabilityScores = processedData.map(d => d.reliability);
    const averageReliability = reliabilityScores.reduce((sum, r) => sum + r, 0) / reliabilityScores.length;
    
    if (averageReliability < 0.9) {
      insights.push('Data reliability is below optimal threshold');
    }
    
    // Analyze processing performance
    const processingTimes = processedData.map(d => d.metadata.processing?.processingTime || 0);
    const averageProcessingTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length;
    
    if (averageProcessingTime > 1000) {
      insights.push('Processing time is above optimal threshold');
    }
    
    return insights;
  }

  private async generateEdgeAlerts(summary: any, performance: any, analytics: any): Promise<any> {
    const alerts = {
      critical: [],
      warning: [],
      info: [],
    };
    
    if (summary.errorRate > 0.1) {
      alerts.critical.push('High error rate in edge processing');
    }
    
    if (summary.averageLatency > 1000) {
      alerts.warning.push('High latency in edge processing');
    }
    
    if (performance.memoryUsage > 1000) {
      alerts.warning.push('High memory usage in edge processing');
    }
    
    if (analytics.anomalies.length > 10) {
      alerts.warning.push('High number of anomalies detected');
    }
    
    if (summary.throughput < 100) {
      alerts.info.push('Low throughput in edge processing');
    }
    
    return alerts;
  }

  async registerDevice(device: IoTDevice): Promise<void> {
    this.devices.set(device.id, device);
    this.logger.log(`Device registered: ${device.name}`);
  }

  async registerEdgeNode(node: EdgeNode): Promise<void> {
    this.edgeNodes.set(node.id, node);
    this.logger.log(`Edge node registered: ${node.name}`);
  }

  async getDeviceStatus(deviceId: string): Promise<IoTDevice | null> {
    return this.devices.get(deviceId) || null;
  }

  async getEdgeNodeStatus(nodeId: string): Promise<EdgeNode | null> {
    return this.edgeNodes.get(nodeId) || null;
  }

  async getSensorData(deviceId: string, limit: number = 100): Promise<SensorData[]> {
    const data = this.sensorData.get(deviceId) || [];
    return data.slice(-limit);
  }

  private async saveEdgeProcessingResult(result: EdgeProcessingResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO edge_computing_processing_results 
        (total_devices, active_devices, total_data_points, processed_data_points, 
         average_latency, throughput, error_rate, processing_time, memory_usage, 
         cpu_usage, network_usage, storage_usage, power_consumption, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      `, [
        result.summary.totalDevices,
        result.summary.activeDevices,
        result.summary.totalDataPoints,
        result.summary.processedDataPoints,
        result.summary.averageLatency,
        result.summary.throughput,
        result.summary.errorRate,
        result.performance.processingTime,
        result.performance.memoryUsage,
        result.performance.cpuUsage,
        result.performance.networkUsage,
        result.performance.storageUsage,
        result.performance.powerConsumption,
      ]);
    } catch (error) {
      this.logger.error('Failed to save edge computing processing result:', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.mqttClient) {
        await this.mqttClient.end();
      }
      this.logger.log('MQTT client disconnected');
    } catch (error) {
      this.logger.error('Failed to disconnect MQTT client:', error);
    }
  }
}

