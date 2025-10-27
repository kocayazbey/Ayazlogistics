import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Vehicle {
  id: string;
  type: 'truck' | 'van' | 'motorcycle' | 'car';
  capacity: {
    weight: number; // kg
    volume: number; // m³
    pallets: number;
    dimensions: {
      length: number; // meters
      width: number; // meters
      height: number; // meters
    };
  };
  specifications: {
    fuelType: 'gasoline' | 'diesel' | 'hybrid' | 'electric';
    fuelConsumption: number; // L/100km
    maxSpeed: number; // km/h
    enginePower: number; // HP
    emissionClass: 'Euro1' | 'Euro2' | 'Euro3' | 'Euro4' | 'Euro5' | 'Euro6';
  };
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  location: {
    lat: number;
    lon: number;
    address: string;
  };
  driver: {
    id: string;
    name: string;
    license: string;
    experience: number; // years
    rating: number; // 0-5
  };
  maintenance: {
    lastService: Date;
    nextService: Date;
    mileage: number; // km
    condition: 'excellent' | 'good' | 'fair' | 'poor';
  };
  costs: {
    fixed: number; // daily
    variable: number; // per km
    fuel: number; // per liter
    maintenance: number; // per km
  };
}

interface Delivery {
  id: string;
  customer: {
    id: string;
    name: string;
    address: string;
    coordinates: { lat: number; lon: number };
    contact: string;
    preferences: string[];
  };
  items: DeliveryItem[];
  constraints: {
    timeWindow: {
      start: Date;
      end: Date;
    };
    priority: 'low' | 'medium' | 'high' | 'urgent';
    specialRequirements: string[];
    temperature: 'ambient' | 'cool' | 'cold' | 'frozen';
    fragility: 'low' | 'medium' | 'high';
    hazardous: boolean;
  };
  pickup: {
    location: { lat: number; lon: number };
    timeWindow: { start: Date; end: Date };
    estimatedDuration: number; // minutes
  };
  dropoff: {
    location: { lat: number; lon: number };
    timeWindow: { start: Date; end: Date };
    estimatedDuration: number; // minutes
  };
  distance: number; // km
  estimatedDuration: number; // minutes
  cost: number; // currency
}

interface DeliveryItem {
  id: string;
  name: string;
  quantity: number;
  weight: number; // kg
  volume: number; // m³
  dimensions: {
    length: number; // meters
    width: number; // meters
    height: number; // meters
  };
  fragility: 'low' | 'medium' | 'high';
  temperature: 'ambient' | 'cool' | 'cold' | 'frozen';
  hazardous: boolean;
  value: number; // currency
}

interface Assignment {
  id: string;
  vehicleId: string;
  deliveryId: string;
  startTime: Date;
  endTime: Date;
  route: RoutePoint[];
  cost: number;
  efficiency: number; // 0-1
  feasibility: boolean;
  violations: string[];
}

interface RoutePoint {
  lat: number;
  lon: number;
  address: string;
  type: 'pickup' | 'dropoff' | 'waypoint';
  timeWindow: { start: Date; end: Date };
  estimatedDuration: number; // minutes
  order: number;
}

