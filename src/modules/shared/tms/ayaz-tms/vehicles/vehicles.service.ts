import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleMaintenance } from './entities/vehicle-maintenance.entity';
import { VehicleFuelConsumption } from './entities/vehicle-fuel-consumption.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(VehicleMaintenance)
    private readonly maintenanceRepository: Repository<VehicleMaintenance>,
    @InjectRepository(VehicleFuelConsumption)
    private readonly fuelRepository: Repository<VehicleFuelConsumption>
  ) {}

  async getVehicles(filters: {
    tenantId: string;
    status?: string;
    type?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const query = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.tenantId = :tenantId', { tenantId: filters.tenantId })
      .leftJoinAndSelect('vehicle.currentDriver', 'driver')
      .orderBy('vehicle.updatedAt', 'DESC');

    if (filters.status) {
      query.andWhere('vehicle.status = :status', { status: filters.status });
    }

    if (filters.type) {
      query.andWhere('vehicle.type = :type', { type: filters.type });
    }

    if (filters.search) {
      query.andWhere(
        '(vehicle.name ILIKE :search OR vehicle.licensePlate ILIKE :search OR vehicle.vin ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [vehicles, total] = await query
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return {
      vehicles,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    };
  }

  async getVehiclesStats(tenantId: string) {
    const totalVehicles = await this.vehicleRepository.count({
      where: { tenantId }
    });

    const activeVehicles = await this.vehicleRepository.count({
      where: { tenantId, status: 'active' }
    });

    const maintenanceVehicles = await this.vehicleRepository.count({
      where: { tenantId, status: 'maintenance' }
    });

    const avgFuelEfficiency = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.tenantId = :tenantId', { tenantId })
      .andWhere('vehicle.fuelEfficiency > 0')
      .select('AVG(vehicle.fuelEfficiency)', 'avgFuelEfficiency')
      .getRawOne();

    const totalMileage = await this.vehicleRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.tenantId = :tenantId', { tenantId })
      .select('SUM(vehicle.mileage)', 'totalMileage')
      .getRawOne();

    return {
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      avgFuelEfficiency: parseFloat(avgFuelEfficiency.avgFuelEfficiency) || 0,
      totalMileage: parseFloat(totalMileage.totalMileage) || 0
    };
  }

  async getMaintenanceVehicles(tenantId: string, dueDate?: string) {
    const query = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.tenantId = :tenantId', { tenantId })
      .andWhere('vehicle.nextMaintenanceDate IS NOT NULL');

    if (dueDate) {
      query.andWhere('vehicle.nextMaintenanceDate <= :dueDate', { dueDate });
    } else {
      const today = new Date();
      query.andWhere('vehicle.nextMaintenanceDate <= :today', { today });
    }

    return query
      .orderBy('vehicle.nextMaintenanceDate', 'ASC')
      .getMany();
  }

  async getFuelEfficiencyReport(tenantId: string, filters: { startDate?: string; endDate?: string }) {
    const query = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .where('vehicle.tenantId = :tenantId', { tenantId })
      .andWhere('vehicle.fuelEfficiency > 0');

    if (filters.startDate) {
      query.andWhere('vehicle.updatedAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('vehicle.updatedAt <= :endDate', { endDate: filters.endDate });
    }

    const vehicles = await query
      .select([
        'vehicle.id',
        'vehicle.name',
        'vehicle.licensePlate',
        'vehicle.fuelEfficiency',
        'vehicle.mileage',
        'vehicle.fuelType'
      ])
      .orderBy('vehicle.fuelEfficiency', 'DESC')
      .getRawMany();

    const avgEfficiency = vehicles.reduce((sum, vehicle) => sum + parseFloat(vehicle.vehicle_fuelEfficiency), 0) / vehicles.length;

    return {
      totalVehicles: vehicles.length,
      avgEfficiency: avgEfficiency || 0,
      vehicles: vehicles.map(vehicle => ({
        id: vehicle.vehicle_id,
        name: vehicle.vehicle_name,
        licensePlate: vehicle.vehicle_licensePlate,
        fuelEfficiency: parseFloat(vehicle.vehicle_fuelEfficiency),
        mileage: parseFloat(vehicle.vehicle_mileage),
        fuelType: vehicle.vehicle_fuelType
      }))
    };
  }

  async getVehicle(id: string, tenantId: string) {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id, tenantId },
      relations: ['currentDriver', 'maintenance', 'fuelConsumption']
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async createVehicle(createVehicleDto: CreateVehicleDto, userId: string, tenantId: string) {
    const vehicle = this.vehicleRepository.create({
      ...createVehicleDto,
      tenantId,
      createdBy: userId,
      status: 'active'
    });

    return this.vehicleRepository.save(vehicle);
  }

  async updateVehicle(id: string, updateVehicleDto: UpdateVehicleDto, userId: string, tenantId: string) {
    const vehicle = await this.getVehicle(id, tenantId);

    Object.assign(vehicle, updateVehicleDto);
    vehicle.updatedBy = userId;
    vehicle.updatedAt = new Date();

    return this.vehicleRepository.save(vehicle);
  }

  async getVehicleRoutes(id: string, tenantId: string, filters: { status?: string; startDate?: string; endDate?: string }) {
    await this.getVehicle(id, tenantId); // Verify vehicle exists

    const query = this.vehicleRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.routes', 'routes')
      .where('vehicle.id = :id', { id })
      .andWhere('vehicle.tenantId = :tenantId', { tenantId });

    if (filters.status) {
      query.andWhere('routes.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      query.andWhere('routes.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('routes.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const vehicle = await query.getOne();
    return vehicle?.routes || [];
  }

  async getVehicleMaintenance(id: string, tenantId: string) {
    await this.getVehicle(id, tenantId); // Verify vehicle exists

    return this.maintenanceRepository.find({
      where: { vehicleId: id },
      order: { scheduledDate: 'DESC' }
    });
  }

  async getVehicleFuelConsumption(id: string, tenantId: string, filters: { startDate?: string; endDate?: string }) {
    await this.getVehicle(id, tenantId); // Verify vehicle exists

    const query = this.fuelRepository
      .createQueryBuilder('fuel')
      .where('fuel.vehicleId = :vehicleId', { vehicleId: id });

    if (filters.startDate) {
      query.andWhere('fuel.date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('fuel.date <= :endDate', { endDate: filters.endDate });
    }

    const consumption = await query
      .orderBy('fuel.date', 'DESC')
      .getMany();

    const totalConsumption = consumption.reduce((sum, record) => sum + parseFloat(record.quantity), 0);
    const totalCost = consumption.reduce((sum, record) => sum + parseFloat(record.cost), 0);

    return {
      totalRecords: consumption.length,
      totalConsumption,
      totalCost,
      avgConsumption: consumption.length > 0 ? totalConsumption / consumption.length : 0,
      records: consumption
    };
  }

  async getVehicleLocation(id: string, tenantId: string) {
    const vehicle = await this.getVehicle(id, tenantId);

    return {
      vehicleId: vehicle.id,
      name: vehicle.name,
      licensePlate: vehicle.licensePlate,
      latitude: vehicle.currentLatitude,
      longitude: vehicle.currentLongitude,
      lastUpdated: vehicle.locationUpdatedAt,
      status: vehicle.status
    };
  }

  async scheduleMaintenance(id: string, maintenanceData: any, userId: string, tenantId: string) {
    const vehicle = await this.getVehicle(id, tenantId);

    const maintenance = this.maintenanceRepository.create({
      vehicleId: id,
      type: maintenanceData.type,
      description: maintenanceData.description,
      scheduledDate: maintenanceData.scheduledDate,
      estimatedDuration: maintenanceData.estimatedDuration,
      estimatedCost: maintenanceData.estimatedCost,
      priority: maintenanceData.priority || 'medium',
      createdBy: userId,
      status: 'scheduled'
    });

    const savedMaintenance = await this.maintenanceRepository.save(maintenance);

    // Update vehicle next maintenance date
    vehicle.nextMaintenanceDate = maintenanceData.scheduledDate;
    vehicle.updatedBy = userId;
    vehicle.updatedAt = new Date();
    await this.vehicleRepository.save(vehicle);

    return savedMaintenance;
  }
}
