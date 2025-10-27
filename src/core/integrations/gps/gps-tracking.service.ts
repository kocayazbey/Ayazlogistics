import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/database.provider';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { gpsDevices, gpsPositions, gpsAlerts, gpsTrips, geofences } from '../../database/schema/gps.schema';
import { eq, desc, and, gte, lte, sql as drizzleSql } from 'drizzle-orm';

interface GPSDevice {
  deviceId: string;
  imei: string;
  vehicleId: string;
  model: string;
  provider: 'teltonika' | 'queclink' | 'concox' | 'other';
  isActive: boolean;
  lastUpdate: Date;
  firmware: string;
}

interface GPSPosition {
  deviceId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: Date;
  satellites: number;
  odometer: number;
  engineStatus: 'on' | 'off';
  ignition: boolean;
  batteryLevel: number;
}

interface GPSAlert {
  id: string;
  deviceId: string;
  vehicleId: string;
  alertType: 'speeding' | 'geofence_exit' | 'geofence_entry' | 'harsh_brake' | 'harsh_acceleration' | 'idle_timeout' | 'tow_alert' | 'power_disconnected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location: { latitude: number; longitude: number };
  timestamp: Date;
  acknowledged: boolean;
}

interface GPSTrip {
  tripId: string;
  vehicleId: string;
  driverId?: string;
  startTime: Date;
  endTime?: Date;
  startLocation: { latitude: number; longitude: number; address?: string };
  endLocation?: { latitude: number; longitude: number; address?: string };
  totalDistance: number;
  totalDuration: number;
  maxSpeed: number;
  avgSpeed: number;
  idleTime: number;
  fuelConsumed: number;
  route: Array<{ latitude: number; longitude: number; timestamp: Date }>;
}

@Injectable()
export class GPSTrackingService {
  private readonly logger = new Logger(GPSTrackingService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private configService: ConfigService,
  ) {}

  async registerDevice(device: Omit<GPSDevice, 'lastUpdate'>): Promise<GPSDevice> {
    const gpsDevice: GPSDevice = {
      ...device,
      lastUpdate: new Date(),
    };

    try {
      await this.db.insert(gpsDevices).values({
        deviceId: device.deviceId,
        imei: device.imei,
        vehicleId: device.vehicleId,
        model: device.model,
        provider: device.provider,
        isActive: device.isActive,
        firmware: device.firmware,
        lastUpdate: gpsDevice.lastUpdate,
      }).onConflictDoUpdate({
        target: gpsDevices.deviceId,
        set: {
          vehicleId: device.vehicleId,
          isActive: device.isActive,
          lastUpdate: gpsDevice.lastUpdate,
        },
      });

      this.logger.log(`GPS device registered: ${device.deviceId} (IMEI: ${device.imei})`);
      return gpsDevice;
    } catch (error) {
      this.logger.error(`Error registering GPS device: ${device.deviceId}`, error);
      throw error;
    }
  }

  async processGPSData(position: GPSPosition): Promise<void> {
    try {
      await this.db.insert(gpsPositions).values({
        deviceId: position.deviceId,
        vehicleId: position.vehicleId,
        latitude: position.latitude.toString(),
        longitude: position.longitude.toString(),
        altitude: position.altitude?.toString(),
        speed: position.speed?.toString(),
        heading: position.heading?.toString(),
        accuracy: position.accuracy?.toString(),
        timestamp: position.timestamp,
        satellites: position.satellites,
        odometer: position.odometer?.toString(),
        engineStatus: position.engineStatus,
        ignition: position.ignition,
        batteryLevel: position.batteryLevel?.toString(),
      });

      await this.checkForAlerts(position);
      await this.updateTripData(position);

      this.logger.debug(`GPS position processed: ${position.deviceId} at ${position.latitude}, ${position.longitude}`);
    } catch (error) {
      this.logger.error(`Error processing GPS data for device ${position.deviceId}`, error);
      throw error;
    }
  }

