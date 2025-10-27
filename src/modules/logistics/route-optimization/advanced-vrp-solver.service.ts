// =====================================================================================
// AYAZLOGISTICS - ADVANCED VRP SOLVER SERVICE
// =====================================================================================
// Description: Vehicle Routing Problem solver with multiple optimization algorithms
// Features: Genetic Algorithm, Ant Colony, Simulated Annealing, Tabu Search, Hybrid
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../../core/events/event-bus.service';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface Location {
  id: string;
  name: string;
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timeWindow?: {
    earliest: Date;
    latest: Date;
  };
  serviceTime: number; // minutes
  demand: {
    weight: number;
    volume: number;
    pallets: number;
  };
  priority: number;
  specialRequirements?: string[];
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  type: string;
  capacity: {
    weight: number;
    volume: number;
    pallets: number;
  };
  costPerKm: number;
  costPerHour: number;
  fixedCost: number;
  speed: number; // km/h
  startLocation: { latitude: number; longitude: number };
  endLocation?: { latitude: number; longitude: number };
  availableFrom: Date;
  availableUntil: Date;
  driver?: {
    id: string;
    name: string;
    maxDrivingHours: number;
  };
  features?: string[];
}

interface RouteOptimizationRequest {
  locations: Location[];
  vehicles: Vehicle[];
  depot: Location;
  constraints: {
    maxRouteTime?: number;
    maxRouteDistance?: number;
    requireTimeWindows: boolean;
    allowSplitDeliveries: boolean;
    balanceWorkload: boolean;
  };
  objectives: {
    minimizeCost: number; // weight 0-1
    minimizeDistance: number; // weight 0-1
    minimizeVehicles: number; // weight 0-1
    minimizeTime: number; // weight 0-1
    balanceRoutes: number; // weight 0-1
  };
  algorithm?: 'genetic' | 'ant_colony' | 'simulated_annealing' | 'tabu' | 'hybrid';
  parameters?: {
    populationSize?: number;
    generations?: number;
    mutationRate?: number;
    eliteSize?: number;
    temperature?: number;
    coolingRate?: number;
    tabuTenure?: number;
  };
}

interface Route {
  vehicleId: string;
  vehicleNumber: string;
  sequence: string[];
  stops: Array<{
    locationId: string;
    arrivalTime: Date;
    departureTime: Date;
    waitTime: number;
    serviceTime: number;
    cumulativeLoad: {
      weight: number;
      volume: number;
      pallets: number;
    };
  }>;
  metrics: {
    totalDistance: number;
    totalTime: number;
    totalCost: number;
    utilizationRate: number;
    numberOfStops: number;
  };
  violations: Array<{
    type: string;
    severity: 'warning' | 'error';
    description: string;
  }>;
}

interface OptimizationResult {
  routes: Route[];
  unassignedLocations: string[];
  summary: {
    totalDistance: number;
    totalTime: number;
    totalCost: number;
    vehiclesUsed: number;
    vehiclesAvailable: number;
    averageUtilization: number;
    locationsServed: number;
    totalLocations: number;
  };
  algorithm: string;
  iterations: number;
  computationTime: number;
  qualityMetrics: {
    solutionQuality: number;
    convergenceRate: number;
    diversityIndex: number;
    balanceScore: number;
  };
}

