import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as mqtt from 'mqtt';

interface SensorData {
  deviceId: string;
  sensorType: 'temperature' | 'humidity' | 'gps' | 'rfid' | 'pressure' | 'vibration';
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface DeviceStatus {
  deviceId: string;
  online: boolean;
  lastSeen: Date;
  battery: number;
  signalStrength: number;
}

@Injectable()
export class IoTDeviceService {
  private readonly logger = new Logger(IoTDeviceService.name);
  private mqttClient: mqtt.MqttClient;
  private deviceData: Map<string, SensorData[]> = new Map();

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {
    this.initializeMQTT();
  }

  private initializeMQTT(): void {
    const brokerUrl = process.env.IOT_MQTT_BROKER || 'mqtt://localhost:1883';
    this.mqttClient = mqtt.connect(brokerUrl, {
      username: process.env.IOT_MQTT_USERNAME,
      password: process.env.IOT_MQTT_PASSWORD,
    });

    this.mqttClient.on('connect', () => {
      this.logger.log('Connected to MQTT broker');
      this.mqttClient.subscribe('devices/+/sensors/#');
    });

    this.mqttClient.on('message', (topic, message) => {
      this.handleSensorData(topic, message);
    });
  }

  private handleSensorData(topic: string, message: Buffer): void {
    try {
      const parts = topic.split('/');
      const deviceId = parts[1];
      const data = JSON.parse(message.toString()) as SensorData;
      
      const deviceHistory = this.deviceData.get(deviceId) || [];
      deviceHistory.push(data);
      if (deviceHistory.length > 1000) deviceHistory.shift();
      this.deviceData.set(deviceId, deviceHistory);

      this.checkThresholds(data);
    } catch (error) {
      this.logger.error('Failed to process sensor data:', error);
    }
  }

  private checkThresholds(data: SensorData): void {
    if (data.sensorType === 'temperature') {
      const temp = data.value;
      if (temp < 5 || temp > 35) {
        this.logger.warn(`Temperature alert for device ${data.deviceId}: ${temp}°C`);
      }
    }
  }

  async getDeviceData(deviceId: string, limit: number = 100): Promise<SensorData[]> {
    const history = this.deviceData.get(deviceId) || [];
    return history.slice(-limit);
  }

  async publishCommand(deviceId: string, command: string, payload: any): Promise<void> {
    const topic = `devices/${deviceId}/commands`;
    this.mqttClient.publish(topic, JSON.stringify({ command, payload }));
    this.logger.log(`Command sent to device ${deviceId}: ${command}`);
  }
}

