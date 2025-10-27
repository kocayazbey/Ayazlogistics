import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { TransactionManagerService } from '../../../core/database/transaction-manager.service';
import { QueryOptimizerService } from '../../../core/database/query-optimizer.service';
import { eq, and, desc, gte, lte, count, sql } from 'drizzle-orm';
import { 
  vehicles, 
  drivers, 
  routes, 
  routeStops,
  gpsTracking
} from '../../../database/schema/logistics/tms.schema';

@Injectable()
export class TmsService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly transactionManager: TransactionManagerService,
    private readonly queryOptimizer: QueryOptimizerService,
  ) {}

  // ============================================================================
  // ROUTES
  // ============================================================================

  async getRoutes(params: {
    page: number;
    limit: number;
    status?: string;
    driverId?: string;
    tenantId: string;
  }) {
    const { page, limit, status, driverId, tenantId } = params;
    const offset = (page - 1) * limit;

    let whereConditions = [eq(routes.tenantId, tenantId)];
    
    if (status) {
      whereConditions.push(eq(routes.status, status as any));
    }
    if (driverId) {
      whereConditions.push(eq(routes.driverId, driverId));
    }

    // PERFORMANCE FIX: Use query optimizer for better performance
    return this.queryOptimizer.optimizeQuery(async () => {
      const [routesData, totalCount] = await Promise.all([
        this.db
          .select({
            id: routes.id,
            routeNumber: routes.routeNumber,
            vehicleId: routes.vehicleId,
            driverId: routes.driverId,
            routeDate: routes.routeDate,
            status: routes.status,
            totalDistance: routes.totalDistance,
            estimatedDuration: routes.estimatedDuration,
            totalStops: routes.totalStops,
            optimizationAlgorithm: routes.optimizationAlgorithm,
            startedAt: routes.startedAt,
            completedAt: routes.completedAt,
            createdAt: routes.createdAt,
            updatedAt: routes.updatedAt,
          })
          .from(routes)
          .where(and(...whereConditions))
          .orderBy(desc(routes.createdAt))
          .limit(limit)
          .offset(offset),
        this.db
          .select({ count: count() })
          .from(routes)
          .where(and(...whereConditions))
      ]);

      return {
        items: routesData,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          pages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    }, {
      enableQueryCaching: true,
      maxExecutionTime: 5000,
      enableIndexHints: true
    });
  }

  async createRoute(data: {
    tenantId: string;
    routeNumber: string;
    vehicleId: string;
    driverId: string;
    routeDate: string;
    totalDistance?: string;
    estimatedDuration?: number;
    totalStops?: number;
    optimizationAlgorithm?: string;
    metadata?: any;
    createdBy?: string;
  }) {
    // CRITICAL FIX: Use transaction for data consistency
    return this.transactionManager.executeTenantTransaction(
      data.tenantId,
      async (tx) => {
        // Verify vehicle and driver exist and are available
        const [vehicle, driver] = await Promise.all([
          tx.select().from(vehicles).where(and(
            eq(vehicles.id, data.vehicleId),
            eq(vehicles.tenantId, data.tenantId),
            eq(vehicles.status, 'available')
          )).limit(1),
          tx.select().from(drivers).where(and(
            eq(drivers.id, data.driverId),
            eq(drivers.tenantId, data.tenantId),
            eq(drivers.status, 'active')
          )).limit(1)
        ]);

        if (!vehicle[0]) {
          throw new NotFoundException('Vehicle not found or not available');
        }
        if (!driver[0]) {
          throw new NotFoundException('Driver not found or not active');
        }

        // Create route
        const [route] = await tx
          .insert(routes)
          .values({
            tenantId: data.tenantId,
            routeNumber: data.routeNumber,
            vehicleId: data.vehicleId,
            driverId: data.driverId,
            routeDate: data.routeDate,
            status: 'planned',
            totalDistance: data.totalDistance || null,
            estimatedDuration: data.estimatedDuration || null,
            totalStops: data.totalStops || null,
            optimizationAlgorithm: data.optimizationAlgorithm || null,
            metadata: data.metadata || null,
            createdBy: data.createdBy || null,
          })
          .returning();

        // Update vehicle status to assigned
        await tx
          .update(vehicles)
          .set({ 
            status: 'assigned',
            updatedAt: new Date()
          })
          .where(eq(vehicles.id, data.vehicleId));

        return route;
      },
      {
        isolationLevel: 'READ_COMMITTED',
        timeout: 10000,
        metadata: { operation: 'createRoute' }
      }
    );
  }

  async updateRoute(id: string, data: Partial<{
    routeNumber: string;
    vehicleId: string;
    driverId: string;
    routeDate: string;
    status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
    totalDistance: string;
    estimatedDuration: number;
    totalStops: number;
    optimizationAlgorithm: string;
    metadata: any;
  }>) {
    const [route] = await this.db
      .update(routes)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(routes.id, id))
      .returning();

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  async startRoute(id: string) {
    const [route] = await this.db
      .update(routes)
      .set({
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(routes.id, id))
      .returning();

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  async completeRoute(id: string) {
    const [route] = await this.db
      .update(routes)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(routes.id, id))
      .returning();

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  // ============================================================================
  // VEHICLES
  // ============================================================================

  async getVehicles(params: {
    page: number;
    limit: number;
    status?: string;
    vehicleType?: string;
    driverId?: string;
    tenantId: string;
  }) {
    const { page, limit, status, vehicleType, driverId, tenantId } = params;
    const offset = (page - 1) * limit;

    let whereConditions = [eq(vehicles.tenantId, tenantId)];
    
    if (status) {
      whereConditions.push(eq(vehicles.status, status as any));
    }
    if (vehicleType) {
      whereConditions.push(eq(vehicles.vehicleType, vehicleType as any));
    }
    if (driverId) {
      whereConditions.push(eq(vehicles.driverId, driverId));
    }

    const [vehiclesData, totalCount] = await Promise.all([
      this.db
        .select()
        .from(vehicles)
        .where(and(...whereConditions))
        .orderBy(desc(vehicles.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(vehicles)
        .where(and(...whereConditions))
    ]);

    return {
      items: vehiclesData,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        pages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
  }

  async createVehicle(data: {
    tenantId: string;
    vehicleNumber: string;
    licensePlate: string;
    vehicleType: 'truck' | 'van' | 'car' | 'motorcycle';
    make: string;
    model: string;
    year: number;
    capacity: string;
    maxWeight: string;
    fuelType: 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';
    currentOdometer?: string;
    gpsDevice?: string;
    metadata?: any;
  }) {
    const [vehicle] = await this.db
      .insert(vehicles)
      .values({
        tenantId: data.tenantId,
        vehicleNumber: data.vehicleNumber,
        licensePlate: data.licensePlate,
        vehicleType: data.vehicleType,
        make: data.make,
        model: data.model,
        year: data.year,
        capacity: data.capacity,
        maxWeight: data.maxWeight,
        fuelType: data.fuelType,
        currentOdometer: data.currentOdometer || null,
        gpsDevice: data.gpsDevice || null,
        status: 'available',
        metadata: data.metadata || null,
      })
      .returning();

    return vehicle;
  }

  async updateVehicle(id: string, data: Partial<{
    vehicleNumber: string;
    licensePlate: string;
    vehicleType: 'truck' | 'van' | 'car' | 'motorcycle';
    make: string;
    model: string;
    year: number;
    capacity: string;
    maxWeight: string;
    fuelType: 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';
    currentOdometer: string;
    gpsDevice: string;
    status: 'available' | 'in_use' | 'maintenance' | 'out_of_service';
    metadata: any;
  }>) {
    const [vehicle] = await this.db
      .update(vehicles)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(vehicles.id, id))
      .returning();

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  // ============================================================================
  // DRIVERS
  // ============================================================================

  async getDrivers(params: {
    page: number;
    limit: number;
    status?: string;
    tenantId: string;
  }) {
    const { page, limit, status, tenantId } = params;
    const offset = (page - 1) * limit;

    let whereConditions = [eq(drivers.tenantId, tenantId)];
    
    if (status) {
      whereConditions.push(eq(drivers.status, status as any));
    }

    const [driversData, totalCount] = await Promise.all([
      this.db
        .select()
        .from(drivers)
        .where(and(...whereConditions))
        .orderBy(desc(drivers.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(drivers)
        .where(and(...whereConditions))
    ]);

    return {
      items: driversData,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        pages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
  }

  async createDriver(data: {
    tenantId: string;
    driverNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    licenseNumber: string;
    licenseExpiry: string;
    metadata?: any;
  }) {
    const [driver] = await this.db
      .insert(drivers)
      .values({
        tenantId: data.tenantId,
        driverNumber: data.driverNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email || null,
        licenseNumber: data.licenseNumber,
        licenseExpiry: data.licenseExpiry,
        status: 'available',
        metadata: data.metadata || null,
      })
      .returning();

    return driver;
  }

  async updateDriver(id: string, data: Partial<{
    driverNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    licenseNumber: string;
    licenseExpiry: string;
    status: 'available' | 'busy' | 'off_duty' | 'suspended';
    metadata: any;
  }>) {
    const [driver] = await this.db
      .update(drivers)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(drivers.id, id))
      .returning();

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  // ============================================================================
  // GPS TRACKING
  // ============================================================================

  async getTracking(params: {
    page: number;
    limit: number;
    vehicleId?: string;
    tenantId: string;
  }) {
    const { page, limit, vehicleId, tenantId } = params;
    const offset = (page - 1) * limit;

    let whereConditions = [eq(gpsTracking.tenantId, tenantId)];
    
    if (vehicleId) {
      whereConditions.push(eq(gpsTracking.vehicleId, vehicleId));
    }

    const [trackingData, totalCount] = await Promise.all([
      this.db
        .select()
        .from(gpsTracking)
        .where(and(...whereConditions))
        .orderBy(desc(gpsTracking.timestamp))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(gpsTracking)
        .where(and(...whereConditions))
    ]);

    return {
      items: trackingData,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        pages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
  }

  async createTracking(data: {
    tenantId: string;
    vehicleId: string;
    latitude: string;
    longitude: string;
    speed?: string;
    heading?: string;
    accuracy?: string;
    timestamp?: Date;
    metadata?: any;
  }) {
    const [tracking] = await this.db
      .insert(gpsTracking)
      .values({
        tenantId: data.tenantId,
        vehicleId: data.vehicleId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed || null,
        heading: data.heading || null,
        accuracy: data.accuracy || null,
        timestamp: data.timestamp || new Date(),
        metadata: data.metadata || null,
      })
      .returning();

    return tracking;
  }

  async getCurrentLocation(vehicleId: string) {
    const [tracking] = await this.db
      .select({
        latitude: gpsTracking.latitude,
        longitude: gpsTracking.longitude,
        speed: gpsTracking.speed,
        heading: gpsTracking.heading,
        timestamp: gpsTracking.timestamp,
      })
      .from(gpsTracking)
      .where(eq(gpsTracking.vehicleId, vehicleId))
      .orderBy(desc(gpsTracking.timestamp))
      .limit(1);

    if (!tracking) {
      throw new NotFoundException('No tracking data found for this vehicle');
    }

    return {
      coordinates: {
        latitude: tracking.latitude,
        longitude: tracking.longitude,
      },
      speed: tracking.speed,
      heading: tracking.heading,
      lastUpdate: tracking.timestamp
    };
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getPerformanceAnalytics(tenantId: string, dateFrom?: string, dateTo?: string) {
    let whereConditions = [eq(routes.tenantId, tenantId)];
    
    if (dateFrom) {
      whereConditions.push(gte(routes.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte(routes.createdAt, new Date(dateTo)));
    }

    const [analytics] = await this.db
      .select({
        totalRoutes: count(),
        completedRoutes: sql<number>`COUNT(CASE WHEN ${routes.status} = 'completed' THEN 1 END)`,
        totalDistance: sql<number>`COALESCE(SUM(CAST(${routes.totalDistance} AS DECIMAL)), 0)`,
        averageEfficiency: sql<number>`COALESCE(AVG(${routes.estimatedDuration}), 0)`,
      })
      .from(routes)
      .where(and(...whereConditions));

    return analytics;
  }

  async getRouteAnalytics(tenantId: string, dateFrom?: string, dateTo?: string) {
    let whereConditions = [eq(routes.tenantId, tenantId)];
    
    if (dateFrom) {
      whereConditions.push(gte(routes.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte(routes.createdAt, new Date(dateTo)));
    }

    const [analytics] = await this.db
      .select({
        totalRoutes: count(),
        completedRoutes: sql<number>`COUNT(CASE WHEN ${routes.status} = 'completed' THEN 1 END)`,
        inProgressRoutes: sql<number>`COUNT(CASE WHEN ${routes.status} = 'in_progress' THEN 1 END)`,
        totalDistance: sql<number>`COALESCE(SUM(CAST(${routes.totalDistance} AS DECIMAL)), 0)`,
        averageStops: sql<number>`COALESCE(AVG(${routes.totalStops}), 0)`,
      })
      .from(routes)
      .where(and(...whereConditions));

    return analytics;
  }

  async getVehicleAnalytics(tenantId: string, dateFrom?: string, dateTo?: string) {
    let whereConditions = [eq(vehicles.tenantId, tenantId)];
    
    if (dateFrom) {
      whereConditions.push(gte(vehicles.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      whereConditions.push(lte(vehicles.createdAt, new Date(dateTo)));
    }

    const [analytics] = await this.db
      .select({
        totalVehicles: count(),
        availableVehicles: sql<number>`COUNT(CASE WHEN ${vehicles.status} = 'available' THEN 1 END)`,
        inUseVehicles: sql<number>`COUNT(CASE WHEN ${vehicles.status} = 'in_use' THEN 1 END)`,
        maintenanceVehicles: sql<number>`COUNT(CASE WHEN ${vehicles.status} = 'maintenance' THEN 1 END)`,
        averageOdometer: sql<number>`COALESCE(AVG(CAST(${vehicles.currentOdometer} AS DECIMAL)), 0)`,
      })
      .from(vehicles)
      .where(and(...whereConditions));

    return analytics;
  }
}