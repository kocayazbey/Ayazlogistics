import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as mqtt from 'mqtt';

interface IoTDeviceRegistration {
  deviceId: string;
  deviceType: 'sensor' | 'gateway' | 'actuator' | 'tracker' | 'controller';
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  locationId?: string;
  metadata: Record<string, any>;
}

interface DeviceConfiguration {
  deviceId: string;
  samplingInterval: number;
  reportingInterval: number;
  thresholds: Record<string, { min: number; max: number }>;
  enabledSensors: string[];
  powerMode: 'normal' | 'low_power' | 'high_performance';
}

interface DeviceCommand {
  deviceId: string;
  command: 'reboot' | 'update_config' | 'calibrate' | 'test' | 'shutdown' | 'wake';
  parameters?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt?: Date;
}

interface FirmwareUpdate {
  version: string;
  deviceType: string;
  releaseDate: Date;
  downloadUrl: string;
  checksum: string;
  changelog: string[];
  mandatory: boolean;
  rolloutPercentage: number;
}

@Injectable()
export class IoTPlatformService {
  private readonly logger = new Logger(IoTPlatformService.name);
  private mqttClient: mqtt.MqttClient;

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {
    this.initializeMQTT();
  }

  private initializeMQTT(): void {
    const brokerUrl = process.env.IOT_MQTT_BROKER || 'mqtt://localhost:1883';
    
    this.mqttClient = mqtt.connect(brokerUrl, {
      clientId: `iot_platform_${Math.random().toString(36).substr(2, 9)}`,
      username: process.env.IOT_MQTT_USERNAME,
      password: process.env.IOT_MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 1000,
    });

    this.mqttClient.on('connect', () => {
      this.logger.log('MQTT broker connected');
      
      this.mqttClient.subscribe('devices/+/telemetry', (err) => {
        if (err) this.logger.error('Subscription failed:', err);
      });

      this.mqttClient.subscribe('devices/+/status', (err) => {
        if (err) this.logger.error('Subscription failed:', err);
      });
    });

    this.mqttClient.on('message', (topic, message) => {
      this.handleMQTTMessage(topic, message);
    });

    this.mqttClient.on('error', (error) => {
      this.logger.error('MQTT error:', error);
    });
  }

  private async handleMQTTMessage(topic: string, message: Buffer): Promise<void> {
    const parts = topic.split('/');
    const deviceId = parts[1];
    const messageType = parts[2];

    try {
      const payload = JSON.parse(message.toString());

      if (messageType === 'telemetry') {
        await this.processTelemetry(deviceId, payload);
      } else if (messageType === 'status') {
        await this.updateDeviceStatus(deviceId, payload);
      }
    } catch (error) {
      this.logger.error(`Failed to process message from ${deviceId}:`, error);
    }
  }

  async registerDevice(registration: IoTDeviceRegistration): Promise<void> {
    this.logger.log(`Registering IoT device: ${registration.deviceId}`);

    await this.db.execute(
      `INSERT INTO iot_devices 
       (device_id, device_type, manufacturer, model, firmware_version, location_id, metadata, registered_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'registered')
       ON CONFLICT (device_id) DO UPDATE SET
         firmware_version = $5,
         location_id = $6,
         metadata = $7,
         updated_at = NOW()`,
      [
        registration.deviceId,
        registration.deviceType,
        registration.manufacturer,
        registration.model,
        registration.firmwareVersion,
        registration.locationId,
        JSON.stringify(registration.metadata),
      ]
    );

    const defaultConfig: DeviceConfiguration = {
      deviceId: registration.deviceId,
      samplingInterval: 60,
      reportingInterval: 300,
      thresholds: {},
      enabledSensors: ['temperature', 'humidity', 'location'],
      powerMode: 'normal',
    };

    await this.updateDeviceConfiguration(defaultConfig);
  }

  async updateDeviceConfiguration(config: DeviceConfiguration): Promise<void> {
    await this.db.execute(
      `INSERT INTO iot_device_configurations 
       (device_id, sampling_interval, reporting_interval, thresholds, enabled_sensors, power_mode, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (device_id) DO UPDATE SET
         sampling_interval = $2,
         reporting_interval = $3,
         thresholds = $4,
         enabled_sensors = $5,
         power_mode = $6,
         updated_at = NOW()`,
      [
        config.deviceId,
        config.samplingInterval,
        config.reportingInterval,
        JSON.stringify(config.thresholds),
        JSON.stringify(config.enabledSensors),
        config.powerMode,
      ]
    );

    const topic = `devices/${config.deviceId}/config`;
    this.mqttClient.publish(topic, JSON.stringify(config), { qos: 1 });

    this.logger.log(`Configuration updated for device ${config.deviceId}`);
  }

