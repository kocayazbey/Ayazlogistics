import { Injectable, Inject, CacheKey, CacheTTL, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc, asc } from 'drizzle-orm';
import { routes, routeStops, vehicles, drivers, Route } from '../../../../database/schema/logistics/tms.schema';
import * as schema from '../../../../database/schema';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

interface RouteOptimizationCache {
  routeId: string;
  tenantId: string;
  stops: any[];
  vehicleId?: string;
  driverId?: string;
  optimizationResult: any;
  timestamp: number;
  hash: string; // Hash of input parameters for cache validation
}

interface FuelCalculationParams {
  distance: number;
  vehicleType: string;
  vehicleWeight: number;
  cargoWeight: number;
  trafficMultiplier: number;
  weatherMultiplier: number;
  driverExperience: 'beginner' | 'experienced' | 'expert';
  routeType: 'urban' | 'highway' | 'mixed';
}

@Injectable()
export class RouteOptimizationService {
  private readonly logger = new Logger(RouteOptimizationService.name);
  private redis: Redis;
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly FUEL_CALCULATION_CACHE_TTL = 1800; // 30 minutes

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
    private configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
    });

    this.logger.log('Route Optimization Service initialized with Redis cache');
  }

  @CacheKey('route-optimization-find-all')
  @CacheTTL(300) // 5 minutes cache
  async findAll(tenantId: string, filters?: any): Promise<Route[]> {
    let query = this.db
      .select()
      .from(routes)
      .where(eq(routes.tenantId, tenantId));

    if (filters?.status) {
      query = query.where(and(eq(routes.tenantId, tenantId), eq(routes.status, filters.status)));
    }

    if (filters?.vehicleId) {
      query = query.where(and(eq(routes.tenantId, tenantId), eq(routes.vehicleId, filters.vehicleId)));
    }

    return query.orderBy(desc(routes.createdAt));
  }

  async findOne(id: string, tenantId: string): Promise<Route> {
    const result = await this.db
      .select({
        route: routes,
        vehicle: vehicles,
        driver: drivers,
      })
      .from(routes)
      .leftJoin(vehicles, eq(routes.vehicleId, vehicles.id))
      .leftJoin(drivers, eq(routes.driverId, drivers.id))
      .where(and(eq(routes.id, id), eq(routes.tenantId, tenantId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    // Get route stops separately
    const stops = await this.db
      .select()
      .from(routeStops)
      .where(eq(routeStops.routeId, id))
      .orderBy(asc(routeStops.stopSequence));

    return {
      ...result[0].route,
      vehicle: result[0].vehicle,
      driver: result[0].driver,
      stops,
    };
  }

  async create(routeData: Partial<Route>, tenantId: string): Promise<Route> {
    const routeNumber = this.generateRouteNumber();
    
    const [newRoute] = await this.db
      .insert(routes)
      .values({
        ...routeData,
        tenantId,
        routeNumber,
        status: 'planned',
      })
      .returning();

    return newRoute;
  }

  async update(id: string, routeData: Partial<Route>, tenantId: string): Promise<Route> {
    await this.db
      .update(routes)
      .set({
        ...routeData,
        updatedAt: new Date(),
      })
      .where(and(eq(routes.id, id), eq(routes.tenantId, tenantId)));
    
    return this.findOne(id, tenantId);
  }

  async optimizeRoute(routeId: string, tenantId: string): Promise<any> {
    const route = await this.findOne(routeId, tenantId);
    if (!route) {
      throw new Error('Route not found');
    }

    // Generate cache key based on route parameters
    const cacheKey = `route-optimization:${routeId}:${tenantId}`;
    const inputHash = this.generateInputHash(route);

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const cachedData: RouteOptimizationCache = JSON.parse(cached);
        if (cachedData.hash === inputHash) {
          this.logger.debug(`Cache hit for route optimization: ${routeId}`);
          return cachedData.optimizationResult;
        } else {
          this.logger.debug(`Cache invalid for route optimization: ${routeId}`);
        }
      }
    } catch (error) {
      this.logger.warn('Error checking cache for route optimization:', error);
    }

    // Perform route optimization
    const optimizedRoute = await this.performRouteOptimization(route);

    // Cache the result
    try {
      const cacheData: RouteOptimizationCache = {
        routeId,
        tenantId,
        stops: route.stops || [],
        vehicleId: route.vehicleId,
        driverId: route.driverId,
        optimizationResult: optimizedRoute,
        timestamp: Date.now(),
        hash: inputHash,
      };

      await this.redis.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(cacheData)
      );

      this.logger.debug(`Route optimization cached: ${routeId}`);
    } catch (error) {
      this.logger.warn('Error caching route optimization:', error);
    }

    return optimizedRoute;
  }

  private async performRouteOptimization(route: any): Promise<any> {
    // Get traffic and weather data
    const trafficData = await this.getTrafficData(route.stops);
    const weatherData = await this.getWeatherData(route.stops);

    // Implement advanced route optimization algorithm
    const optimizedStops = this.optimizeStopsSequence(route.stops, trafficData, weatherData);
    const optimizedDistance = this.calculateOptimizedDistance(optimizedStops, trafficData);
    const optimizedTime = this.calculateOptimizedTime(optimizedStops, trafficData, weatherData);

    const fuelCalculation = await this.calculateFuelConsumption({
      distance: optimizedDistance,
      vehicleType: route.vehicle?.type || 'truck',
      vehicleWeight: route.vehicle?.weight || 5000,
      cargoWeight: route.totalWeight || 0,
      trafficMultiplier: trafficData.averageMultiplier,
      weatherMultiplier: weatherData.averageMultiplier,
      driverExperience: route.driver?.experience || 'experienced',
      routeType: this.determineRouteType(route.stops),
    });

    return {
      originalDistance: route.totalDistance || 0,
      optimizedDistance,
      originalTime: route.estimatedTime || 0,
      optimizedTime,
      savings: {
        distance: (route.totalDistance || 0) - optimizedDistance,
        time: (route.estimatedTime || 0) - optimizedTime,
        fuel: fuelCalculation.savings,
      },
      optimizedStops,
      trafficConditions: trafficData,
      weatherConditions: weatherData,
      fuelCalculation,
      optimizationScore: this.calculateOptimizationScore(route, optimizedStops, fuelCalculation),
    };
  }

  private generateInputHash(route: any): string {
    const input = {
      stopsCount: route.stops?.length || 0,
      vehicleId: route.vehicleId,
      driverId: route.driverId,
      totalWeight: route.totalWeight,
      priority: route.priority,
      timeWindows: route.stops?.map(s => s.timeWindow).join(','),
      lastModified: route.updatedAt,
    };

    return this.simpleHash(JSON.stringify(input));
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private optimizeStopsSequence(stops: any[], trafficData: any, weatherData: any): any[] {
    // Simple nearest neighbor algorithm with traffic consideration
    if (!stops || stops.length <= 1) return stops;

    const optimized = [stops[0]]; // Start with depot
    const remaining = stops.slice(1);

    while (remaining.length > 0) {
      let bestStop = null;
      let bestScore = -1;

      for (const stop of remaining) {
        const score = this.calculateStopScore(stop, optimized[optimized.length - 1], trafficData, weatherData);
        if (score > bestScore) {
          bestScore = score;
          bestStop = stop;
        }
      }

      if (bestStop) {
        optimized.push(bestStop);
        remaining.splice(remaining.indexOf(bestStop), 1);
      }
    }

    return optimized;
  }

  private calculateStopScore(stop: any, previousStop: any, trafficData: any, weatherData: any): number {
    const distance = this.calculateDistance(previousStop, stop);
    const trafficMultiplier = trafficData.multipliers[stop.area] || 1;
    const weatherMultiplier = weatherData.multipliers[stop.area] || 1;

    // Score based on distance, traffic, and weather (lower is better, so invert for score)
    return 1 / (distance * trafficMultiplier * weatherMultiplier);
  }

  private calculateDistance(stop1: any, stop2: any): number {
    const R = 6371; // Earth's radius in km
    const dLat = (stop2.latitude - stop1.latitude) * Math.PI / 180;
    const dLon = (stop2.longitude - stop1.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(stop1.latitude * Math.PI / 180) * Math.cos(stop2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateOptimizedDistance(stops: any[], trafficData: any): number {
    let totalDistance = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      totalDistance += this.calculateDistance(stops[i], stops[i + 1]);
    }
    return totalDistance * (trafficData.averageMultiplier || 1);
  }

  private calculateOptimizedTime(stops: any[], trafficData: any, weatherData: any): number {
    let totalTime = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const distance = this.calculateDistance(stops[i], stops[i + 1]);
      const avgSpeed = 50; // km/h base speed
      const trafficMultiplier = trafficData.multipliers[stops[i + 1].area] || 1;
      const weatherMultiplier = weatherData.multipliers[stops[i + 1].area] || 1;

      totalTime += (distance / avgSpeed) * trafficMultiplier * weatherMultiplier;
    }
    return totalTime * 60; // Convert to minutes
  }

  private async getTrafficData(stops: any[]): Promise<any> {
    // In a real implementation, integrate with traffic APIs like Google Maps, HERE, or TomTom
    // For now, return mock data
    const multipliers = {};
    let totalMultiplier = 0;
    let count = 0;

    for (const stop of stops) {
      const area = `${stop.latitude.toFixed(2)},${stop.longitude.toFixed(2)}`;
      multipliers[area] = 1 + (Math.random() * 0.5); // 1.0 to 1.5 multiplier
      totalMultiplier += multipliers[area];
      count++;
    }

    return {
      multipliers,
      averageMultiplier: count > 0 ? totalMultiplier / count : 1,
      lastUpdated: new Date().toISOString(),
    };
  }

  private async getWeatherData(stops: any[]): Promise<any> {
    // In a real implementation, integrate with weather APIs like OpenWeatherMap
    // For now, return mock data
    const multipliers = {};
    let totalMultiplier = 0;
    let count = 0;

    for (const stop of stops) {
      const area = `${stop.latitude.toFixed(2)},${stop.longitude.toFixed(2)}`;
      multipliers[area] = 1 + (Math.random() * 0.3); // 1.0 to 1.3 multiplier
      totalMultiplier += multipliers[area];
      count++;
    }

    return {
      multipliers,
      averageMultiplier: count > 0 ? totalMultiplier / count : 1,
      conditions: stops.map(s => ({ area: s.area, condition: 'clear', temperature: 20 + Math.random() * 10 })),
      lastUpdated: new Date().toISOString(),
    };
  }

  private determineRouteType(stops: any[]): 'urban' | 'highway' | 'mixed' {
    if (stops.length < 3) return 'mixed';
    const distances = [];
    for (let i = 0; i < stops.length - 1; i++) {
      distances.push(this.calculateDistance(stops[i], stops[i + 1]));
    }
    const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
    return avgDistance > 20 ? 'highway' : avgDistance < 5 ? 'urban' : 'mixed';
  }

  async getRouteMetrics(tenantId: string): Promise<any> {
    const routes = await this.findAll(tenantId);
    
    const total = routes.length;
    const completed = routes.filter(r => r.status === 'completed').length;
    const inProgress = routes.filter(r => r.status === 'in_progress').length;
    const pending = routes.filter(r => r.status === 'pending').length;

    return {
      total,
      completed,
      inProgress,
      pending,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  async getFuelOptimization(routeId: string, tenantId: string): Promise<any> {
    const route = await this.findOne(routeId, tenantId);
    if (!route) {
      throw new Error('Route not found');
    }

    const cacheKey = `fuel-optimization:${routeId}:${tenantId}`;
    const inputHash = this.generateFuelInputHash(route);

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached);
        if (cachedData.hash === inputHash) {
          this.logger.debug(`Fuel optimization cache hit: ${routeId}`);
          return cachedData.result;
        }
      }
    } catch (error) {
      this.logger.warn('Error checking fuel optimization cache:', error);
    }

    // Perform fuel optimization
    const fuelCalculation = await this.calculateFuelConsumption({
      distance: route.totalDistance || 0,
      vehicleType: route.vehicle?.type || 'truck',
      vehicleWeight: route.vehicle?.weight || 5000,
      cargoWeight: route.totalWeight || 0,
      trafficMultiplier: 1.2, // Default traffic multiplier
      weatherMultiplier: 1.1, // Default weather multiplier
      driverExperience: route.driver?.experience || 'experienced',
      routeType: this.determineRouteType(route.stops || []),
    });

    // Get traffic and weather data for more accurate calculation
    const trafficData = await this.getTrafficData(route.stops || []);
    const weatherData = await this.getWeatherData(route.stops || []);

    const accurateFuelCalculation = await this.calculateFuelConsumption({
      distance: route.totalDistance || 0,
      vehicleType: route.vehicle?.type || 'truck',
      vehicleWeight: route.vehicle?.weight || 5000,
      cargoWeight: route.totalWeight || 0,
      trafficMultiplier: trafficData.averageMultiplier,
      weatherMultiplier: weatherData.averageMultiplier,
      driverExperience: route.driver?.experience || 'experienced',
      routeType: this.determineRouteType(route.stops || []),
    });

    const optimizationResult = {
      estimatedFuelConsumption: fuelCalculation.estimatedConsumption,
      optimizedFuelConsumption: accurateFuelCalculation.estimatedConsumption,
      fuelSavings: fuelCalculation.savings,
      recommendations: this.generateFuelOptimizationRecommendations(route, fuelCalculation, trafficData, weatherData),
      trafficImpact: {
        multiplier: trafficData.averageMultiplier,
        impact: (trafficData.averageMultiplier - 1) * 100,
      },
      weatherImpact: {
        conditions: weatherData.conditions,
        multiplier: weatherData.averageMultiplier,
        impact: (weatherData.averageMultiplier - 1) * 100,
      },
      routeOptimization: {
        ecoRoute: this.suggestEcoRoute(route.stops || [], trafficData, weatherData),
        speedOptimization: this.calculateSpeedOptimization(route.vehicle?.type || 'truck'),
        breakRecommendations: this.generateBreakRecommendations(route),
      },
    };

    // Cache the result
    try {
      await this.redis.setex(
        cacheKey,
        this.FUEL_CALCULATION_CACHE_TTL,
        JSON.stringify({
          hash: inputHash,
          result: optimizationResult,
          timestamp: Date.now(),
        })
      );
      this.logger.debug(`Fuel optimization cached: ${routeId}`);
    } catch (error) {
      this.logger.warn('Error caching fuel optimization:', error);
    }

    return optimizationResult;
  }

  private async calculateFuelConsumption(params: FuelCalculationParams): Promise<any> {
    const { distance, vehicleType, vehicleWeight, cargoWeight, trafficMultiplier, weatherMultiplier, driverExperience, routeType } = params;

    // Base fuel consumption rates (liters per 100km) based on vehicle type
    const baseConsumptionRates = {
      'motorcycle': 4,
      'car': 6,
      'van': 8,
      'truck': 12,
      'heavy_truck': 20,
      'trailer': 25,
    };

    let baseConsumption = baseConsumptionRates[vehicleType] || 12;

    // Weight factor (each ton increases consumption by 10%)
    const totalWeight = vehicleWeight + cargoWeight;
    const weightTons = totalWeight / 1000;
    const weightFactor = 1 + (weightTons * 0.1);

    // Traffic factor
    const trafficFactor = trafficMultiplier;

    // Weather factor
    const weatherFactor = weatherMultiplier;

    // Driver experience factor
    const experienceFactors = {
      'beginner': 1.2,
      'experienced': 1.0,
      'expert': 0.9,
    };
    const experienceFactor = experienceFactors[driverExperience] || 1.0;

    // Route type factor
    const routeTypeFactors = {
      'urban': 1.3,
      'highway': 0.8,
      'mixed': 1.0,
    };
    const routeTypeFactor = routeTypeFactors[routeType] || 1.0;

    // Calculate total consumption
    const totalConsumptionRate = baseConsumption * weightFactor * trafficFactor * weatherFactor * experienceFactor * routeTypeFactor;
    const totalConsumption = (distance / 100) * totalConsumptionRate;

    // Calculate potential savings with optimization
    const optimizedConsumptionRate = baseConsumption * 0.85 * experienceFactor * routeTypeFactor; // 15% improvement
    const optimizedConsumption = (distance / 100) * optimizedConsumptionRate;
    const savings = totalConsumption - optimizedConsumption;

    return {
      estimatedConsumption: totalConsumption,
      optimizedConsumption,
      savings,
      breakdown: {
        baseConsumption,
        weightFactor,
        trafficFactor,
        weatherFactor,
        experienceFactor,
        routeTypeFactor,
        totalConsumptionRate,
      },
      recommendations: this.generateFuelRecommendations(params, totalConsumptionRate),
    };
  }

  private generateFuelInputHash(route: any): string {
    const input = {
      distance: route.totalDistance,
      vehicleType: route.vehicle?.type,
      vehicleWeight: route.vehicle?.weight,
      cargoWeight: route.totalWeight,
      driverExperience: route.driver?.experience,
      stopsCount: route.stops?.length || 0,
      routeType: this.determineRouteType(route.stops || []),
      lastModified: route.updatedAt,
    };

    return this.simpleHash(JSON.stringify(input));
  }

  private generateFuelOptimizationRecommendations(route: any, fuelCalculation: any, trafficData: any, weatherData: any): string[] {
    const recommendations = [];

    if (fuelCalculation.breakdown.trafficFactor > 1.2) {
      recommendations.push('Consider avoiding peak traffic hours for fuel efficiency');
    }

    if (fuelCalculation.breakdown.weatherFactor > 1.1) {
      recommendations.push('Weather conditions may impact fuel consumption - plan accordingly');
    }

    if (fuelCalculation.breakdown.weightFactor > 1.2) {
      recommendations.push('High load weight significantly increases fuel consumption');
    }

    if (route.driver?.experience === 'beginner') {
      recommendations.push('Driver training could improve fuel efficiency by up to 20%');
    }

    if (trafficData.averageMultiplier > 1.3) {
      recommendations.push('High traffic areas detected - consider alternative routes');
    }

    recommendations.push('Maintain consistent speed between 50-70 km/h for optimal fuel efficiency');
    recommendations.push('Regular vehicle maintenance can improve fuel efficiency by 5-10%');

    return recommendations;
  }

  private suggestEcoRoute(stops: any[], trafficData: any, weatherData: any): any {
    if (!stops || stops.length < 2) return null;

    // Find route with least traffic impact
    const ecoRoute = {
      stops: [...stops],
      totalDistance: 0,
      estimatedFuel: 0,
      trafficScore: 0,
      recommendation: 'This route minimizes traffic congestion and fuel consumption',
    };

    for (let i = 0; i < stops.length - 1; i++) {
      const distance = this.calculateDistance(stops[i], stops[i + 1]);
      ecoRoute.totalDistance += distance;

      const area = `${stops[i + 1].latitude.toFixed(2)},${stops[i + 1].longitude.toFixed(2)}`;
      const trafficMultiplier = trafficData.multipliers[area] || 1;
      ecoRoute.trafficScore += trafficMultiplier;
    }

    return ecoRoute;
  }

  private calculateSpeedOptimization(vehicleType: string): any {
    const optimalSpeeds = {
      'car': { speed: 60, fuelSaving: '5%' },
      'van': { speed: 55, fuelSaving: '8%' },
      'truck': { speed: 50, fuelSaving: '10%' },
      'heavy_truck': { speed: 45, fuelSaving: '12%' },
    };

    return optimalSpeeds[vehicleType] || { speed: 50, fuelSaving: '10%' };
  }

  private generateBreakRecommendations(route: any): any[] {
    const stops = route.stops || [];
    if (stops.length < 2) return [];

    const recommendations = [];
    const totalDistance = route.totalDistance || 0;
    const totalTime = route.estimatedTime || 0;

    // Recommend breaks every 2-3 hours or 200-300 km
    if (totalTime > 180) { // More than 3 hours
      const breakCount = Math.floor(totalTime / 180);
      recommendations.push(`Plan ${breakCount} break(s) during this route`);
    }

    if (totalDistance > 300) { // More than 300 km
      const breakCount = Math.floor(totalDistance / 300);
      recommendations.push(`Schedule ${breakCount} rest stop(s) for driver safety and fuel efficiency`);
    }

    recommendations.push('Take 15-minute breaks every 2 hours to maintain driver alertness');

    return recommendations;
  }

  private generateFuelRecommendations(params: FuelCalculationParams, consumptionRate: number): string[] {
    const recommendations = [];

    if (params.cargoWeight > params.vehicleWeight) {
      recommendations.push('Cargo weight exceeds vehicle weight - consider load distribution');
    }

    if (params.trafficMultiplier > 1.3) {
      recommendations.push('Heavy traffic expected - plan for increased fuel consumption');
    }

    if (params.weatherMultiplier > 1.2) {
      recommendations.push('Adverse weather conditions - allow extra fuel buffer');
    }

    if (params.driverExperience === 'beginner') {
      recommendations.push('Beginner driver - expect 20% higher fuel consumption');
    }

    if (params.routeType === 'urban') {
      recommendations.push('Urban route - stop-start driving increases consumption');
    }

    if (consumptionRate > 20) {
      recommendations.push('High fuel consumption detected - consider route optimization');
    }

    recommendations.push('Regular tire pressure checks can save up to 3% fuel');
    recommendations.push('Use cruise control on highways for better fuel efficiency');

    return recommendations;
  }

  private calculateOptimizationScore(route: any, optimizedStops: any[], fuelCalculation: any): number {
    const distanceImprovement = route.totalDistance ? ((route.totalDistance - this.calculateOptimizedDistance(optimizedStops, { averageMultiplier: 1 })) / route.totalDistance) * 100 : 0;
    const timeImprovement = route.estimatedTime ? ((route.estimatedTime - this.calculateOptimizedTime(optimizedStops, { multipliers: {} }, { multipliers: {} })) / route.estimatedTime) * 100 : 0;
    const fuelImprovement = fuelCalculation.savings > 0 ? (fuelCalculation.savings / fuelCalculation.estimatedConsumption) * 100 : 0;

    // Weighted score (40% distance, 40% time, 20% fuel)
    return (distanceImprovement * 0.4) + (timeImprovement * 0.4) + (fuelImprovement * 0.2);
  }

  private generateRouteNumber(): string {
    const timestamp = Date.now();
    return `RT-${timestamp}`;
  }
}