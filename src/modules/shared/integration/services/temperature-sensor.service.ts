import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface TemperatureSensor {
  id: string;
  sensorId: string;
  location: string;
  zoneType: 'ambient' | 'refrigerated' | 'frozen' | 'deep_freeze';
  minTemp: number;
  maxTemp: number;
  currentTemp?: number;
  lastReading?: Date;
  isActive: boolean;
  batteryLevel?: number;
}

interface TemperatureReading {
  sensorId: string;
  temperature: number;
  humidity?: number;
  timestamp: Date;
  location?: string;
}

interface TemperatureAlert {
  id: string;
  sensorId: string;
  alertType: 'high_temp' | 'low_temp' | 'excursion' | 'battery_low' | 'offline';
  severity: 'info' | 'warning' | 'critical';
  temperature?: number;
  threshold?: number;
  duration?: number; // minutes
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

@Injectable()
export class TemperatureSensorService {
  private readonly logger = new Logger(TemperatureSensorService.name);
  private mqttClient: mqtt.MqttClient | null = null;
  private readonly sensorReadings: Map<string, TemperatureReading[]> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
  ) {
    this.initializeMQTT();
  }

  private initializeMQTT(): void {
    const mqttUrl = this.configService.get<string>('MQTT_BROKER_URL') || 'mqtt://localhost:1883';
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');

    try {
      this.mqttClient = mqtt.connect(mqttUrl, {
        username,
        password,
        clientId: `ayaz-temp-service-${Date.now()}`,
        clean: true,
        reconnectPeriod: 5000,
      });

      this.mqttClient.on('connect', () => {
        this.logger.log('Connected to MQTT broker for temperature sensors');
        this.mqttClient?.subscribe('sensors/temperature/#', (err) => {
          if (err) {
            this.logger.error(`MQTT subscription failed: ${err.message}`);
          }
        });
      });

      this.mqttClient.on('message', (topic, payload) => {
        this.handleSensorMessage(topic, payload);
      });

      this.mqttClient.on('error', (error) => {
        this.logger.error(`MQTT error: ${error.message}`);
      });
    } catch (error: any) {
      this.logger.error(`MQTT initialization failed: ${error.message}`);
    }
  }

  private handleSensorMessage(topic: string, payload: Buffer): void {
    try {
      const data = JSON.parse(payload.toString());
      const sensorId = topic.split('/').pop() || '';

      const reading: TemperatureReading = {
        sensorId,
        temperature: data.temperature,
        humidity: data.humidity,
        timestamp: new Date(data.timestamp || Date.now()),
        location: data.location,
      };

      this.processSensorReading(reading);
    } catch (error: any) {
      this.logger.error(`Failed to process sensor message: ${error.message}`);
    }
  }

  private async processSensorReading(reading: TemperatureReading): Promise<void> {
    // Store reading
    if (!this.sensorReadings.has(reading.sensorId)) {
      this.sensorReadings.set(reading.sensorId, []);
    }

    const readings = this.sensorReadings.get(reading.sensorId)!;
    readings.push(reading);

    // Keep only last 1000 readings per sensor
    if (readings.length > 1000) {
      readings.shift();
    }

    // Check for alerts
    const sensor = await this.getSensor(reading.sensorId);

    if (sensor) {
      if (reading.temperature > sensor.maxTemp) {
        await this.createAlert({
          sensorId: reading.sensorId,
          alertType: 'high_temp',
          severity: 'critical',
          temperature: reading.temperature,
          threshold: sensor.maxTemp,
          timestamp: reading.timestamp,
        });
      } else if (reading.temperature < sensor.minTemp) {
        await this.createAlert({
          sensorId: reading.sensorId,
          alertType: 'low_temp',
          severity: 'critical',
          temperature: reading.temperature,
          threshold: sensor.minTemp,
          timestamp: reading.timestamp,
        });
      }
    }

    // Emit event for real-time monitoring
    await this.eventBus.emit('temperature.reading.received', {
      sensorId: reading.sensorId,
      temperature: reading.temperature,
      timestamp: reading.timestamp,
    });
  }

  async registerSensor(
    sensor: Omit<TemperatureSensor, 'id'>,
    tenantId: string,
    userId: string,
  ): Promise<TemperatureSensor> {
    const id = `TEMP-SENSOR-${Date.now()}`;

    const fullSensor: TemperatureSensor = {
      id,
      ...sensor,
    };

    await this.eventBus.emit('temperature.sensor.registered', {
      sensorId: fullSensor.id,
      location: sensor.location,
      zoneType: sensor.zoneType,
      tenantId,
    });

    return fullSensor;
  }

  async getSensor(sensorId: string): Promise<TemperatureSensor | null> {
    // Mock: Would query sensors table
    return null;
  }

  async getSensorReadings(
    sensorId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TemperatureReading[]> {
    const allReadings = this.sensorReadings.get(sensorId) || [];

    return allReadings.filter(
      (r) => r.timestamp >= startDate && r.timestamp <= endDate,
    );
  }

  async getZoneTemperatures(
    warehouseId: string,
    zoneType: string,
    tenantId: string,
  ): Promise<Array<{ sensorId: string; location: string; currentTemp: number; status: string }>> {
    // Mock: Would query active sensors for this zone
    return [];
  }

  async createAlert(
    data: Omit<TemperatureAlert, 'id' | 'acknowledged'>,
  ): Promise<TemperatureAlert> {
    const alertId = `ALERT-${Date.now()}`;

    const alert: TemperatureAlert = {
      id: alertId,
      ...data,
      acknowledged: false,
    };

    await this.eventBus.emit('temperature.alert.created', {
      alertId,
      sensorId: data.sensorId,
      alertType: data.alertType,
      severity: data.severity,
      temperature: data.temperature,
    });

    // Send notifications based on severity
    if (data.severity === 'critical') {
      await this.eventBus.emit('temperature.critical_alert', {
        alertId,
        sensorId: data.sensorId,
        temperature: data.temperature,
        threshold: data.threshold,
      });
    }

    return alert;
  }

  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string,
    notes?: string,
  ): Promise<void> {
    await this.eventBus.emit('temperature.alert.acknowledged', {
      alertId,
      acknowledgedBy,
      acknowledgedAt: new Date(),
      notes,
    });
  }

  async resolveAlert(
    alertId: string,
    resolvedBy: string,
    resolution: string,
  ): Promise<void> {
    await this.eventBus.emit('temperature.alert.resolved', {
      alertId,
      resolvedBy,
      resolvedAt: new Date(),
      resolution,
    });
  }

  async getActiveAlerts(warehouseId: string, tenantId: string): Promise<TemperatureAlert[]> {
    // Mock: Would query temperature_alerts table
    return [];
  }

  async getTemperatureExcursionReport(
    locationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    return {
      locationId,
      period: { startDate, endDate },
      excursions: [],
      totalExcursionTime: 0, // minutes
      avgTemperature: 0,
      minTemperature: 0,
      maxTemperature: 0,
    };
  }

  async validateColdChainCompliance(
    shipmentId: string,
    tenantId: string,
  ): Promise<{
    compliant: boolean;
    excursions: number;
    totalExcursionMinutes: number;
    report: any;
  }> {
    // Mock: Would check all temperature readings for this shipment
    return {
      compliant: true,
      excursions: 0,
      totalExcursionMinutes: 0,
      report: {},
    };
  }

  onModuleDestroy(): void {
    if (this.mqttClient) {
      this.mqttClient.end();
    }
  }
}

