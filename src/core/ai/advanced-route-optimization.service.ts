import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Vehicle {
  id: string;
  type: 'truck' | 'van' | 'motorcycle';
  capacity: {
    weight: number;
    volume: number;
    pallets: number;
  };
  fuelConsumption: number; // L/100km
  operatingCost: number; // Cost per km
  maxDistance: number; // Max daily distance
  driverId: string;
  currentLocation: {
    lat: number;
    lon: number;
  };
}

interface Customer {
  id: string;
  name: string;
  location: {
    lat: number;
    lon: number;
  };
  timeWindow: {
    start: Date;
    end: Date;
  };
  serviceTime: number; // minutes
  priority: number; // 1-5, 5 being highest
  demand: {
    weight: number;
    volume: number;
    pallets: number;
  };
  specialRequirements: string[];
}

interface Route {
  vehicleId: string;
  customers: Customer[];
  totalDistance: number;
  totalTime: number;
  totalCost: number;
  fuelConsumption: number;
  utilization: {
    weight: number;
    volume: number;
    pallets: number;
  };
  feasibility: boolean;
  violations: string[];
}

interface OptimizationResult {
  routes: Route[];
  totalCost: number;
  totalDistance: number;
  totalTime: number;
  totalFuelConsumption: number;
  averageUtilization: number;
  algorithm: string;
  executionTime: number;
  improvement: {
    costReduction: number;
    distanceReduction: number;
    timeReduction: number;
  };
}

@Injectable()
export class AdvancedRouteOptimizationService {
  private readonly logger = new Logger(AdvancedRouteOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimizeMultiObjectiveVRP(
    vehicles: Vehicle[],
    customers: Customer[],
    objectives: {
      minimizeCost: boolean;
      minimizeDistance: boolean;
      minimizeTime: boolean;
      maximizeUtilization: boolean;
      respectTimeWindows: boolean;
    },
    constraints: {
      maxRouteDuration: number; // hours
      maxCustomersPerRoute: number;
      fuelLimit: number; // liters
      driverWorkingHours: number; // hours
    },
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    this.logger.log(`Starting multi-objective VRP optimization for ${vehicles.length} vehicles and ${customers.length} customers`);

    // Phase 1: Initial Solution Generation
    const initialSolution = await this.generateInitialSolution(vehicles, customers, constraints);
    
    // Phase 2: Multi-objective Optimization
    const optimizedSolution = await this.multiObjectiveOptimization(
      initialSolution,
      objectives,
      constraints,
    );

    // Phase 3: Solution Refinement
    const refinedSolution = await this.refineSolution(optimizedSolution, objectives);

    const executionTime = Date.now() - startTime;

    const result: OptimizationResult = {
      routes: refinedSolution.routes,
      totalCost: refinedSolution.totalCost,
      totalDistance: refinedSolution.totalDistance,
      totalTime: refinedSolution.totalTime,
      totalFuelConsumption: refinedSolution.totalFuelConsumption,
      averageUtilization: refinedSolution.averageUtilization,
      algorithm: 'Multi-Objective VRP',
      executionTime,
      improvement: this.calculateImprovement(initialSolution, refinedSolution),
    };

    await this.saveOptimizationResult(result);
    await this.eventBus.emit('route.optimized', { result });

    return result;
  }

  private async generateInitialSolution(
    vehicles: Vehicle[],
    customers: Customer[],
    constraints: any,
  ): Promise<OptimizationResult> {
    const routes: Route[] = [];
    const unassignedCustomers = [...customers];

    // Sort customers by priority and time window
    unassignedCustomers.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timeWindow.start.getTime() - b.timeWindow.start.getTime();
    });

