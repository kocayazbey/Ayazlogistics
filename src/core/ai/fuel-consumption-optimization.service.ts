import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Vehicle {
  id: string;
  type: 'truck' | 'van' | 'motorcycle' | 'car';
  specifications: {
    engineSize: number; // liters
    fuelType: 'gasoline' | 'diesel' | 'hybrid' | 'electric';
    weight: number; // kg
    maxLoad: number; // kg
    aerodynamics: number; // drag coefficient
    tirePressure: number; // psi
    engineEfficiency: number; // 0-1
  };
  currentState: {
    load: number; // kg
    speed: number; // km/h
    rpm: number;
    gear: number;
    fuelLevel: number; // percentage
    engineTemp: number; // celsius
    tireWear: number; // 0-1
  };
  maintenance: {
    lastService: Date;
    oilChange: Date;
    filterChange: Date;
    tireRotation: Date;
    engineTune: Date;
  };
}

interface Route {
  id: string;
  waypoints: RouteWaypoint[];
  totalDistance: number;
  elevationProfile: ElevationPoint[];
  roadConditions: RoadCondition[];
  trafficConditions: TrafficCondition[];
  weatherConditions: WeatherCondition[];
}

interface RouteWaypoint {
  lat: number;
  lon: number;
  elevation: number;
  speedLimit: number;
  roadType: 'highway' | 'urban' | 'rural' | 'mountain';
  trafficDensity: 'low' | 'medium' | 'high' | 'severe';
  stopSigns: number;
  trafficLights: number;
  roundabouts: number;
}

interface ElevationPoint {
  distance: number; // km from start
  elevation: number; // meters
  gradient: number; // percentage
}

interface RoadCondition {
  distance: number;
  surface: 'asphalt' | 'concrete' | 'gravel' | 'dirt';
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  roughness: number; // 0-1
}

interface TrafficCondition {
  distance: number;
  density: 'low' | 'medium' | 'high' | 'severe';
  averageSpeed: number; // km/h
  stops: number;
  idling: number; // minutes
}

interface WeatherCondition {
  distance: number;
  temperature: number; // celsius
  humidity: number; // percentage
  windSpeed: number; // km/h
  windDirection: number; // degrees
  precipitation: 'none' | 'light' | 'moderate' | 'heavy';
  visibility: number; // km
}

interface FuelOptimizationResult {
  routeId: string;
  vehicleId: string;
  originalFuelConsumption: number; // liters
  optimizedFuelConsumption: number; // liters
  fuelSavings: number; // liters
  fuelSavingsPercentage: number;
  costSavings: number; // currency
  recommendations: FuelOptimizationRecommendation[];
  drivingPattern: OptimizedDrivingPattern;
  maintenanceRecommendations: MaintenanceRecommendation[];
}

