import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import { gpsTracking, vehicles, drivers } from '../../../../database/schema/logistics/tms.schema';
import * as schema from '../../../../database/schema';

@Injectable()
export class GpsTrackingService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<any[]> {
    let query = this.db
      .select()
      .from(gpsTracking)
      .where(eq(gpsTracking.tenantId, tenantId));

    if (filters?.vehicleId) {
      query = query.where(and(eq(gpsTracking.tenantId, tenantId), eq(gpsTracking.vehicleId, filters.vehicleId)));
    }

    if (filters?.dateRange) {
      query = query.where(and(
        eq(gpsTracking.tenantId, tenantId),
        gte(gpsTracking.timestamp, filters.dateRange.startDate),
        lte(gpsTracking.timestamp, filters.dateRange.endDate)
      ));
    }

    return query.orderBy(desc(gpsTracking.timestamp));
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const result = await this.db
      .select({
        tracking: gpsTracking,
        vehicle: vehicles,
        driver: drivers,
      })
      .from(gpsTracking)
      .leftJoin(vehicles, eq(gpsTracking.vehicleId, vehicles.id))
      .leftJoin(drivers, eq(gpsTracking.driverId, drivers.id))
      .where(and(eq(gpsTracking.id, id), eq(gpsTracking.tenantId, tenantId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0].tracking,
      vehicle: result[0].vehicle,
      driver: result[0].driver,
    };
  }

  async create(trackingData: Partial<any>, tenantId: string): Promise<any> {
    const [newTracking] = await this.db
      .insert(gpsTracking)
      .values({
        ...trackingData,
        tenantId,
        timestamp: new Date(),
      })
      .returning();

    return newTracking;
  }

  async updateLocation(vehicleId: string, location: any, tenantId: string): Promise<any> {
    const [newTracking] = await this.db
      .insert(gpsTracking)
      .values({
        vehicleId,
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude,
        speed: location.speed,
        heading: location.heading,
        accuracy: location.accuracy,
        tenantId,
        timestamp: new Date(),
      })
      .returning();

    return newTracking;
  }

  async getCurrentLocation(vehicleId: string, tenantId: string): Promise<any> {
    const result = await this.db
      .select()
      .from(gpsTracking)
      .where(and(eq(gpsTracking.vehicleId, vehicleId), eq(gpsTracking.tenantId, tenantId)))
      .orderBy(desc(gpsTracking.timestamp))
      .limit(1);

    return result[0] || null;
  }

  async getRouteHistory(vehicleId: string, tenantId: string, dateRange?: any): Promise<any[]> {
    let query = this.db
      .select()
      .from(gpsTracking)
      .where(and(eq(gpsTracking.vehicleId, vehicleId), eq(gpsTracking.tenantId, tenantId)));

    if (dateRange) {
      query = query.where(and(
        eq(gpsTracking.vehicleId, vehicleId),
        eq(gpsTracking.tenantId, tenantId),
        gte(gpsTracking.timestamp, dateRange.startDate),
        lte(gpsTracking.timestamp, dateRange.endDate)
      ));
    }

    return query.orderBy(asc(gpsTracking.timestamp));
  }

  async getDistanceTraveled(vehicleId: string, tenantId: string, dateRange?: any): Promise<number> {
    const routeHistory = await this.getRouteHistory(vehicleId, tenantId, dateRange);
    let totalDistance = 0;

    for (let i = 1; i < routeHistory.length; i++) {
      const prev = routeHistory[i - 1];
      const curr = routeHistory[i];
      
      const distance = this.calculateDistance(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );
      
      totalDistance += distance;
    }

    return totalDistance;
  }

  async getSpeedAnalysis(vehicleId: string, tenantId: string): Promise<any> {
    const routeHistory = await this.getRouteHistory(vehicleId, tenantId);
    
    const speeds = routeHistory.map(point => point.speed).filter(speed => speed > 0);
    const averageSpeed = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);
    const minSpeed = Math.min(...speeds);

    return {
      averageSpeed,
      maxSpeed,
      minSpeed,
      totalPoints: routeHistory.length,
    };
  }

  async getGeofenceAlerts(tenantId: string): Promise<any[]> {
    // Implement geofence alert logic
    // This would typically involve:
    // 1. Checking current vehicle locations
    // 2. Comparing against defined geofences
    // 3. Generating alerts for violations
    // 4. Logging alert history

    return [];
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}