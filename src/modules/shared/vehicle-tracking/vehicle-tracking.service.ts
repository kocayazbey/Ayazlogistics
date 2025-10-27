import { Injectable, NotFoundException, BadRequestException, Logger, Inject } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, desc, count, asc, gte, lte } from 'drizzle-orm';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { vehicles, drivers, routes, gpsTracking, routeStops } from '../../../database/schema/shared/tms.schema';
import { shipments } from '../../../database/schema/shared/wms.schema';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from '../../../realtime/services/realtime.service';
import { EventService } from '../../../realtime/services/event.service';

interface LocationUpdate {
  vehicleId: string;
  driverId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
  tenantId: string;
}

interface LocationQueueConfig {
  maxRetries: number;
  retryDelay: number;
  batchSize: number;
  processingInterval: number;
}

@Injectable()
export class VehicleTrackingService {
  private readonly logger = new Logger(VehicleTrackingService.name);
  private redis: Redis;
  private locationQueue: Map<string, LocationUpdate[]> = new Map();
  private processingTimer?: NodeJS.Timeout;
  private realtimeService: RealtimeService;
  private eventService: EventService;

  private readonly queueConfig: LocationQueueConfig = {
    maxRetries: 3,
    retryDelay: 5000, // 5 seconds
    batchSize: 10,
    processingInterval: 2000, // Process every 2 seconds
  };