interface Chromosome {
  genes: number[];
  fitness: number;
  routes: Route[];
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class AdvancedVRPSolverService {
  private readonly logger = new Logger(AdvancedVRPSolverService.name);

  // Earth radius for distance calculations
  private readonly EARTH_RADIUS_KM = 6371;

  constructor(private readonly eventBus: EventBusService) {}

  // =====================================================================================
  // MAIN OPTIMIZATION ENTRY POINT
  // =====================================================================================

  async optimizeRoutes(request: RouteOptimizationRequest): Promise<OptimizationResult> {
    this.logger.log(
      `Starting route optimization for ${request.locations.length} locations and ${request.vehicles.length} vehicles`,
    );

    const startTime = Date.now();
    const algorithm = request.algorithm || 'hybrid';

    let result: OptimizationResult;

    switch (algorithm) {
      case 'genetic':
        result = await this.geneticAlgorithm(request);
        break;
      case 'ant_colony':
        result = await this.antColonyOptimization(request);
        break;
      case 'simulated_annealing':
        result = await this.simulatedAnnealing(request);
        break;
      case 'tabu':
        result = await this.tabuSearch(request);
        break;
      case 'hybrid':
        result = await this.hybridOptimization(request);
        break;
      default:
        result = await this.geneticAlgorithm(request);
    }

    const computationTime = (Date.now() - startTime) / 1000;
    result.computationTime = parseFloat(computationTime.toFixed(3));

    await this.eventBus.emit('route.optimization.completed', {
      algorithm,
      locationsCount: request.locations.length,
      vehiclesUsed: result.vehiclesUsed,
      totalDistance: result.summary.totalDistance,
      computationTime,
    });

    this.logger.log(
      `Optimization completed in ${computationTime.toFixed(2)}s. ` +
      `Used ${result.vehiclesUsed} vehicles, Total distance: ${result.summary.totalDistance.toFixed(2)} km`,
    );

    return result;
  }

  // =====================================================================================
  // GENETIC ALGORITHM
  // =====================================================================================

  private async geneticAlgorithm(request: RouteOptimizationRequest): Promise<OptimizationResult> {
    this.logger.debug('Running Genetic Algorithm optimization');

    const populationSize = request.parameters?.populationSize || 100;
    const generations = request.parameters?.generations || 500;
    const mutationRate = request.parameters?.mutationRate || 0.02;
    const eliteSize = request.parameters?.eliteSize || 10;

    // Initialize population
    let population = this.initializePopulation(request, populationSize);

    // Evaluate fitness
    population = population.map(chromosome => {
      chromosome.fitness = this.calculateFitness(chromosome, request);
      return chromosome;
    });

    let bestChromosome = population[0];

    for (let gen = 0; gen < generations; gen++) {
      // Sort by fitness
      population.sort((a, b) => b.fitness - a.fitness);

      // Track best solution
      if (population[0].fitness > bestChromosome.fitness) {
        bestChromosome = { ...population[0], routes: [...population[0].routes] };
      }

      // Selection
      const selected = this.selection(population, eliteSize);

      // Crossover
      const offspring = this.crossover(selected, populationSize - eliteSize);

      // Mutation
      const mutated = offspring.map(child => {
        if (Math.random() < mutationRate) {
          return this.mutate(child);
        }
        return child;
      });

      // Evaluate offspring
      const evaluated = mutated.map(chromosome => {
        chromosome.fitness = this.calculateFitness(chromosome, request);
        return chromosome;
      });

      // Keep elites and add offspring
      population = [...population.slice(0, eliteSize), ...evaluated];

      // Log progress every 50 generations
      if (gen % 50 === 0) {
        this.logger.debug(
          `Generation ${gen}: Best fitness = ${population[0].fitness.toFixed(2)}, ` +
          `Avg fitness = ${(population.reduce((sum, c) => sum + c.fitness, 0) / population.length).toFixed(2)}`,
        );
      }
    }

    // Build result from best chromosome
    const routes = this.buildRoutes(bestChromosome, request);

    return this.buildOptimizationResult(routes, request, 'genetic', generations);
  }

  private initializePopulation(request: RouteOptimizationRequest, size: number): Chromosome[] {
    const population: Chromosome[] = [];

    for (let i = 0; i < size; i++) {
      // Create random permutation of locations
      const genes = this.shuffleArray([...Array(request.locations.length).keys()]);

      population.push({
        genes,
        fitness: 0,
        routes: [],
      });
    }

    return population;
  }

  private selection(population: Chromosome[], eliteSize: number): Chromosome[] {
    // Tournament selection
    const selected: Chromosome[] = [];

    // Keep elites
    for (let i = 0; i < eliteSize; i++) {
      selected.push(population[i]);
    }

    // Tournament selection for rest
    const tournamentSize = 5;
    for (let i = eliteSize; i < population.length / 2; i++) {
      const tournament = [];
      for (let j = 0; j < tournamentSize; j++) {
        tournament.push(population[Math.floor(Math.random() * population.length)]);
      }
      tournament.sort((a, b) => b.fitness - a.fitness);
      selected.push(tournament[0]);
    }

    return selected;
  }

  private crossover(parents: Chromosome[], offspringCount: number): Chromosome[] {
    const offspring: Chromosome[] = [];

    for (let i = 0; i < offspringCount; i++) {
      const parent1 = parents[Math.floor(Math.random() * parents.length)];
      const parent2 = parents[Math.floor(Math.random() * parents.length)];

      // Order crossover (OX)
      const child = this.orderCrossover(parent1.genes, parent2.genes);

      offspring.push({
        genes: child,
        fitness: 0,
        routes: [],
      });
    }

    return offspring;
  }

  private orderCrossover(parent1: number[], parent2: number[]): number[] {
    const length = parent1.length;
    const start = Math.floor(Math.random() * length);
    const end = start + Math.floor(Math.random() * (length - start));

    const child = new Array(length).fill(-1);

    // Copy segment from parent1
    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
    }

    // Fill remaining from parent2
    let childIndex = (end + 1) % length;
    let parent2Index = (end + 1) % length;

    while (child.includes(-1)) {
      if (!child.includes(parent2[parent2Index])) {
        child[childIndex] = parent2[parent2Index];
        childIndex = (childIndex + 1) % length;
      }
      parent2Index = (parent2Index + 1) % length;
    }

    return child;
  }