interface FuelOptimizationRecommendation {
  type: 'speed' | 'acceleration' | 'braking' | 'gear' | 'route' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  potentialSavings: number; // liters
  implementation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface OptimizedDrivingPattern {
  segments: DrivingSegment[];
  totalFuelConsumption: number;
  averageSpeed: number;
  totalTime: number;
  efficiency: number; // 0-1
}

interface DrivingSegment {
  startDistance: number;
  endDistance: number;
  recommendedSpeed: number; // km/h
  recommendedGear: number;
  acceleration: number; // m/s²
  deceleration: number; // m/s²
  fuelConsumption: number; // liters
  reasoning: string;
}

interface MaintenanceRecommendation {
  type: 'oil_change' | 'filter_change' | 'tire_rotation' | 'engine_tune' | 'tire_pressure' | 'aerodynamics';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  potentialFuelSavings: number; // liters per 100km
  cost: number; // currency
  roi: number; // return on investment
}

@Injectable()
export class FuelConsumptionOptimizationService {
  private readonly logger = new Logger(FuelConsumptionOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimizeFuelConsumption(
    vehicle: Vehicle,
    route: Route,
    constraints: {
      maxTimeIncrease: number; // percentage
      minSpeed: number; // km/h
      maxSpeed: number; // km/h
      driverExperience: 'beginner' | 'intermediate' | 'expert';
      safetyMargin: number; // percentage
    },
  ): Promise<FuelOptimizationResult> {
    this.logger.log(`Optimizing fuel consumption for vehicle ${vehicle.id} on route ${route.id}`);

    // Calculate baseline fuel consumption
    const baselineConsumption = await this.calculateBaselineFuelConsumption(vehicle, route);
    
    // Generate optimization strategies
    const strategies = await this.generateOptimizationStrategies(vehicle, route, constraints);
    
    // Apply optimization strategies
    const optimizedPattern = await this.applyOptimizationStrategies(vehicle, route, strategies);
    
    // Calculate savings
    const optimizedConsumption = await this.calculateOptimizedFuelConsumption(vehicle, route, optimizedPattern);
    
    // Generate recommendations
    const recommendations = await this.generateFuelOptimizationRecommendations(
      vehicle,
      route,
      baselineConsumption,
      optimizedConsumption,
    );
    
    // Generate maintenance recommendations
    const maintenanceRecommendations = await this.generateMaintenanceRecommendations(vehicle, route);
    
    const result: FuelOptimizationResult = {
      routeId: route.id,
      vehicleId: vehicle.id,
      originalFuelConsumption: baselineConsumption,
      optimizedFuelConsumption: optimizedConsumption,
      fuelSavings: baselineConsumption - optimizedConsumption,
      fuelSavingsPercentage: ((baselineConsumption - optimizedConsumption) / baselineConsumption) * 100,
      costSavings: (baselineConsumption - optimizedConsumption) * 5.5, // Assuming 5.5 TL per liter
      recommendations,
      drivingPattern: optimizedPattern,
      maintenanceRecommendations,
    };

    await this.saveOptimizationResult(result);
    await this.eventBus.emit('fuel.optimized', { result });

    return result;
  }

  private async calculateBaselineFuelConsumption(vehicle: Vehicle, route: Route): Promise<number> {
    let totalConsumption = 0;
    
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const current = route.waypoints[i];
      const next = route.waypoints[i + 1];
      
      const distance = this.calculateDistance(current, next);
      const elevationChange = next.elevation - current.elevation;
      const gradient = (elevationChange / distance) * 100;
      
      // Base fuel consumption calculation
      const baseConsumption = this.calculateBaseFuelConsumption(vehicle, distance, current.speedLimit);
      
      // Apply modifiers
      const loadFactor = this.calculateLoadFactor(vehicle, current.speedLimit);
      const gradientFactor = this.calculateGradientFactor(gradient);
      const trafficFactor = this.calculateTrafficFactor(current.trafficDensity);
      const roadFactor = this.calculateRoadFactor(current.roadType);
      const weatherFactor = this.calculateWeatherFactor(route.weatherConditions[i]);
      
      const segmentConsumption = baseConsumption * loadFactor * gradientFactor * trafficFactor * roadFactor * weatherFactor;
      totalConsumption += segmentConsumption;
    }
    
    return totalConsumption;
  }

  private calculateBaseFuelConsumption(vehicle: Vehicle, distance: number, speed: number): number {
    // Engine efficiency curve
    const optimalSpeed = this.getOptimalSpeed(vehicle);
    const speedEfficiency = this.calculateSpeedEfficiency(speed, optimalSpeed);
    
    // Base consumption per 100km
    const baseConsumptionPer100km = this.getBaseConsumptionPer100km(vehicle);
    
    // Calculate consumption for this segment
    const consumption = (baseConsumptionPer100km / 100) * distance * speedEfficiency;
    
    return consumption;
  }