  async sendCommand(command: DeviceCommand): Promise<void> {
    this.logger.log(`Sending command to device ${command.deviceId}: ${command.command}`);

    await this.db.execute(
      `INSERT INTO iot_device_commands 
       (device_id, command, parameters, priority, scheduled_at, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
      [
        command.deviceId,
        command.command,
        JSON.stringify(command.parameters || {}),
        command.priority,
        command.scheduledAt || new Date(),
      ]
    );

    const topic = `devices/${command.deviceId}/commands`;
    const payload = {
      command: command.command,
      parameters: command.parameters,
      timestamp: new Date().toISOString(),
    };

    this.mqttClient.publish(topic, JSON.stringify(payload), { qos: command.priority === 'urgent' ? 2 : 1 });
  }

  private async processTelemetry(deviceId: string, data: any): Promise<void> {
    await this.db.execute(
      `INSERT INTO iot_sensor_data (device_id, sensor_type, value, unit, timestamp, quality)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [deviceId, data.sensor_type, data.value, data.unit, new Date(data.timestamp), data.quality || 'good']
    );

    await this.db.execute(
      `UPDATE iot_devices SET last_seen = NOW() WHERE device_id = $1`,
      [deviceId]
    );
  }

  private async updateDeviceStatus(deviceId: string, status: any): Promise<void> {
    await this.db.execute(
      `UPDATE iot_devices SET 
       status = $2,
       battery_level = $3,
       signal_strength = $4,
       last_seen = NOW()
       WHERE device_id = $1`,
      [deviceId, status.status, status.battery_level, status.signal_strength]
    );
  }

  async deployFirmwareUpdate(update: FirmwareUpdate, targetDevices?: string[]): Promise<void> {
    this.logger.log(`Deploying firmware ${update.version} to ${update.deviceType} devices`);

    const devices = targetDevices || await this.getDevicesByType(update.deviceType);
    const updateCount = Math.ceil(devices.length * (update.rolloutPercentage / 100));
    const selectedDevices = devices.slice(0, updateCount);

    for (const deviceId of selectedDevices) {
      await this.sendCommand({
        deviceId,
        command: 'update_config',
        parameters: {
          firmware_version: update.version,
          download_url: update.downloadUrl,
          checksum: update.checksum,
        },
        priority: update.mandatory ? 'high' : 'normal',
      });
    }

    await this.db.execute(
      `INSERT INTO firmware_updates 
       (version, device_type, release_date, download_url, checksum, mandatory, rollout_percentage, deployed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [update.version, update.deviceType, update.releaseDate, update.downloadUrl, update.checksum, update.mandatory, update.rolloutPercentage]
    );

    this.logger.log(`Firmware deployed to ${selectedDevices.length} devices`);
  }

  private async getDevicesByType(deviceType: string): Promise<string[]> {
    const result = await this.db.execute(
      `SELECT device_id FROM iot_devices WHERE device_type = $1 AND status = 'online'`,
      [deviceType]
    );

    return result.rows.map(row => row.device_id);
  }

  async getDeviceFleet(tenantId: string): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT 
        d.device_id,
        d.device_type,
        d.status,
        d.battery_level,
        d.firmware_version,
        d.last_seen,
        EXTRACT(EPOCH FROM (NOW() - d.last_seen)) as offline_seconds
       FROM iot_devices d
       WHERE d.tenant_id = $1
       ORDER BY d.last_seen DESC`,
      [tenantId]
    );

    return result.rows.map(row => ({
      deviceId: row.device_id,
      type: row.device_type,
      status: parseInt(row.offline_seconds) < 300 ? 'online' : 'offline',
      batteryLevel: parseFloat(row.battery_level || '0'),
      firmwareVersion: row.firmware_version,
      lastSeen: new Date(row.last_seen),
      offlineFor: parseInt(row.offline_seconds),
    }));
  }
}

