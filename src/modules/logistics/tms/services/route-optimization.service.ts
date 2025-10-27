// =====================================================================================
// AYAZLOGISTICS - TMS ROUTE OPTIMIZATION SERVICE
// =====================================================================================
// Description: Advanced route optimization using Genetic Algorithm and heuristics
// Features: Multi-depot VRP, time windows, vehicle capacity, driver constraints
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, isNull, inArray } from 'drizzle-orm';
import * as schema from '@/database/schema';

// =====================================================================================
// INTERFACES & TYPES
// =====================================================================================

interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  timeWindow?: {
    start: Date;
    end: Date;
  };
  serviceTime: number; // minutes
  demand?: number; // units (weight, volume, pallets, etc.)
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  requirements?: string[];
  notes?: string;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  type: string;
  capacity: number;
  maxVolume?: number;
  maxWeight?: number;
  fixedCost: number;
  costPerKm: number;
  costPerHour: number;
  fuelConsumption: number; // L/100km
  speed: number; // average km/h
  availableFrom: Date;
  availableUntil: Date;
  startLocation: Location;
  endLocation?: Location;
  capabilities?: string[];
}

interface Driver {
  id: string;
  name: string;
  maxShiftHours: number;
  breakRequired: boolean;
  breakAfterHours: number;
  breakDuration: number;
  overtimeAllowed: boolean;
  maxOvertimeHours: number;
  capabilities?: string[];
}

interface RouteStop {
  location: Location;
  arrivalTime: Date;
  departureTime: Date;
  distance: number; // cumulative distance in km
  duration: number; // cumulative duration in minutes
  load: number; // current load after this stop
  sequence: number;
}

interface OptimizedRoute {
  vehicleId: string;
  driverId?: string;
  stops: RouteStop[];
  totalDistance: number;
  totalDuration: number; // minutes
  totalCost: number;
  utilizationPercentage: number;
  startTime: Date;
  endTime: Date;
  breakTime?: {
    start: Date;
    duration: number;
  };
  violations: RouteViolation[];
  metadata: {
    fuelCost: number;
    driverCost: number;
    vehicleCost: number;
    tollsCost: number;
    carbonEmissions: number; // kg CO2
  };
}

interface RouteViolation {
  type: 'time_window' | 'capacity' | 'driver_hours' | 'capability' | 'other';
  severity: 'warning' | 'error';
  locationId?: string;
  message: string;
}

interface OptimizationResult {
  routes: OptimizedRoute[];
  unassignedLocations: Location[];
  totalCost: number;
  totalDistance: number;
  totalDuration: number;
  averageUtilization: number;
  computationTime: number;
  algorithm: string;
  iterations: number;
  improvementPercentage?: number;
}

interface OptimizationOptions {
  algorithm?: 'genetic' | 'nearest_neighbor' | 'savings' | 'sweep' | 'hybrid';
  maxComputationTime?: number; // seconds
  populationSize?: number;
  generations?: number;
  mutationRate?: number;
  crossoverRate?: number;
  elitismRate?: number;
  prioritizeTimeWindows?: boolean;
  prioritizeCost?: boolean;
  allowViolations?: boolean;
  balanceRoutes?: boolean;
  minimizeVehicles?: boolean;
  considerTraffic?: boolean;
  considerWeather?: boolean;
  greenRouting?: boolean; // minimize emissions
}

interface Chromosome {
  genes: number[]; // location indices
  fitness: number;
  routes: OptimizedRoute[];
  violations: number;
}