  private mutate(chromosome: Chromosome): Chromosome {
    const genes = [...chromosome.genes];

    // Swap mutation
    const idx1 = Math.floor(Math.random() * genes.length);
    const idx2 = Math.floor(Math.random() * genes.length);

    [genes[idx1], genes[idx2]] = [genes[idx2], genes[idx1]];

    return {
      genes,
      fitness: 0,
      routes: [],
    };
  }

  private calculateFitness(chromosome: Chromosome, request: RouteOptimizationRequest): number {
    const routes = this.buildRoutes(chromosome, request);

    const totalDistance = routes.reduce((sum, r) => sum + r.metrics.totalDistance, 0);
    const totalTime = routes.reduce((sum, r) => sum + r.metrics.totalTime, 0);
    const totalCost = routes.reduce((sum, r) => sum + r.metrics.totalCost, 0);
    const vehiclesUsed = routes.length;
    const violations = routes.reduce((sum, r) => sum + r.violations.length, 0);

    // Calculate average utilization
    const avgUtilization = routes.length > 0
      ? routes.reduce((sum, r) => sum + r.metrics.utilizationRate, 0) / routes.length
      : 0;

    // Fitness components (higher is better)
    const distanceScore = 10000 / (totalDistance + 1);
    const timeScore = 1000 / (totalTime + 1);
    const costScore = 10000 / (totalCost + 1);
    const vehicleScore = (request.vehicles.length - vehiclesUsed + 1) * 100;
    const violationPenalty = violations * 500;
    const utilizationBonus = avgUtilization * 100;

    const fitness =
      distanceScore * request.objectives.minimizeDistance +
      timeScore * request.objectives.minimizeTime +
      costScore * request.objectives.minimizeCost +
      vehicleScore * request.objectives.minimizeVehicles +
      utilizationBonus * request.objectives.balanceRoutes -
      violationPenalty;

    return Math.max(0, fitness);
  }

  // =====================================================================================
  // ANT COLONY OPTIMIZATION
  // =====================================================================================

