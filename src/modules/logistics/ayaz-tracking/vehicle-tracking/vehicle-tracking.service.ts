import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between, gte, lte, desc } from 'drizzle-orm';
import { vehicleTracking } from '../../../../database/schema/logistics/tracking.schema';
import { vehicles } from '../../../../database/schema/logistics/tms.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';
import { CacheService } from '../../common/services/cache.service';

interface TrackingPoint {
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude?: number;
  accuracy: number;
  timestamp: Date;
}

@Injectable()
export class VehicleTrackingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
    private readonly cacheService: CacheService,
  ) {}

  async recordTrackingPoint(vehicleId: string, point: TrackingPoint, tenantId: string) {
    const [tracking] = await this.db
      .insert(vehicleTracking)
      .values({
        tenantId,
        vehicleId,
        latitude: point.latitude.toString(),
        longitude: point.longitude.toString(),
        speed: point.speed?.toString(),
        heading: point.heading?.toString(),
        altitude: point.altitude?.toString(),
        accuracy: point.accuracy?.toString(),
        timestamp: point.timestamp,
      })
      .returning();

    await this.cacheService.set(
      this.cacheService.generateKey('vehicle-location', vehicleId),
      tracking,
      300,
    );

    this.wsGateway.sendToRoom(`vehicle:${vehicleId}`, 'location:update', tracking);
    this.wsGateway.broadcast('fleet:location:update', { vehicleId, location: tracking });

    await this.checkSpeedingViolation(vehicleId, point.speed, tenantId);
    await this.checkIdling(vehicleId, point.speed, tenantId);

    await this.eventBus.emit('vehicle.location.updated', {
      vehicleId,
      latitude: point.latitude,
      longitude: point.longitude,
      tenantId,
    });

    return tracking;
  }

  async getVehicleLocation(vehicleId: string, tenantId: string) {
    const cached = await this.cacheService.get(
      this.cacheService.generateKey('vehicle-location', vehicleId),
    );

    if (cached) {
      return cached;
    }

    const [location] = await this.db
      .select()
      .from(vehicleTracking)
      .where(and(eq(vehicleTracking.tenantId, tenantId), eq(vehicleTracking.vehicleId, vehicleId)))
      .orderBy(desc(vehicleTracking.timestamp))
      .limit(1);

    if (location) {
      await this.cacheService.set(
        this.cacheService.generateKey('vehicle-location', vehicleId),
        location,
        300,
      );
    }

    return location;
  }

  async getVehicleRoute(vehicleId: string, startTime: Date, endTime: Date, tenantId: string) {
    const route = await this.db
      .select()
      .from(vehicleTracking)
      .where(
        and(
          eq(vehicleTracking.tenantId, tenantId),
          eq(vehicleTracking.vehicleId, vehicleId),
          gte(vehicleTracking.timestamp, startTime),
          lte(vehicleTracking.timestamp, endTime),
        ),
      )
      .orderBy(vehicleTracking.timestamp);

    const totalDistance = this.calculateTotalDistance(route);
    const duration = route.length > 0 
      ? (new Date(route[route.length - 1].timestamp).getTime() - new Date(route[0].timestamp).getTime()) / (1000 * 60)
      : 0;

    return {
      vehicleId,
      period: { startTime, endTime },
      points: route,
      totalDistance,
      duration,
      averageSpeed: duration > 0 ? (totalDistance / duration) * 60 : 0,
    };
  }

  async getFleetLocations(tenantId: string) {
    const allVehicles = await this.db
      .select()
      .from(vehicles)
      .where(eq(vehicles.tenantId, tenantId));

    const locations = [];

    for (const vehicle of allVehicles) {
      const location = await this.getVehicleLocation(vehicle.id, tenantId);
      if (location) {
        locations.push({
          vehicleId: vehicle.id,
          vehicleNumber: vehicle.vehicleNumber,
          location,
        });
      }
    }

    return {
      totalVehicles: allVehicles.length,
      locationsFound: locations.length,
      locations,
    };
  }

  async analyzeDriverBehavior(vehicleId: string, startTime: Date, endTime: Date, tenantId: string) {
    const route = await this.db
      .select()
      .from(vehicleTracking)
      .where(
        and(
          eq(vehicleTracking.tenantId, tenantId),
          eq(vehicleTracking.vehicleId, vehicleId),
          gte(vehicleTracking.timestamp, startTime),
          lte(vehicleTracking.timestamp, endTime),
        ),
      )
      .orderBy(vehicleTracking.timestamp);

    let speedingCount = 0;
    let harshBrakingCount = 0;
    let rapidAccelerationCount = 0;
    let idlingTime = 0;

    const speedLimit = 120;

    for (let i = 0; i < route.length; i++) {
      const point = route[i];
      const speed = parseFloat(point.speed || '0');

      if (speed > speedLimit) {
        speedingCount++;
      }

      if (speed < 5 && i > 0) {
        idlingTime += 1;
      }

      if (i > 0) {
        const prevSpeed = parseFloat(route[i - 1].speed || '0');
        const speedChange = speed - prevSpeed;

        if (speedChange < -15) {
          harshBrakingCount++;
        } else if (speedChange > 15) {
          rapidAccelerationCount++;
        }
      }
    }

    const totalPoints = route.length;
    const safetyScore = Math.max(
      0,
      100 - (speedingCount / totalPoints) * 100 - harshBrakingCount * 2 - rapidAccelerationCount * 2,
    );

    return {
      vehicleId,
      period: { startTime, endTime },
      totalDataPoints: totalPoints,
      violations: {
        speeding: speedingCount,
        harshBraking: harshBrakingCount,
        rapidAcceleration: rapidAccelerationCount,
      },
      idlingTimeMinutes: idlingTime,
      safetyScore: Math.round(safetyScore),
      rating: safetyScore >= 90 ? 'excellent' : safetyScore >= 75 ? 'good' : safetyScore >= 60 ? 'fair' : 'poor',
    };
  }

  private calculateTotalDistance(points: any[]): number {
    let total = 0;

    for (let i = 1; i < points.length; i++) {
      const lat1 = parseFloat(points[i - 1].latitude);
      const lon1 = parseFloat(points[i - 1].longitude);
      const lat2 = parseFloat(points[i].latitude);
      const lon2 = parseFloat(points[i].longitude);

      total += this.haversineDistance(lat1, lon1, lat2, lon2);
    }

    return total;
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  private async checkSpeedingViolation(vehicleId: string, speed: number, tenantId: string) {
    const speedLimit = 120;

    if (speed > speedLimit) {
      await this.eventBus.emit('vehicle.speeding', {
        vehicleId,
        speed,
        speedLimit,
        excessSpeed: speed - speedLimit,
        tenantId,
      });
    }
  }

  private async checkIdling(vehicleId: string, speed: number, tenantId: string) {
    if (speed < 2) {
      await this.eventBus.emit('vehicle.idling', {
        vehicleId,
        tenantId,
      });
    }
  }

  async getVehicleTripHistory(vehicleId: string, days: number, tenantId: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allPoints = await this.db
      .select()
      .from(vehicleTracking)
      .where(
        and(
          eq(vehicleTracking.tenantId, tenantId),
          eq(vehicleTracking.vehicleId, vehicleId),
          gte(vehicleTracking.timestamp, startDate),
        ),
      )
      .orderBy(vehicleTracking.timestamp);

    const trips = this.identifyTrips(allPoints);

    return {
      vehicleId,
      period: { days, startDate },
      totalTrips: trips.length,
      trips,
    };
  }

  private identifyTrips(points: any[]) {
    const trips = [];
    let currentTrip: any[] = [];
    let lastMovingTime = null;

    for (const point of points) {
      const speed = parseFloat(point.speed || '0');

      if (speed > 5) {
        currentTrip.push(point);
        lastMovingTime = point.timestamp;
      } else {
        if (lastMovingTime && currentTrip.length > 0) {
          const idleTime = (point.timestamp.getTime() - lastMovingTime.getTime()) / (1000 * 60);

          if (idleTime > 30) {
            if (currentTrip.length > 10) {
              trips.push({
                startTime: currentTrip[0].timestamp,
                endTime: currentTrip[currentTrip.length - 1].timestamp,
                pointCount: currentTrip.length,
                distance: this.calculateTotalDistance(currentTrip),
              });
            }
            currentTrip = [];
            lastMovingTime = null;
          }
        }
      }
    }

    if (currentTrip.length > 10) {
      trips.push({
        startTime: currentTrip[0].timestamp,
        endTime: currentTrip[currentTrip.length - 1].timestamp,
        pointCount: currentTrip.length,
        distance: this.calculateTotalDistance(currentTrip),
      });
    }

    return trips;
  }
}
