import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../../database/schema/shared/tms.schema';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Driver[]> {
    const query = this.driverRepository.createQueryBuilder('driver')
      .where('driver.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('driver.status = :status', { status: filters.status });
    }

    if (filters?.licenseType) {
      query.andWhere('driver.licenseType = :licenseType', { licenseType: filters.licenseType });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Driver> {
    return this.driverRepository.findOne({
      where: { id, tenantId },
      relations: ['vehicle', 'routes'],
    });
  }

  async create(driverData: Partial<Driver>, tenantId: string): Promise<Driver> {
    const driver = this.driverRepository.create({
      ...driverData,
      tenantId,
      driverNumber: this.generateDriverNumber(),
      status: 'available',
    });
    return this.driverRepository.save(driver);
  }

  async update(id: string, driverData: Partial<Driver>, tenantId: string): Promise<Driver> {
    await this.driverRepository.update({ id, tenantId }, driverData);
    return this.findOne(id, tenantId);
  }

  async assignVehicle(driverId: string, vehicleId: string, tenantId: string): Promise<Driver> {
    const driver = await this.findOne(driverId, tenantId);
    if (!driver) {
      throw new Error('Driver not found');
    }

    driver.vehicleId = vehicleId;
    driver.assignedAt = new Date();
    return this.driverRepository.save(driver);
  }

  async updateDriverStatus(driverId: string, status: string, tenantId: string): Promise<Driver> {
    const driver = await this.findOne(driverId, tenantId);
    if (!driver) {
      throw new Error('Driver not found');
    }

    driver.status = status;
    driver.statusUpdatedAt = new Date();
    return this.driverRepository.save(driver);
  }

  async getDriverPerformance(driverId: string, tenantId: string): Promise<any> {
    const driver = await this.findOne(driverId, tenantId);
    if (!driver) {
      throw new Error('Driver not found');
    }

    // Calculate driver performance metrics
    return {
      totalDeliveries: 0,
      onTimeDeliveries: 0,
      averageRating: 0,
      safetyScore: 0,
      fuelEfficiency: 0,
    };
  }

  async getDriverMetrics(tenantId: string): Promise<any> {
    const drivers = await this.findAll(tenantId);
    
    const total = drivers.length;
    const available = drivers.filter(d => d.status === 'available').length;
    const busy = drivers.filter(d => d.status === 'busy').length;
    const offDuty = drivers.filter(d => d.status === 'off_duty').length;

    return {
      total,
      available,
      busy,
      offDuty,
      utilizationRate: total > 0 ? (busy / total) * 100 : 0,
    };
  }

  async getLicenseExpiry(tenantId: string): Promise<any> {
    const drivers = await this.findAll(tenantId);
    const expiringSoon = [];
    const expired = [];

    for (const driver of drivers) {
      if (driver.licenseExpiry) {
        const daysUntilExpiry = Math.ceil((driver.licenseExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          expired.push(driver);
        } else if (daysUntilExpiry <= 30) {
          expiringSoon.push(driver);
        }
      }
    }

    return {
      expiringSoon,
      expired,
      totalExpiring: expiringSoon.length + expired.length,
    };
  }

  private generateDriverNumber(): string {
    const timestamp = Date.now();
    return `DRV-${timestamp}`;
  }
}