  private getOptimalSpeed(vehicle: Vehicle): number {
    // Optimal speed varies by vehicle type and load
    const baseOptimalSpeed = {
      'truck': 80,
      'van': 90,
      'car': 100,
      'motorcycle': 70,
    }[vehicle.type];
    
    const loadFactor = vehicle.currentState.load / vehicle.specifications.maxLoad;
    const speedAdjustment = loadFactor * 10; // Reduce optimal speed with higher load
    
    return Math.max(baseOptimalSpeed - speedAdjustment, 60);
  }

  private calculateSpeedEfficiency(speed: number, optimalSpeed: number): number {
    // Fuel efficiency decreases significantly above optimal speed
    if (speed <= optimalSpeed) {
      return 1.0;
    }
    
    const speedRatio = speed / optimalSpeed;
    if (speedRatio <= 1.1) {
      return 1.0 - (speedRatio - 1.0) * 0.1;
    } else if (speedRatio <= 1.2) {
      return 0.9 - (speedRatio - 1.1) * 0.3;
    } else {
      return 0.87 - (speedRatio - 1.2) * 0.5;
    }
  }

  private getBaseConsumptionPer100km(vehicle: Vehicle): number {
    const baseConsumption = {
      'truck': 35,
      'van': 12,
      'car': 8,
      'motorcycle': 4,
    }[vehicle.type];
    
    // Adjust for engine efficiency
    const efficiencyFactor = vehicle.specifications.engineEfficiency;
    return baseConsumption / efficiencyFactor;
  }

  private calculateLoadFactor(vehicle: Vehicle, speed: number): number {
    const loadRatio = vehicle.currentState.load / vehicle.specifications.maxLoad;
    
    // Load factor increases fuel consumption
    const baseLoadFactor = 1 + (loadRatio * 0.3);
    
    // Speed-load interaction
    const speedLoadFactor = 1 + (loadRatio * speed * 0.001);
    
    return baseLoadFactor * speedLoadFactor;
  }

  private calculateGradientFactor(gradient: number): number {
    if (gradient > 0) {
      // Uphill - significantly increases consumption
      return 1 + (gradient * 0.05);
    } else if (gradient < -2) {
      // Downhill - can reduce consumption with engine braking
      return 1 + (gradient * 0.02);
    } else {
      // Flat or slight downhill
      return 1.0;
    }
  }

  private calculateTrafficFactor(density: string): number {
    const factors = {
      'low': 1.0,
      'medium': 1.1,
      'high': 1.3,
      'severe': 1.6,
    };
    return factors[density];
  }

  private calculateRoadFactor(roadType: string): number {
    const factors = {
      'highway': 0.9, // Most efficient
      'urban': 1.2, // Stop and go
      'rural': 1.0, // Normal
      'mountain': 1.4, // Challenging terrain
    };
    return factors[roadType];
  }

  private calculateWeatherFactor(weather: WeatherCondition): number {
    let factor = 1.0;
    
    // Temperature effect
    if (weather.temperature < 0) {
      factor += 0.1; // Cold weather increases consumption
    } else if (weather.temperature > 30) {
      factor += 0.05; // Hot weather slightly increases consumption
    }
    
    // Wind effect
    if (weather.windSpeed > 20) {
      factor += 0.1; // Strong wind increases consumption
    }
    
    // Precipitation effect
    const precipitationFactors = {
      'none': 1.0,
      'light': 1.05,
      'moderate': 1.1,
      'heavy': 1.2,
    };
    factor *= precipitationFactors[weather.precipitation];
    
    return factor;
  }

  private async generateOptimizationStrategies(
    vehicle: Vehicle,
    route: Route,
    constraints: any,
  ): Promise<any[]> {
    const strategies = [];
    
    // Speed optimization
    strategies.push({
      type: 'speed_optimization',
      description: 'Optimize speed for fuel efficiency',
      potentialSavings: 0.15,
      implementation: this.optimizeSpeedProfile(vehicle, route, constraints),
    });
    
    // Acceleration/Deceleration optimization
    strategies.push({
      type: 'acceleration_optimization',
      description: 'Smooth acceleration and deceleration',
      potentialSavings: 0.10,
      implementation: this.optimizeAccelerationProfile(vehicle, route, constraints),
    });
    
    // Gear optimization
    strategies.push({
      type: 'gear_optimization',
      description: 'Optimal gear selection',
      potentialSavings: 0.08,
      implementation: this.optimizeGearProfile(vehicle, route, constraints),
    });
    
    // Route optimization
    strategies.push({
      type: 'route_optimization',
      description: 'Alternative route with better fuel efficiency',
      potentialSavings: 0.12,
      implementation: this.optimizeRouteProfile(vehicle, route, constraints),
    });
    
    return strategies;
  }

