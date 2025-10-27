import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { StandardizedDatabaseService } from '../../../core/database/standardized-database.service';
import { RealtimeEventsService } from '../../../realtime/services/realtime-events.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { OptimizeRouteDto } from './dto/optimize-route.dto';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly dbService: StandardizedDatabaseService,
    private readonly realtimeEventsService: RealtimeEventsService
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getRoutes(filters: {
    tenantId: string;
    status?: string;
    vehicleId?: string;
    driverId?: string;
    page: number;
    limit: number;
  }) {
    try {
      // Import database schema
      const { routes, vehicles, drivers, routeStops } = await import('../../../database/schema/shared/tms.schema');
      const { eq, and, desc, sql, count } = await import('drizzle-orm');
      
      // Build where conditions
      const whereConditions = [eq(routes.tenantId, filters.tenantId)];
      
      if (filters.status) {
        whereConditions.push(eq(routes.status, filters.status));
      }
      
      if (filters.vehicleId) {
        whereConditions.push(eq(routes.vehicleId, filters.vehicleId));
      }
      
      if (filters.driverId) {
        whereConditions.push(eq(routes.driverId, filters.driverId));
      }

      // Get total count for pagination
      const totalCount = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(routes)
        .where(and(...whereConditions));

      // Get paginated routes data
      const offset = (filters.page - 1) * filters.limit;
      const routesData = await this.db
        .select({
          id: routes.id,
          routeNumber: routes.routeNumber,
          vehicleId: routes.vehicleId,
          driverId: routes.driverId,
          status: routes.status,
          distance: routes.distance,
          duration: routes.duration,
          fuelConsumption: routes.fuelConsumption,
          efficiency: routes.efficiency,
          startedAt: routes.startedAt,
          completedAt: routes.completedAt,
          createdAt: routes.createdAt,
          updatedAt: routes.updatedAt,
          vehicle: {
            id: vehicles.id,
            plateNumber: vehicles.plateNumber,
            make: vehicles.make,
            model: vehicles.model,
          },
          driver: {
            id: drivers.id,
            name: drivers.name,
            email: drivers.email,
            phone: drivers.phone,
          },
          stopsCount: sql<number>`count(${routeStops.id})`
        })
        .from(routes)
        .leftJoin(vehicles, eq(routes.vehicleId, vehicles.id))
        .leftJoin(drivers, eq(routes.driverId, drivers.id))
        .leftJoin(routeStops, eq(routes.id, routeStops.routeId))
        .where(and(...whereConditions))
        .groupBy(routes.id, vehicles.id, drivers.id)
        .orderBy(desc(routes.createdAt))
        .limit(filters.limit)
        .offset(offset);

      return {
        routes: routesData,
        total: totalCount[0]?.count || 0,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / filters.limit)
      };
    } catch (error) {
      this.logger.error('Error fetching routes:', error);
      throw new Error('Failed to fetch routes data');
    }
  }

  async getRoutesStats(tenantId: string) {
    try {
      // Import database schema
      const { routes } = await import('../../../database/schema/shared/tms.schema');
      const { eq, and, sql, count, avg } = await import('drizzle-orm');

      // Get total routes
      const totalRoutes = await this.db
        .select({ count: count() })
        .from(routes)
        .where(eq(routes.tenantId, tenantId));

      // Get active routes
      const activeRoutes = await this.db
        .select({ count: count() })
        .from(routes)
        .where(and(eq(routes.tenantId, tenantId), eq(routes.status, 'active')));

      // Get completed routes
      const completedRoutes = await this.db
        .select({ count: count() })
        .from(routes)
        .where(and(eq(routes.tenantId, tenantId), eq(routes.status, 'completed')));

      // Get average distance for completed routes
      const avgDistance = await this.db
        .select({ avg: avg(routes.distance) })
        .from(routes)
        .where(and(eq(routes.tenantId, tenantId), eq(routes.status, 'completed')));

      // Get average duration for completed routes
      const avgDuration = await this.db
        .select({ avg: avg(routes.duration) })
        .from(routes)
        .where(and(eq(routes.tenantId, tenantId), eq(routes.status, 'completed')));

      return {
        totalRoutes: totalRoutes[0]?.count || 0,
        activeRoutes: activeRoutes[0]?.count || 0,
        completedRoutes: completedRoutes[0]?.count || 0,
        avgDistance: avgDistance[0]?.avg || 0,
        avgDuration: avgDuration[0]?.avg || 0
      };
    } catch (error) {
      this.logger.error('Error fetching routes stats:', error);
      throw new Error('Failed to fetch routes statistics');
    }
  }

  async getRoutesPerformance(tenantId: string, filters: { startDate?: string; endDate?: string }) {
    const query = this.routeRepository
      .createQueryBuilder('route')
      .where('route.tenantId = :tenantId', { tenantId })
      .andWhere('route.status = :status', { status: 'completed' });

    if (filters.startDate) {
      query.andWhere('route.completedAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('route.completedAt <= :endDate', { endDate: filters.endDate });
    }

    const performance = await query
      .select([
        'AVG(route.distance) as avgDistance',
        'AVG(route.duration) as avgDuration',
        'AVG(route.fuelConsumption) as avgFuelConsumption',
        'AVG(route.efficiency) as avgEfficiency',
        'COUNT(*) as totalRoutes'
      ])
      .getRawOne();

    return {
      totalRoutes: parseInt(performance.totalRoutes),
      avgDistance: parseFloat(performance.avgDistance) || 0,
      avgDuration: parseFloat(performance.avgDuration) || 0,
      avgFuelConsumption: parseFloat(performance.avgFuelConsumption) || 0,
      avgEfficiency: parseFloat(performance.avgEfficiency) || 0
    };
  }

  async getRoute(id: string, tenantId: string) {
    try {
      // Import database schema
      const { routes, vehicles, drivers, routeStops, routeTracking } = await import('../../../database/schema/shared/tms.schema');
      const { eq, and, asc } = await import('drizzle-orm');

      // Get route with vehicle and driver info
      const routeData = await this.db
        .select({
          id: routes.id,
          routeNumber: routes.routeNumber,
          vehicleId: routes.vehicleId,
          driverId: routes.driverId,
          status: routes.status,
          distance: routes.distance,
          duration: routes.duration,
          fuelConsumption: routes.fuelConsumption,
          efficiency: routes.efficiency,
          startLatitude: routes.startLatitude,
          startLongitude: routes.startLongitude,
          endLatitude: routes.endLatitude,
          endLongitude: routes.endLongitude,
          plannedDuration: routes.plannedDuration,
          startedAt: routes.startedAt,
          completedAt: routes.completedAt,
          createdAt: routes.createdAt,
          updatedAt: routes.updatedAt,
          vehicle: {
            id: vehicles.id,
            plateNumber: vehicles.plateNumber,
            make: vehicles.make,
            model: vehicles.model,
            year: vehicles.year,
            capacity: vehicles.capacity,
            status: vehicles.status,
          },
          driver: {
            id: drivers.id,
            name: drivers.name,
            email: drivers.email,
            phone: drivers.phone,
            licenseNumber: drivers.licenseNumber,
            licenseExpiry: drivers.licenseExpiry,
            status: drivers.status,
          },
        })
        .from(routes)
        .leftJoin(vehicles, eq(routes.vehicleId, vehicles.id))
        .leftJoin(drivers, eq(routes.driverId, drivers.id))
        .where(and(eq(routes.id, id), eq(routes.tenantId, tenantId)))
        .limit(1);

      if (routeData.length === 0) {
        throw new NotFoundException('Route not found');
      }

      // Get route stops
      const stops = await this.db
        .select()
        .from(routeStops)
        .where(eq(routeStops.routeId, id))
        .orderBy(asc(routeStops.sequence));

      // Get route tracking
      const tracking = await this.db
        .select()
        .from(routeTracking)
        .where(eq(routeTracking.routeId, id))
        .orderBy(asc(routeTracking.timestamp));

      return {
        ...routeData[0],
        stops,
        tracking
      };
    } catch (error) {
      this.logger.error('Error fetching route:', error);
      throw new Error('Failed to fetch route data');
    }
  }

  async createRoute(createRouteDto: CreateRouteDto, userId: string, tenantId: string) {
    try {
      // Import database schema
      const { routes, routeStops } = await import('../../../database/schema/shared/tms.schema');
      const { eq } = await import('drizzle-orm');

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // Create route
        const newRoute = await tx
          .insert(routes)
          .values({
            routeNumber: createRouteDto.routeNumber,
            vehicleId: createRouteDto.vehicleId,
            driverId: createRouteDto.driverId,
            status: 'planned',
            distance: createRouteDto.distance || 0,
            duration: createRouteDto.duration || 0,
            fuelConsumption: createRouteDto.fuelConsumption || 0,
            efficiency: 0,
            startLatitude: createRouteDto.startLatitude,
            startLongitude: createRouteDto.startLongitude,
            endLatitude: createRouteDto.endLatitude,
            endLongitude: createRouteDto.endLongitude,
            plannedDuration: createRouteDto.plannedDuration,
            tenantId,
            createdBy: userId,
          })
          .returning();

        // Create route stops
        if (createRouteDto.stops && createRouteDto.stops.length > 0) {
          const stops = createRouteDto.stops.map((stop, index) => ({
            routeId: newRoute[0].id,
            name: stop.name,
            address: stop.address,
            city: stop.city,
            latitude: stop.latitude,
            longitude: stop.longitude,
            sequence: index + 1,
            status: 'pending',
            plannedArrival: stop.plannedArrival,
            plannedDeparture: stop.plannedDeparture,
          }));

          await tx
            .insert(routeStops)
            .values(stops);
        }

        // Emit real-time WebSocket event
        this.realtimeEventsService.emitToAll('tms.route.created', {
          type: 'route_created',
          data: newRoute[0],
          timestamp: new Date().toISOString()
        });

        this.logger.log(`Route created: ${newRoute[0].id}`);
        return newRoute[0];
      });
    } catch (error) {
      this.logger.error('Error creating route:', error);
      throw new Error('Failed to create route');
    }
  }

  async updateRoute(id: string, updateRouteDto: UpdateRouteDto, userId: string, tenantId: string) {
    const route = await this.getRoute(id, tenantId);

    if (route.status === 'completed') {
      throw new BadRequestException('Cannot update completed route');
    }

    Object.assign(route, updateRouteDto);
    route.updatedBy = userId;
    route.updatedAt = new Date();

    return this.routeRepository.save(route);
  }

  async optimizeRoutes(optimizeRouteDto: OptimizeRouteDto, userId: string, tenantId: string) {
    // This would integrate with the route optimization algorithm
    const { routeIds, optimizationType, constraints } = optimizeRouteDto;

    const routes = await this.routeRepository.find({
      where: { id: { $in: routeIds }, tenantId },
      relations: ['stops']
    });

    if (routes.length === 0) {
      throw new NotFoundException('No routes found for optimization');
    }

    // Simulate optimization algorithm
    const optimizedRoutes = routes.map(route => {
      const optimizedStops = this.optimizeRouteStops(route.stops, optimizationType, constraints);
      return {
        routeId: route.id,
        originalDistance: route.distance,
        optimizedDistance: this.calculateDistance(optimizedStops),
        originalDuration: route.duration,
        optimizedDuration: this.calculateDuration(optimizedStops),
        savings: this.calculateSavings(route, optimizedStops)
      };
    });

    return {
      optimizationType,
      constraints,
      results: optimizedRoutes,
      totalSavings: optimizedRoutes.reduce((sum, route) => sum + route.savings, 0)
    };
  }

  async startRoute(id: string, userId: string, tenantId: string) {
    try {
      // Import database schema
      const { routes, routeTracking } = await import('../../../database/schema/shared/tms.schema');
      const { eq, and } = await import('drizzle-orm');

      // Get route to check status
      const route = await this.getRoute(id, tenantId);

      if (route.status !== 'planned') {
        throw new BadRequestException('Route can only be started from planned status');
      }

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // Update route status
        const updatedRoute = await tx
          .update(routes)
          .set({
            status: 'active',
            startedAt: new Date(),
            startedBy: userId,
            updatedAt: new Date()
          })
          .where(and(eq(routes.id, id), eq(routes.tenantId, tenantId)))
          .returning();

        // Create initial tracking record
        await tx
          .insert(routeTracking)
          .values({
            routeId: id,
            type: 'start',
            latitude: route.startLatitude,
            longitude: route.startLongitude,
            timestamp: new Date(),
            userId,
            metadata: { action: 'route_started' }
          });

        // Emit real-time WebSocket event
        this.realtimeEventsService.emitToAll('tms.route.started', {
          type: 'route_started',
          data: updatedRoute[0],
          timestamp: new Date().toISOString()
        });

        this.logger.log(`Route started: ${id}`);
        return updatedRoute[0];
      });
    } catch (error) {
      this.logger.error('Error starting route:', error);
      throw new Error('Failed to start route');
    }
  }

  async completeRoute(id: string, userId: string, tenantId: string) {
    try {
      // Import database schema
      const { routes, routeTracking } = await import('../../../database/schema/shared/tms.schema');
      const { eq, and } = await import('drizzle-orm');

      // Get route to check status
      const route = await this.getRoute(id, tenantId);

      if (route.status !== 'active') {
        throw new BadRequestException('Route must be active to complete');
      }

      // Start transaction
      return await this.db.transaction(async (tx) => {
        const completedAt = new Date();
        const duration = route.startedAt ? 
          Math.round((completedAt.getTime() - route.startedAt.getTime()) / (1000 * 60)) : 0; // minutes
        const efficiency = this.calculateEfficiency({ ...route, duration });

        // Update route status
        const updatedRoute = await tx
          .update(routes)
          .set({
            status: 'completed',
            completedAt,
            completedBy: userId,
            duration,
            efficiency,
            updatedAt: new Date()
          })
          .where(and(eq(routes.id, id), eq(routes.tenantId, tenantId)))
          .returning();

        // Create completion tracking record
        await tx
          .insert(routeTracking)
          .values({
            routeId: id,
            type: 'complete',
            latitude: route.endLatitude,
            longitude: route.endLongitude,
            timestamp: completedAt,
            userId,
            metadata: { action: 'route_completed', duration, efficiency }
          });

        // Emit real-time WebSocket event
        this.realtimeEventsService.emitToAll('tms.route.completed', {
          type: 'route_completed',
          data: updatedRoute[0],
          timestamp: new Date().toISOString()
        });

        this.logger.log(`Route completed: ${id}`);
        return updatedRoute[0];
      });
    } catch (error) {
      this.logger.error('Error completing route:', error);
      throw new Error('Failed to complete route');
    }
  }

  async getRouteTracking(id: string, tenantId: string) {
    try {
      await this.getRoute(id, tenantId); // Verify route exists

      // Import database schema
      const { routeTracking } = await import('../../../database/schema/shared/tms.schema');
      const { eq, asc } = await import('drizzle-orm');

      return await this.db
        .select()
        .from(routeTracking)
        .where(eq(routeTracking.routeId, id))
        .orderBy(asc(routeTracking.timestamp));
    } catch (error) {
      this.logger.error('Error fetching route tracking:', error);
      throw new Error('Failed to fetch route tracking data');
    }
  }

  async getRouteStops(id: string, tenantId: string) {
    try {
      await this.getRoute(id, tenantId); // Verify route exists

      // Import database schema
      const { routeStops } = await import('../../../database/schema/shared/tms.schema');
      const { eq, asc } = await import('drizzle-orm');

      return await this.db
        .select()
        .from(routeStops)
        .where(eq(routeStops.routeId, id))
        .orderBy(asc(routeStops.sequence));
    } catch (error) {
      this.logger.error('Error fetching route stops:', error);
      throw new Error('Failed to fetch route stops data');
    }
  }

  async arriveAtStop(id: string, stopId: string, userId: string, tenantId: string) {
    try {
      await this.getRoute(id, tenantId); // Verify route exists

      // Import database schema
      const { routeStops, routeTracking } = await import('../../../database/schema/shared/tms.schema');
      const { eq, and } = await import('drizzle-orm');

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // Get stop
        const stop = await tx
          .select()
          .from(routeStops)
          .where(and(eq(routeStops.id, stopId), eq(routeStops.routeId, id)))
          .limit(1);

        if (stop.length === 0) {
          throw new NotFoundException('Route stop not found');
        }

        // Update stop status
        const updatedStop = await tx
          .update(routeStops)
          .set({
            status: 'arrived',
            arrivedAt: new Date(),
            arrivedBy: userId,
            updatedAt: new Date()
          })
          .where(eq(routeStops.id, stopId))
          .returning();

        // Create tracking record
        await tx
          .insert(routeTracking)
          .values({
            routeId: id,
            type: 'arrive',
            latitude: stop[0].latitude,
            longitude: stop[0].longitude,
            timestamp: new Date(),
            userId,
            metadata: { stopId, stopName: stop[0].name, action: 'arrived_at_stop' }
          });

        this.logger.log(`Arrived at stop: ${stopId} for route: ${id}`);
        return updatedStop[0];
      });
    } catch (error) {
      this.logger.error('Error arriving at stop:', error);
      throw new Error('Failed to arrive at stop');
    }
  }

  async completeStop(id: string, stopId: string, userId: string, tenantId: string) {
    try {
      await this.getRoute(id, tenantId); // Verify route exists

      // Import database schema
      const { routeStops, routeTracking } = await import('../../../database/schema/shared/tms.schema');
      const { eq, and } = await import('drizzle-orm');

      // Start transaction
      return await this.db.transaction(async (tx) => {
        // Get stop
        const stop = await tx
          .select()
          .from(routeStops)
          .where(and(eq(routeStops.id, stopId), eq(routeStops.routeId, id)))
          .limit(1);

        if (stop.length === 0) {
          throw new NotFoundException('Route stop not found');
        }

        if (stop[0].status !== 'arrived') {
          throw new BadRequestException('Stop must be arrived before completion');
        }

        // Update stop status
        const updatedStop = await tx
          .update(routeStops)
          .set({
            status: 'completed',
            completedAt: new Date(),
            completedBy: userId,
            updatedAt: new Date()
          })
          .where(eq(routeStops.id, stopId))
          .returning();

        // Create tracking record
        await tx
          .insert(routeTracking)
          .values({
            routeId: id,
            type: 'complete',
            latitude: stop[0].latitude,
            longitude: stop[0].longitude,
            timestamp: new Date(),
            userId,
            metadata: { stopId, stopName: stop[0].name, action: 'completed_stop' }
          });

        this.logger.log(`Completed stop: ${stopId} for route: ${id}`);
        return updatedStop[0];
      });
    } catch (error) {
      this.logger.error('Error completing stop:', error);
      throw new Error('Failed to complete stop');
    }
  }

  private optimizeRouteStops(stops: any[], optimizationType: string, constraints: any) {
    // Simplified optimization algorithm
    // In real implementation, this would use advanced algorithms like genetic algorithm, simulated annealing, etc.
    return stops.sort((a, b) => a.sequence - b.sequence);
  }

  private calculateDistance(stops: any[]) {
    // Simplified distance calculation
    // In real implementation, this would use actual distance calculation APIs
    return stops.length * 10; // km
  }

  private calculateDuration(stops: any[]) {
    // Simplified duration calculation
    return stops.length * 30; // minutes
  }

  private calculateSavings(originalRoute: any, optimizedStops: any[]) {
    const originalDistance = originalRoute.distance;
    const optimizedDistance = this.calculateDistance(optimizedStops);
    return originalDistance - optimizedDistance;
  }

  private calculateEfficiency(route: any) {
    // Calculate efficiency based on planned vs actual metrics
    const plannedDuration = route.plannedDuration || route.duration;
    const actualDuration = route.duration;
    return Math.round((plannedDuration / actualDuration) * 100);
  }

}