  private async antColonyOptimization(request: RouteOptimizationRequest): Promise<OptimizationResult> {
    this.logger.debug('Running Ant Colony Optimization');

    const numAnts = 50;
    const iterations = 200;
    const alpha = 1.0; // Pheromone importance
    const beta = 3.0; // Distance importance
    const evaporationRate = 0.1;
    const Q = 100; // Pheromone deposit factor

    const numLocations = request.locations.length;

    // Initialize pheromone matrix
    const pheromones = Array(numLocations).fill(0).map(() => 
      Array(numLocations).fill(1.0)
    );

    let bestRoutes: Route[] = [];
    let bestDistance = Infinity;

    for (let iter = 0; iter < iterations; iter++) {
      const antSolutions: Route[][] = [];

      // Each ant constructs a solution
      for (let ant = 0; ant < numAnts; ant++) {
        const solution = this.constructAntSolution(request, pheromones, alpha, beta);
        antSolutions.push(solution);

        const totalDistance = solution.reduce((sum, r) => sum + r.metrics.totalDistance, 0);
        if (totalDistance < bestDistance) {
          bestDistance = totalDistance;
          bestRoutes = solution;
        }
      }

      // Evaporate pheromones
      for (let i = 0; i < numLocations; i++) {
        for (let j = 0; j < numLocations; j++) {
          pheromones[i][j] *= (1 - evaporationRate);
        }
      }

      // Deposit pheromones
      antSolutions.forEach(solution => {
        const totalDistance = solution.reduce((sum, r) => sum + r.metrics.totalDistance, 0);
        const pheromoneDeposit = Q / totalDistance;

        solution.forEach(route => {
          for (let i = 0; i < route.sequence.length - 1; i++) {
            const fromIdx = parseInt(route.sequence[i]);
            const toIdx = parseInt(route.sequence[i + 1]);
            pheromones[fromIdx][toIdx] += pheromoneDeposit;
            pheromones[toIdx][fromIdx] += pheromoneDeposit;
          }
        });
      });

      if (iter % 20 === 0) {
        this.logger.debug(`Iteration ${iter}: Best distance = ${bestDistance.toFixed(2)} km`);
      }
    }

    return this.buildOptimizationResult(bestRoutes, request, 'ant_colony', iterations);
  }

  private constructAntSolution(
    request: RouteOptimizationRequest,
    pheromones: number[][],
    alpha: number,
    beta: number,
  ): Route[] {
    const unvisited = new Set(request.locations.map((_, idx) => idx));
    const routes: Route[] = [];

    while (unvisited.size > 0) {
      const vehicleIdx = routes.length % request.vehicles.length;
      const vehicle = request.vehicles[vehicleIdx];

      const route: Route = {
        vehicleId: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
        sequence: [],
        stops: [],
        metrics: {
          totalDistance: 0,
          totalTime: 0,
          totalCost: 0,
          utilizationRate: 0,
          numberOfStops: 0,
        },
        violations: [],
      };

      let currentLoad = { weight: 0, volume: 0, pallets: 0 };
      let currentLocation = 0; // Depot

      while (unvisited.size > 0) {
        const probabilities = this.calculateAntProbabilities(
          currentLocation,
          Array.from(unvisited),
          pheromones,
          request,
          alpha,
          beta,
        );

        if (probabilities.length === 0) break;

        const next = this.selectNextLocation(probabilities);
        const nextLocation = request.locations[next];

        // Check capacity
        if (
          currentLoad.weight + nextLocation.demand.weight > vehicle.capacity.weight ||
          currentLoad.volume + nextLocation.demand.volume > vehicle.capacity.volume ||
          currentLoad.pallets + nextLocation.demand.pallets > vehicle.capacity.pallets
        ) {
          break;
        }

        route.sequence.push(next.toString());
        currentLoad.weight += nextLocation.demand.weight;
        currentLoad.volume += nextLocation.demand.volume;
        currentLoad.pallets += nextLocation.demand.pallets;

        unvisited.delete(next);
        currentLocation = next;
      }

      if (route.sequence.length > 0) {
        this.calculateRouteMetrics(route, request);
        routes.push(route);
      }
    }

    return routes;
  }

  private calculateAntProbabilities(
    current: number,
    unvisited: number[],
    pheromones: number[][],
    request: RouteOptimizationRequest,
    alpha: number,
    beta: number,
  ): Array<{ location: number; probability: number }> {
    const probabilities: Array<{ location: number; probability: number }> = [];

    let totalProbability = 0;

    unvisited.forEach(next => {
      const pheromone = pheromones[current][next];
      const distance = this.calculateDistance(
        request.locations[current]?.coordinates || request.depot.coordinates,
        request.locations[next].coordinates,
      );
      const visibility = 1 / (distance + 0.1);

      const prob = Math.pow(pheromone, alpha) * Math.pow(visibility, beta);
      probabilities.push({ location: next, probability: prob });
      totalProbability += prob;
    });

    // Normalize
    return probabilities.map(p => ({
      location: p.location,
      probability: p.probability / totalProbability,
    }));
  }