  private optimizeSpeedProfile(vehicle: Vehicle, route: Route, constraints: any): DrivingSegment[] {
    const segments: DrivingSegment[] = [];
    
    for (let i = 0; i < route.waypoints.length - 1; i++) {
      const current = route.waypoints[i];
      const next = route.waypoints[i + 1];
      const distance = this.calculateDistance(current, next);
      
      // Calculate optimal speed for this segment
      const optimalSpeed = this.calculateOptimalSpeedForSegment(vehicle, current, next, constraints);
      
      segments.push({
        startDistance: i === 0 ? 0 : segments[i - 1].endDistance,
        endDistance: (i === 0 ? 0 : segments[i - 1].endDistance) + distance,
        recommendedSpeed: optimalSpeed,
        recommendedGear: this.calculateOptimalGear(vehicle, optimalSpeed),
        acceleration: this.calculateOptimalAcceleration(vehicle, optimalSpeed),
        deceleration: this.calculateOptimalDeceleration(vehicle, optimalSpeed),
        fuelConsumption: this.calculateSegmentFuelConsumption(vehicle, current, next, optimalSpeed),
        reasoning: this.generateSpeedReasoning(vehicle, current, next, optimalSpeed),
      });
    }
    
    return segments;
  }

  private calculateOptimalSpeedForSegment(
    vehicle: Vehicle,
    current: RouteWaypoint,
    next: RouteWaypoint,
    constraints: any,
  ): number {
    const baseOptimalSpeed = this.getOptimalSpeed(vehicle);
    const speedLimit = Math.min(current.speedLimit, next.speedLimit);
    
    // Adjust for traffic conditions
    let optimalSpeed = baseOptimalSpeed;
    
    if (current.trafficDensity === 'severe') {
      optimalSpeed = Math.min(optimalSpeed, 30);
    } else if (current.trafficDensity === 'high') {
      optimalSpeed = Math.min(optimalSpeed, 50);
    } else if (current.trafficDensity === 'medium') {
      optimalSpeed = Math.min(optimalSpeed, 70);
    }
    
    // Adjust for road type
    if (current.roadType === 'urban') {
      optimalSpeed = Math.min(optimalSpeed, 50);
    } else if (current.roadType === 'mountain') {
      optimalSpeed = Math.min(optimalSpeed, 60);
    }
    
    // Ensure within constraints
    optimalSpeed = Math.max(optimalSpeed, constraints.minSpeed);
    optimalSpeed = Math.min(optimalSpeed, constraints.maxSpeed);
    optimalSpeed = Math.min(optimalSpeed, speedLimit);
    
    return optimalSpeed;
  }

  private calculateOptimalGear(vehicle: Vehicle, speed: number): number {
    // Simplified gear calculation based on speed and vehicle type
    if (vehicle.type === 'truck') {
      if (speed < 20) return 1;
      if (speed < 40) return 2;
      if (speed < 60) return 3;
      if (speed < 80) return 4;
      return 5;
    } else if (vehicle.type === 'van') {
      if (speed < 15) return 1;
      if (speed < 30) return 2;
      if (speed < 50) return 3;
      if (speed < 70) return 4;
      return 5;
    } else {
      if (speed < 10) return 1;
      if (speed < 25) return 2;
      if (speed < 40) return 3;
      if (speed < 60) return 4;
      return 5;
    }
  }