interface OptimizationResult {
  assignments: Assignment[];
  summary: {
    totalVehicles: number;
    assignedVehicles: number;
    totalDeliveries: number;
    assignedDeliveries: number;
    totalCost: number;
    totalDistance: number;
    totalTime: number;
    averageEfficiency: number;
    averageUtilization: number;
  };
  performance: {
    coverage: number; // percentage
    utilization: number; // percentage
    costEfficiency: number; // 0-1
    timeEfficiency: number; // 0-1
    customerSatisfaction: number; // 0-1
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface OptimizationConstraints {
  maxCost: number;
  maxDistance: number;
  maxTime: number; // hours
  minEfficiency: number;
  maxViolations: number;
  priorityWeight: number;
  costWeight: number;
  timeWeight: number;
  qualityWeight: number;
  environmentalWeight: number;
}

@Injectable()
export class VehicleAssignmentAlgorithmService {
  private readonly logger = new Logger(VehicleAssignmentAlgorithmService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimizeVehicleAssignment(
    vehicles: Vehicle[],
    deliveries: Delivery[],
    constraints: OptimizationConstraints,
    options: {
      algorithm: 'hungarian' | 'genetic' | 'simulated_annealing' | 'linear_programming' | 'hybrid';
      includeRealTime: boolean;
      includeTraffic: boolean;
      includeWeather: boolean;
      includeCustomerPreferences: boolean;
      includeEnvironmental: boolean;
      maxIterations: number;
      timeLimit: number; // minutes
    },
  ): Promise<OptimizationResult> {
    this.logger.log(`Optimizing vehicle assignment for ${vehicles.length} vehicles and ${deliveries.length} deliveries`);

    // Preprocess data
    const processedData = this.preprocessData(vehicles, deliveries, constraints);
    
    // Generate initial solution
    const initialSolution = this.generateInitialSolution(processedData, constraints);
    
    // Optimize using selected algorithm
    let optimizedSolution: Assignment[];
    
    switch (options.algorithm) {
      case 'hungarian':
        optimizedSolution = this.optimizeHungarian(initialSolution, processedData, constraints);
        break;
        
      case 'genetic':
        optimizedSolution = await this.optimizeGenetic(initialSolution, processedData, constraints, options);
        break;
        
      case 'simulated_annealing':
        optimizedSolution = await this.optimizeSimulatedAnnealing(initialSolution, processedData, constraints, options);
        break;
        
      case 'linear_programming':
        optimizedSolution = await this.optimizeLinearProgramming(initialSolution, processedData, constraints, options);
        break;
        
      case 'hybrid':
        optimizedSolution = await this.optimizeHybrid(initialSolution, processedData, constraints, options);
        break;
        
      default:
        optimizedSolution = initialSolution;
    }
    
    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(optimizedSolution, processedData);
    
    // Generate summary
    const summary = this.calculateSummary(optimizedSolution, processedData);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(optimizedSolution, performance, constraints);
    
    const result: OptimizationResult = {
      assignments: optimizedSolution,
      summary,
      performance,
      recommendations,
    };

    await this.saveOptimizationResult(result);
    await this.eventBus.emit('vehicle.assignment.optimized', { result });

    return result;
  }

  private preprocessData(
    vehicles: Vehicle[],
    deliveries: Delivery[],
    constraints: OptimizationConstraints,
  ): any {
    // Filter available vehicles
    const availableVehicles = vehicles.filter(vehicle => 
      vehicle.status === 'available' &&
      vehicle.maintenance.condition !== 'poor'
    );
    
    // Filter feasible deliveries
    const feasibleDeliveries = deliveries.filter(delivery => 
      delivery.constraints.timeWindow.end > new Date() &&
      delivery.cost <= constraints.maxCost
    );
    
    // Sort deliveries by priority
    const sortedDeliveries = feasibleDeliveries.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.constraints.priority] - priorityOrder[a.constraints.priority];
    });
    
    return {
      vehicles: availableVehicles,
      deliveries: sortedDeliveries,
      constraints,
    };
  }