  private async checkForAlerts(position: GPSPosition): Promise<void> {
    if (position.speed > 120) {
      await this.createAlert({
        deviceId: position.deviceId,
        vehicleId: position.vehicleId,
        alertType: 'speeding',
        severity: position.speed > 150 ? 'critical' : 'high',
        message: `Vehicle speeding: ${position.speed} km/h`,
        location: { latitude: position.latitude, longitude: position.longitude },
      });
    }

    if (position.batteryLevel < 20) {
      await this.createAlert({
        deviceId: position.deviceId,
        vehicleId: position.vehicleId,
        alertType: 'power_disconnected',
        severity: 'medium',
        message: `Low battery: ${position.batteryLevel}%`,
        location: { latitude: position.latitude, longitude: position.longitude },
      });
    }

    const geofenceViolation = await this.checkGeofenceViolation(position);
    if (geofenceViolation) {
      await this.createAlert({
        deviceId: position.deviceId,
        vehicleId: position.vehicleId,
        alertType: geofenceViolation.type,
        severity: 'high',
        message: `Geofence ${geofenceViolation.type === 'geofence_exit' ? 'exit' : 'entry'}: ${geofenceViolation.name}`,
        location: { latitude: position.latitude, longitude: position.longitude },
      });
    }
  }

  private async checkGeofenceViolation(position: GPSPosition): Promise<{ type: 'geofence_exit' | 'geofence_entry'; name: string } | null> {
    const result = await this.db.execute(
      `SELECT id, name, geometry, alert_on_exit, alert_on_entry
       FROM geofences
       WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       LIMIT 1`,
      [position.longitude, position.latitude]
    );

    if (result.rows.length > 0) {
      const geofence = result.rows[0];
      return { type: 'geofence_entry', name: geofence.name };
    }

    return null;
  }

