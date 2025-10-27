import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { geofences } from '../../../../database/schema/logistics/tracking.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

interface Point {
  lat: number;
  lng: number;
}

@Injectable()
export class GeofencingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  async createGeofence(data: {
    name: string;
    geofenceType: 'circle' | 'polygon';
    centerLat?: number;
    centerLng?: number;
    radius?: number;
    polygon?: Point[];
    alertOnEntry?: boolean;
    alertOnExit?: boolean;
  }, tenantId: string) {
    const [geofence] = await this.db
      .insert(geofences)
      .values({
        tenantId,
        name: data.name,
        geofenceType: data.geofenceType,
        centerLat: data.centerLat?.toString(),
        centerLng: data.centerLng?.toString(),
        radius: data.radius?.toString(),
        polygon: data.polygon,
        alertOnEntry: data.alertOnEntry ?? true,
        alertOnExit: data.alertOnExit ?? true,
        isActive: true,
      })
      .returning();

    await this.eventBus.emit('geofence.created', {
      geofenceId: geofence.id,
      name: data.name,
      tenantId,
    });

    return geofence;
  }

  async checkGeofenceViolation(vehicleId: string, location: Point, tenantId: string) {
    const activeGeofences = await this.db
      .select()
      .from(geofences)
      .where(and(eq(geofences.tenantId, tenantId), eq(geofences.isActive, true)));

    const violations = [];

    for (const geofence of activeGeofences) {
      const isInside = this.isPointInsideGeofence(location, geofence);

      const wasInside = await this.getLastGeofenceState(vehicleId, geofence.id);

      if (isInside && !wasInside && geofence.alertOnEntry) {
        violations.push({
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          type: 'entry',
          timestamp: new Date(),
        });

        await this.eventBus.emit('geofence.entered', {
          vehicleId,
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          location,
          tenantId,
        });

        this.wsGateway.broadcast('geofence:alert', {
          type: 'entry',
          vehicleId,
          geofence: geofence.name,
          location,
        });
      } else if (!isInside && wasInside && geofence.alertOnExit) {
        violations.push({
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          type: 'exit',
          timestamp: new Date(),
        });

        await this.eventBus.emit('geofence.exited', {
          vehicleId,
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          location,
          tenantId,
        });

        this.wsGateway.broadcast('geofence:alert', {
          type: 'exit',
          vehicleId,
          geofence: geofence.name,
          location,
        });
      }

      await this.saveGeofenceState(vehicleId, geofence.id, isInside);
    }

    return {
      violations,
      checkedGeofences: activeGeofences.length,
    };
  }

  private isPointInsideGeofence(point: Point, geofence: any): boolean {
    if (geofence.geofenceType === 'circle') {
      const centerLat = parseFloat(geofence.centerLat);
      const centerLng = parseFloat(geofence.centerLng);
      const radius = parseFloat(geofence.radius);

      const distance = this.calculateDistance(point.lat, point.lng, centerLat, centerLng);
      return distance * 1000 <= radius;
    } else if (geofence.geofenceType === 'polygon') {
      return this.isPointInPolygon(point, geofence.polygon);
    }

    return false;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

  private isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat;
      const yi = polygon[i].lng;
      const xj = polygon[j].lat;
      const yj = polygon[j].lng;

      const intersect =
        yi > point.lng !== yj > point.lng &&
        point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  private geofenceStates = new Map<string, boolean>();

  private async getLastGeofenceState(vehicleId: string, geofenceId: string): Promise<boolean> {
    return this.geofenceStates.get(`${vehicleId}:${geofenceId}`) || false;
  }

  private async saveGeofenceState(vehicleId: string, geofenceId: string, isInside: boolean) {
    this.geofenceStates.set(`${vehicleId}:${geofenceId}`, isInside);
  }

  async getGeofences(tenantId: string) {
    return await this.db
      .select()
      .from(geofences)
      .where(eq(geofences.tenantId, tenantId));
  }

  async updateGeofence(geofenceId: string, data: any, tenantId: string) {
    const [updated] = await this.db
      .update(geofences)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(geofences.id, geofenceId), eq(geofences.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('geofence.updated', { geofenceId, tenantId });

    return updated;
  }

  async deleteGeofence(geofenceId: string, tenantId: string) {
    const [deleted] = await this.db
      .update(geofences)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(geofences.id, geofenceId), eq(geofences.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('geofence.deleted', { geofenceId, tenantId });

    return deleted;
  }

  async getGeofenceHistory(vehicleId: string, geofenceId: string, startDate: Date, endDate: Date) {
    return {
      vehicleId,
      geofenceId,
      period: { startDate, endDate },
      entries: [],
      exits: [],
      totalEntries: 0,
      totalExits: 0,
      totalTimeInside: 0,
    };
  }
}
