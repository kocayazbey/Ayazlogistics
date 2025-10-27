import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc } from 'drizzle-orm';
import { vehicles, drivers, routes } from '../../../../database/schema/logistics/tms.schema';
import * as schema from '../../../../database/schema';

@Injectable()
export class VehicleService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<any[]> {
    let query = this.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.tenantId, tenantId));

    if (filters?.status) {
      query = query.where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.status, filters.status)));
    }

    if (filters?.type) {
      query = query.where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.type, filters.type)));
    }

    return query.orderBy(desc(vehicles.createdAt));
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const result = await this.db
      .select({
        vehicle: vehicles,
        driver: drivers,
      })
      .from(vehicles)
      .leftJoin(drivers, eq(vehicles.driverId, drivers.id))
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    // Get vehicle routes separately
    const vehicleRoutes = await this.db
      .select()
      .from(routes)
      .where(eq(routes.vehicleId, id))
      .orderBy(desc(routes.createdAt));

    return {
      ...result[0].vehicle,
      driver: result[0].driver,
      routes: vehicleRoutes,
    };
  }

  async create(vehicleData: Partial<any>, tenantId: string): Promise<any> {
    const vehicleNumber = this.generateVehicleNumber();
    
    const [newVehicle] = await this.db
      .insert(vehicles)
      .values({
        ...vehicleData,
        tenantId,
        vehicleNumber,
        status: 'available',
      })
      .returning();

    return newVehicle;
  }

  async update(id: string, vehicleData: Partial<any>, tenantId: string): Promise<any> {
    await this.db
      .update(vehicles)
      .set({
        ...vehicleData,
        updatedAt: new Date(),
      })
      .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId)));
    
    return this.findOne(id, tenantId);
  }

  async assignDriver(vehicleId: string, driverId: string, tenantId: string): Promise<any> {
    const vehicle = await this.findOne(vehicleId, tenantId);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    await this.db
      .update(vehicles)
      .set({
        driverId,
        assignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.tenantId, tenantId)));

    return this.findOne(vehicleId, tenantId);
  }

  async updateLocation(vehicleId: string, location: any, tenantId: string): Promise<any> {
    const vehicle = await this.findOne(vehicleId, tenantId);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    await this.db
      .update(vehicles)
      .set({
        currentLocation: location,
        lastLocationUpdate: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.tenantId, tenantId)));

    return this.findOne(vehicleId, tenantId);
  }

  async getVehicleMetrics(tenantId: string): Promise<any> {
    const vehicles = await this.findAll(tenantId);
    
    const total = vehicles.length;
    const available = vehicles.filter(v => v.status === 'available').length;
    const inUse = vehicles.filter(v => v.status === 'in_use').length;
    const maintenance = vehicles.filter(v => v.status === 'maintenance').length;

    return {
      total,
      available,
      inUse,
      maintenance,
      utilizationRate: total > 0 ? (inUse / total) * 100 : 0,
    };
  }

  async getMaintenanceSchedule(tenantId: string): Promise<any> {
    const vehicles = await this.findAll(tenantId);
    
    // Calculate maintenance schedules based on:
    // - Mileage
    // - Last maintenance date
    // - Manufacturer recommendations
    // - Usage patterns

    return {
      dueForMaintenance: [],
      upcomingMaintenance: [],
      maintenanceHistory: [],
    };
  }

  async getFuelConsumption(vehicleId: string, tenantId: string): Promise<any> {
    const vehicle = await this.findOne(vehicleId, tenantId);
    if (!vehicle) {
      throw new Error('Vehicle not found');
    }

    // Calculate fuel consumption metrics
    return {
      averageConsumption: 0,
      totalFuelUsed: 0,
      costPerKm: 0,
      efficiencyRating: 0,
    };
  }

  private generateVehicleNumber(): string {
    const timestamp = Date.now();
    return `VH-${timestamp}`;
  }
}