  private async createAlert(alert: Omit<GPSAlert, 'id' | 'timestamp' | 'acknowledged'>): Promise<void> {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      await this.db.insert(gpsAlerts).values({
        id,
        deviceId: alert.deviceId,
        vehicleId: alert.vehicleId,
        alertType: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        latitude: alert.location.latitude?.toString(),
        longitude: alert.location.longitude?.toString(),
        acknowledged: false,
      });

      this.logger.warn(`GPS Alert: ${alert.alertType} - ${alert.message}`);
    } catch (error) {
      this.logger.error(`Error creating GPS alert: ${id}`, error);
    }
  }

  private async updateTripData(position: GPSPosition): Promise<void> {
    const activeTrip = await this.db.execute(
      `SELECT * FROM gps_trips WHERE vehicle_id = $1 AND end_time IS NULL ORDER BY start_time DESC LIMIT 1`,
      [position.vehicleId]
    );

    if (position.ignition && activeTrip.rows.length === 0) {
      await this.startTrip(position);
    } else if (!position.ignition && activeTrip.rows.length > 0) {
      await this.endTrip(activeTrip.rows[0].trip_id, position);
    } else if (activeTrip.rows.length > 0) {
      await this.updateTrip(activeTrip.rows[0].trip_id, position);
    }
  }

  private async startTrip(position: GPSPosition): Promise<void> {
    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      await this.db.insert(gpsTrips).values({
        tripId,
        vehicleId: position.vehicleId,
        startTime: position.timestamp,
        startLatitude: position.latitude.toString(),
        startLongitude: position.longitude.toString(),
        totalDistance: '0',
        maxSpeed: '0',
        status: 'active',
      });

      this.logger.log(`Trip started: ${tripId} for vehicle ${position.vehicleId}`);
    } catch (error) {
      this.logger.error(`Error starting trip: ${tripId}`, error);
    }
  }

  private async endTrip(tripId: string, position: GPSPosition): Promise<void> {
    await this.db.execute(
      `UPDATE gps_trips SET
       end_time = $2,
       end_latitude = $3,
       end_longitude = $4
       WHERE trip_id = $1`,
      [tripId, position.timestamp, position.latitude, position.longitude]
    );

    this.logger.log(`Trip ended: ${tripId}`);
  }

  private async updateTrip(tripId: string, position: GPSPosition): Promise<void> {
    await this.db.execute(
      `UPDATE gps_trips SET
       total_distance = total_distance + $2,
       max_speed = GREATEST(max_speed, $3)
       WHERE trip_id = $1`,
      [tripId, 0.1, position.speed]
    );
  }

  async getVehicleHistory(vehicleId: string, period: { start: Date; end: Date }): Promise<GPSPosition[]> {
    try {
      const positions = await this.db.select()
        .from(gpsPositions)
        .where(and(
          eq(gpsPositions.vehicleId, vehicleId),
          gte(gpsPositions.timestamp, period.start),
          lte(gpsPositions.timestamp, period.end)
        ))
        .orderBy(gpsPositions.timestamp);

      return positions.map(row => ({
        deviceId: row.deviceId,
        vehicleId: row.vehicleId,
        latitude: parseFloat(row.latitude || '0'),
        longitude: parseFloat(row.longitude || '0'),
        altitude: row.altitude ? parseFloat(row.altitude) : undefined,
        speed: row.speed ? parseFloat(row.speed) : undefined,
        heading: row.heading ? parseFloat(row.heading) : undefined,
        accuracy: row.accuracy ? parseFloat(row.accuracy) : undefined,
        timestamp: row.timestamp || new Date(),
        satellites: row.satellites || undefined,
        odometer: row.odometer ? parseFloat(row.odometer) : undefined,
        engineStatus: row.engineStatus as 'on' | 'off' || undefined,
        ignition: row.ignition || undefined,
        batteryLevel: row.batteryLevel ? parseFloat(row.batteryLevel) : undefined,
      }));
    } catch (error) {
      this.logger.error(`Error getting vehicle history: ${vehicleId}`, error);
      throw error;
    }
  }

  async getFleetStatus(tenantId: string): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT 
        v.id,
        v.plate_number,
        gp.latitude,
        gp.longitude,
        gp.speed,
        gp.engine_status,
        gp.timestamp,
        EXTRACT(EPOCH FROM (NOW() - gp.timestamp)) as last_update_seconds
       FROM vehicles v
       JOIN gps_devices gd ON v.id = gd.vehicle_id
       LEFT JOIN LATERAL (
         SELECT * FROM gps_positions 
         WHERE vehicle_id = v.id 
         ORDER BY timestamp DESC 
         LIMIT 1
       ) gp ON true
       WHERE v.tenant_id = $1
       ORDER BY v.plate_number`,
      [tenantId]
    );

    return result.rows.map(row => ({
      vehicleId: row.id,
      plateNumber: row.plate_number,
      currentLocation: row.latitude ? { latitude: parseFloat(row.latitude), longitude: parseFloat(row.longitude) } : null,
      speed: row.speed ? parseFloat(row.speed) : 0,
      engineStatus: row.engine_status || 'off',
      lastUpdate: row.timestamp ? new Date(row.timestamp) : null,
      connectionStatus: row.last_update_seconds < 300 ? 'online' : 'offline',
    }));
  }

  async calculateETA(vehicleId: string, destinationLat: number, destinationLon: number): Promise<{ eta: Date; distance: number }> {
    const position = await this.db.execute(
      `SELECT * FROM gps_positions WHERE vehicle_id = $1 ORDER BY timestamp DESC LIMIT 1`,
      [vehicleId]
    );

    if (position.rows.length === 0) {
      throw new Error('No GPS data available for vehicle');
    }

    const currentPos = position.rows[0];
    const distance = this.calculateDistance(
      parseFloat(currentPos.latitude),
      parseFloat(currentPos.longitude),
      destinationLat,
      destinationLon
    );

    const avgSpeed = parseFloat(currentPos.speed) || 60;
    const estimatedHours = distance / avgSpeed;
    const eta = new Date(Date.now() + estimatedHours * 60 * 60 * 1000);

    return { eta, distance };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