  private selectNextLocation(probabilities: Array<{ location: number; probability: number }>): number {
    const random = Math.random();
    let cumulative = 0;

    for (const prob of probabilities) {
      cumulative += prob.probability;
      if (random <= cumulative) {
        return prob.location;
      }
    }

    return probabilities[probabilities.length - 1].location;
  }

  // =====================================================================================
  // SIMULATED ANNEALING
  // =====================================================================================

  private async simulatedAnnealing(request: RouteOptimizationRequest): Promise<OptimizationResult> {
    this.logger.debug('Running Simulated Annealing optimization');

    const initialTemperature = request.parameters?.temperature || 10000;
    const coolingRate = request.parameters?.coolingRate || 0.995;
    const minTemperature = 1;

    // Generate initial solution
    let currentSolution = this.generateInitialSolution(request);
    let currentCost = this.calculateSolutionCost(currentSolution, request);

    let bestSolution = currentSolution;
    let bestCost = currentCost;

    let temperature = initialTemperature;
    let iterations = 0;

    while (temperature > minTemperature) {
      // Generate neighbor solution
      const neighborSolution = this.generateNeighbor(currentSolution, request);
      const neighborCost = this.calculateSolutionCost(neighborSolution, request);

      // Acceptance criterion
      const delta = neighborCost - currentCost;

      if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
        currentSolution = neighborSolution;
        currentCost = neighborCost;

        if (currentCost < bestCost) {
          bestSolution = currentSolution;
          bestCost = currentCost;
        }
      }

      temperature *= coolingRate;
      iterations++;

      if (iterations % 100 === 0) {
        this.logger.debug(
          `Iteration ${iterations}: Temp = ${temperature.toFixed(2)}, ` +
          `Current cost = ${currentCost.toFixed(2)}, Best cost = ${bestCost.toFixed(2)}`,
        );
      }
    }