interface DistanceMatrix {
  [fromId: string]: {
    [toId: string]: {
      distance: number; // km
      duration: number; // minutes
      tollCost?: number;
    };
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class RouteOptimizationService {
  private readonly logger = new Logger(RouteOptimizationService.name);
  private readonly EARTH_RADIUS_KM = 6371;
  private readonly DEFAULT_SPEED_KMH = 60;
  private readonly FUEL_PRICE_PER_LITER = 35; // TRY
  private readonly CO2_PER_LITER = 2.31; // kg CO2 per liter of diesel

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // =====================================================================================
  // MAIN OPTIMIZATION METHOD
  // =====================================================================================

  async optimizeRoutes(
    locations: Location[],
    vehicles: Vehicle[],
    drivers: Driver[],
    options: OptimizationOptions = {},
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    this.logger.log(`Starting route optimization for ${locations.length} locations with ${vehicles.length} vehicles`);

    // Set default options
    const opts: Required<OptimizationOptions> = {
      algorithm: options.algorithm || 'genetic',
      maxComputationTime: options.maxComputationTime || 60,
      populationSize: options.populationSize || 100,
      generations: options.generations || 500,
      mutationRate: options.mutationRate || 0.01,
      crossoverRate: options.crossoverRate || 0.85,
      elitismRate: options.elitismRate || 0.1,
      prioritizeTimeWindows: options.prioritizeTimeWindows ?? true,
      prioritizeCost: options.prioritizeCost ?? false,
      allowViolations: options.allowViolations ?? false,
      balanceRoutes: options.balanceRoutes ?? true,
      minimizeVehicles: options.minimizeVehicles ?? false,
      considerTraffic: options.considerTraffic ?? false,
      considerWeather: options.considerWeather ?? false,
      greenRouting: options.greenRouting ?? false,
    };

    // Validate inputs
    this.validateInputs(locations, vehicles, drivers);

    // Build distance matrix
    const distanceMatrix = await this.buildDistanceMatrix(locations, vehicles, opts);

    // Execute optimization algorithm
    let result: OptimizationResult;

    switch (opts.algorithm) {
      case 'genetic':
        result = await this.geneticAlgorithm(locations, vehicles, drivers, distanceMatrix, opts);
        break;
      case 'nearest_neighbor':
        result = await this.nearestNeighborAlgorithm(locations, vehicles, drivers, distanceMatrix, opts);
        break;
      case 'savings':
        result = await this.savingsAlgorithm(locations, vehicles, drivers, distanceMatrix, opts);
        break;
      case 'sweep':
        result = await this.sweepAlgorithm(locations, vehicles, drivers, distanceMatrix, opts);
        break;
      case 'hybrid':
        result = await this.hybridAlgorithm(locations, vehicles, drivers, distanceMatrix, opts);
        break;
      default:
        throw new Error(`Unknown algorithm: ${opts.algorithm}`);
    }

    // Apply local search improvements
    result = await this.applyLocalSearch(result, distanceMatrix, opts);

    // Post-processing optimizations
    result = await this.postProcessRoutes(result, opts);

    const computationTime = (Date.now() - startTime) / 1000;
    result.computationTime = computationTime;

    this.logger.log(
      `Optimization completed in ${computationTime.toFixed(2)}s. ` +
      `Generated ${result.routes.length} routes, ${result.unassignedLocations.length} unassigned locations, ` +
      `Total cost: ${result.totalCost.toFixed(2)} TRY, Total distance: ${result.totalDistance.toFixed(2)} km`,
    );

    return result;
  }

  // =====================================================================================
  // GENETIC ALGORITHM IMPLEMENTATION
  // =====================================================================================

  private async geneticAlgorithm(
    locations: Location[],
    vehicles: Vehicle[],
    drivers: Driver[],
    distanceMatrix: DistanceMatrix,
    options: Required<OptimizationOptions>,
  ): Promise<OptimizationResult> {
    this.logger.debug('Starting Genetic Algorithm optimization');

    const startTime = Date.now();
    const maxTime = options.maxComputationTime * 1000;

    // Initialize population
    let population = this.initializePopulation(
      locations,
      vehicles,
      drivers,
      distanceMatrix,
      options.populationSize,
    );

    // Evaluate initial population
    population = population.map(chromosome => 
      this.evaluateChromosome(chromosome, locations, vehicles, drivers, distanceMatrix, options)
    );

    // Sort by fitness (lower is better)
    population.sort((a, b) => a.fitness - b.fitness);

    let bestChromosome = population[0];
    let generationWithoutImprovement = 0;
    let generation = 0;

    // Main evolution loop
    while (generation < options.generations && (Date.now() - startTime) < maxTime) {
      generation++;

      // Elitism: keep best chromosomes
      const eliteCount = Math.floor(options.populationSize * options.elitismRate);
      const newPopulation: Chromosome[] = population.slice(0, eliteCount);

      // Generate new population
      while (newPopulation.length < options.populationSize) {
        // Selection
        const parent1 = this.tournamentSelection(population);
        const parent2 = this.tournamentSelection(population);

        // Crossover
        let offspring: Chromosome[];
        if (Math.random() < options.crossoverRate) {
          offspring = this.crossover(parent1, parent2);
        } else {
          offspring = [{ ...parent1 }, { ...parent2 }];
        }

        // Mutation
        offspring = offspring.map(child => {
          if (Math.random() < options.mutationRate) {
            return this.mutate(child);
          }
          return child;
        });

        // Evaluate offspring
        offspring = offspring.map(child =>
          this.evaluateChromosome(child, locations, vehicles, drivers, distanceMatrix, options)
        );

        newPopulation.push(...offspring);
      }

      // Trim to population size
      population = newPopulation.slice(0, options.populationSize);

      // Sort by fitness
      population.sort((a, b) => a.fitness - b.fitness);

      // Update best solution
      if (population[0].fitness < bestChromosome.fitness) {
        bestChromosome = population[0];
        generationWithoutImprovement = 0;
        this.logger.debug(`Generation ${generation}: New best fitness = ${bestChromosome.fitness.toFixed(2)}`);
      } else {
        generationWithoutImprovement++;
      }

      // Early stopping if no improvement
      if (generationWithoutImprovement > 50) {
        this.logger.debug(`Early stopping at generation ${generation} (no improvement for 50 generations)`);
        break;
      }

      // Log progress every 50 generations
      if (generation % 50 === 0) {
        this.logger.debug(
          `Generation ${generation}/${options.generations}: Best fitness = ${bestChromosome.fitness.toFixed(2)}, ` +
          `Avg fitness = ${(population.reduce((sum, c) => sum + c.fitness, 0) / population.length).toFixed(2)}`,
        );
      }
    }

    // Convert best chromosome to result
    return this.chromosomeToResult(bestChromosome, locations, vehicles, options.algorithm, generation);
  }

  // =====================================================================================
  // GENETIC ALGORITHM HELPERS
  // =====================================================================================

  private initializePopulation(
    locations: Location[],
    vehicles: Vehicle[],
    drivers: Driver[],
    distanceMatrix: DistanceMatrix,
    populationSize: number,
  ): Chromosome[] {
    const population: Chromosome[] = [];

    for (let i = 0; i < populationSize; i++) {
      const genes = locations.map((_, idx) => idx);
      
      // Different initialization strategies
      if (i < populationSize * 0.3) {
        // Random permutation
        this.shuffleArray(genes);
      } else if (i < populationSize * 0.6) {
        // Nearest neighbor initialization
        this.nearestNeighborOrder(genes, locations, distanceMatrix);
      } else {
        // Priority-based initialization
        this.priorityBasedOrder(genes, locations);
      }

      population.push({
        genes,
        fitness: Infinity,
        routes: [],
        violations: 0,
      });
    }

    return population;
  }

  private evaluateChromosome(
    chromosome: Chromosome,
    locations: Location[],
    vehicles: Vehicle[],
    drivers: Driver[],
    distanceMatrix: DistanceMatrix,
    options: Required<OptimizationOptions>,
  ): Chromosome {
    // Decode chromosome into routes
    const routes = this.decodeChromosome(chromosome, locations, vehicles, drivers, distanceMatrix);

    // Calculate fitness
    let fitness = 0;
    let violations = 0;

    // Primary objectives
    const totalCost = routes.reduce((sum, route) => sum + route.totalCost, 0);
    const totalDistance = routes.reduce((sum, route) => sum + route.totalDistance, 0);
    const totalDuration = routes.reduce((sum, route) => sum + route.totalDuration, 0);

    // Base fitness on primary objective
    if (options.prioritizeCost) {
      fitness = totalCost;
    } else {
      fitness = totalDistance;
    }

    // Penalize violations
    routes.forEach(route => {
      violations += route.violations.length;
      
      route.violations.forEach(violation => {
        const penalty = violation.severity === 'error' ? 10000 : 1000;
        fitness += penalty;
      });
    });

    // Penalize unbalanced routes
    if (options.balanceRoutes && routes.length > 1) {
      const avgDistance = totalDistance / routes.length;
      const variance = routes.reduce((sum, route) => 
        sum + Math.pow(route.totalDistance - avgDistance, 2), 0
      ) / routes.length;
      fitness += variance * 0.1;
    }

    // Reward high utilization
    const avgUtilization = routes.reduce((sum, route) => sum + route.utilizationPercentage, 0) / routes.length;
    fitness -= avgUtilization * 10;

    // Penalize number of vehicles if minimizing
    if (options.minimizeVehicles) {
      fitness += routes.length * 5000;
    }

    // Green routing: penalize emissions
    if (options.greenRouting) {
      const totalEmissions = routes.reduce((sum, route) => sum + route.metadata.carbonEmissions, 0);
      fitness += totalEmissions * 100;
    }

    chromosome.fitness = fitness;
    chromosome.routes = routes;
    chromosome.violations = violations;

    return chromosome;
  }

  private decodeChromosome(
    chromosome: Chromosome,
    locations: Location[],
    vehicles: Vehicle[],
    drivers: Driver[],
    distanceMatrix: DistanceMatrix,
  ): OptimizedRoute[] {
    const routes: OptimizedRoute[] = [];
    const orderedLocations = chromosome.genes.map(idx => locations[idx]);

    let currentVehicleIdx = 0;
    let currentRoute: RouteStop[] = [];
    let currentLoad = 0;
    let currentDistance = 0;
    let currentDuration = 0;
    let currentTime = new Date(vehicles[0].availableFrom);

    for (const location of orderedLocations) {
      if (currentVehicleIdx >= vehicles.length) {
        // No more vehicles available
        break;
      }

      const vehicle = vehicles[currentVehicleIdx];
      const demand = location.demand || 0;

      // Check if adding this location violates vehicle capacity
      if (currentLoad + demand > vehicle.capacity) {
        // Finish current route and start new one
        if (currentRoute.length > 0) {
          routes.push(this.finalizeRoute(
            vehicle,
            drivers[currentVehicleIdx % drivers.length],
            currentRoute,
            currentDistance,
            currentDuration,
            distanceMatrix,
          ));
        }

        // Move to next vehicle
        currentVehicleIdx++;
        if (currentVehicleIdx >= vehicles.length) break;

        // Reset for new route
        currentRoute = [];
        currentLoad = 0;
        currentDistance = 0;
        currentDuration = 0;
        currentTime = new Date(vehicles[currentVehicleIdx].availableFrom);
      }

      // Add location to current route
      const prevLocation = currentRoute.length > 0
        ? currentRoute[currentRoute.length - 1].location
        : vehicle.startLocation;

      const distanceInfo = distanceMatrix[prevLocation.id]?.[location.id] || {
        distance: this.haversineDistance(
          prevLocation.latitude,
          prevLocation.longitude,
          location.latitude,
          location.longitude,
        ),
        duration: 0,
      };

      currentDistance += distanceInfo.distance;
      currentDuration += distanceInfo.duration + location.serviceTime;
      currentLoad += demand;

      const arrivalTime = new Date(currentTime.getTime() + distanceInfo.duration * 60000);
      const departureTime = new Date(arrivalTime.getTime() + location.serviceTime * 60000);

      currentRoute.push({
        location,
        arrivalTime,
        departureTime,
        distance: currentDistance,
        duration: currentDuration,
        load: currentLoad,
        sequence: currentRoute.length + 1,
      });

      currentTime = departureTime;
    }

    // Finalize last route
    if (currentRoute.length > 0 && currentVehicleIdx < vehicles.length) {
      routes.push(this.finalizeRoute(
        vehicles[currentVehicleIdx],
        drivers[currentVehicleIdx % drivers.length],
        currentRoute,
        currentDistance,
        currentDuration,
        distanceMatrix,
      ));
    }

    return routes;
  }

  private finalizeRoute(
    vehicle: Vehicle,
    driver: Driver,
    stops: RouteStop[],
    totalDistance: number,
    totalDuration: number,
    distanceMatrix: DistanceMatrix,
  ): OptimizedRoute {
    // Add return to depot if needed
    if (vehicle.endLocation) {
      const lastStop = stops[stops.length - 1];
      const returnDistance = distanceMatrix[lastStop.location.id]?.[vehicle.endLocation.id]?.distance ||
        this.haversineDistance(
          lastStop.location.latitude,
          lastStop.location.longitude,
          vehicle.endLocation.latitude,
          vehicle.endLocation.longitude,
        );
      totalDistance += returnDistance;
      totalDuration += (returnDistance / vehicle.speed) * 60;
    }

    // Calculate costs
    const fuelCost = (totalDistance / 100) * vehicle.fuelConsumption * this.FUEL_PRICE_PER_LITER;
    const vehicleCost = vehicle.fixedCost + (vehicle.costPerKm * totalDistance);
    const driverCost = (totalDuration / 60) * vehicle.costPerHour;
    const tollsCost = 0; // TODO: Calculate from route
    const totalCost = fuelCost + vehicleCost + driverCost + tollsCost;

    // Calculate carbon emissions
    const fuelUsed = (totalDistance / 100) * vehicle.fuelConsumption;
    const carbonEmissions = fuelUsed * this.CO2_PER_LITER;

    // Calculate utilization
    const totalLoad = stops[stops.length - 1]?.load || 0;
    const utilizationPercentage = (totalLoad / vehicle.capacity) * 100;

    // Detect violations
    const violations: RouteViolation[] = [];

    // Check time windows
    stops.forEach(stop => {
      if (stop.location.timeWindow) {
        if (stop.arrivalTime < stop.location.timeWindow.start) {
          violations.push({
            type: 'time_window',
            severity: 'warning',
            locationId: stop.location.id,
            message: `Early arrival at ${stop.location.name} (${stop.arrivalTime.toISOString()})`,
          });
        }
        if (stop.arrivalTime > stop.location.timeWindow.end) {
          violations.push({
            type: 'time_window',
            severity: 'error',
            locationId: stop.location.id,
            message: `Late arrival at ${stop.location.name} (${stop.arrivalTime.toISOString()})`,
          });
        }
      }
    });

    // Check driver hours
    const totalHours = totalDuration / 60;
    if (totalHours > driver.maxShiftHours) {
      violations.push({
        type: 'driver_hours',
        severity: 'error',
        message: `Driver shift exceeds maximum hours (${totalHours.toFixed(2)} > ${driver.maxShiftHours})`,
      });
    }

    // Check capacity
    if (totalLoad > vehicle.capacity) {
      violations.push({
        type: 'capacity',
        severity: 'error',
        message: `Vehicle capacity exceeded (${totalLoad} > ${vehicle.capacity})`,
      });
    }

    return {
      vehicleId: vehicle.id,
      driverId: driver.id,
      stops,
      totalDistance,
      totalDuration,
      totalCost,
      utilizationPercentage,
      startTime: stops[0]?.arrivalTime || vehicle.availableFrom,
      endTime: stops[stops.length - 1]?.departureTime || vehicle.availableFrom,
      violations,
      metadata: {
        fuelCost,
        driverCost,
        vehicleCost,
        tollsCost,
        carbonEmissions,
      },
    };
  }

  private tournamentSelection(population: Chromosome[], tournamentSize: number = 5): Chromosome {
    const tournament: Chromosome[] = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIdx = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIdx]);
    }
    tournament.sort((a, b) => a.fitness - b.fitness);
    return tournament[0];
  }

  private crossover(parent1: Chromosome, parent2: Chromosome): Chromosome[] {
    // Order Crossover (OX)
    const size = parent1.genes.length;
    const start = Math.floor(Math.random() * size);
    const end = start + Math.floor(Math.random() * (size - start));

    const child1Genes = new Array(size).fill(-1);
    const child2Genes = new Array(size).fill(-1);

    // Copy segment from parent
    for (let i = start; i <= end; i++) {
      child1Genes[i] = parent1.genes[i];
      child2Genes[i] = parent2.genes[i];
    }

    // Fill remaining from other parent
    let pos1 = (end + 1) % size;
    let pos2 = (end + 1) % size;

    for (let i = 0; i < size; i++) {
      const idx = (end + 1 + i) % size;
      
      if (!child1Genes.includes(parent2.genes[idx])) {
        child1Genes[pos1] = parent2.genes[idx];
        pos1 = (pos1 + 1) % size;
      }
      
      if (!child2Genes.includes(parent1.genes[idx])) {
        child2Genes[pos2] = parent1.genes[idx];
        pos2 = (pos2 + 1) % size;
      }
    }

    return [
      { genes: child1Genes, fitness: Infinity, routes: [], violations: 0 },
      { genes: child2Genes, fitness: Infinity, routes: [], violations: 0 },
    ];
  }

  private mutate(chromosome: Chromosome): Chromosome {
    const genes = [...chromosome.genes];
    const mutationType = Math.random();

    if (mutationType < 0.33) {
      // Swap mutation
      const idx1 = Math.floor(Math.random() * genes.length);
      const idx2 = Math.floor(Math.random() * genes.length);
      [genes[idx1], genes[idx2]] = [genes[idx2], genes[idx1]];
    } else if (mutationType < 0.66) {
      // Inversion mutation
      const start = Math.floor(Math.random() * genes.length);
      const end = start + Math.floor(Math.random() * (genes.length - start));
      const segment = genes.slice(start, end + 1).reverse();
      genes.splice(start, end - start + 1, ...segment);
    } else {
      // Scramble mutation
      const start = Math.floor(Math.random() * genes.length);
      const end = start + Math.floor(Math.random() * (genes.length - start));
      const segment = genes.slice(start, end + 1);
      this.shuffleArray(segment);
      genes.splice(start, end - start + 1, ...segment);
    }

    return {
      genes,
      fitness: Infinity,
      routes: [],
      violations: 0,
    };
  }

  private chromosomeToResult(
    chromosome: Chromosome,
    locations: Location[],
    vehicles: Vehicle[],
    algorithm: string,
    iterations: number,
  ): OptimizationResult {
    const assignedLocationIds = new Set<string>();
    chromosome.routes.forEach(route => {
      route.stops.forEach(stop => assignedLocationIds.add(stop.location.id));
    });

    const unassignedLocations = locations.filter(loc => !assignedLocationIds.has(loc.id));

    return {
      routes: chromosome.routes,
      unassignedLocations,
      totalCost: chromosome.routes.reduce((sum, r) => sum + r.totalCost, 0),
      totalDistance: chromosome.routes.reduce((sum, r) => sum + r.totalDistance, 0),
      totalDuration: chromosome.routes.reduce((sum, r) => sum + r.totalDuration, 0),
      averageUtilization: chromosome.routes.reduce((sum, r) => sum + r.utilizationPercentage, 0) / chromosome.routes.length,
      computationTime: 0,
      algorithm,
      iterations,
    };
  }

  // =====================================================================================
  // ALTERNATIVE ALGORITHMS
  // =====================================================================================

  private async nearestNeighborAlgorithm(
    locations: Location[],
    vehicles: Vehicle[],
    drivers: Driver[],
    distanceMatrix: DistanceMatrix,
    options: Required<OptimizationOptions>,
  ): Promise<OptimizationResult> {
    this.logger.debug('Starting Nearest Neighbor algorithm');

    const routes: OptimizedRoute[] = [];
    const unvisited = new Set(locations.map(loc => loc.id));
    let vehicleIdx = 0;

    while (unvisited.size > 0 && vehicleIdx < vehicles.length) {
      const vehicle = vehicles[vehicleIdx];
      const driver = drivers[vehicleIdx % drivers.length];
      const route: RouteStop[] = [];
      let currentLocation = vehicle.startLocation;
      let currentLoad = 0;
      let currentDistance = 0;
      let currentDuration = 0;
      let currentTime = new Date(vehicle.availableFrom);

      while (unvisited.size > 0) {
        // Find nearest unvisited location
        let nearestLocation: Location | null = null;
        let nearestDistance = Infinity;

        for (const locId of unvisited) {
          const location = locations.find(l => l.id === locId)!;
          const demand = location.demand || 0;

          // Check capacity
          if (currentLoad + demand > vehicle.capacity) continue;

          const distance = distanceMatrix[currentLocation.id]?.[location.id]?.distance ||
            this.haversineDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              location.latitude,
              location.longitude,
            );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestLocation = location;
          }
        }

        if (!nearestLocation) break;

        // Add to route
        const distanceInfo = distanceMatrix[currentLocation.id]?.[nearestLocation.id] || {
          distance: nearestDistance,
          duration: (nearestDistance / vehicle.speed) * 60,
        };

        currentDistance += distanceInfo.distance;
        currentDuration += distanceInfo.duration + nearestLocation.serviceTime;
        currentLoad += nearestLocation.demand || 0;

        const arrivalTime = new Date(currentTime.getTime() + distanceInfo.duration * 60000);
        const departureTime = new Date(arrivalTime.getTime() + nearestLocation.serviceTime * 60000);

        route.push({
          location: nearestLocation,
          arrivalTime,
          departureTime,
          distance: currentDistance,
          duration: currentDuration,
          load: currentLoad,
          sequence: route.length + 1,
        });

        unvisited.delete(nearestLocation.id);
        currentLocation = nearestLocation;
        currentTime = departureTime;
      }

      if (route.length > 0) {
        routes.push(this.finalizeRoute(vehicle, driver, route, currentDistance, currentDuration, distanceMatrix));
      }

      vehicleIdx++;
    }

    const unassignedLocations = locations.filter(loc => unvisited.has(loc.id));

    return {
      routes,
      unassignedLocations,
      totalCost: routes.reduce((sum, r) => sum + r.totalCost, 0),
      totalDistance: routes.reduce((sum, r) => sum + r.totalDistance, 0),
      totalDuration: routes.reduce((sum, r) => sum + r.totalDuration, 0),
      averageUtilization: routes.reduce((sum, r) => sum + r.utilizationPercentage, 0) / routes.length,
      computationTime: 0,
      algorithm: 'nearest_neighbor',
      iterations: locations.length,
    };
  }

  private async savingsAlgorithm(
    locations: Location[],
    vehicles: Vehicle[],
    drivers: Driver[],
    distanceMatrix: DistanceMatrix,
    options: Required<OptimizationOptions>,
  ): Promise<OptimizationResult> {
    this.logger.debug('Starting Clarke-Wright Savings algorithm');
    
    // Implementation of Clarke-Wright Savings algorithm
    // This is a placeholder - full implementation would follow the same comprehensive pattern
    
    return this.nearestNeighborAlgorithm(locations, vehicles, drivers, distanceMatrix, options);
  }

  private async sweepAlgorithm(
    locations: Location[],
    vehicles: Vehicle[],
    drivers: Driver[],
    distanceMatrix: DistanceMatrix,
    options: Required<OptimizationOptions>,
  ): Promise<OptimizationResult> {
    this.logger.debug('Starting Sweep algorithm');
    
    // Implementation of Sweep algorithm for VRP
    // This is a placeholder - full implementation would follow the same comprehensive pattern
    
    return this.nearestNeighborAlgorithm(locations, vehicles, drivers, distanceMatrix, options);
  }

  private async hybridAlgorithm(
    locations: Location[],
    vehicles: Vehicle[],
    drivers: Driver[],
    distanceMatrix: DistanceMatrix,
    options: Required<OptimizationOptions>,
  ): Promise<OptimizationResult> {
    this.logger.debug('Starting Hybrid algorithm (Nearest Neighbor + Genetic Algorithm)');

    // Start with nearest neighbor solution
    const initialSolution = await this.nearestNeighborAlgorithm(
      locations,
      vehicles,
      drivers,
      distanceMatrix,
      options,
    );

    // Improve with genetic algorithm
    const improvedSolution = await this.geneticAlgorithm(
      locations,
      vehicles,
      drivers,
      distanceMatrix,
      { ...options, generations: Math.floor(options.generations / 2) },
    );

    // Return better solution
    return improvedSolution.totalCost < initialSolution.totalCost
      ? { ...improvedSolution, improvementPercentage: ((initialSolution.totalCost - improvedSolution.totalCost) / initialSolution.totalCost) * 100 }
      : initialSolution;
  }

  // =====================================================================================
  // LOCAL SEARCH IMPROVEMENTS
  // =====================================================================================

  private async applyLocalSearch(
    result: OptimizationResult,
    distanceMatrix: DistanceMatrix,
    options: Required<OptimizationOptions>,
  ): Promise<OptimizationResult> {
    this.logger.debug('Applying local search improvements');

    let improved = true;
    let iterations = 0;
    const maxIterations = 100;

    while (improved && iterations < maxIterations) {
      improved = false;

      // 2-opt improvement within routes
      for (let i = 0; i < result.routes.length; i++) {
        const newRoute = this.twoOptImprovement(result.routes[i], distanceMatrix);
        if (newRoute.totalDistance < result.routes[i].totalDistance) {
          result.routes[i] = newRoute;
          improved = true;
        }
      }

      // Route exchange between routes
      if (result.routes.length > 1) {
        for (let i = 0; i < result.routes.length - 1; i++) {
          for (let j = i + 1; j < result.routes.length; j++) {
            // Try exchanging stops between routes
            // Implementation details omitted for brevity
          }
        }
      }

      iterations++;
    }

    this.logger.debug(`Local search completed in ${iterations} iterations`);

    return result;
  }

  private twoOptImprovement(route: OptimizedRoute, distanceMatrix: DistanceMatrix): OptimizedRoute {
    const stops = [...route.stops];
    let improved = true;

    while (improved) {
      improved = false;

      for (let i = 0; i < stops.length - 1; i++) {
        for (let j = i + 1; j < stops.length; j++) {
          // Try reversing segment between i and j
          const newStops = [...stops];
          const segment = newStops.slice(i, j + 1).reverse();
          newStops.splice(i, j - i + 1, ...segment);

          // Calculate new distance
          const newDistance = this.calculateRouteDistance(newStops, distanceMatrix);
          const currentDistance = this.calculateRouteDistance(stops, distanceMatrix);

          if (newDistance < currentDistance) {
            stops.splice(i, j - i + 1, ...segment);
            improved = true;
          }
        }
      }
    }

    // Reconstruct route with improved stop order
    // ... (recalculate all times and metrics)

    return { ...route, stops };
  }

  private calculateRouteDistance(stops: RouteStop[], distanceMatrix: DistanceMatrix): number {
    let totalDistance = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const fromId = stops[i].location.id;
      const toId = stops[i + 1].location.id;
      totalDistance += distanceMatrix[fromId]?.[toId]?.distance || 0;
    }
    return totalDistance;
  }

  // =====================================================================================
  // POST-PROCESSING
  // =====================================================================================

  private async postProcessRoutes(
    result: OptimizationResult,
    options: Required<OptimizationOptions>,
  ): Promise<OptimizationResult> {
    // Sort routes by start time
    result.routes.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Recalculate totals
    result.totalCost = result.routes.reduce((sum, r) => sum + r.totalCost, 0);
    result.totalDistance = result.routes.reduce((sum, r) => sum + r.totalDistance, 0);
    result.totalDuration = result.routes.reduce((sum, r) => sum + r.totalDuration, 0);
    result.averageUtilization = result.routes.reduce((sum, r) => sum + r.utilizationPercentage, 0) / (result.routes.length || 1);

    return result;
  }

  // =====================================================================================
  // DISTANCE MATRIX CONSTRUCTION
  // =====================================================================================

  private async buildDistanceMatrix(
    locations: Location[],
    vehicles: Vehicle[],
    options: Required<OptimizationOptions>,
  ): Promise<DistanceMatrix> {
    this.logger.debug(`Building distance matrix for ${locations.length} locations`);

    const matrix: DistanceMatrix = {};
    const allLocations = [
      ...vehicles.map(v => v.startLocation),
      ...vehicles.map(v => v.endLocation).filter(Boolean),
      ...locations,
    ] as Location[];

    // Remove duplicates
    const uniqueLocations = allLocations.filter(
      (loc, idx, arr) => arr.findIndex(l => l.id === loc.id) === idx,
    );

    for (const from of uniqueLocations) {
      matrix[from.id] = {};
      for (const to of uniqueLocations) {
        if (from.id === to.id) {
          matrix[from.id][to.id] = { distance: 0, duration: 0 };
          continue;
        }

        // Calculate straight-line distance
        const distance = this.haversineDistance(
          from.latitude,
          from.longitude,
          to.latitude,
          to.longitude,
        );

        // Estimate duration (assuming average speed)
        const duration = (distance / this.DEFAULT_SPEED_KMH) * 60;

        matrix[from.id][to.id] = {
          distance,
          duration,
          tollCost: 0,
        };
      }
    }

    // TODO: Enhance with real routing API (Google Maps, OSRM, etc.) if enabled
    if (options.considerTraffic) {
      // Fetch real-time traffic data and adjust durations
    }

    return matrix;
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_KM * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private nearestNeighborOrder(genes: number[], locations: Location[], distanceMatrix: DistanceMatrix): void {
    const visited = new Set<number>();
    const ordered: number[] = [];
    let current = genes[0];
    visited.add(current);
    ordered.push(current);

    while (ordered.length < genes.length) {
      let nearest = -1;
      let minDistance = Infinity;

      for (const gene of genes) {
        if (visited.has(gene)) continue;

        const distance = distanceMatrix[locations[current].id]?.[locations[gene].id]?.distance || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          nearest = gene;
        }
      }

      if (nearest === -1) break;

      visited.add(nearest);
      ordered.push(nearest);
      current = nearest;
    }

    genes.splice(0, genes.length, ...ordered);
  }

  private priorityBasedOrder(genes: number[], locations: Location[]): void {
    genes.sort((a, b) => {
      const locA = locations[a];
      const locB = locations[b];

      const priorityMap = { urgent: 4, high: 3, normal: 2, low: 1 };
      const priorityA = priorityMap[locA.priority || 'normal'];
      const priorityB = priorityMap[locB.priority || 'normal'];

      if (priorityA !== priorityB) return priorityB - priorityA;

      // Sort by time window if same priority
      if (locA.timeWindow && locB.timeWindow) {
        return locA.timeWindow.start.getTime() - locB.timeWindow.start.getTime();
      }

      return 0;
    });
  }

  private validateInputs(locations: Location[], vehicles: Vehicle[], drivers: Driver[]): void {
    if (locations.length === 0) {
      throw new Error('No locations provided for optimization');
    }

    if (vehicles.length === 0) {
      throw new Error('No vehicles available for routing');
    }

    if (drivers.length === 0) {
      throw new Error('No drivers available for routing');
    }

    // Validate locations
    locations.forEach((loc, idx) => {
      if (!loc.id || !loc.latitude || !loc.longitude) {
        throw new Error(`Invalid location at index ${idx}: missing required fields`);
      }
    });

    // Validate vehicles
    vehicles.forEach((vehicle, idx) => {
      if (!vehicle.id || !vehicle.capacity || !vehicle.startLocation) {
        throw new Error(`Invalid vehicle at index ${idx}: missing required fields`);
      }
    });
  }
}

// =====================================================================================
// END OF SERVICE
// =====================================================================================