  private generateInitialSolution(processedData: any, constraints: OptimizationConstraints): Assignment[] {
    const assignments: Assignment[] = [];
    const { vehicles, deliveries } = processedData;
    
    // Simple greedy assignment
    for (const delivery of deliveries) {
      const suitableVehicles = this.findSuitableVehicles(vehicles, delivery, constraints);
      
      if (suitableVehicles.length > 0) {
        const bestVehicle = this.selectBestVehicle(suitableVehicles, delivery, constraints);
        const assignment = this.createAssignment(bestVehicle, delivery, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private findSuitableVehicles(
    vehicles: Vehicle[],
    delivery: Delivery,
    constraints: OptimizationConstraints,
  ): Vehicle[] {
    return vehicles.filter(vehicle => {
      // Check capacity constraints
      const totalWeight = delivery.items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
      const totalVolume = delivery.items.reduce((sum, item) => sum + item.volume * item.quantity, 0);
      
      if (totalWeight > vehicle.capacity.weight || totalVolume > vehicle.capacity.volume) {
        return false;
      }
      
      // Check special requirements
      if (delivery.constraints.temperature !== 'ambient' && vehicle.specifications.fuelType === 'electric') {
        return false; // Electric vehicles may not have temperature control
      }
      
      if (delivery.constraints.hazardous && vehicle.specifications.emissionClass === 'Euro1') {
        return false; // Old vehicles may not be suitable for hazardous materials
      }
      
      // Check driver qualifications
      if (delivery.constraints.hazardous && !vehicle.driver.license.includes('hazardous')) {
        return false;
      }
      
      return true;
    });
  }

  private selectBestVehicle(
    vehicles: Vehicle[],
    delivery: Delivery,
    constraints: OptimizationConstraints,
  ): Vehicle {
    let bestVehicle = vehicles[0];
    let bestScore = this.calculateVehicleScore(vehicles[0], delivery, constraints);
    
    for (let i = 1; i < vehicles.length; i++) {
      const score = this.calculateVehicleScore(vehicles[i], delivery, constraints);
      if (score > bestScore) {
        bestScore = score;
        bestVehicle = vehicles[i];
      }
    }
    
    return bestVehicle;
  }

  private calculateVehicleScore(
    vehicle: Vehicle,
    delivery: Delivery,
    constraints: OptimizationConstraints,
  ): number {
    let score = 0;
    
    // Cost score (lower is better)
    const costScore = 100 / (vehicle.costs.fixed + vehicle.costs.variable * delivery.distance + 1);
    score += costScore * constraints.costWeight;
    
    // Efficiency score
    const efficiencyScore = vehicle.driver.rating / 5;
    score += efficiencyScore * constraints.qualityWeight;
    
    // Environmental score
    const environmentalScore = this.calculateEnvironmentalScore(vehicle);
    score += environmentalScore * constraints.environmentalWeight;
    
    // Distance score (closer is better)
    const distance = this.calculateDistance(vehicle.location, delivery.pickup.location);
    const distanceScore = 100 / (distance + 1);
    score += distanceScore * constraints.timeWeight;
    
    // Capacity utilization score
    const totalWeight = delivery.items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const totalVolume = delivery.items.reduce((sum, item) => sum + item.volume * item.quantity, 0);
    const weightUtilization = totalWeight / vehicle.capacity.weight;
    const volumeUtilization = totalVolume / vehicle.capacity.volume;
    const utilizationScore = (weightUtilization + volumeUtilization) / 2;
    score += utilizationScore * 50;
    
    return score;
  }

  private calculateEnvironmentalScore(vehicle: Vehicle): number {
    const emissionScores = {
      'Euro1': 0.2,
      'Euro2': 0.4,
      'Euro3': 0.6,
      'Euro4': 0.8,
      'Euro5': 0.9,
      'Euro6': 1.0,
    };
    
    const fuelScores = {
      'electric': 1.0,
      'hybrid': 0.8,
      'diesel': 0.6,
      'gasoline': 0.4,
    };
    
    const emissionScore = emissionScores[vehicle.specifications.emissionClass] || 0;
    const fuelScore = fuelScores[vehicle.specifications.fuelType] || 0;
    
    return (emissionScore + fuelScore) / 2;
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

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private createAssignment(
    vehicle: Vehicle,
    delivery: Delivery,
    constraints: OptimizationConstraints,
  ): Assignment {
    const assignmentId = `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate route
    const route = this.calculateRoute(vehicle, delivery);
    
    // Calculate costs
    const cost = this.calculateAssignmentCost(vehicle, delivery, route);
    
    // Calculate efficiency
    const efficiency = this.calculateAssignmentEfficiency(vehicle, delivery, route);
    
    // Check feasibility
    const feasibility = this.checkAssignmentFeasibility(vehicle, delivery, route, constraints);
    
    // Identify violations
    const violations = this.identifyViolations(vehicle, delivery, route, constraints);
    
    return {
      id: assignmentId,
      vehicleId: vehicle.id,
      deliveryId: delivery.id,
      startTime: delivery.pickup.timeWindow.start,
      endTime: delivery.dropoff.timeWindow.end,
      route,
      cost,
      efficiency,
      feasibility,
      violations,
    };
  }

  private calculateRoute(vehicle: Vehicle, delivery: Delivery): RoutePoint[] {
    const route: RoutePoint[] = [];
    
    // Add pickup point
    route.push({
      lat: delivery.pickup.location.lat,
      lon: delivery.pickup.location.lon,
      address: 'Pickup Location',
      type: 'pickup',
      timeWindow: delivery.pickup.timeWindow,
      estimatedDuration: delivery.pickup.estimatedDuration,
      order: 1,
    });
    
    // Add dropoff point
    route.push({
      lat: delivery.dropoff.location.lat,
      lon: delivery.dropoff.location.lon,
      address: delivery.customer.address,
      type: 'dropoff',
      timeWindow: delivery.dropoff.timeWindow,
      estimatedDuration: delivery.dropoff.estimatedDuration,
      order: 2,
    });
    
    return route;
  }

  private calculateAssignmentCost(vehicle: Vehicle, delivery: Delivery, route: RoutePoint[]): number {
    const distance = delivery.distance;
    const duration = delivery.estimatedDuration / 60; // hours
    
    const fixedCost = vehicle.costs.fixed;
    const variableCost = vehicle.costs.variable * distance;
    const fuelCost = (distance / 100) * vehicle.specifications.fuelConsumption * vehicle.costs.fuel;
    const maintenanceCost = vehicle.costs.maintenance * distance;
    
    return fixedCost + variableCost + fuelCost + maintenanceCost;
  }

  private calculateAssignmentEfficiency(vehicle: Vehicle, delivery: Delivery, route: RoutePoint[]): number {
    let efficiency = 0.5; // Base efficiency
    
    // Driver experience factor
    efficiency += vehicle.driver.experience * 0.05;
    
    // Vehicle condition factor
    const conditionScores = { excellent: 0.2, good: 0.1, fair: 0.0, poor: -0.1 };
    efficiency += conditionScores[vehicle.maintenance.condition];
    
    // Route efficiency factor
    const directDistance = this.calculateDistance(
      { lat: delivery.pickup.location.lat, lon: delivery.pickup.location.lon },
      { lat: delivery.dropoff.location.lat, lon: delivery.dropoff.location.lon }
    );
    const routeEfficiency = directDistance / delivery.distance;
    efficiency += routeEfficiency * 0.3;
    
    return Math.max(0, Math.min(1, efficiency));
  }

  private checkAssignmentFeasibility(
    vehicle: Vehicle,
    delivery: Delivery,
    route: RoutePoint[],
    constraints: OptimizationConstraints,
  ): boolean {
    // Check time constraints
    const totalTime = delivery.estimatedDuration / 60; // hours
    if (totalTime > constraints.maxTime) {
      return false;
    }
    
    // Check distance constraints
    if (delivery.distance > constraints.maxDistance) {
      return false;
    }
    
    // Check cost constraints
    const cost = this.calculateAssignmentCost(vehicle, delivery, route);
    if (cost > constraints.maxCost) {
      return false;
    }
    
    // Check efficiency constraints
    const efficiency = this.calculateAssignmentEfficiency(vehicle, delivery, route);
    if (efficiency < constraints.minEfficiency) {
      return false;
    }
    
    return true;
  }

  private identifyViolations(
    vehicle: Vehicle,
    delivery: Delivery,
    route: RoutePoint[],
    constraints: OptimizationConstraints,
  ): string[] {
    const violations: string[] = [];
    
    // Check time violations
    const totalTime = delivery.estimatedDuration / 60; // hours
    if (totalTime > constraints.maxTime) {
      violations.push('Exceeds maximum time limit');
    }
    
    // Check distance violations
    if (delivery.distance > constraints.maxDistance) {
      violations.push('Exceeds maximum distance limit');
    }
    
    // Check cost violations
    const cost = this.calculateAssignmentCost(vehicle, delivery, route);
    if (cost > constraints.maxCost) {
      violations.push('Exceeds maximum cost limit');
    }
    
    // Check efficiency violations
    const efficiency = this.calculateAssignmentEfficiency(vehicle, delivery, route);
    if (efficiency < constraints.minEfficiency) {
      violations.push('Below minimum efficiency threshold');
    }
    
    return violations;
  }

  private optimizeHungarian(
    initialSolution: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
  ): Assignment[] {
    // Hungarian algorithm for assignment problem
    const { vehicles, deliveries } = processedData;
    const assignments: Assignment[] = [];
    
    // Create cost matrix
    const costMatrix = this.createCostMatrix(vehicles, deliveries, constraints);
    
    // Solve using Hungarian algorithm
    const solution = this.solveHungarian(costMatrix);
    
    // Create assignments from solution
    for (let i = 0; i < solution.length; i++) {
      if (solution[i] !== -1) {
        const vehicle = vehicles[i];
        const delivery = deliveries[solution[i]];
        const assignment = this.createAssignment(vehicle, delivery, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private createCostMatrix(
    vehicles: Vehicle[],
    deliveries: Delivery[],
    constraints: OptimizationConstraints,
  ): number[][] {
    const matrix: number[][] = [];
    
    for (let i = 0; i < vehicles.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < deliveries.length; j++) {
        const vehicle = vehicles[i];
        const delivery = deliveries[j];
        
        if (this.isAssignmentFeasible(vehicle, delivery, constraints)) {
          const cost = this.calculateAssignmentCost(vehicle, delivery, []);
          matrix[i][j] = cost;
        } else {
          matrix[i][j] = Infinity;
        }
      }
    }
    
    return matrix;
  }

  private isAssignmentFeasible(
    vehicle: Vehicle,
    delivery: Delivery,
    constraints: OptimizationConstraints,
  ): boolean {
    // Check capacity constraints
    const totalWeight = delivery.items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
    const totalVolume = delivery.items.reduce((sum, item) => sum + item.volume * item.quantity, 0);
    
    if (totalWeight > vehicle.capacity.weight || totalVolume > vehicle.capacity.volume) {
      return false;
    }
    
    // Check special requirements
    if (delivery.constraints.temperature !== 'ambient' && vehicle.specifications.fuelType === 'electric') {
      return false;
    }
    
    if (delivery.constraints.hazardous && !vehicle.driver.license.includes('hazardous')) {
      return false;
    }
    
    return true;
  }

  private solveHungarian(costMatrix: number[][]): number[] {
    // Simplified Hungarian algorithm
    const n = costMatrix.length;
    const m = costMatrix[0].length;
    const assignment = new Array(n).fill(-1);
    const used = new Array(m).fill(false);
    
    for (let i = 0; i < n; i++) {
      let minCost = Infinity;
      let minIndex = -1;
      
      for (let j = 0; j < m; j++) {
        if (!used[j] && costMatrix[i][j] < minCost) {
          minCost = costMatrix[i][j];
          minIndex = j;
        }
      }
      
      if (minIndex !== -1) {
        assignment[i] = minIndex;
        used[minIndex] = true;
      }
    }
    
    return assignment;
  }

  private async optimizeGenetic(
    initialSolution: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
    options: any,
  ): Promise<Assignment[]> {
    const populationSize = 50;
    const generations = options.maxIterations || 100;
    const mutationRate = 0.1;
    const crossoverRate = 0.8;
    
    // Initialize population
    let population = this.initializePopulation(initialSolution, populationSize, processedData, constraints);
    
    for (let generation = 0; generation < generations; generation++) {
      // Evaluate fitness
      const fitnessScores = population.map(individual => ({
        individual,
        fitness: this.calculateFitness(individual, processedData, constraints),
      }));
      
      // Sort by fitness
      fitnessScores.sort((a, b) => b.fitness - a.fitness);
      
      // Create new population
      const newPopulation: Assignment[] = [];
      
      // Elitism - keep best individuals
      const eliteCount = Math.floor(populationSize * 0.1);
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push(fitnessScores[i].individual);
      }
      
      // Generate offspring
      while (newPopulation.length < populationSize) {
        const parent1 = this.selectParent(fitnessScores);
        const parent2 = this.selectParent(fitnessScores);
        
        if (Math.random() < crossoverRate) {
          const offspring = this.crossover(parent1, parent2, processedData, constraints);
          newPopulation.push(offspring);
        } else {
          newPopulation.push(parent1);
        }
        
        if (newPopulation.length < populationSize) {
          const offspring = this.crossover(parent2, parent1, processedData, constraints);
          newPopulation.push(offspring);
        }
      }
      
      // Apply mutation
      for (let i = eliteCount; i < newPopulation.length; i++) {
        if (Math.random() < mutationRate) {
          newPopulation[i] = this.mutate(newPopulation[i], processedData, constraints);
        }
      }
      
      population = newPopulation;
    }
    
    // Return best individual
    const finalFitness = population.map(individual => ({
      individual,
      fitness: this.calculateFitness(individual, processedData, constraints),
    }));
    
    finalFitness.sort((a, b) => b.fitness - a.fitness);
    
    return finalFitness[0].individual;
  }

  private initializePopulation(
    initialSolution: Assignment[],
    size: number,
    processedData: any,
    constraints: OptimizationConstraints,
  ): Assignment[][] {
    const population: Assignment[][] = [];
    
    for (let i = 0; i < size; i++) {
      const solution = this.generateRandomSolution(processedData, constraints);
      population.push(solution);
    }
    
    return population;
  }

  private generateRandomSolution(
    processedData: any,
    constraints: OptimizationConstraints,
  ): Assignment[] {
    const { vehicles, deliveries } = processedData;
    const assignments: Assignment[] = [];
    
    for (const delivery of deliveries) {
      const suitableVehicles = this.findSuitableVehicles(vehicles, delivery, constraints);
      
      if (suitableVehicles.length > 0) {
        const randomVehicle = suitableVehicles[Math.floor(Math.random() * suitableVehicles.length)];
        const assignment = this.createAssignment(randomVehicle, delivery, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private calculateFitness(
    solution: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
  ): number {
    let fitness = 0;
    
    // Cost fitness (lower is better)
    const totalCost = solution.reduce((sum, assignment) => sum + assignment.cost, 0);
    fitness += 1000 / (totalCost + 1);
    
    // Efficiency fitness
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    fitness += averageEfficiency * 100;
    
    // Coverage fitness
    const coverage = solution.length / processedData.deliveries.length;
    fitness += coverage * 100;
    
    // Constraint violations
    const violations = solution.reduce((sum, assignment) => sum + assignment.violations.length, 0);
    fitness -= violations * 50;
    
    return fitness;
  }

  private selectParent(fitnessScores: { individual: Assignment[]; fitness: number }[]): Assignment[] {
    // Tournament selection
    const tournamentSize = 5;
    let best = fitnessScores[Math.floor(Math.random() * fitnessScores.length)];
    
    for (let i = 1; i < tournamentSize; i++) {
      const competitor = fitnessScores[Math.floor(Math.random() * fitnessScores.length)];
      if (competitor.fitness > best.fitness) {
        best = competitor;
      }
    }
    
    return best.individual;
  }

  private crossover(
    parent1: Assignment[],
    parent2: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
  ): Assignment[] {
    // Uniform crossover
    const offspring: Assignment[] = [];
    const allAssignments = [...parent1, ...parent2];
    
    // Remove duplicates
    const uniqueAssignments = allAssignments.filter((assignment, index, self) => 
      index === self.findIndex(a => a.id === assignment.id)
    );
    
    // Select assignments based on fitness
    const selectedAssignments = uniqueAssignments.filter(() => Math.random() > 0.5);
    
    return selectedAssignments;
  }

  private mutate(
    solution: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
  ): Assignment[] {
    const mutated = [...solution];
    
    // Random mutation
    if (Math.random() < 0.3) {
      // Add random assignment
      const newAssignment = this.generateRandomAssignment(processedData, constraints);
      mutated.push(newAssignment);
    }
    
    if (Math.random() < 0.3 && mutated.length > 1) {
      // Remove random assignment
      const randomIndex = Math.floor(Math.random() * mutated.length);
      mutated.splice(randomIndex, 1);
    }
    
    return mutated;
  }

  private generateRandomAssignment(
    processedData: any,
    constraints: OptimizationConstraints,
  ): Assignment {
    const { vehicles, deliveries } = processedData;
    const randomDelivery = deliveries[Math.floor(Math.random() * deliveries.length)];
    const suitableVehicles = this.findSuitableVehicles(vehicles, randomDelivery, constraints);
    const randomVehicle = suitableVehicles[Math.floor(Math.random() * suitableVehicles.length)];
    
    return this.createAssignment(randomVehicle, randomDelivery, constraints);
  }

  private async optimizeSimulatedAnnealing(
    initialSolution: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
    options: any,
  ): Promise<Assignment[]> {
    const initialTemp = 1000;
    const finalTemp = 1;
    const coolingRate = 0.95;
    
    let currentSolution = initialSolution;
    let bestSolution = currentSolution;
    
    let temperature = initialTemp;
    
    while (temperature > finalTemp) {
      // Generate neighbor solution
      const neighbor = this.generateNeighbor(currentSolution, processedData, constraints);
      
      // Calculate energy difference
      const currentEnergy = this.calculateEnergy(currentSolution, processedData, constraints);
      const neighborEnergy = this.calculateEnergy(neighbor, processedData, constraints);
      const deltaEnergy = neighborEnergy - currentEnergy;
      
      // Accept or reject
      if (deltaEnergy < 0 || Math.random() < Math.exp(-deltaEnergy / temperature)) {
        currentSolution = neighbor;
        
        if (this.calculateFitness(currentSolution, processedData, constraints) > 
            this.calculateFitness(bestSolution, processedData, constraints)) {
          bestSolution = currentSolution;
        }
      }
      
      temperature *= coolingRate;
    }
    
    return bestSolution;
  }

  private generateNeighbor(
    current: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
  ): Assignment[] {
    const neighbor = [...current];
    
    // Random mutation
    if (Math.random() < 0.5) {
      // Add random assignment
      const newAssignment = this.generateRandomAssignment(processedData, constraints);
      neighbor.push(newAssignment);
    }
    
    if (Math.random() < 0.5 && neighbor.length > 1) {
      // Remove random assignment
      const randomIndex = Math.floor(Math.random() * neighbor.length);
      neighbor.splice(randomIndex, 1);
    }
    
    return neighbor;
  }

  private calculateEnergy(
    solution: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
  ): number {
    // Energy is inverse of fitness
    return -this.calculateFitness(solution, processedData, constraints);
  }

  private async optimizeLinearProgramming(
    initialSolution: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
    options: any,
  ): Promise<Assignment[]> {
    // Simplified linear programming approach
    const { vehicles, deliveries } = processedData;
    const variables = this.createLPVariables(vehicles, deliveries);
    const objective = this.createLPObjective(variables);
    const constraints_matrix = this.createLPConstraints(variables, constraints);
    
    // Solve using simplified approach
    const solution = this.solveLinearProgram(variables, objective, constraints_matrix);
    
    return this.convertLPSolutionToAssignments(solution, vehicles, deliveries, constraints);
  }

  private createLPVariables(vehicles: Vehicle[], deliveries: Delivery[]): any[] {
    const variables = [];
    
    for (const vehicle of vehicles) {
      for (const delivery of deliveries) {
        variables.push({
          vehicleId: vehicle.id,
          deliveryId: delivery.id,
          coefficient: 1,
        });
      }
    }
    
    return variables;
  }

  private createLPObjective(variables: any[]): number[] {
    return variables.map(v => v.coefficient);
  }

  private createLPConstraints(variables: any[], constraints: OptimizationConstraints): number[][] {
    const matrix: number[][] = [];
    
    // Coverage constraints
    const coverageRow = variables.map(v => 1);
    matrix.push(coverageRow);
    
    // Cost constraints
    const costRow = variables.map(v => v.cost || 1);
    matrix.push(costRow);
    
    return matrix;
  }

  private solveLinearProgram(
    variables: any[],
    objective: number[],
    constraints: number[][],
  ): number[] {
    // Simplified linear programming solution
    const solution = new Array(variables.length).fill(0);
    
    // Greedy approach: select variables with highest objective coefficients
    const sortedIndices = variables
      .map((_, index) => ({ index, coefficient: objective[index] }))
      .sort((a, b) => b.coefficient - a.coefficient);
    
    for (const { index } of sortedIndices) {
      solution[index] = 1;
    }
    
    return solution;
  }

  private convertLPSolutionToAssignments(
    solution: number[],
    vehicles: Vehicle[],
    deliveries: Delivery[],
    constraints: OptimizationConstraints,
  ): Assignment[] {
    const assignments: Assignment[] = [];
    
    for (let i = 0; i < solution.length; i++) {
      if (solution[i] === 1) {
        const variable = this.createLPVariables(vehicles, deliveries)[i];
        const vehicle = vehicles.find(v => v.id === variable.vehicleId);
        const delivery = deliveries.find(d => d.id === variable.deliveryId);
        
        if (vehicle && delivery) {
          const assignment = this.createAssignment(vehicle, delivery, constraints);
          assignments.push(assignment);
        }
      }
    }
    
    return assignments;
  }

  private async optimizeHybrid(
    initialSolution: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
    options: any,
  ): Promise<Assignment[]> {
    // Combine multiple algorithms
    const hungarian = this.optimizeHungarian(initialSolution, processedData, constraints);
    const genetic = await this.optimizeGenetic(initialSolution, processedData, constraints, options);
    const simulatedAnnealing = await this.optimizeSimulatedAnnealing(initialSolution, processedData, constraints, options);
    
    // Select best solution
    const solutions = [hungarian, genetic, simulatedAnnealing];
    const bestSolution = solutions.reduce((best, current) => 
      this.calculateFitness(current, processedData, constraints) > 
      this.calculateFitness(best, processedData, constraints) ? current : best
    );
    
    return bestSolution;
  }

  private calculatePerformanceMetrics(
    solution: Assignment[],
    processedData: any,
  ): any {
    const coverage = solution.length / processedData.deliveries.length;
    const utilization = solution.length / processedData.vehicles.length;
    const costEfficiency = this.calculateCostEfficiency(solution);
    const timeEfficiency = this.calculateTimeEfficiency(solution);
    const customerSatisfaction = this.calculateCustomerSatisfaction(solution);
    
    return {
      coverage,
      utilization,
      costEfficiency,
      timeEfficiency,
      customerSatisfaction,
    };
  }

  private calculateCostEfficiency(solution: Assignment[]): number {
    const totalCost = solution.reduce((sum, assignment) => sum + assignment.cost, 0);
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    
    return averageEfficiency / (totalCost / 1000 + 1);
  }

  private calculateTimeEfficiency(solution: Assignment[]): number {
    const totalTime = solution.reduce((sum, assignment) => 
      sum + (assignment.endTime.getTime() - assignment.startTime.getTime()) / (1000 * 60 * 60), 0);
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    
    return averageEfficiency / (totalTime / 24 + 1);
  }

  private calculateCustomerSatisfaction(solution: Assignment[]): number {
    // Simplified customer satisfaction calculation
    const onTimeDeliveries = solution.filter(assignment => 
      assignment.endTime <= assignment.route[assignment.route.length - 1].timeWindow.end
    ).length;
    
    return onTimeDeliveries / solution.length;
  }

  private calculateSummary(solution: Assignment[], processedData: any): any {
    const totalVehicles = processedData.vehicles.length;
    const assignedVehicles = new Set(solution.map(a => a.vehicleId)).size;
    const totalDeliveries = processedData.deliveries.length;
    const assignedDeliveries = solution.length;
    const totalCost = solution.reduce((sum, assignment) => sum + assignment.cost, 0);
    const totalDistance = solution.reduce((sum, assignment) => sum + assignment.route.length, 0);
    const totalTime = solution.reduce((sum, assignment) => 
      sum + (assignment.endTime.getTime() - assignment.startTime.getTime()) / (1000 * 60 * 60), 0);
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    const averageUtilization = assignedVehicles / totalVehicles;
    
    return {
      totalVehicles,
      assignedVehicles,
      totalDeliveries,
      assignedDeliveries,
      totalCost,
      totalDistance,
      totalTime,
      averageEfficiency,
      averageUtilization,
    };
  }

  private generateRecommendations(
    solution: Assignment[],
    performance: any,
    constraints: OptimizationConstraints,
  ): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (performance.coverage < 0.8) {
      immediate.push('Low delivery coverage - consider additional vehicles');
    }
    
    if (performance.utilization < 0.7) {
      immediate.push('Low vehicle utilization - optimize assignments');
    }
    
    if (performance.costEfficiency < 0.6) {
      shortTerm.push('Low cost efficiency - review vehicle selection');
    }
    
    if (performance.timeEfficiency < 0.6) {
      shortTerm.push('Low time efficiency - optimize routes');
    }
    
    if (performance.customerSatisfaction < 0.8) {
      shortTerm.push('Low customer satisfaction - improve delivery times');
    }
    
    longTerm.push('Implement real-time vehicle tracking');
    longTerm.push('Develop predictive maintenance system');
    longTerm.push('Create dynamic pricing model');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveOptimizationResult(result: OptimizationResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO vehicle_assignment_optimization_results 
        (total_vehicles, assigned_vehicles, total_deliveries, assigned_deliveries, 
         total_cost, total_distance, total_time, average_efficiency, average_utilization,
         coverage, utilization, cost_efficiency, time_efficiency, customer_satisfaction, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      `, [
        result.summary.totalVehicles,
        result.summary.assignedVehicles,
        result.summary.totalDeliveries,
        result.summary.assignedDeliveries,
        result.summary.totalCost,
        result.summary.totalDistance,
        result.summary.totalTime,
        result.summary.averageEfficiency,
        result.summary.averageUtilization,
        result.performance.coverage,
        result.performance.utilization,
        result.performance.costEfficiency,
        result.performance.timeEfficiency,
        result.performance.customerSatisfaction,
      ]);
    } catch (error) {
      this.logger.error('Failed to save vehicle assignment optimization result:', error);
    }
  }
}