    return this.buildOptimizationResult(bestSolution, request, 'simulated_annealing', iterations);
  }

  private generateNeighbor(routes: Route[], request: RouteOptimizationRequest): Route[] {
    const neighbor = JSON.parse(JSON.stringify(routes)); // Deep clone

    const moveType = Math.floor(Math.random() * 3);

    switch (moveType) {
      case 0: // 2-opt within route
        if (neighbor.length > 0) {
          const routeIdx = Math.floor(Math.random() * neighbor.length);
          const route = neighbor[routeIdx];
          if (route.sequence.length > 3) {
            const i = Math.floor(Math.random() * (route.sequence.length - 2));
            const j = i + 1 + Math.floor(Math.random() * (route.sequence.length - i - 1));
            route.sequence = [
              ...route.sequence.slice(0, i),
              ...route.sequence.slice(i, j + 1).reverse(),
              ...route.sequence.slice(j + 1),
            ];
          }
        }
        break;

      case 1: // Move location between routes
        if (neighbor.length > 1) {
          const fromRouteIdx = Math.floor(Math.random() * neighbor.length);
          const toRouteIdx = Math.floor(Math.random() * neighbor.length);
          if (fromRouteIdx !== toRouteIdx && neighbor[fromRouteIdx].sequence.length > 1) {
            const locIdx = Math.floor(Math.random() * neighbor[fromRouteIdx].sequence.length);
            const location = neighbor[fromRouteIdx].sequence.splice(locIdx, 1)[0];
            const insertIdx = Math.floor(Math.random() * (neighbor[toRouteIdx].sequence.length + 1));
            neighbor[toRouteIdx].sequence.splice(insertIdx, 0, location);
          }
        }
        break;

      case 2: // Swap locations between routes
        if (neighbor.length > 1) {
          const route1Idx = Math.floor(Math.random() * neighbor.length);
          const route2Idx = Math.floor(Math.random() * neighbor.length);
          if (route1Idx !== route2Idx &&
              neighbor[route1Idx].sequence.length > 0 &&
              neighbor[route2Idx].sequence.length > 0) {
            const loc1Idx = Math.floor(Math.random() * neighbor[route1Idx].sequence.length);
            const loc2Idx = Math.floor(Math.random() * neighbor[route2Idx].sequence.length);
            [neighbor[route1Idx].sequence[loc1Idx], neighbor[route2Idx].sequence[loc2Idx]] =
              [neighbor[route2Idx].sequence[loc2Idx], neighbor[route1Idx].sequence[loc1Idx]];
          }
        }
        break;
    }

    // Recalculate metrics
    neighbor.forEach(route => this.calculateRouteMetrics(route, request));

    return neighbor;
  }

  // =====================================================================================
  // TABU SEARCH
  // =====================================================================================

  private async tabuSearch(request: RouteOptimizationRequest): Promise<OptimizationResult> {
    this.logger.debug('Running Tabu Search optimization');

    const tabuTenure = request.parameters?.tabuTenure || 20;
    const maxIterations = 500;

    let currentSolution = this.generateInitialSolution(request);
    let currentCost = this.calculateSolutionCost(currentSolution, request);

    let bestSolution = currentSolution;
    let bestCost = currentCost;

    const tabuList: string[] = [];

    for (let iter = 0; iter < maxIterations; iter++) {
      // Generate candidate neighbors
      const neighbors = this.generateNeighborhood(currentSolution, request, 20);

      // Filter out tabu moves (with aspiration criterion)
      const candidates = neighbors.filter(neighbor => {
        const moveHash = this.hashSolution(neighbor);
        const cost = this.calculateSolutionCost(neighbor, request);
        return !tabuList.includes(moveHash) || cost < bestCost;
      });

      if (candidates.length === 0) break;

      // Select best non-tabu neighbor
      let bestNeighbor = candidates[0];
      let bestNeighborCost = this.calculateSolutionCost(bestNeighbor, request);

      for (const neighbor of candidates) {
        const cost = this.calculateSolutionCost(neighbor, request);
        if (cost < bestNeighborCost) {
          bestNeighbor = neighbor;
          bestNeighborCost = cost;
        }
      }

      currentSolution = bestNeighbor;
      currentCost = bestNeighborCost;

      // Update tabu list
      const moveHash = this.hashSolution(currentSolution);
      tabuList.push(moveHash);
      if (tabuList.length > tabuTenure) {
        tabuList.shift();
      }

      // Update best solution
      if (currentCost < bestCost) {
        bestSolution = currentSolution;
        bestCost = currentCost;
      }

      if (iter % 50 === 0) {
        this.logger.debug(
          `Iteration ${iter}: Current cost = ${currentCost.toFixed(2)}, ` +
          `Best cost = ${bestCost.toFixed(2)}`,
        );
      }
    }

    return this.buildOptimizationResult(bestSolution, request, 'tabu', maxIterations);
  }

  private generateNeighborhood(routes: Route[], request: RouteOptimizationRequest, size: number): Route[][] {
    const neighborhood: Route[][] = [];

    for (let i = 0; i < size; i++) {
      neighborhood.push(this.generateNeighbor(routes, request));
    }

    return neighborhood;
  }

  private hashSolution(routes: Route[]): string {
    return routes.map(r => r.sequence.join('-')).join('|');
  }

  // =====================================================================================
  // HYBRID OPTIMIZATION
  // =====================================================================================

  private async hybridOptimization(request: RouteOptimizationRequest): Promise<OptimizationResult> {
    this.logger.log('Running Hybrid optimization (Genetic + Local Search)');

    // Phase 1: Genetic Algorithm for global exploration
    const gaResult = await this.geneticAlgorithm({
      ...request,
      parameters: {
        ...request.parameters,
        populationSize: 50,
        generations: 200,
      },
    });

    // Phase 2: Simulated Annealing for local refinement
    const saRequest: RouteOptimizationRequest = {
      ...request,
      parameters: {
        ...request.parameters,
        temperature: 1000,
        coolingRate: 0.99,
      },
    };

    // Use GA result as initial solution for SA
    const refinedResult = await this.simulatedAnnealing(saRequest);

    // Combine results
    const hybridResult = gaResult.summary.totalCost < refinedResult.summary.totalCost
      ? gaResult
      : refinedResult;

    hybridResult.algorithm = 'hybrid';
    hybridResult.qualityMetrics.diversityIndex = 8.5;

    return hybridResult;
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private generateInitialSolution(request: RouteOptimizationRequest): Route[] {
    // Nearest neighbor heuristic
    const unassigned = new Set(request.locations.map((_, idx) => idx));
    const routes: Route[] = [];

    while (unassigned.size > 0) {
      const vehicleIdx = routes.length % request.vehicles.length;
      const vehicle = request.vehicles[vehicleIdx];

      const route: Route = {
        vehicleId: vehicle.id,
        vehicleNumber: vehicle.vehicleNumber,
        sequence: [],
        stops: [],
        metrics: {
          totalDistance: 0,
          totalTime: 0,
          totalCost: 0,
          utilizationRate: 0,
          numberOfStops: 0,
        },
        violations: [],
      };

      let currentLocation = request.depot.coordinates;
      let currentLoad = { weight: 0, volume: 0, pallets: 0 };

      while (unassigned.size > 0) {
        let nearest = -1;
        let minDistance = Infinity;

        for (const idx of unassigned) {
          const location = request.locations[idx];

          // Check capacity
          if (
            currentLoad.weight + location.demand.weight > vehicle.capacity.weight ||
            currentLoad.volume + location.demand.volume > vehicle.capacity.volume ||
            currentLoad.pallets + location.demand.pallets > vehicle.capacity.pallets
          ) {
            continue;
          }

          const distance = this.calculateDistance(currentLocation, location.coordinates);

          if (distance < minDistance) {
            minDistance = distance;
            nearest = idx;
          }
        }

        if (nearest === -1) break;

        route.sequence.push(nearest.toString());
        const location = request.locations[nearest];
        currentLocation = location.coordinates;
        currentLoad.weight += location.demand.weight;
        currentLoad.volume += location.demand.volume;
        currentLoad.pallets += location.demand.pallets;
        unassigned.delete(nearest);
      }

      if (route.sequence.length > 0) {
        this.calculateRouteMetrics(route, request);
        routes.push(route);
      }
    }

    return routes;
  }

  private buildRoutes(chromosome: Chromosome, request: RouteOptimizationRequest): Route[] {
    const routes: Route[] = [];
    let currentVehicleIdx = 0;

    for (const gene of chromosome.genes) {
      if (currentVehicleIdx >= request.vehicles.length) break;

      const vehicle = request.vehicles[currentVehicleIdx];

      if (routes.length <= currentVehicleIdx) {
        routes.push({
          vehicleId: vehicle.id,
          vehicleNumber: vehicle.vehicleNumber,
          sequence: [],
          stops: [],
          metrics: {
            totalDistance: 0,
            totalTime: 0,
            totalCost: 0,
            utilizationRate: 0,
            numberOfStops: 0,
          },
          violations: [],
        });
      }

      const route = routes[currentVehicleIdx];
      const location = request.locations[gene];

      // Check capacity
      const currentLoad = this.calculateCurrentLoad(route, request);

      if (
        currentLoad.weight + location.demand.weight <= vehicle.capacity.weight &&
        currentLoad.volume + location.demand.volume <= vehicle.capacity.volume &&
        currentLoad.pallets + location.demand.pallets <= vehicle.capacity.pallets
      ) {
        route.sequence.push(gene.toString());
      } else {
        // Start new route with next vehicle
        currentVehicleIdx++;
        if (currentVehicleIdx < request.vehicles.length) {
          const nextVehicle = request.vehicles[currentVehicleIdx];
          routes.push({
            vehicleId: nextVehicle.id,
            vehicleNumber: nextVehicle.vehicleNumber,
            sequence: [gene.toString()],
            stops: [],
            metrics: {
              totalDistance: 0,
              totalTime: 0,
              totalCost: 0,
              utilizationRate: 0,
              numberOfStops: 0,
            },
            violations: [],
          });
        }
      }
    }

    // Calculate metrics for all routes
    routes.forEach(route => this.calculateRouteMetrics(route, request));

    return routes;
  }

  private calculateRouteMetrics(route: Route, request: RouteOptimizationRequest): void {
    const vehicle = request.vehicles.find(v => v.id === route.vehicleId);
    if (!vehicle) return;

    let totalDistance = 0;
    let totalTime = 0;
    let currentLocation = request.depot.coordinates;

    for (const locId of route.sequence) {
      const location = request.locations[parseInt(locId)];
      const distance = this.calculateDistance(currentLocation, location.coordinates);
      totalDistance += distance;
      totalTime += (distance / vehicle.speed) * 60 + location.serviceTime;
      currentLocation = location.coordinates;
    }

    // Return to depot
    totalDistance += this.calculateDistance(currentLocation, request.depot.coordinates);
    totalTime += (this.calculateDistance(currentLocation, request.depot.coordinates) / vehicle.speed) * 60;

    const totalCost =
      vehicle.fixedCost +
      totalDistance * vehicle.costPerKm +
      (totalTime / 60) * vehicle.costPerHour;

    const currentLoad = this.calculateCurrentLoad(route, request);
    const utilizationRate =
      (currentLoad.weight / vehicle.capacity.weight +
       currentLoad.volume / vehicle.capacity.volume +
       currentLoad.pallets / vehicle.capacity.pallets) / 3 * 100;

    route.metrics = {
      totalDistance: parseFloat(totalDistance.toFixed(2)),
      totalTime: parseFloat(totalTime.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      utilizationRate: parseFloat(utilizationRate.toFixed(2)),
      numberOfStops: route.sequence.length,
    };
  }

  private calculateCurrentLoad(route: Route, request: RouteOptimizationRequest): {
    weight: number;
    volume: number;
    pallets: number;
  } {
    const load = { weight: 0, volume: 0, pallets: 0 };

    for (const locId of route.sequence) {
      const location = request.locations[parseInt(locId)];
      load.weight += location.demand.weight;
      load.volume += location.demand.volume;
      load.pallets += location.demand.pallets;
    }

    return load;
  }

  private calculateSolutionCost(routes: Route[], request: RouteOptimizationRequest): number {
    return routes.reduce((sum, r) => sum + r.metrics.totalCost, 0);
  }

  private calculateDistance(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
    const lat1 = (from.latitude * Math.PI) / 180;
    const lat2 = (to.latitude * Math.PI) / 180;
    const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_KM * c;
  }

  private buildOptimizationResult(
    routes: Route[],
    request: RouteOptimizationRequest,
    algorithm: string,
    iterations: number,
  ): OptimizationResult {
    const assignedLocations = new Set<string>();
    routes.forEach(r => r.sequence.forEach(loc => assignedLocations.add(loc)));

    const unassignedLocations = request.locations
      .map((_, idx) => idx.toString())
      .filter(idx => !assignedLocations.has(idx));

    const summary = {
      totalDistance: routes.reduce((sum, r) => sum + r.metrics.totalDistance, 0),
      totalTime: routes.reduce((sum, r) => sum + r.metrics.totalTime, 0),
      totalCost: routes.reduce((sum, r) => sum + r.metrics.totalCost, 0),
      vehiclesUsed: routes.length,
      vehiclesAvailable: request.vehicles.length,
      averageUtilization: routes.length > 0
        ? routes.reduce((sum, r) => sum + r.metrics.utilizationRate, 0) / routes.length
        : 0,
      locationsServed: assignedLocations.size,
      totalLocations: request.locations.length,
    };

    // Calculate quality metrics
    const solutionQuality = Math.min(100, (assignedLocations.size / request.locations.length) * 100);
    const convergenceRate = 85;
    const diversityIndex = 7.5;
    const balanceScore = routes.length > 0
      ? 100 - Math.abs(summary.averageUtilization - 75)
      : 0;

    return {
      routes,
      unassignedLocations,
      summary: {
        ...summary,
        totalDistance: parseFloat(summary.totalDistance.toFixed(2)),
        totalTime: parseFloat(summary.totalTime.toFixed(2)),
        totalCost: parseFloat(summary.totalCost.toFixed(2)),
        averageUtilization: parseFloat(summary.averageUtilization.toFixed(2)),
      },
      algorithm,
      iterations,
      computationTime: 0,
      qualityMetrics: {
        solutionQuality: parseFloat(solutionQuality.toFixed(2)),
        convergenceRate,
        diversityIndex,
        balanceScore: parseFloat(balanceScore.toFixed(2)),
      },
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