    // Assign customers to vehicles using nearest neighbor with constraints
    for (const vehicle of vehicles) {
      const route: Route = {
        vehicleId: vehicle.id,
        customers: [],
        totalDistance: 0,
        totalTime: 0,
        totalCost: 0,
        fuelConsumption: 0,
        utilization: { weight: 0, volume: 0, pallets: 0 },
        feasibility: true,
        violations: [],
      };

      let currentLocation = vehicle.currentLocation;
      let currentTime = new Date();
      let currentWeight = 0;
      let currentVolume = 0;
      let currentPallets = 0;

      for (let i = unassignedCustomers.length - 1; i >= 0; i--) {
        const customer = unassignedCustomers[i];
        
        // Check capacity constraints
        if (
          currentWeight + customer.demand.weight > vehicle.capacity.weight ||
          currentVolume + customer.demand.volume > vehicle.capacity.volume ||
          currentPallets + customer.demand.pallets > vehicle.capacity.pallets
        ) {
          continue;
        }

        // Check time window constraints
        const travelTime = this.calculateTravelTime(currentLocation, customer.location);
        const arrivalTime = new Date(currentTime.getTime() + travelTime * 60000);
        
        if (arrivalTime > customer.timeWindow.end) {
          continue;
        }

        // Check route duration constraint
        const serviceEndTime = new Date(arrivalTime.getTime() + customer.serviceTime * 60000);
        if (serviceEndTime.getTime() - currentTime.getTime() > constraints.maxRouteDuration * 3600000) {
          continue;
        }

        // Add customer to route
        route.customers.push(customer);
        unassignedCustomers.splice(i, 1);

        // Update route metrics
        const distance = this.calculateDistance(currentLocation, customer.location);
        route.totalDistance += distance;
        route.totalTime += travelTime + customer.serviceTime;
        route.totalCost += distance * vehicle.operatingCost;
        route.fuelConsumption += (distance / 100) * vehicle.fuelConsumption;
        
        currentWeight += customer.demand.weight;
        currentVolume += customer.demand.volume;
        currentPallets += customer.demand.pallets;
        
        currentLocation = customer.location;
        currentTime = serviceEndTime;
      }

      // Calculate utilization
      route.utilization = {
        weight: (currentWeight / vehicle.capacity.weight) * 100,
        volume: (currentVolume / vehicle.capacity.volume) * 100,
        pallets: (currentPallets / vehicle.capacity.pallets) * 100,
      };

      routes.push(route);
    }