  private calculateOptimalAcceleration(vehicle: Vehicle, targetSpeed: number): number {
    // Optimal acceleration for fuel efficiency
    const maxAcceleration = 2.0; // m/s²
    const optimalAcceleration = Math.min(maxAcceleration, targetSpeed * 0.02);
    return optimalAcceleration;
  }

  private calculateOptimalDeceleration(vehicle: Vehicle, currentSpeed: number): number {
    // Optimal deceleration for fuel efficiency
    const maxDeceleration = 3.0; // m/s²
    const optimalDeceleration = Math.min(maxDeceleration, currentSpeed * 0.03);
    return optimalDeceleration;
  }

  private calculateSegmentFuelConsumption(
    vehicle: Vehicle,
    current: RouteWaypoint,
    next: RouteWaypoint,
    speed: number,
  ): number {
    const distance = this.calculateDistance(current, next);
    const baseConsumption = this.calculateBaseFuelConsumption(vehicle, distance, speed);
    
    // Apply all factors
    const loadFactor = this.calculateLoadFactor(vehicle, speed);
    const gradient = (next.elevation - current.elevation) / distance * 100;
    const gradientFactor = this.calculateGradientFactor(gradient);
    const trafficFactor = this.calculateTrafficFactor(current.trafficDensity);
    const roadFactor = this.calculateRoadFactor(current.roadType);
    
    return baseConsumption * loadFactor * gradientFactor * trafficFactor * roadFactor;
  }

  private generateSpeedReasoning(
    vehicle: Vehicle,
    current: RouteWaypoint,
    next: RouteWaypoint,
    speed: number,
  ): string {
    const reasons = [];
    
    if (current.trafficDensity === 'severe') {
      reasons.push('Reduced speed due to heavy traffic');
    }
    
    if (current.roadType === 'urban') {
      reasons.push('Urban driving requires lower speeds');
    }
    
    if (next.elevation > current.elevation) {
      reasons.push('Uphill segment - maintaining efficient speed');
    }
    
    if (speed < this.getOptimalSpeed(vehicle)) {
      reasons.push('Speed optimized for fuel efficiency');
    }
    
    return reasons.join('; ');
  }

  private optimizeAccelerationProfile(vehicle: Vehicle, route: Route, constraints: any): DrivingSegment[] {
    // Implementation for acceleration optimization
    return [];
  }

  private optimizeGearProfile(vehicle: Vehicle, route: Route, constraints: any): DrivingSegment[] {
    // Implementation for gear optimization
    return [];
  }

  private optimizeRouteProfile(vehicle: Vehicle, route: Route, constraints: any): DrivingSegment[] {
    // Implementation for route optimization
    return [];
  }

  private async applyOptimizationStrategies(
    vehicle: Vehicle,
    route: Route,
    strategies: any[],
  ): Promise<OptimizedDrivingPattern> {
    // Apply all optimization strategies
    const segments: DrivingSegment[] = [];
    let totalFuelConsumption = 0;
    let totalTime = 0;
    
    for (const strategy of strategies) {
      const strategySegments = strategy.implementation;
      segments.push(...strategySegments);
    }
    
    // Calculate totals
    for (const segment of segments) {
      totalFuelConsumption += segment.fuelConsumption;
      totalTime += (segment.endDistance - segment.startDistance) / segment.recommendedSpeed * 60;
    }
    
    const averageSpeed = segments.reduce((sum, seg) => sum + seg.recommendedSpeed, 0) / segments.length;
    const efficiency = this.calculateOverallEfficiency(vehicle, segments);
    
    return {
      segments,
      totalFuelConsumption,
      averageSpeed,
      totalTime,
      efficiency,
    };
  }

  private calculateOverallEfficiency(vehicle: Vehicle, segments: DrivingSegment[]): number {
    // Calculate overall driving efficiency
    let totalEfficiency = 0;
    
    for (const segment of segments) {
      const optimalSpeed = this.getOptimalSpeed(vehicle);
      const speedEfficiency = this.calculateSpeedEfficiency(segment.recommendedSpeed, optimalSpeed);
      totalEfficiency += speedEfficiency;
    }
    
    return totalEfficiency / segments.length;
  }