  constructor(
    private readonly dbService: DatabaseService,
    private configService: ConfigService,
    realtimeService: RealtimeService,
    eventService: EventService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
    });

    this.realtimeService = realtimeService;
    this.eventService = eventService;

    this.startLocationProcessing();
    this.logger.log('Vehicle Tracking Service initialized with location queue system');
  }

  private get db() {
    return this.dbService.getDb();
  }

  async getVehicles(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(vehicles.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(vehicles.status, filters.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(vehicles)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(vehicles.createdAt)),
        this.db
          .select({ count: count() })
          .from(vehicles)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getVehicles:', error);
      throw new BadRequestException(`Araçlar alınamadı: ${error.message}`);
    }
  }

  async getVehicleById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, id), eq(vehicles.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Araç bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Araç bulunamadı');
    }
  }

  async getVehicleLocation(id: string, tenantId: string) {
    try {
      const vehicle = await this.getVehicleById(id, tenantId);
      
      const latestTracking = await this.db
        .select()
        .from(gpsTracking)
        .where(and(eq(gpsTracking.vehicleId, id), eq(gpsTracking.tenantId, tenantId)))
        .orderBy(desc(gpsTracking.timestamp))
        .limit(1);

      return {
        vehicle,
        location: latestTracking[0] || vehicle.currentLocation,
      };
    } catch (error) {
      console.error('Database error in getVehicleLocation:', error);
      throw error;
    }
  }

  async updateVehicleLocation(id: string, updateLocationDto: UpdateLocationDto, tenantId: string, userId: string) {
    try {
      await this.getVehicleById(id, tenantId);

      // Create location update object
      const locationUpdate: LocationUpdate = {
        vehicleId: id,
        driverId: userId,
        latitude: updateLocationDto.latitude,
        longitude: updateLocationDto.longitude,
        speed: updateLocationDto.speed,
        heading: updateLocationDto.heading,
        timestamp: Date.now(),
        accuracy: updateLocationDto.accuracy,
        altitude: updateLocationDto.altitude,
        tenantId,
      };

      // Add to queue for processing
      await this.addToLocationQueue(locationUpdate);

      // Return immediate acknowledgment
      return {
        id: randomUUID(),
        vehicleId: id,
        status: 'queued',
        timestamp: new Date(),
        message: 'Location update queued for processing',
      };
    } catch (error) {
      this.logger.error('Error in updateVehicleLocation:', error);
      throw error;
    }
  }

  private async addToLocationQueue(locationUpdate: LocationUpdate): Promise<void> {
    try {
      const queueKey = `location_queue:${locationUpdate.vehicleId}`;

      // Add to in-memory queue
      const queue = this.locationQueue.get(queueKey) || [];
      queue.push(locationUpdate);
      this.locationQueue.set(queueKey, queue);

      // Also add to Redis for persistence
      await this.redis.lpush(
        `location_updates:${locationUpdate.tenantId}`,
        JSON.stringify(locationUpdate)
      );

      // Set expiry for Redis list (24 hours)
      await this.redis.expire(`location_updates:${locationUpdate.tenantId}`, 24 * 60 * 60);

      this.logger.debug(`Location update queued for vehicle ${locationUpdate.vehicleId}`);
    } catch (error) {
      this.logger.error('Error adding to location queue:', error);
    }
  }

  private async startLocationProcessing(): Promise<void> {
    this.processingTimer = setInterval(async () => {
      await this.processLocationQueue();
    }, this.queueConfig.processingInterval);

    this.logger.log('Location processing started');
  }

  private async processLocationQueue(): Promise<void> {
    try {
      const tenantIds = await this.redis.smembers('active_tenants');

      for (const tenantId of tenantIds) {
        await this.processTenantLocationQueue(tenantId);
      }
    } catch (error) {
      this.logger.error('Error processing location queue:', error);
    }
  }

  private async processTenantLocationQueue(tenantId: string): Promise<void> {
    try {
      const queueKey = `location_updates:${tenantId}`;
      const updates = await this.redis.lrange(queueKey, 0, this.queueConfig.batchSize - 1);

      if (updates.length === 0) return;

      const processedUpdates: LocationUpdate[] = [];
      const failedUpdates: LocationUpdate[] = [];

      // Process updates in batch
      for (const updateStr of updates) {
        try {
          const update: LocationUpdate = JSON.parse(updateStr);
          await this.processLocationUpdate(update);
          processedUpdates.push(update);
        } catch (error) {
          this.logger.error(`Error processing location update:`, error);
          failedUpdates.push(JSON.parse(updateStr));
        }
      }

      // Remove processed updates from Redis
      if (processedUpdates.length > 0) {
        await this.redis.ltrim(queueKey, processedUpdates.length, -1);

        // Broadcast real-time updates
        for (const update of processedUpdates) {
          await this.broadcastLocationUpdate(update);
        }
      }

      // Re-queue failed updates
      if (failedUpdates.length > 0) {
        await this.retryFailedUpdates(failedUpdates, tenantId);
      }

      this.logger.debug(`Processed ${processedUpdates.length} location updates for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error('Error processing tenant location queue:', error);
    }
  }

  private async processLocationUpdate(update: LocationUpdate): Promise<void> {
    try {
      // Insert into GPS tracking table
      await this.db
        .insert(gpsTracking)
        .values({
          vehicleId: update.vehicleId,
          driverId: update.driverId,
          latitude: update.latitude,
          longitude: update.longitude,
          speed: update.speed,
          heading: update.heading,
          altitude: update.altitude,
          accuracy: update.accuracy,
          timestamp: new Date(update.timestamp),
          tenantId: update.tenantId,
        });

      // Update vehicle current location
      await this.db
        .update(vehicles)
        .set({
          currentLocation: {
            latitude: update.latitude,
            longitude: update.longitude,
          },
          lastLocationUpdate: new Date(update.timestamp),
          speed: update.speed,
          heading: update.heading,
          updatedAt: new Date(),
        })
        .where(and(eq(vehicles.id, update.vehicleId), eq(vehicles.tenantId, update.tenantId)));

      // Emit events for other services
      await this.eventService.emit('vehicle.location_updated', {
        vehicleId: update.vehicleId,
        driverId: update.driverId,
        location: {
          latitude: update.latitude,
          longitude: update.longitude,
        },
        speed: update.speed,
        heading: update.heading,
        timestamp: update.timestamp,
        tenantId: update.tenantId,
      });

      // Check for route progress if vehicle is on a route
      await this.checkRouteProgress(update);

    } catch (error) {
      this.logger.error(`Error processing location update for vehicle ${update.vehicleId}:`, error);
      throw error;
    }
  }

  private async broadcastLocationUpdate(update: LocationUpdate): Promise<void> {
    try {
      // Broadcast to WebSocket clients
      await this.realtimeService.broadcastToAll('vehicle:location-update', {
        vehicleId: update.vehicleId,
        driverId: update.driverId,
        location: {
          latitude: update.latitude,
          longitude: update.longitude,
        },
        speed: update.speed,
        heading: update.heading,
        timestamp: update.timestamp,
      });

      // Also broadcast to specific tenant
      await this.realtimeService.broadcastToTenant(update.tenantId, 'vehicle:location-update', {
        vehicleId: update.vehicleId,
        location: {
          latitude: update.latitude,
          longitude: update.longitude,
        },
        speed: update.speed,
        heading: update.heading,
        timestamp: update.timestamp,
      });

    } catch (error) {
      this.logger.error('Error broadcasting location update:', error);
    }
  }

  private async retryFailedUpdates(failedUpdates: LocationUpdate[], tenantId: string): Promise<void> {
    try {
      const retryKey = `location_retry:${tenantId}`;

      for (const update of failedUpdates) {
        update.timestamp = Date.now(); // Update timestamp for retry

        await this.redis.lpush(retryKey, JSON.stringify(update));
        await this.redis.expire(retryKey, 60 * 60); // 1 hour expiry
      }

      this.logger.warn(`Re-queued ${failedUpdates.length} failed location updates for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error('Error retrying failed updates:', error);
    }
  }

  private async checkRouteProgress(update: LocationUpdate): Promise<void> {
    try {
      // Find active routes for this vehicle
      const activeRoutes = await this.db
        .select()
        .from(routes)
        .where(
          and(
            eq(routes.vehicleId, update.vehicleId),
            eq(routes.tenantId, update.tenantId),
            eq(routes.status, 'in_progress')
          )
        )
        .limit(1);

      if (activeRoutes.length === 0) return;

      const route = activeRoutes[0];

      // Check if vehicle is near next stop
      const nextStops = await this.db
        .select()
        .from(routeStops)
        .where(
          and(
            eq(routeStops.routeId, route.id),
            eq(routeStops.tenantId, update.tenantId),
            eq(routeStops.status, 'pending')
          )
        )
        .orderBy(asc(routeStops.stopSequence))
        .limit(1);

      if (nextStops.length > 0) {
        const nextStop = nextStops[0];
        const distance = this.calculateDistance(
          update.latitude,
          update.longitude,
          nextStop.latitude,
          nextStop.longitude
        );

        // If within 100 meters of next stop
        if (distance < 0.1) {
          await this.eventService.emit('vehicle.near_stop', {
            vehicleId: update.vehicleId,
            routeId: route.id,
            stopId: nextStop.id,
            distance,
            location: {
              latitude: update.latitude,
              longitude: update.longitude,
            },
            tenantId: update.tenantId,
          });

          this.logger.debug(`Vehicle ${update.vehicleId} is near stop ${nextStop.id}`);
        }
      }

    } catch (error) {
      this.logger.error('Error checking route progress:', error);
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Cleanup method
  async onModuleDestroy() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    if (this.redis) {
      this.redis.disconnect();
    }
  }

  async getVehicleHistory(id: string, tenantId: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const conditions = [
        eq(gpsTracking.vehicleId, id),
        eq(gpsTracking.tenantId, tenantId),
      ];

      if (filters?.dateFrom) {
        conditions.push(gte(gpsTracking.timestamp, new Date(filters.dateFrom)));
      }

      if (filters?.dateTo) {
        conditions.push(lte(gpsTracking.timestamp, new Date(filters.dateTo)));
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      const history = await this.db
        .select()
        .from(gpsTracking)
        .where(whereClause)
        .orderBy(desc(gpsTracking.timestamp))
        .limit(1000);

      return history;
    } catch (error) {
      console.error('Database error in getVehicleHistory:', error);
      throw new BadRequestException(`Araç geçmişi alınamadı: ${error.message}`);
    }
  }

  async getDrivers(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(drivers.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(drivers.status, filters.status));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(drivers)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(drivers.createdAt)),
        this.db
          .select({ count: count() })
          .from(drivers)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getDrivers:', error);
      throw new BadRequestException(`Sürücüler alınamadı: ${error.message}`);
    }
  }

  async getDriverById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(drivers)
        .where(and(eq(drivers.id, id), eq(drivers.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Sürücü bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Sürücü bulunamadı');
    }
  }

  async getDriverStatus(id: string, tenantId: string) {
    try {
      const driver = await this.getDriverById(id, tenantId);
      return {
        driver,
        status: driver.status,
        vehicleId: driver.vehicleId,
        statusUpdatedAt: driver.statusUpdatedAt,
      };
    } catch (error) {
      console.error('Database error in getDriverStatus:', error);
      throw error;
    }
  }

  async updateDriverStatus(id: string, status: string, tenantId: string) {
    try {
      const result = await this.db
        .update(drivers)
        .set({
          status,
          statusUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(drivers.id, id), eq(drivers.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Sürücü bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updateDriverStatus:', error);
      throw error;
    }
  }

  async getRoutes(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
    driverId?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(routes.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(routes.status, filters.status));
    }

    if (filters?.driverId) {
      conditions.push(eq(routes.driverId, filters.driverId));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(routes)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(routes.createdAt)),
        this.db
          .select({ count: count() })
          .from(routes)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getRoutes:', error);
      throw new BadRequestException(`Rotalar alınamadı: ${error.message}`);
    }
  }

  async getRouteById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(routes)
        .where(and(eq(routes.id, id), eq(routes.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Rota bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Rota bulunamadı');
    }
  }

  async createRoute(createRouteDto: CreateRouteDto, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .insert(routes)
        .values({
          routeNumber: `RT-${Date.now()}`,
          vehicleId: createRouteDto.vehicleId,
          driverId: createRouteDto.driverId || userId,
          totalDistance: createRouteDto.totalDistanceKm ? createRouteDto.totalDistanceKm.toString() : null,
          estimatedTime: createRouteDto.estimatedDurationHours ? Math.round(createRouteDto.estimatedDurationHours * 60) : null,
          status: 'pending',
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in createRoute:', error);
      throw new BadRequestException(`Rota oluşturulamadı: ${error.message}`);
    }
  }

  async updateRoute(id: string, updateRouteDto: UpdateRouteDto, tenantId: string) {
    try {
      const result = await this.db
        .update(routes)
        .set({ ...updateRouteDto, updatedAt: new Date() })
        .where(and(eq(routes.id, id), eq(routes.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Rota bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updateRoute:', error);
      throw error;
    }
  }

  async startRoute(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(routes)
        .set({
          status: 'in_progress',
          updatedAt: new Date(),
        })
        .where(and(eq(routes.id, id), eq(routes.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Rota bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in startRoute:', error);
      throw error;
    }
  }

  async completeRoute(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(routes)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(and(eq(routes.id, id), eq(routes.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Rota bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in completeRoute:', error);
      throw error;
    }
  }

  async getRouteStops(id: string, tenantId: string) {
    try {
      await this.getRouteById(id, tenantId);
      
      const stops = await this.db
        .select()
        .from(routeStops)
        .where(and(eq(routeStops.routeId, id), eq(routeStops.tenantId, tenantId)))
        .orderBy(asc(routeStops.stopSequence));

      return { routeId: id, stops };
    } catch (error) {
      console.error('Database error in getRouteStops:', error);
      throw error;
    }
  }

  async arriveAtStop(id: string, stopId: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(routeStops)
        .set({
          status: 'arrived',
          actualArrival: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(routeStops.id, stopId), eq(routeStops.routeId, id), eq(routeStops.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Stop not found');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in arriveAtStop:', error);
      throw error;
    }
  }

  async completeStop(id: string, stopId: string, notes: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(routeStops)
        .set({
          status: 'completed',
          completedAt: new Date(),
          deliveryNotes: notes,
          updatedAt: new Date(),
        })
        .where(and(eq(routeStops.id, stopId), eq(routeStops.routeId, id), eq(routeStops.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Stop not found');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in completeStop:', error);
      throw error;
    }
  }

  async getDeliveries(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    status?: string;
    driverId?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(shipments.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(shipments.status, filters.status));
    }

    if (filters?.driverId) {
      conditions.push(eq(shipments.driverId, filters.driverId));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(shipments)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(shipments.createdAt)),
        this.db
          .select({ count: count() })
          .from(shipments)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getDeliveries:', error);
      throw new BadRequestException(`Teslimatlar alınamadı: ${error.message}`);
    }
  }

  async getDeliveryById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(shipments)
        .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Teslimat bulunamadı');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Teslimat bulunamadı');
    }
  }

  async pickupDelivery(id: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(shipments)
        .set({
          status: 'picked_up',
          dispatchedAt: new Date(),
          driverId: userId,
          updatedAt: new Date(),
        })
        .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Teslimat bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in pickupDelivery:', error);
      throw error;
    }
  }

  async deliverDelivery(id: string, signature: string, notes: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(shipments)
        .set({
          status: 'delivered',
          shippedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Teslimat bulunamadı');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in deliverDelivery:', error);
      throw error;
    }
  }

  async getAnalyticsDashboard(tenantId: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const [totalVehicles, activeVehicles, totalDrivers, activeDrivers] = await Promise.all([
        this.db.select({ count: count() }).from(vehicles).where(eq(vehicles.tenantId, tenantId)),
        this.db.select({ count: count() }).from(vehicles).where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.status, 'available'))),
        this.db.select({ count: count() }).from(drivers).where(eq(drivers.tenantId, tenantId)),
        this.db.select({ count: count() }).from(drivers).where(and(eq(drivers.tenantId, tenantId), eq(drivers.status, 'available'))),
      ]);

      return {
        vehicles: {
          total: Number(totalVehicles[0].count),
          active: Number(activeVehicles[0].count),
        },
        drivers: {
          total: Number(totalDrivers[0].count),
          active: Number(activeDrivers[0].count),
        },
      };
    } catch (error) {
      console.error('Database error in getAnalyticsDashboard:', error);
      throw new BadRequestException(`Analitik dashboard alınamadı: ${error.message}`);
    }
  }

  async getPerformanceAnalytics(tenantId: string, filters?: {
    driverId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const conditions = [eq(shipments.tenantId, tenantId)];
      
      if (filters?.driverId) {
        conditions.push(eq(shipments.driverId, filters.driverId));
      }
      
      if (filters?.dateFrom) {
        conditions.push(gte(shipments.createdAt, new Date(filters.dateFrom)));
      }
      
      if (filters?.dateTo) {
        conditions.push(lte(shipments.createdAt, new Date(filters.dateTo)));
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      const [totalDeliveries, completedDeliveries, onTimeDeliveries] = await Promise.all([
        this.db.select({ count: count() }).from(shipments).where(whereClause),
        this.db.select({ count: count() }).from(shipments).where(
          and(whereClause, eq(shipments.status, 'delivered'))
        ),
        this.db.select({ count: count() }).from(shipments).where(
          and(
            whereClause,
            eq(shipments.status, 'delivered'),
            lte(shipments.shippedAt, shipments.expectedDelivery)
          )
        ),
      ]);

      const total = Number(totalDeliveries[0].count);
      const completed = Number(completedDeliveries[0].count);
      const onTime = Number(onTimeDeliveries[0].count);

      return {
        driverId: filters?.driverId,
        period: { from: filters?.dateFrom, to: filters?.dateTo },
        metrics: {
          totalDeliveries: total,
          completedDeliveries: completed,
          onTimeDeliveries: onTime,
          onTimeRate: total > 0 ? (onTime / total) * 100 : 0,
          completionRate: total > 0 ? (completed / total) * 100 : 0,
        },
      };
    } catch (error) {
      console.error('Database error in getPerformanceAnalytics:', error);
      throw error;
    }
  }

  async getAlerts(tenantId: string, filters?: {
    type?: string;
    severity?: string;
  }) {
    try {
      const alerts = [];
      
      // Check for vehicles without location updates for more than 1 hour
      const staleVehicles = await this.db
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.tenantId, tenantId),
            lte(vehicles.lastLocationUpdate, new Date(Date.now() - 60 * 60 * 1000))
          )
        );

      staleVehicles.forEach(vehicle => {
        alerts.push({
          id: randomUUID(),
          type: 'vehicle_stale_location',
          severity: 'medium',
          message: `Vehicle ${vehicle.vehicleNumber} location not updated in 1 hour`,
          vehicleId: vehicle.id,
          timestamp: new Date(),
        });
      });

      // Check for overdue routes
      const overdueRoutes = await this.db
        .select()
        .from(routes)
        .where(
          and(
            eq(routes.tenantId, tenantId),
            eq(routes.status, 'in_progress'),
            lte(routes.updatedAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
          )
        );

      overdueRoutes.forEach(route => {
        alerts.push({
          id: randomUUID(),
          type: 'route_overdue',
          severity: 'high',
          message: `Route ${route.routeNumber} is overdue`,
          routeId: route.id,
          timestamp: new Date(),
        });
      });

      // Filter by type and severity if provided
      let filteredAlerts = alerts;
      if (filters?.type) {
        filteredAlerts = filteredAlerts.filter(a => a.type === filters.type);
      }
      if (filters?.severity) {
        filteredAlerts = filteredAlerts.filter(a => a.severity === filters.severity);
      }

      return { alerts: filteredAlerts };
    } catch (error) {
      console.error('Database error in getAlerts:', error);
      throw error;
    }
  }
}