    return this.calculateOptimizationResult(routes);
  }

  private async multiObjectiveOptimization(
    initialSolution: OptimizationResult,
    objectives: any,
    constraints: any,
  ): Promise<OptimizationResult> {
    let bestSolution = initialSolution;
    let iterations = 0;
    const maxIterations = 1000;

    while (iterations < maxIterations) {
      // Generate neighborhood solutions
      const neighborhood = await this.generateNeighborhood(bestSolution, constraints);
      
      // Evaluate each solution using multi-objective criteria
      for (const solution of neighborhood) {
        if (this.isSolutionBetter(solution, bestSolution, objectives)) {
          bestSolution = solution;
        }
      }

      iterations++;
    }

    return bestSolution;
  }

  private async generateNeighborhood(solution: OptimizationResult, constraints: any): Promise<OptimizationResult[]> {
    const neighborhood: OptimizationResult[] = [];

    // 2-opt moves within routes
    for (let i = 0; i < solution.routes.length; i++) {
      const route = solution.routes[i];
      if (route.customers.length < 2) continue;

      for (let j = 0; j < route.customers.length - 1; j++) {
        for (let k = j + 1; k < route.customers.length; k++) {
          const newRoute = this.twoOptSwap(route, j, k);
          if (this.isRouteFeasible(newRoute, constraints)) {
            const newSolution = this.createNewSolution(solution, i, newRoute);
            neighborhood.push(newSolution);
          }
        }
      }
    }

    // Customer moves between routes
    for (let i = 0; i < solution.routes.length; i++) {
      for (let j = 0; j < solution.routes.length; j++) {
        if (i === j) continue;

        const sourceRoute = solution.routes[i];
        const targetRoute = solution.routes[j];

        for (let k = 0; k < sourceRoute.customers.length; k++) {
          const customer = sourceRoute.customers[k];
          const newTargetRoute = this.insertCustomer(targetRoute, customer, 0);
          
          if (this.isRouteFeasible(newTargetRoute, constraints)) {
            const newSourceRoute = this.removeCustomer(sourceRoute, k);
            const newSolution = this.createNewSolution(solution, i, newSourceRoute);
            const finalSolution = this.createNewSolution(newSolution, j, newTargetRoute);
            neighborhood.push(finalSolution);
          }
        }
      }
    }

    return neighborhood;
  }

  private twoOptSwap(route: Route, i: number, j: number): Route {
    const newCustomers = [...route.customers];
    const segment = newCustomers.slice(i, j + 1).reverse();
    newCustomers.splice(i, j - i + 1, ...segment);

    return this.recalculateRoute({ ...route, customers: newCustomers });
  }

  private insertCustomer(route: Route, customer: Customer, position: number): Route {
    const newCustomers = [...route.customers];
    newCustomers.splice(position, 0, customer);
    return this.recalculateRoute({ ...route, customers: newCustomers });
  }

  private removeCustomer(route: Route, index: number): Route {
    const newCustomers = [...route.customers];
    newCustomers.splice(index, 1);
    return this.recalculateRoute({ ...route, customers: newCustomers });
  }

  private recalculateRoute(route: Route): Route {
    let totalDistance = 0;
    let totalTime = 0;
    let totalCost = 0;
    let fuelConsumption = 0;
    let currentWeight = 0;
    let currentVolume = 0;
    let currentPallets = 0;

    for (let i = 0; i < route.customers.length; i++) {
      const customer = route.customers[i];
      const distance = this.calculateDistance(
        i === 0 ? { lat: 0, lon: 0 } : route.customers[i - 1].location,
        customer.location
      );
      
      totalDistance += distance;
      totalTime += this.calculateTravelTime(
        i === 0 ? { lat: 0, lon: 0 } : route.customers[i - 1].location,
        customer.location
      ) + customer.serviceTime;
      totalCost += distance * 0.5; // Assuming 0.5 cost per km
      fuelConsumption += (distance / 100) * 8; // Assuming 8 L/100km
      
      currentWeight += customer.demand.weight;
      currentVolume += customer.demand.volume;
      currentPallets += customer.demand.pallets;
    }

    return {
      ...route,
      totalDistance,
      totalTime,
      totalCost,
      fuelConsumption,
      utilization: {
        weight: (currentWeight / 1000) * 100, // Assuming 1000kg capacity
        volume: (currentVolume / 10) * 100, // Assuming 10m³ capacity
        pallets: (currentPallets / 20) * 100, // Assuming 20 pallet capacity
      },
    };
  }

  private isRouteFeasible(route: Route, constraints: any): boolean {
    return (
      route.totalTime <= constraints.maxRouteDuration * 60 &&
      route.customers.length <= constraints.maxCustomersPerRoute &&
      route.fuelConsumption <= constraints.fuelLimit
    );
  }

  private isSolutionBetter(
    solution1: OptimizationResult,
    solution2: OptimizationResult,
    objectives: any,
  ): boolean {
    let score1 = 0;
    let score2 = 0;

    if (objectives.minimizeCost) {
      score1 += solution1.totalCost;
      score2 += solution2.totalCost;
    }
    if (objectives.minimizeDistance) {
      score1 += solution1.totalDistance;
      score2 += solution2.totalDistance;
    }
    if (objectives.minimizeTime) {
      score1 += solution1.totalTime;
      score2 += solution2.totalTime;
    }
    if (objectives.maximizeUtilization) {
      score1 -= solution1.averageUtilization;
      score2 -= solution2.averageUtilization;
    }

    return score1 < score2;
  }

  private async refineSolution(
    solution: OptimizationResult,
    objectives: any,
  ): Promise<OptimizationResult> {
    // Apply local search improvements
    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;

      // Try to improve each route
      for (let i = 0; i < solution.routes.length; i++) {
        const originalRoute = solution.routes[i];
        const improvedRoute = await this.improveRoute(originalRoute, objectives);
        
        if (this.isRouteBetter(improvedRoute, originalRoute, objectives)) {
          solution.routes[i] = improvedRoute;
          improved = true;
        }
      }
    }

    return this.calculateOptimizationResult(solution.routes);
  }

  private async improveRoute(route: Route, objectives: any): Promise<Route> {
    // Apply 3-opt improvement
    let bestRoute = route;
    
    for (let i = 0; i < route.customers.length - 2; i++) {
      for (let j = i + 1; j < route.customers.length - 1; j++) {
        for (let k = j + 1; k < route.customers.length; k++) {
          const newRoute = this.threeOptSwap(route, i, j, k);
          if (this.isRouteBetter(newRoute, bestRoute, objectives)) {
            bestRoute = newRoute;
          }
        }
      }
    }

    return bestRoute;
  }

  private threeOptSwap(route: Route, i: number, j: number, k: number): Route {
    const customers = route.customers;
    const newCustomers = [
      ...customers.slice(0, i),
      ...customers.slice(i, j).reverse(),
      ...customers.slice(j, k).reverse(),
      ...customers.slice(k),
    ];

    return this.recalculateRoute({ ...route, customers: newCustomers });
  }

  private isRouteBetter(route1: Route, route2: Route, objectives: any): boolean {
    let score1 = 0;
    let score2 = 0;

    if (objectives.minimizeCost) {
      score1 += route1.totalCost;
      score2 += route2.totalCost;
    }
    if (objectives.minimizeDistance) {
      score1 += route1.totalDistance;
      score2 += route2.totalDistance;
    }
    if (objectives.minimizeTime) {
      score1 += route1.totalTime;
      score2 += route2.totalTime;
    }
    if (objectives.maximizeUtilization) {
      const util1 = (route1.utilization.weight + route1.utilization.volume + route1.utilization.pallets) / 3;
      const util2 = (route2.utilization.weight + route2.utilization.volume + route2.utilization.pallets) / 3;
      score1 -= util1;
      score2 -= util2;
    }

    return score1 < score2;
  }

  private calculateOptimizationResult(routes: Route[]): OptimizationResult {
    const totalCost = routes.reduce((sum, route) => sum + route.totalCost, 0);
    const totalDistance = routes.reduce((sum, route) => sum + route.totalDistance, 0);
    const totalTime = routes.reduce((sum, route) => sum + route.totalTime, 0);
    const totalFuelConsumption = routes.reduce((sum, route) => sum + route.fuelConsumption, 0);
    
    const totalUtilization = routes.reduce((sum, route) => {
      return sum + (route.utilization.weight + route.utilization.volume + route.utilization.pallets) / 3;
    }, 0);
    const averageUtilization = totalUtilization / routes.length;

    return {
      routes,
      totalCost,
      totalDistance,
      totalTime,
      totalFuelConsumption,
      averageUtilization,
      algorithm: 'Multi-Objective VRP',
      executionTime: 0,
      improvement: { costReduction: 0, distanceReduction: 0, timeReduction: 0 },
    };
  }

  private calculateImprovement(initial: OptimizationResult, final: OptimizationResult): any {
    return {
      costReduction: ((initial.totalCost - final.totalCost) / initial.totalCost) * 100,
      distanceReduction: ((initial.totalDistance - final.totalDistance) / initial.totalDistance) * 100,
      timeReduction: ((initial.totalTime - final.totalTime) / initial.totalTime) * 100,
    };
  }

  private createNewSolution(original: OptimizationResult, routeIndex: number, newRoute: Route): OptimizationResult {
    const newRoutes = [...original.routes];
    newRoutes[routeIndex] = newRoute;
    return this.calculateOptimizationResult(newRoutes);
  }

  private calculateDistance(point1: { lat: number; lon: number }, point2: { lat: number; lon: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lon - point1.lon);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculateTravelTime(point1: { lat: number; lon: number }, point2: { lat: number; lon: number }): number {
    const distance = this.calculateDistance(point1, point2);
    const averageSpeed = 50; // km/h
    return (distance / averageSpeed) * 60; // minutes
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async saveOptimizationResult(result: OptimizationResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO route_optimization_results 
        (algorithm, total_cost, total_distance, total_time, total_fuel_consumption, 
         average_utilization, execution_time, improvement_cost, improvement_distance, 
         improvement_time, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      `, [
        result.algorithm,
        result.totalCost,
        result.totalDistance,
        result.totalTime,
        result.totalFuelConsumption,
        result.averageUtilization,
        result.executionTime,
        result.improvement.costReduction,
        result.improvement.distanceReduction,
        result.improvement.timeReduction,
      ]);
    } catch (error) {
      this.logger.error('Failed to save optimization result:', error);
    }
  }
}