  private async calculateOptimizedFuelConsumption(
    vehicle: Vehicle,
    route: Route,
    pattern: OptimizedDrivingPattern,
  ): Promise<number> {
    return pattern.totalFuelConsumption;
  }

  private async generateFuelOptimizationRecommendations(
    vehicle: Vehicle,
    route: Route,
    baselineConsumption: number,
    optimizedConsumption: number,
  ): Promise<FuelOptimizationRecommendation[]> {
    const recommendations: FuelOptimizationRecommendation[] = [];
    
    // Speed recommendations
    recommendations.push({
      type: 'speed',
      priority: 'high',
      description: 'Maintain optimal speed of 80-90 km/h on highways',
      potentialSavings: (baselineConsumption - optimizedConsumption) * 0.4,
      implementation: 'Use cruise control and avoid speeding',
      difficulty: 'easy',
    });
    
    // Acceleration recommendations
    recommendations.push({
      type: 'acceleration',
      priority: 'medium',
      description: 'Smooth acceleration and deceleration',
      potentialSavings: (baselineConsumption - optimizedConsumption) * 0.3,
      implementation: 'Gradual acceleration, coast to decelerate',
      difficulty: 'medium',
    });
    
    // Gear recommendations
    recommendations.push({
      type: 'gear',
      priority: 'medium',
      description: 'Use appropriate gear for speed and load',
      potentialSavings: (baselineConsumption - optimizedConsumption) * 0.2,
      implementation: 'Shift gears at optimal RPM',
      difficulty: 'medium',
    });
    
    // Route recommendations
    recommendations.push({
      type: 'route',
      priority: 'low',
      description: 'Consider alternative routes with less traffic',
      potentialSavings: (baselineConsumption - optimizedConsumption) * 0.1,
      implementation: 'Use traffic-aware routing',
      difficulty: 'easy',
    });
    
    return recommendations;
  }

  private async generateMaintenanceRecommendations(
    vehicle: Vehicle,
    route: Route,
  ): Promise<MaintenanceRecommendation[]> {
    const recommendations: MaintenanceRecommendation[] = [];
    
    // Check maintenance intervals
    const daysSinceService = (Date.now() - vehicle.maintenance.lastService.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceService > 90) {
      recommendations.push({
        type: 'oil_change',
        priority: 'high',
        description: 'Oil change overdue',
        potentialFuelSavings: 0.5,
        cost: 200,
        roi: 2.5,
      });
    }
    
    if (vehicle.currentState.tireWear > 0.7) {
      recommendations.push({
        type: 'tire_rotation',
        priority: 'medium',
        description: 'Tire rotation needed',
        potentialFuelSavings: 0.3,
        cost: 100,
        roi: 1.5,
      });
    }
    
    if (vehicle.specifications.tirePressure < 30) {
      recommendations.push({
        type: 'tire_pressure',
        priority: 'high',
        description: 'Tire pressure too low',
        potentialFuelSavings: 0.8,
        cost: 0,
        roi: 999,
      });
    }
    
    return recommendations;
  }

  private calculateDistance(point1: RouteWaypoint, point2: RouteWaypoint): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lon - point1.lon);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async saveOptimizationResult(result: FuelOptimizationResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO fuel_optimization_results 
        (route_id, vehicle_id, original_consumption, optimized_consumption, 
         fuel_savings, fuel_savings_percentage, cost_savings, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        result.routeId,
        result.vehicleId,
        result.originalFuelConsumption,
        result.optimizedFuelConsumption,
        result.fuelSavings,
        result.fuelSavingsPercentage,
        result.costSavings,
      ]);
    } catch (error) {
      this.logger.error('Failed to save fuel optimization result:', error);
    }
  }
}

