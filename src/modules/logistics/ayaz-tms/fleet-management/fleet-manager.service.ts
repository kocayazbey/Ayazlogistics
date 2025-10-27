import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface VehicleDetails {
  id: string;
  plateNumber: string;
  type: 'truck' | 'van' | 'trailer' | 'container';
  capacity: number;
  fuelType: 'diesel' | 'gasoline' | 'electric' | 'hybrid';
  year: number;
  status: 'active' | 'maintenance' | 'inactive';
  currentLocation?: { lat: number; lng: number };
  mileage: number;
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
}

interface MaintenanceSchedule {
  vehicleId: string;
  type: 'routine' | 'repair' | 'inspection';
  scheduledDate: Date;
  estimatedCost: number;
  description: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

interface FuelRecord {
  vehicleId: string;
  date: Date;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  mileage: number;
  station: string;
}

@Injectable()
export class FleetManagerService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async scheduleMaintenance(data: Partial<MaintenanceSchedule>): Promise<MaintenanceSchedule> {
    const schedule: MaintenanceSchedule = {
      vehicleId: data.vehicleId!,
      type: data.type!,
      scheduledDate: data.scheduledDate!,
      estimatedCost: data.estimatedCost!,
      description: data.description!,
      status: 'scheduled'
    };

    await this.eventBus.publish('fleet.maintenance.scheduled', {
      vehicleId: schedule.vehicleId,
      scheduledDate: schedule.scheduledDate
    });

    return schedule;
  }

  async predictMaintenanceNeeds(vehicleId: string): Promise<any> {
    const vehicle = await this.getVehicleDetails(vehicleId);
    const predictions = [];

    if (vehicle.mileage % 10000 < 500) {
      predictions.push({
        type: 'Oil Change',
        urgency: 'high',
        estimatedDate: this.addDays(new Date(), 7),
        estimatedCost: 500
      });
    }

    if (vehicle.mileage > 50000 && vehicle.mileage % 50000 < 1000) {
      predictions.push({
        type: 'Major Service',
        urgency: 'medium',
        estimatedDate: this.addDays(new Date(), 14),
        estimatedCost: 3500
      });
    }

    return {
      vehicleId,
      currentMileage: vehicle.mileage,
      predictions,
      nextMaintenanceIn: predictions.length > 0 ? predictions[0].estimatedDate : null
    };
  }

  async recordFuelConsumption(record: Partial<FuelRecord>): Promise<FuelRecord> {
    const fuelRecord: FuelRecord = {
      vehicleId: record.vehicleId!,
      date: record.date || new Date(),
      liters: record.liters!,
      pricePerLiter: record.pricePerLiter!,
      totalCost: record.liters! * record.pricePerLiter!,
      mileage: record.mileage!,
      station: record.station!
    };

    await this.eventBus.publish('fleet.fuel.recorded', {
      vehicleId: fuelRecord.vehicleId,
      totalCost: fuelRecord.totalCost
    });

    return fuelRecord;
  }

  async calculateFuelEfficiency(vehicleId: string, startDate: Date, endDate: Date): Promise<any> {
    return {
      vehicleId,
      period: { startDate, endDate },
      totalLiters: 1250,
      totalMileage: 8500,
      averageConsumption: 14.7,
      totalCost: 43750,
      costPerKm: 5.15,
      efficiency: 'Good',
      comparedToFleet: '+5%',
      trend: 'improving'
    };
  }

  async getFleetUtilization(startDate: Date, endDate: Date): Promise<any> {
    return {
      period: { startDate, endDate },
      totalVehicles: 45,
      activeVehicles: 38,
      inMaintenance: 4,
      idle: 3,
      averageUtilization: 84.4,
      totalMileage: 125000,
      totalTrips: 850,
      revenuePerVehicle: 54500,
      costPerVehicle: 38200,
      profitPerVehicle: 16300
    };
  }

  private async getVehicleDetails(vehicleId: string): Promise<VehicleDetails> {
    return {
      id: vehicleId,
      plateNumber: '34 ABC 123',
      type: 'truck',
      capacity: 24000,
      fuelType: 'diesel',
      year: 2022,
      status: 'active',
      mileage: 125000,
      lastMaintenanceDate: new Date('2024-09-15'),
      nextMaintenanceDate: new Date('2024-11-15')
    };
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  async getVehicleHealthScore(vehicleId: string): Promise<any> {
    return {
      vehicleId,
      overallScore: 87,
      breakdown: {
        mechanical: 92,
        electrical: 85,
        bodyCondition: 88,
        tires: 75,
        brakes: 90
      },
      issues: [
        { component: 'Tires', severity: 'medium', description: 'Tread depth at 4mm, replace soon' }
      ],
      recommendation: 'Schedule tire replacement within 2 weeks'
    };
  }
}

