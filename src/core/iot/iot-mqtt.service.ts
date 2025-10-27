import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mqtt from 'mqtt';
import { EventBusService } from '../events/event-bus.service';
import { WebSocketGateway } from '../websocket/websocket.gateway';

interface IoTDevice {
  id: string;
  type: 'temperature' | 'gps' | 'humidity' | 'door' | 'scale';
  shipmentId?: string;
  vehicleId?: string;
  warehouseId?: string;
  status: 'online' | 'offline';
  lastSeen: Date;
}

interface TemperatureReading {
  deviceId: string;
  temperature: number;
  humidity?: number;
  timestamp: Date;
  shipmentId?: string;
  alert?: boolean;
}

interface GPSReading {
  deviceId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude: number;
  timestamp: Date;
  vehicleId?: string;
}

@Injectable()
export class IoTMQTTService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IoTMQTTService.name);
  private mqttClient: mqtt.MqttClient;
  private devices: Map<string, IoTDevice> = new Map();

  constructor(
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    const mqttUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const mqttUsername = process.env.MQTT_USERNAME || '';
    const mqttPassword = process.env.MQTT_PASSWORD || '';

    try {
      this.mqttClient = mqtt.connect(mqttUrl, {
        username: mqttUsername,
        password: mqttPassword,
        clientId: `ayazlogistics-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
      });

      this.mqttClient.on('connect', () => {
        this.logger.log('Connected to MQTT broker');
        this.subscribeToTopics();
      });

      this.mqttClient.on('message', (topic, message) => {
        this.handleMessage(topic, message);
      });

      this.mqttClient.on('error', (error) => {
        this.logger.error('MQTT error:', error);
      });

      this.mqttClient.on('offline', () => {
        this.logger.warn('MQTT client offline');
      });

      this.mqttClient.on('reconnect', () => {
        this.logger.log('MQTT client reconnecting...');
      });
    } catch (error) {
      this.logger.error('Failed to connect to MQTT broker:', error);
    }
  }

  private subscribeToTopics() {
    const topics = [
      'ayaz/devices/+/temperature',
      'ayaz/devices/+/gps',
      'ayaz/devices/+/humidity',
      'ayaz/devices/+/door',
      'ayaz/devices/+/scale',
      'ayaz/devices/+/status',
    ];

    this.mqttClient.subscribe(topics, (err) => {
      if (err) {
        this.logger.error('Failed to subscribe to topics:', err);
      } else {
        this.logger.log(`Subscribed to ${topics.length} IoT topics`);
      }
    });
  }

  private handleMessage(topic: string, message: Buffer) {
    try {
      const data = JSON.parse(message.toString());
      const topicParts = topic.split('/');
      const deviceId = topicParts[2];
      const messageType = topicParts[3];

      switch (messageType) {
        case 'temperature':
          this.handleTemperatureReading(deviceId, data);
          break;
        case 'gps':
          this.handleGPSReading(deviceId, data);
          break;
        case 'humidity':
          this.handleHumidityReading(deviceId, data);
          break;
        case 'door':
          this.handleDoorSensor(deviceId, data);
          break;
        case 'scale':
          this.handleScaleReading(deviceId, data);
          break;
        case 'status':
          this.handleDeviceStatus(deviceId, data);
          break;
      }
    } catch (error) {
      this.logger.error(`Failed to handle message from ${topic}:`, error);
    }
  }

  private async handleTemperatureReading(deviceId: string, data: any) {
    const reading: TemperatureReading = {
      deviceId,
      temperature: data.temperature,
      humidity: data.humidity,
      timestamp: new Date(data.timestamp || Date.now()),
      shipmentId: data.shipmentId,
      alert: false,
    };

    // Check temperature thresholds
    const minTemp = data.minThreshold || 2;
    const maxTemp = data.maxThreshold || 8;

    if (reading.temperature < minTemp || reading.temperature > maxTemp) {
      reading.alert = true;
      this.logger.warn(`Temperature alert for device ${deviceId}: ${reading.temperature}°C (range: ${minTemp}-${maxTemp}°C)`);

      await this.eventBus.emit('iot.temperature.alert', reading);

      // Send real-time alert to frontend
      if (reading.shipmentId) {
        this.wsGateway.sendToRoom(`shipment:${reading.shipmentId}`, 'temperature:alert', reading);
      }
    }

    await this.eventBus.emit('iot.temperature.reading', reading);
  }

  private async handleGPSReading(deviceId: string, data: any) {
    const reading: GPSReading = {
      deviceId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed || 0,
      heading: data.heading || 0,
      altitude: data.altitude || 0,
      timestamp: new Date(data.timestamp || Date.now()),
      vehicleId: data.vehicleId,
    };

    await this.eventBus.emit('iot.gps.reading', reading);

    // Update vehicle location in real-time
    if (reading.vehicleId) {
      this.wsGateway.sendToRoom(`vehicle:${reading.vehicleId}`, 'gps:update', {
        latitude: reading.latitude,
        longitude: reading.longitude,
        speed: reading.speed,
        timestamp: reading.timestamp,
      });
    }

    // Check geofencing (if configured)
    await this.checkGeofence(reading);
  }

  private async handleHumidityReading(deviceId: string, data: any) {
    const reading = {
      deviceId,
      humidity: data.humidity,
      timestamp: new Date(data.timestamp || Date.now()),
    };

    if (data.humidity > 80 || data.humidity < 20) {
      this.logger.warn(`Humidity alert for device ${deviceId}: ${data.humidity}%`);
      await this.eventBus.emit('iot.humidity.alert', reading);
    }

    await this.eventBus.emit('iot.humidity.reading', reading);
  }

  private async handleDoorSensor(deviceId: string, data: any) {
    const event = {
      deviceId,
      status: data.status, // 'open' or 'closed'
      timestamp: new Date(data.timestamp || Date.now()),
      vehicleId: data.vehicleId,
    };

    if (data.status === 'open' && data.unauthorized) {
      this.logger.warn(`Unauthorized door opening detected: ${deviceId}`);
      await this.eventBus.emit('iot.door.unauthorized', event);
    }

    await this.eventBus.emit('iot.door.event', event);
  }

  private async handleScaleReading(deviceId: string, data: any) {
    const reading = {
      deviceId,
      weight: data.weight,
      unit: data.unit || 'kg',
      timestamp: new Date(data.timestamp || Date.now()),
      warehouseId: data.warehouseId,
    };

    await this.eventBus.emit('iot.scale.reading', reading);
  }

  private async handleDeviceStatus(deviceId: string, data: any) {
    const device = this.devices.get(deviceId) || {
      id: deviceId,
      type: data.type,
      status: 'offline',
      lastSeen: new Date(),
    };

    device.status = data.status;
    device.lastSeen = new Date();

    this.devices.set(deviceId, device);

    if (data.status === 'offline') {
      this.logger.warn(`Device ${deviceId} went offline`);
      await this.eventBus.emit('iot.device.offline', device);
    }
  }

  private async checkGeofence(gps: GPSReading) {
    // Simplified geofence check
    // In production, this would check against configured geofences
    const isInGeofence = true; // Mock

    if (!isInGeofence) {
      this.logger.warn(`Vehicle ${gps.vehicleId} left geofence`);
      await this.eventBus.emit('iot.geofence.violation', {
        vehicleId: gps.vehicleId,
        location: { lat: gps.latitude, lng: gps.longitude },
        timestamp: gps.timestamp,
      });
    }
  }

  // Publish command to device
  async publishCommand(deviceId: string, command: string, payload: any): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const topic = `ayaz/devices/${deviceId}/commands`;
      const message = JSON.stringify({ command, payload, timestamp: Date.now() });

      this.mqttClient.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          this.logger.error(`Failed to publish command to ${deviceId}:`, error);
          reject(false);
        } else {
          this.logger.log(`Command published to ${deviceId}: ${command}`);
          resolve(true);
        }
      });
    });
  }

  // Get device status
  getDeviceStatus(deviceId: string): IoTDevice | undefined {
    return this.devices.get(deviceId);
  }

  // Get all devices
  getAllDevices(): IoTDevice[] {
    return Array.from(this.devices.values());
  }

  // Get devices by type
  getDevicesByType(type: IoTDevice['type']): IoTDevice[] {
    return Array.from(this.devices.values()).filter(d => d.type === type);
  }

  async disconnect(): Promise<void> {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.logger.log('Disconnected from MQTT broker');
    }
  }
}

