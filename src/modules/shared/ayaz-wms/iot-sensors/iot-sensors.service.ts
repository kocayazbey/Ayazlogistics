import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IotSensor } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class IotSensorsService {
  constructor(
    @InjectRepository(IotSensor)
    private iotSensorRepository: Repository<IotSensor>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<IotSensor[]> {
    const query = this.iotSensorRepository.createQueryBuilder('iotSensor')
      .where('iotSensor.tenantId = :tenantId', { tenantId });

    if (filters?.type) {
      query.andWhere('iotSensor.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      query.andWhere('iotSensor.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<IotSensor> {
    return this.iotSensorRepository.findOne({
      where: { id, tenantId },
      relations: ['warehouse', 'location'],
    });
  }

  async create(sensorData: Partial<IotSensor>, tenantId: string): Promise<IotSensor> {
    const sensor = this.iotSensorRepository.create({
      ...sensorData,
      tenantId,
      sensorId: this.generateSensorId(),
      status: 'active',
    });
    return this.iotSensorRepository.save(sensor);
  }

  async update(id: string, sensorData: Partial<IotSensor>, tenantId: string): Promise<IotSensor> {
    await this.iotSensorRepository.update({ id, tenantId }, sensorData);
    return this.findOne(id, tenantId);
  }

  async recordSensorData(sensorId: string, data: any, tenantId: string): Promise<IotSensor> {
    const sensor = await this.iotSensorRepository.findOne({
      where: { sensorId, tenantId },
    });

    if (!sensor) {
      throw new Error('IoT sensor not found');
    }

    // Update sensor data
    sensor.lastReading = data;
    sensor.lastReadingAt = new Date();

    // Add to reading history
    if (!sensor.readingHistory) {
      sensor.readingHistory = [];
    }
    sensor.readingHistory.push({
      timestamp: new Date(),
      data: data,
    });

    return this.iotSensorRepository.save(sensor);
  }

  async getSensorReadings(sensorId: string, tenantId: string, timeRange?: any): Promise<any[]> {
    const sensor = await this.iotSensorRepository.findOne({
      where: { sensorId, tenantId },
    });

    if (!sensor) {
      throw new Error('IoT sensor not found');
    }

    let readings = sensor.readingHistory || [];
    
    if (timeRange) {
      const startDate = timeRange.startDate;
      const endDate = timeRange.endDate;
      readings = readings.filter(reading => 
        reading.timestamp >= startDate && reading.timestamp <= endDate
      );
    }

    return readings;
  }

  async getSensorAlerts(tenantId: string): Promise<any[]> {
    const sensors = await this.findAll(tenantId);
    const alerts = [];

    for (const sensor of sensors) {
      if (sensor.alerts && sensor.alerts.length > 0) {
        alerts.push(...sensor.alerts);
      }
    }

    return alerts;
  }

  async getWarehouseMetrics(warehouseId: string, tenantId: string): Promise<any> {
    const sensors = await this.iotSensorRepository.find({
      where: { warehouseId, tenantId },
    });

    const metrics = {
      temperature: { min: 0, max: 0, avg: 0 },
      humidity: { min: 0, max: 0, avg: 0 },
      light: { min: 0, max: 0, avg: 0 },
      motion: { detections: 0, lastDetection: null },
    };

    // Calculate metrics from sensor data
    for (const sensor of sensors) {
      if (sensor.lastReading) {
        // Process sensor readings and update metrics
        // This would typically involve:
        // 1. Parsing sensor data
        // 2. Calculating min/max/average values
        // 3. Detecting anomalies
        // 4. Generating alerts
      }
    }

    return metrics;
  }

  private generateSensorId(): string {
    const timestamp = Date.now();
    return `SENSOR-${timestamp}`;
  }
}