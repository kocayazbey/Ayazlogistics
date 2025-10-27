import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Warehouse {
  id: string;
  name: string;
  layout: WarehouseLayout;
  zones: Zone[];
  aisles: Aisle[];
  dockDoors: DockDoor[];
}

interface WarehouseLayout {
  width: number;
  length: number;
  height: number;
  gridSize: number;
  obstacles: Obstacle[];
}

interface Zone {
  id: string;
  name: string;
  type: 'receiving' | 'storage' | 'picking' | 'shipping';
  boundaries: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  accessibility: 'high' | 'medium' | 'low';
}

interface Aisle {
  id: string;
  zoneId: string;
  number: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  height: number;
  direction: 'horizontal' | 'vertical';
  accessibility: 'high' | 'medium' | 'low';
}

interface DockDoor {
  id: string;
  zoneId: string;
  x: number;
  y: number;
  type: 'receiving' | 'shipping';
  capacity: number;
}

interface Obstacle {
  id: string;
  type: 'column' | 'equipment' | 'restricted';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PickItem {
  id: string;
  sku: string;
  name: string;
  location: Location;
  quantity: number;
  weight: number;
  volume: number;
  priority: 'high' | 'medium' | 'low';
  fragility: 'low' | 'medium' | 'high';
  temperature: 'ambient' | 'cool' | 'cold' | 'frozen';
  hazardous: boolean;
  expiration?: Date;
}

interface Location {
  zoneId: string;
  aisleId: string;
  x: number;
  y: number;
  z: number;
  address: string;
}

interface Picker {
  id: string;
  name: string;
  experience: 'beginner' | 'intermediate' | 'expert';
  equipment: string[];
  maxWeight: number;
  maxVolume: number;
  currentLocation: Location;
  workingHours: {
    start: Date;
    end: Date;
  };
}

interface PickList {
  id: string;
  orderId: string;
  items: PickItem[];
  priority: 'urgent' | 'high' | 'medium' | 'low';
  deadline: Date;
  customer: string;
  specialInstructions: string[];
}

interface OptimizedPickPath {
  pickerId: string;
  pickListId: string;
  startLocation: Location;
  endLocation: Location;
  waypoints: Waypoint[];
  totalDistance: number;
  totalTime: number;
  totalWeight: number;
  totalVolume: number;
  efficiency: number;
  estimatedCompletion: Date;
}

interface Waypoint {
  location: Location;
  item: PickItem;
  action: 'pick' | 'drop' | 'rest';
  estimatedTime: number;
  instructions: string;
  warnings: string[];
}

interface OptimizationResult {
  pickListId: string;
  optimizedPaths: OptimizedPickPath[];
  summary: {
    totalDistance: number;
    totalTime: number;
    totalWeight: number;
    totalVolume: number;
    averageEfficiency: number;
    pickerUtilization: number;
  };
  improvements: {
    distanceReduction: number;
    timeReduction: number;
    efficiencyImprovement: number;
  };
  recommendations: string[];
}

@Injectable()
export class PickPathOptimizationService {
  private readonly logger = new Logger(PickPathOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimizePickPaths(
    warehouse: Warehouse,
    pickLists: PickList[],
    pickers: Picker[],
    constraints: {
      maxDistance: number;
      maxTime: number;
      maxWeight: number;
      maxVolume: number;
      priorityWeight: number;
      efficiencyWeight: number;
    },
    options: {
      algorithm: 'nearest_neighbor' | 'genetic' | 'simulated_annealing' | 'ant_colony' | 'hybrid';
      includeBatching: boolean;
      includeZoning: boolean;
      includeEquipment: boolean;
      includeConstraints: boolean;
    },
  ): Promise<OptimizationResult[]> {
    this.logger.log(`Optimizing pick paths for ${pickLists.length} pick lists`);

    const results: OptimizationResult[] = [];
    
    for (const pickList of pickLists) {
      try {
        const result = await this.optimizeSinglePickList(
          warehouse,
          pickList,
          pickers,
          constraints,
          options,
        );
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to optimize pick list ${pickList.id}:`, error);
      }
    }
    
    await this.saveOptimizationResults(results);
    await this.eventBus.emit('pick.paths.optimized', { results });

    return results;
  }

  private async optimizeSinglePickList(
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
    options: any,
  ): Promise<OptimizationResult> {
    // Filter available pickers
    const availablePickers = this.filterAvailablePickers(pickers, pickList);
    
    if (availablePickers.length === 0) {
      throw new Error('No available pickers for this pick list');
    }
    
    // Generate initial solution
    const initialSolution = this.generateInitialSolution(
      warehouse,
      pickList,
      availablePickers,
      constraints,
    );
    
    // Optimize using selected algorithm
    let optimizedSolution: OptimizedPickPath[];
    
    switch (options.algorithm) {
      case 'nearest_neighbor':
        optimizedSolution = this.optimizeNearestNeighbor(
          warehouse,
          pickList,
          availablePickers,
          constraints,
        );
        break;
        
      case 'genetic':
        optimizedSolution = await this.optimizeGenetic(
          warehouse,
          pickList,
          availablePickers,
          constraints,
        );
        break;
        
      case 'simulated_annealing':
        optimizedSolution = await this.optimizeSimulatedAnnealing(
          warehouse,
          pickList,
          availablePickers,
          constraints,
        );
        break;
        
      case 'ant_colony':
        optimizedSolution = await this.optimizeAntColony(
          warehouse,
          pickList,
          availablePickers,
          constraints,
        );
        break;
        
      case 'hybrid':
        optimizedSolution = await this.optimizeHybrid(
          warehouse,
          pickList,
          availablePickers,
          constraints,
          options,
        );
        break;
        
      default:
        optimizedSolution = this.optimizeNearestNeighbor(
          warehouse,
          pickList,
          availablePickers,
          constraints,
        );
    }
    
    // Calculate improvements
    const improvements = this.calculateImprovements(initialSolution, optimizedSolution);
    
    // Generate summary
    const summary = this.calculateSummary(optimizedSolution);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(optimizedSolution, improvements);
    
    return {
      pickListId: pickList.id,
      optimizedPaths: optimizedSolution,
      summary,
      improvements,
      recommendations,
    };
  }

  private filterAvailablePickers(pickers: Picker[], pickList: PickList): Picker[] {
    return pickers.filter(picker => {
      // Check working hours
      const now = new Date();
      if (now < picker.workingHours.start || now > picker.workingHours.end) {
        return false;
      }
      
      // Check capacity constraints
      const totalWeight = pickList.items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
      const totalVolume = pickList.items.reduce((sum, item) => sum + item.volume * item.quantity, 0);
      
      if (totalWeight > picker.maxWeight || totalVolume > picker.maxVolume) {
        return false;
      }
      
      return true;
    });
  }

  private generateInitialSolution(
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
  ): OptimizedPickPath[] {
    const paths: OptimizedPickPath[] = [];
    
    // Simple assignment - one picker per pick list
    const picker = pickers[0];
    const path = this.createPickPath(warehouse, pickList, picker, constraints);
    paths.push(path);
    
    return paths;
  }

  private createPickPath(
    warehouse: Warehouse,
    pickList: PickList,
    picker: Picker,
    constraints: any,
  ): OptimizedPickPath {
    const waypoints: Waypoint[] = [];
    let currentLocation = picker.currentLocation;
    let totalDistance = 0;
    let totalTime = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    
    // Sort items by priority and location
    const sortedItems = this.sortItemsForPicking(pickList.items, currentLocation);
    
    for (const item of sortedItems) {
      const distance = this.calculateDistance(currentLocation, item.location);
      const time = this.calculatePickTime(item, picker);
      
      const waypoint: Waypoint = {
        location: item.location,
        item,
        action: 'pick',
        estimatedTime: time,
        instructions: this.generatePickInstructions(item),
        warnings: this.generateWarnings(item),
      };
      
      waypoints.push(waypoint);
      
      totalDistance += distance;
      totalTime += time;
      totalWeight += item.weight * item.quantity;
      totalVolume += item.volume * item.quantity;
      
      currentLocation = item.location;
    }
    
    // Calculate efficiency
    const efficiency = this.calculateEfficiency(totalDistance, totalTime, totalWeight, totalVolume);
    
    // Estimate completion time
    const estimatedCompletion = new Date(Date.now() + totalTime * 60000);
    
    return {
      pickerId: picker.id,
      pickListId: pickList.id,
      startLocation: picker.currentLocation,
      endLocation: currentLocation,
      waypoints,
      totalDistance,
      totalTime,
      totalWeight,
      totalVolume,
      efficiency,
      estimatedCompletion,
    };
  }

  private sortItemsForPicking(items: PickItem[], startLocation: Location): PickItem[] {
    // Sort by priority first, then by distance
    return items.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      const distanceA = this.calculateDistance(startLocation, a.location);
      const distanceB = this.calculateDistance(startLocation, b.location);
      
      return distanceA - distanceB;
    });
  }

  private optimizeNearestNeighbor(
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
  ): OptimizedPickPath[] {
    const paths: OptimizedPickPath[] = [];
    
    for (const picker of pickers) {
      const path = this.createOptimizedPath(warehouse, pickList, picker, constraints);
      paths.push(path);
    }
    
    // Select best path
    const bestPath = paths.reduce((best, current) => 
      current.efficiency > best.efficiency ? current : best
    );
    
    return [bestPath];
  }

  private createOptimizedPath(
    warehouse: Warehouse,
    pickList: PickList,
    picker: Picker,
    constraints: any,
  ): OptimizedPickPath {
    const waypoints: Waypoint[] = [];
    let currentLocation = picker.currentLocation;
    let totalDistance = 0;
    let totalTime = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    
    const remainingItems = [...pickList.items];
    
    while (remainingItems.length > 0) {
      // Find nearest item
      let nearestItem: PickItem | null = null;
      let minDistance = Infinity;
      
      for (const item of remainingItems) {
        const distance = this.calculateDistance(currentLocation, item.location);
        if (distance < minDistance) {
          minDistance = distance;
          nearestItem = item;
        }
      }
      
      if (!nearestItem) break;
      
      // Add waypoint
      const time = this.calculatePickTime(nearestItem, picker);
      const waypoint: Waypoint = {
        location: nearestItem.location,
        item: nearestItem,
        action: 'pick',
        estimatedTime: time,
        instructions: this.generatePickInstructions(nearestItem),
        warnings: this.generateWarnings(nearestItem),
      };
      
      waypoints.push(waypoint);
      
      totalDistance += minDistance;
      totalTime += time;
      totalWeight += nearestItem.weight * nearestItem.quantity;
      totalVolume += nearestItem.volume * nearestItem.quantity;
      
      currentLocation = nearestItem.location;
      
      // Remove item from remaining items
      const index = remainingItems.indexOf(nearestItem);
      remainingItems.splice(index, 1);
    }
    
    const efficiency = this.calculateEfficiency(totalDistance, totalTime, totalWeight, totalVolume);
    const estimatedCompletion = new Date(Date.now() + totalTime * 60000);
    
    return {
      pickerId: picker.id,
      pickListId: pickList.id,
      startLocation: picker.currentLocation,
      endLocation: currentLocation,
      waypoints,
      totalDistance,
      totalTime,
      totalWeight,
      totalVolume,
      efficiency,
      estimatedCompletion,
    };
  }

  private async optimizeGenetic(
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
  ): Promise<OptimizedPickPath[]> {
    const populationSize = 50;
    const generations = 100;
    const mutationRate = 0.1;
    const crossoverRate = 0.8;
    
    // Initialize population
    let population = this.initializePopulation(
      warehouse,
      pickList,
      pickers,
      populationSize,
      constraints,
    );
    
    for (let generation = 0; generation < generations; generation++) {
      // Evaluate fitness
      const fitnessScores = population.map(individual => ({
        individual,
        fitness: this.calculateFitness(individual, constraints),
      }));
      
      // Sort by fitness
      fitnessScores.sort((a, b) => b.fitness - a.fitness);
      
      // Create new population
      const newPopulation: OptimizedPickPath[] = [];
      
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
          const offspring = this.crossover(parent1, parent2, warehouse, pickList, pickers, constraints);
          newPopulation.push(offspring);
        } else {
          newPopulation.push(parent1);
        }
        
        if (newPopulation.length < populationSize) {
          const offspring = this.crossover(parent2, parent1, warehouse, pickList, pickers, constraints);
          newPopulation.push(offspring);
        }
      }
      
      // Apply mutation
      for (let i = eliteCount; i < newPopulation.length; i++) {
        if (Math.random() < mutationRate) {
          newPopulation[i] = this.mutate(newPopulation[i], warehouse, pickList, pickers, constraints);
        }
      }
      
      population = newPopulation;
    }
    
    // Return best individual
    const finalFitness = population.map(individual => ({
      individual,
      fitness: this.calculateFitness(individual, constraints),
    }));
    
    finalFitness.sort((a, b) => b.fitness - a.fitness);
    
    return [finalFitness[0].individual];
  }

  private initializePopulation(
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    size: number,
    constraints: any,
  ): OptimizedPickPath[] {
    const population: OptimizedPickPath[] = [];
    
    for (let i = 0; i < size; i++) {
      const picker = pickers[Math.floor(Math.random() * pickers.length)];
      const path = this.createOptimizedPath(warehouse, pickList, picker, constraints);
      population.push(path);
    }
    
    return population;
  }

  private calculateFitness(individual: OptimizedPickPath, constraints: any): number {
    let fitness = 0;
    
    // Distance fitness (lower is better)
    fitness += 1000 / (individual.totalDistance + 1);
    
    // Time fitness (lower is better)
    fitness += 1000 / (individual.totalTime + 1);
    
    // Efficiency fitness (higher is better)
    fitness += individual.efficiency * 100;
    
    // Constraint violations
    if (individual.totalDistance > constraints.maxDistance) {
      fitness -= 100;
    }
    
    if (individual.totalTime > constraints.maxTime) {
      fitness -= 100;
    }
    
    if (individual.totalWeight > constraints.maxWeight) {
      fitness -= 100;
    }
    
    if (individual.totalVolume > constraints.maxVolume) {
      fitness -= 100;
    }
    
    return fitness;
  }

  private selectParent(fitnessScores: { individual: OptimizedPickPath; fitness: number }[]): OptimizedPickPath {
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
    parent1: OptimizedPickPath,
    parent2: OptimizedPickPath,
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
  ): OptimizedPickPath {
    // Order crossover for waypoints
    const waypoints1 = parent1.waypoints;
    const waypoints2 = parent2.waypoints;
    
    const start = Math.floor(Math.random() * waypoints1.length);
    const end = start + Math.floor(Math.random() * (waypoints1.length - start));
    
    const offspringWaypoints: Waypoint[] = [];
    
    // Copy segment from parent1
    for (let i = start; i <= end; i++) {
      offspringWaypoints.push(waypoints1[i]);
    }
    
    // Fill remaining from parent2
    for (const waypoint of waypoints2) {
      if (!offspringWaypoints.some(w => w.item.id === waypoint.item.id)) {
        offspringWaypoints.push(waypoint);
      }
    }
    
    // Create new path
    const picker = pickers.find(p => p.id === parent1.pickerId) || pickers[0];
    return this.createPathFromWaypoints(
      warehouse,
      pickList,
      picker,
      offspringWaypoints,
      constraints,
    );
  }

  private mutate(
    individual: OptimizedPickPath,
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
  ): OptimizedPickPath {
    // Swap mutation
    const waypoints = [...individual.waypoints];
    
    if (waypoints.length > 1) {
      const i = Math.floor(Math.random() * waypoints.length);
      const j = Math.floor(Math.random() * waypoints.length);
      
      [waypoints[i], waypoints[j]] = [waypoints[j], waypoints[i]];
    }
    
    const picker = pickers.find(p => p.id === individual.pickerId) || pickers[0];
    return this.createPathFromWaypoints(warehouse, pickList, picker, waypoints, constraints);
  }

  private createPathFromWaypoints(
    warehouse: Warehouse,
    pickList: PickList,
    picker: Picker,
    waypoints: Waypoint[],
    constraints: any,
  ): OptimizedPickPath {
    let totalDistance = 0;
    let totalTime = 0;
    let totalWeight = 0;
    let totalVolume = 0;
    
    let currentLocation = picker.currentLocation;
    
    for (const waypoint of waypoints) {
      const distance = this.calculateDistance(currentLocation, waypoint.location);
      totalDistance += distance;
      totalTime += waypoint.estimatedTime;
      totalWeight += waypoint.item.weight * waypoint.item.quantity;
      totalVolume += waypoint.item.volume * waypoint.item.quantity;
      currentLocation = waypoint.location;
    }
    
    const efficiency = this.calculateEfficiency(totalDistance, totalTime, totalWeight, totalVolume);
    const estimatedCompletion = new Date(Date.now() + totalTime * 60000);
    
    return {
      pickerId: picker.id,
      pickListId: pickList.id,
      startLocation: picker.currentLocation,
      endLocation: currentLocation,
      waypoints,
      totalDistance,
      totalTime,
      totalWeight,
      totalVolume,
      efficiency,
      estimatedCompletion,
    };
  }

  private async optimizeSimulatedAnnealing(
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
  ): Promise<OptimizedPickPath[]> {
    const initialTemp = 1000;
    const finalTemp = 1;
    const coolingRate = 0.95;
    
    let currentSolution = this.createOptimizedPath(warehouse, pickList, pickers[0], constraints);
    let bestSolution = currentSolution;
    
    let temperature = initialTemp;
    
    while (temperature > finalTemp) {
      // Generate neighbor solution
      const neighbor = this.generateNeighbor(currentSolution, warehouse, pickList, pickers, constraints);
      
      // Calculate energy difference
      const currentEnergy = this.calculateEnergy(currentSolution, constraints);
      const neighborEnergy = this.calculateEnergy(neighbor, constraints);
      const deltaEnergy = neighborEnergy - currentEnergy;
      
      // Accept or reject
      if (deltaEnergy < 0 || Math.random() < Math.exp(-deltaEnergy / temperature)) {
        currentSolution = neighbor;
        
        if (this.calculateFitness(currentSolution, constraints) > this.calculateFitness(bestSolution, constraints)) {
          bestSolution = currentSolution;
        }
      }
      
      temperature *= coolingRate;
    }
    
    return [bestSolution];
  }

  private generateNeighbor(
    current: OptimizedPickPath,
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
  ): OptimizedPickPath {
    // 2-opt swap
    const waypoints = [...current.waypoints];
    
    if (waypoints.length > 2) {
      const i = Math.floor(Math.random() * (waypoints.length - 1));
      const j = i + 1 + Math.floor(Math.random() * (waypoints.length - i - 1));
      
      // Reverse segment
      for (let k = 0; k < Math.floor((j - i) / 2); k++) {
        [waypoints[i + k], waypoints[j - k]] = [waypoints[j - k], waypoints[i + k]];
      }
    }
    
    const picker = pickers.find(p => p.id === current.pickerId) || pickers[0];
    return this.createPathFromWaypoints(warehouse, pickList, picker, waypoints, constraints);
  }

  private calculateEnergy(solution: OptimizedPickPath, constraints: any): number {
    let energy = 0;
    
    // Distance energy
    energy += solution.totalDistance;
    
    // Time energy
    energy += solution.totalTime;
    
    // Constraint violations
    if (solution.totalDistance > constraints.maxDistance) {
      energy += 1000;
    }
    
    if (solution.totalTime > constraints.maxTime) {
      energy += 1000;
    }
    
    if (solution.totalWeight > constraints.maxWeight) {
      energy += 1000;
    }
    
    if (solution.totalVolume > constraints.maxVolume) {
      energy += 1000;
    }
    
    return energy;
  }

  private async optimizeAntColony(
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
  ): Promise<OptimizedPickPath[]> {
    const numAnts = 20;
    const numIterations = 50;
    const alpha = 1.0; // Pheromone importance
    const beta = 2.0; // Heuristic importance
    const rho = 0.5; // Evaporation rate
    const Q = 100; // Pheromone deposit
    
    // Initialize pheromone matrix
    const pheromoneMatrix = this.initializePheromoneMatrix(pickList.items);
    
    let bestSolution: OptimizedPickPath | null = null;
    
    for (let iteration = 0; iteration < numIterations; iteration++) {
      const solutions: OptimizedPickPath[] = [];
      
      // Each ant constructs a solution
      for (let ant = 0; ant < numAnts; ant++) {
        const solution = this.constructAntSolution(
          warehouse,
          pickList,
          pickers[0],
          constraints,
          pheromoneMatrix,
          alpha,
          beta,
        );
        solutions.push(solution);
      }
      
      // Update pheromones
      this.updatePheromones(pheromoneMatrix, solutions, Q, rho);
      
      // Update best solution
      const currentBest = solutions.reduce((best, current) => 
        this.calculateFitness(current, constraints) > this.calculateFitness(best, constraints) ? current : best
      );
      
      if (!bestSolution || this.calculateFitness(currentBest, constraints) > this.calculateFitness(bestSolution, constraints)) {
        bestSolution = currentBest;
      }
    }
    
    return bestSolution ? [bestSolution] : [];
  }

  private initializePheromoneMatrix(items: PickItem[]): number[][] {
    const matrix: number[][] = [];
    const initialPheromone = 1.0;
    
    for (let i = 0; i < items.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < items.length; j++) {
        matrix[i][j] = initialPheromone;
      }
    }
    
    return matrix;
  }

  private constructAntSolution(
    warehouse: Warehouse,
    pickList: PickList,
    picker: Picker,
    constraints: any,
    pheromoneMatrix: number[][],
    alpha: number,
    beta: number,
  ): OptimizedPickPath {
    const waypoints: Waypoint[] = [];
    const unvisited = [...pickList.items];
    let currentLocation = picker.currentLocation;
    
    while (unvisited.length > 0) {
      // Calculate probabilities for each unvisited item
      const probabilities = this.calculateProbabilities(
        unvisited,
        currentLocation,
        pheromoneMatrix,
        alpha,
        beta,
      );
      
      // Select next item based on probabilities
      const nextItem = this.selectNextItem(unvisited, probabilities);
      
      // Add waypoint
      const time = this.calculatePickTime(nextItem, picker);
      const waypoint: Waypoint = {
        location: nextItem.location,
        item: nextItem,
        action: 'pick',
        estimatedTime: time,
        instructions: this.generatePickInstructions(nextItem),
        warnings: this.generateWarnings(nextItem),
      };
      
      waypoints.push(waypoint);
      currentLocation = nextItem.location;
      
      // Remove from unvisited
      const index = unvisited.indexOf(nextItem);
      unvisited.splice(index, 1);
    }
    
    return this.createPathFromWaypoints(warehouse, pickList, picker, waypoints, constraints);
  }

  private calculateProbabilities(
    unvisited: PickItem[],
    currentLocation: Location,
    pheromoneMatrix: number[][],
    alpha: number,
    beta: number,
  ): number[] {
    const probabilities: number[] = [];
    let totalProbability = 0;
    
    for (let i = 0; i < unvisited.length; i++) {
      const item = unvisited[i];
      const distance = this.calculateDistance(currentLocation, item.location);
      const heuristic = 1 / (distance + 1);
      
      const pheromone = pheromoneMatrix[0][i]; // Simplified
      const probability = Math.pow(pheromone, alpha) * Math.pow(heuristic, beta);
      
      probabilities.push(probability);
      totalProbability += probability;
    }
    
    // Normalize probabilities
    for (let i = 0; i < probabilities.length; i++) {
      probabilities[i] /= totalProbability;
    }
    
    return probabilities;
  }

  private selectNextItem(unvisited: PickItem[], probabilities: number[]): PickItem {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (let i = 0; i < unvisited.length; i++) {
      cumulativeProbability += probabilities[i];
      if (random <= cumulativeProbability) {
        return unvisited[i];
      }
    }
    
    return unvisited[unvisited.length - 1];
  }

  private updatePheromones(
    pheromoneMatrix: number[][],
    solutions: OptimizedPickPath[],
    Q: number,
    rho: number,
  ): void {
    // Evaporate pheromones
    for (let i = 0; i < pheromoneMatrix.length; i++) {
      for (let j = 0; j < pheromoneMatrix[i].length; j++) {
        pheromoneMatrix[i][j] *= (1 - rho);
      }
    }
    
    // Deposit pheromones
    for (const solution of solutions) {
      const pheromoneDeposit = Q / solution.totalDistance;
      
      for (let i = 0; i < solution.waypoints.length - 1; i++) {
        const current = solution.waypoints[i];
        const next = solution.waypoints[i + 1];
        
        // Simplified pheromone update
        pheromoneMatrix[0][0] += pheromoneDeposit;
      }
    }
  }

  private async optimizeHybrid(
    warehouse: Warehouse,
    pickList: PickList,
    pickers: Picker[],
    constraints: any,
    options: any,
  ): Promise<OptimizedPickPath[]> {
    // Combine multiple algorithms
    const nearestNeighbor = this.optimizeNearestNeighbor(warehouse, pickList, pickers, constraints);
    const genetic = await this.optimizeGenetic(warehouse, pickList, pickers, constraints);
    const simulatedAnnealing = await this.optimizeSimulatedAnnealing(warehouse, pickList, pickers, constraints);
    
    // Select best solution
    const solutions = [nearestNeighbor[0], genetic[0], simulatedAnnealing[0]];
    const bestSolution = solutions.reduce((best, current) => 
      this.calculateFitness(current, constraints) > this.calculateFitness(best, constraints) ? current : best
    );
    
    return [bestSolution];
  }

  private calculateDistance(location1: Location, location2: Location): number {
    const dx = location1.x - location2.x;
    const dy = location1.y - location2.y;
    const dz = location1.z - location2.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculatePickTime(item: PickItem, picker: Picker): number {
    let baseTime = 2; // 2 minutes base time
    
    // Adjust for picker experience
    const experienceMultiplier = {
      'beginner': 1.5,
      'intermediate': 1.0,
      'expert': 0.8,
    }[picker.experience];
    
    // Adjust for item characteristics
    if (item.fragility === 'high') baseTime += 1;
    if (item.hazardous) baseTime += 2;
    if (item.temperature !== 'ambient') baseTime += 1;
    
    // Adjust for quantity
    baseTime += (item.quantity - 1) * 0.5;
    
    return baseTime * experienceMultiplier;
  }

  private calculateEfficiency(
    totalDistance: number,
    totalTime: number,
    totalWeight: number,
    totalVolume: number,
  ): number {
    // Efficiency based on distance and time
    const distanceEfficiency = 100 / (totalDistance + 1);
    const timeEfficiency = 100 / (totalTime + 1);
    const weightEfficiency = totalWeight > 0 ? 100 / (totalWeight + 1) : 100;
    const volumeEfficiency = totalVolume > 0 ? 100 / (totalVolume + 1) : 100;
    
    return (distanceEfficiency + timeEfficiency + weightEfficiency + volumeEfficiency) / 4;
  }

  private generatePickInstructions(item: PickItem): string {
    const instructions = [];
    
    instructions.push(`Pick ${item.quantity} units of ${item.name}`);
    instructions.push(`Location: ${item.location.address}`);
    
    if (item.fragility === 'high') {
      instructions.push('Handle with care - fragile item');
    }
    
    if (item.hazardous) {
      instructions.push('Use protective equipment - hazardous material');
    }
    
    if (item.temperature !== 'ambient') {
      instructions.push(`Maintain temperature: ${item.temperature}`);
    }
    
    if (item.expiration) {
      instructions.push(`Check expiration: ${item.expiration.toISOString()}`);
    }
    
    return instructions.join('; ');
  }

  private generateWarnings(item: PickItem): string[] {
    const warnings = [];
    
    if (item.fragility === 'high') {
      warnings.push('Fragile item - handle carefully');
    }
    
    if (item.hazardous) {
      warnings.push('Hazardous material - follow safety procedures');
    }
    
    if (item.temperature !== 'ambient') {
      warnings.push('Temperature controlled item');
    }
    
    if (item.expiration && item.expiration < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      warnings.push('Item expires soon');
    }
    
    return warnings;
  }

  private calculateImprovements(
    initial: OptimizedPickPath[],
    optimized: OptimizedPickPath[],
  ): any {
    const initialTotal = initial.reduce((sum, path) => sum + path.totalDistance, 0);
    const optimizedTotal = optimized.reduce((sum, path) => sum + path.totalDistance, 0);
    
    const initialTime = initial.reduce((sum, path) => sum + path.totalTime, 0);
    const optimizedTime = optimized.reduce((sum, path) => sum + path.totalTime, 0);
    
    const initialEfficiency = initial.reduce((sum, path) => sum + path.efficiency, 0) / initial.length;
    const optimizedEfficiency = optimized.reduce((sum, path) => sum + path.efficiency, 0) / optimized.length;
    
    return {
      distanceReduction: initialTotal - optimizedTotal,
      timeReduction: initialTime - optimizedTime,
      efficiencyImprovement: optimizedEfficiency - initialEfficiency,
    };
  }

  private calculateSummary(optimized: OptimizedPickPath[]): any {
    const totalDistance = optimized.reduce((sum, path) => sum + path.totalDistance, 0);
    const totalTime = optimized.reduce((sum, path) => sum + path.totalTime, 0);
    const totalWeight = optimized.reduce((sum, path) => sum + path.totalWeight, 0);
    const totalVolume = optimized.reduce((sum, path) => sum + path.totalVolume, 0);
    const averageEfficiency = optimized.reduce((sum, path) => sum + path.efficiency, 0) / optimized.length;
    const pickerUtilization = optimized.length > 0 ? 1.0 : 0.0;
    
    return {
      totalDistance,
      totalTime,
      totalWeight,
      totalVolume,
      averageEfficiency,
      pickerUtilization,
    };
  }

  private generateRecommendations(optimized: OptimizedPickPath[], improvements: any): string[] {
    const recommendations = [];
    
    if (improvements.distanceReduction > 0) {
      recommendations.push(`Reduce total distance by ${improvements.distanceReduction.toFixed(1)} meters`);
    }
    
    if (improvements.timeReduction > 0) {
      recommendations.push(`Reduce total time by ${improvements.timeReduction.toFixed(1)} minutes`);
    }
    
    if (improvements.efficiencyImprovement > 0) {
      recommendations.push(`Improve efficiency by ${(improvements.efficiencyImprovement * 100).toFixed(1)}%`);
    }
    
    recommendations.push('Consider implementing pick path optimization for all orders');
    recommendations.push('Train pickers on optimized paths');
    recommendations.push('Monitor and adjust optimization parameters regularly');
    
    return recommendations;
  }

  private async saveOptimizationResults(results: OptimizationResult[]): Promise<void> {
    try {
      for (const result of results) {
        await this.db.execute(`
          INSERT INTO pick_path_optimization_results 
          (pick_list_id, total_distance, total_time, total_weight, total_volume, 
           average_efficiency, picker_utilization, distance_reduction, time_reduction, 
           efficiency_improvement, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        `, [
          result.pickListId,
          result.summary.totalDistance,
          result.summary.totalTime,
          result.summary.totalWeight,
          result.summary.totalVolume,
          result.summary.averageEfficiency,
          result.summary.pickerUtilization,
          result.improvements.distanceReduction,
          result.improvements.timeReduction,
          result.improvements.efficiencyImprovement,
        ]);
      }
    } catch (error) {
      this.logger.error('Failed to save pick path optimization results:', error);
    }
  }
}

