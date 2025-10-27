import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Equipment {
  id: string;
  name: string;
  type: 'forklift' | 'conveyor' | 'crane' | 'palletizer' | 'sorter' | 'scanner' | 'robot' | 'truck' | 'trailer' | 'container';
  category: 'material_handling' | 'transportation' | 'processing' | 'storage' | 'safety' | 'communication';
  specifications: {
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
    performance: {
      speed: number; // km/h or m/s
      efficiency: number; // 0-1
      throughput: number; // units per hour
      accuracy: number; // 0-1
      reliability: number; // 0-1
    };
    energy: {
      consumption: number; // kWh per hour
      type: 'electric' | 'diesel' | 'gasoline' | 'hybrid' | 'solar' | 'battery';
      efficiency: number; // 0-1
      emissions: number; // CO2 per hour
    };
    maintenance: {
      interval: number; // hours
      cost: number; // currency per hour
      complexity: 'low' | 'medium' | 'high';
      requirements: string[];
    };
  };
  status: 'available' | 'busy' | 'maintenance' | 'offline' | 'reserved';
  location: {
    zone: string;
    section: string;
    position: { x: number; y: number; z: number };
    coordinates: { lat: number; lon: number };
  };
  schedule: {
    operatingHours: {
      start: string; // HH:MM
      end: string; // HH:MM
    };
    breaks: {
      start: string; // HH:MM
      end: string; // HH:MM
      duration: number; // minutes
    }[];
    holidays: Date[];
  };
  costs: {
    fixed: number; // daily
    variable: number; // per hour
    maintenance: number; // per hour
    energy: number; // per kWh
    depreciation: number; // per hour
  };
  performance: {
    utilization: number; // percentage
    efficiency: number; // 0-1
    throughput: number; // units per hour
    averageWaitTime: number; // minutes
    averageServiceTime: number; // minutes
    uptime: number; // percentage
    downtime: number; // percentage
  };
  history: {
    totalHours: number;
    totalCycles: number;
    totalDistance: number; // km
    totalLoad: number; // kg
    lastService: Date;
    nextService: Date;
    condition: 'excellent' | 'good' | 'fair' | 'poor';
  };
}

interface Task {
  id: string;
  name: string;
  type: 'pick' | 'place' | 'move' | 'sort' | 'scan' | 'load' | 'unload' | 'transport' | 'process' | 'maintain';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requirements: {
    equipment: string[]; // equipment types
    capacity: {
      weight: number; // kg
      volume: number; // m³
      pallets: number;
    };
    special: string[]; // special requirements
    safety: string[]; // safety requirements
    environmental: string[]; // environmental requirements
  };
  constraints: {
    timeWindow: {
      start: Date;
      end: Date;
    };
    location: {
      pickup: { x: number; y: number; z: number };
      dropoff: { x: number; y: number; z: number };
    };
    duration: number; // minutes
    cost: number; // currency
    quality: number; // 0-1
  };
  dependencies: string[]; // task IDs
  resources: {
    personnel: number;
    materials: string[];
    tools: string[];
    utilities: string[];
  };
}

interface Assignment {
  id: string;
  equipmentId: string;
  taskId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  cost: number; // currency
  efficiency: number; // 0-1
  feasibility: boolean;
  violations: string[];
  resources: {
    personnel: number;
    materials: string[];
    tools: string[];
    utilities: string[];
  };
  performance: {
    throughput: number; // units per hour
    utilization: number; // percentage
    waitTime: number; // minutes
    serviceTime: number; // minutes
    quality: number; // 0-1
  };
}

interface OptimizationResult {
  assignments: Assignment[];
  summary: {
    totalEquipment: number;
    assignedEquipment: number;
    totalTasks: number;
    assignedTasks: number;
    totalCost: number;
    totalDuration: number;
    averageEfficiency: number;
    averageUtilization: number;
  };
  performance: {
    coverage: number; // percentage
    utilization: number; // percentage
    costEfficiency: number; // 0-1
    timeEfficiency: number; // 0-1
    throughput: number; // units per hour
    quality: number; // 0-1
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface OptimizationConstraints {
  maxCost: number;
  maxDuration: number; // hours
  minEfficiency: number;
  minQuality: number;
  maxWaitTime: number; // minutes
  maxViolations: number;
  priorityWeight: number;
  costWeight: number;
  timeWeight: number;
  qualityWeight: number;
  throughputWeight: number;
}

@Injectable()
export class EquipmentUtilizationOptimizationService {
  private readonly logger = new Logger(EquipmentUtilizationOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimizeEquipmentUtilization(
    equipment: Equipment[],
    tasks: Task[],
    constraints: OptimizationConstraints,
    options: {
      algorithm: 'greedy' | 'genetic' | 'simulated_annealing' | 'linear_programming' | 'hybrid';
      includeRealTime: boolean;
      includePredictive: boolean;
      includeMaintenance: boolean;
      includeEnergy: boolean;
      includeEnvironmental: boolean;
      maxIterations: number;
      timeLimit: number; // minutes
    },
  ): Promise<OptimizationResult> {
    this.logger.log(`Optimizing equipment utilization for ${equipment.length} equipment and ${tasks.length} tasks`);

    // Preprocess data
    const processedData = this.preprocessData(equipment, tasks, constraints);
    
    // Generate initial solution
    const initialSolution = this.generateInitialSolution(processedData, constraints);
    
    // Optimize using selected algorithm
    let optimizedSolution: Assignment[];
    
    switch (options.algorithm) {
      case 'greedy':
        optimizedSolution = this.optimizeGreedy(initialSolution, processedData, constraints);
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
    await this.eventBus.emit('equipment.utilization.optimized', { result });

    return result;
  }

  private preprocessData(
    equipment: Equipment[],
    tasks: Task[],
    constraints: OptimizationConstraints,
  ): any {
    // Filter available equipment
    const availableEquipment = equipment.filter(eq => 
      eq.status === 'available' &&
      eq.performance.efficiency > constraints.minEfficiency &&
      eq.history.condition !== 'poor'
    );
    
    // Filter feasible tasks
    const feasibleTasks = tasks.filter(task => 
      task.constraints.timeWindow.end > new Date() &&
      task.constraints.cost <= constraints.maxCost
    );
    
    // Sort tasks by priority
    const sortedTasks = feasibleTasks.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    return {
      equipment: availableEquipment,
      tasks: sortedTasks,
      constraints,
    };
  }

  private generateInitialSolution(processedData: any, constraints: OptimizationConstraints): Assignment[] {
    const assignments: Assignment[] = [];
    const { equipment, tasks } = processedData;
    
    // Simple greedy assignment
    for (const task of tasks) {
      const suitableEquipment = this.findSuitableEquipment(equipment, task, constraints);
      
      if (suitableEquipment.length > 0) {
        const bestEquipment = this.selectBestEquipment(suitableEquipment, task, constraints);
        const assignment = this.createAssignment(bestEquipment, task, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private findSuitableEquipment(
    equipment: Equipment[],
    task: Task,
    constraints: OptimizationConstraints,
  ): Equipment[] {
    return equipment.filter(eq => {
      // Check capacity constraints
      if (task.requirements.capacity.weight > eq.specifications.capacity.weight ||
          task.requirements.capacity.volume > eq.specifications.capacity.volume ||
          task.requirements.capacity.pallets > eq.specifications.capacity.pallets) {
        return false;
      }
      
      // Check equipment type requirements
      if (task.requirements.equipment.length > 0 && 
          !task.requirements.equipment.includes(eq.type)) {
        return false;
      }
      
      // Check special requirements
      for (const requirement of task.requirements.special) {
        if (!this.checkSpecialRequirement(eq, requirement)) {
          return false;
        }
      }
      
      // Check safety requirements
      for (const requirement of task.requirements.safety) {
        if (!this.checkSafetyRequirement(eq, requirement)) {
          return false;
        }
      }
      
      // Check environmental requirements
      for (const requirement of task.requirements.environmental) {
        if (!this.checkEnvironmentalRequirement(eq, requirement)) {
          return false;
        }
      }
      
      return true;
    });
  }

  private checkSpecialRequirement(equipment: Equipment, requirement: string): boolean {
    // Simplified special requirement checking
    switch (requirement) {
      case 'temperature_control':
        return equipment.specifications.energy.type === 'electric';
      case 'hazardous_material':
        return equipment.specifications.performance.reliability > 0.8;
      case 'high_precision':
        return equipment.specifications.performance.accuracy > 0.9;
      case 'heavy_duty':
        return equipment.specifications.capacity.weight > 1000;
      default:
        return true;
    }
  }

  private checkSafetyRequirement(equipment: Equipment, requirement: string): boolean {
    // Simplified safety requirement checking
    switch (requirement) {
      case 'safety_system':
        return equipment.specifications.performance.reliability > 0.9;
      case 'emergency_stop':
        return equipment.specifications.performance.reliability > 0.95;
      case 'operator_protection':
        return equipment.specifications.performance.reliability > 0.85;
      default:
        return true;
    }
  }

  private checkEnvironmentalRequirement(equipment: Equipment, requirement: string): boolean {
    // Simplified environmental requirement checking
    switch (requirement) {
      case 'low_emissions':
        return equipment.specifications.energy.emissions < 10;
      case 'energy_efficient':
        return equipment.specifications.energy.efficiency > 0.8;
      case 'noise_reduction':
        return equipment.specifications.energy.type === 'electric';
      default:
        return true;
    }
  }

  private selectBestEquipment(
    equipment: Equipment[],
    task: Task,
    constraints: OptimizationConstraints,
  ): Equipment {
    let bestEquipment = equipment[0];
    let bestScore = this.calculateEquipmentScore(equipment[0], task, constraints);
    
    for (let i = 1; i < equipment.length; i++) {
      const score = this.calculateEquipmentScore(equipment[i], task, constraints);
      if (score > bestScore) {
        bestScore = score;
        bestEquipment = equipment[i];
      }
    }
    
    return bestEquipment;
  }

  private calculateEquipmentScore(
    equipment: Equipment,
    task: Task,
    constraints: OptimizationConstraints,
  ): number {
    let score = 0;
    
    // Cost score (lower is better)
    const costScore = 100 / (equipment.costs.fixed + equipment.costs.variable * (task.constraints.duration / 60) + 1);
    score += costScore * constraints.costWeight;
    
    // Efficiency score
    score += equipment.performance.efficiency * constraints.qualityWeight;
    
    // Throughput score
    const throughputScore = equipment.specifications.performance.throughput / 100; // normalize
    score += throughputScore * constraints.throughputWeight;
    
    // Utilization score (prefer less utilized equipment)
    const utilizationScore = (100 - equipment.performance.utilization) / 100;
    score += utilizationScore * constraints.timeWeight;
    
    // Quality score
    const qualityScore = equipment.specifications.performance.accuracy;
    score += qualityScore * constraints.qualityWeight;
    
    // Energy efficiency score
    const energyScore = equipment.specifications.energy.efficiency;
    score += energyScore * 20;
    
    // Maintenance score (prefer well-maintained equipment)
    const maintenanceScore = this.calculateMaintenanceScore(equipment);
    score += maintenanceScore * 10;
    
    return score;
  }

  private calculateMaintenanceScore(equipment: Equipment): number {
    const daysSinceLastService = (Date.now() - equipment.history.lastService.getTime()) / (1000 * 60 * 60 * 24);
    const maintenanceInterval = equipment.specifications.maintenance.interval / 24; // convert to days
    
    if (daysSinceLastService < maintenanceInterval * 0.5) {
      return 1.0; // Excellent
    } else if (daysSinceLastService < maintenanceInterval * 0.8) {
      return 0.8; // Good
    } else if (daysSinceLastService < maintenanceInterval) {
      return 0.6; // Fair
    } else {
      return 0.4; // Poor
    }
  }

  private createAssignment(
    equipment: Equipment,
    task: Task,
    constraints: OptimizationConstraints,
  ): Assignment {
    const assignmentId = `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate start and end times
    const startTime = task.constraints.timeWindow.start;
    const endTime = new Date(startTime.getTime() + task.constraints.duration * 60000);
    
    // Calculate costs
    const cost = this.calculateAssignmentCost(equipment, task);
    
    // Calculate efficiency
    const efficiency = this.calculateAssignmentEfficiency(equipment, task);
    
    // Check feasibility
    const feasibility = this.checkAssignmentFeasibility(equipment, task, constraints);
    
    // Identify violations
    const violations = this.identifyViolations(equipment, task, constraints);
    
    // Calculate resources
    const resources = this.calculateRequiredResources(equipment, task);
    
    // Calculate performance
    const performance = this.calculateAssignmentPerformance(equipment, task);
    
    return {
      id: assignmentId,
      equipmentId: equipment.id,
      taskId: task.id,
      startTime,
      endTime,
      duration: task.constraints.duration,
      cost,
      efficiency,
      feasibility,
      violations,
      resources,
      performance,
    };
  }

  private calculateAssignmentCost(equipment: Equipment, task: Task): number {
    const duration = task.constraints.duration / 60; // hours
    
    const fixedCost = equipment.costs.fixed;
    const variableCost = equipment.costs.variable * duration;
    const maintenanceCost = equipment.costs.maintenance * duration;
    const energyCost = equipment.costs.energy * equipment.specifications.energy.consumption * duration;
    const depreciationCost = equipment.costs.depreciation * duration;
    
    return fixedCost + variableCost + maintenanceCost + energyCost + depreciationCost;
  }

  private calculateAssignmentEfficiency(equipment: Equipment, task: Task): number {
    let efficiency = 0.5; // Base efficiency
    
    // Equipment efficiency factor
    efficiency += equipment.performance.efficiency * 0.3;
    
    // Task complexity factor
    const complexityFactor = this.calculateTaskComplexity(task);
    efficiency += complexityFactor * 0.2;
    
    // Equipment-task compatibility factor
    const compatibilityFactor = this.calculateCompatibility(equipment, task);
    efficiency += compatibilityFactor * 0.3;
    
    return Math.max(0, Math.min(1, efficiency));
  }

  private calculateTaskComplexity(task: Task): number {
    let complexity = 0.5; // Base complexity
    
    // Requirements complexity
    complexity += task.requirements.special.length * 0.1;
    complexity += task.requirements.safety.length * 0.1;
    complexity += task.requirements.environmental.length * 0.1;
    
    // Dependencies complexity
    complexity += task.dependencies.length * 0.05;
    
    // Resource complexity
    complexity += task.resources.personnel * 0.02;
    complexity += task.resources.materials.length * 0.05;
    complexity += task.resources.tools.length * 0.05;
    complexity += task.resources.utilities.length * 0.05;
    
    return Math.max(0, Math.min(1, complexity));
  }

  private calculateCompatibility(equipment: Equipment, task: Task): number {
    let compatibility = 0.5; // Base compatibility
    
    // Equipment type compatibility
    if (task.requirements.equipment.includes(equipment.type)) {
      compatibility += 0.3;
    }
    
    // Capacity compatibility
    const weightCompatibility = Math.min(1, equipment.specifications.capacity.weight / task.requirements.capacity.weight);
    const volumeCompatibility = Math.min(1, equipment.specifications.capacity.volume / task.requirements.capacity.volume);
    const palletCompatibility = Math.min(1, equipment.specifications.capacity.pallets / task.requirements.capacity.pallets);
    
    compatibility += (weightCompatibility + volumeCompatibility + palletCompatibility) / 3 * 0.2;
    
    return Math.max(0, Math.min(1, compatibility));
  }

  private checkAssignmentFeasibility(
    equipment: Equipment,
    task: Task,
    constraints: OptimizationConstraints,
  ): boolean {
    // Check time constraints
    const duration = task.constraints.duration / 60; // hours
    if (duration > constraints.maxDuration) {
      return false;
    }
    
    // Check cost constraints
    const cost = this.calculateAssignmentCost(equipment, task);
    if (cost > constraints.maxCost) {
      return false;
    }
    
    // Check efficiency constraints
    const efficiency = this.calculateAssignmentEfficiency(equipment, task);
    if (efficiency < constraints.minEfficiency) {
      return false;
    }
    
    // Check quality constraints
    const quality = equipment.specifications.performance.accuracy;
    if (quality < constraints.minQuality) {
      return false;
    }
    
    return true;
  }

  private identifyViolations(
    equipment: Equipment,
    task: Task,
    constraints: OptimizationConstraints,
  ): string[] {
    const violations: string[] = [];
    
    // Check time violations
    const duration = task.constraints.duration / 60; // hours
    if (duration > constraints.maxDuration) {
      violations.push('Exceeds maximum duration limit');
    }
    
    // Check cost violations
    const cost = this.calculateAssignmentCost(equipment, task);
    if (cost > constraints.maxCost) {
      violations.push('Exceeds maximum cost limit');
    }
    
    // Check efficiency violations
    const efficiency = this.calculateAssignmentEfficiency(equipment, task);
    if (efficiency < constraints.minEfficiency) {
      violations.push('Below minimum efficiency threshold');
    }
    
    // Check quality violations
    const quality = equipment.specifications.performance.accuracy;
    if (quality < constraints.minQuality) {
      violations.push('Below minimum quality threshold');
    }
    
    return violations;
  }

  private calculateRequiredResources(equipment: Equipment, task: Task): any {
    const personnel = Math.max(1, task.resources.personnel);
    const materials = [...task.resources.materials];
    const tools = [...task.resources.tools];
    const utilities = [...task.resources.utilities];
    
    // Add equipment-specific resources
    if (equipment.specifications.energy.type === 'electric') {
      utilities.push('electricity');
    }
    
    if (equipment.specifications.energy.type === 'diesel' || equipment.specifications.energy.type === 'gasoline') {
      utilities.push('fuel');
    }
    
    if (equipment.specifications.maintenance.complexity === 'high') {
      tools.push('maintenance_tools');
    }
    
    return {
      personnel,
      materials,
      tools,
      utilities,
    };
  }

  private calculateAssignmentPerformance(equipment: Equipment, task: Task): any {
    const throughput = equipment.specifications.performance.throughput * this.calculateAssignmentEfficiency(equipment, task);
    const utilization = Math.min(equipment.performance.utilization + 10, 100); // Increase utilization
    const waitTime = this.calculateWaitTime(equipment, task);
    const serviceTime = task.constraints.duration;
    const quality = equipment.specifications.performance.accuracy;
    
    return {
      throughput,
      utilization,
      waitTime,
      serviceTime,
      quality,
    };
  }

  private calculateWaitTime(equipment: Equipment, task: Task): number {
    // Simplified wait time calculation
    const currentUtilization = equipment.performance.utilization;
    const baseWaitTime = 30; // minutes
    
    return baseWaitTime * (currentUtilization / 100);
  }

  private optimizeGreedy(
    initialSolution: Assignment[],
    processedData: any,
    constraints: OptimizationConstraints,
  ): Assignment[] {
    const { equipment, tasks } = processedData;
    const assignments: Assignment[] = [];
    
    // Sort tasks by priority
    const sortedTasks = tasks.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    // Assign to best available equipment
    for (const task of sortedTasks) {
      const suitableEquipment = this.findSuitableEquipment(equipment, task, constraints);
      
      if (suitableEquipment.length > 0) {
        const bestEquipment = this.selectBestEquipment(suitableEquipment, task, constraints);
        const assignment = this.createAssignment(bestEquipment, task, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
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
    const { equipment, tasks } = processedData;
    const assignments: Assignment[] = [];
    
    for (const task of tasks) {
      const suitableEquipment = this.findSuitableEquipment(equipment, task, constraints);
      
      if (suitableEquipment.length > 0) {
        const randomEquipment = suitableEquipment[Math.floor(Math.random() * suitableEquipment.length)];
        const assignment = this.createAssignment(randomEquipment, task, constraints);
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
    const coverage = solution.length / processedData.tasks.length;
    fitness += coverage * 100;
    
    // Quality fitness
    const averageQuality = solution.reduce((sum, assignment) => sum + assignment.performance.quality, 0) / solution.length;
    fitness += averageQuality * 100;
    
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
    const { equipment, tasks } = processedData;
    const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    const suitableEquipment = this.findSuitableEquipment(equipment, randomTask, constraints);
    const randomEquipment = suitableEquipment[Math.floor(Math.random() * suitableEquipment.length)];
    
    return this.createAssignment(randomEquipment, randomTask, constraints);
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
    const { equipment, tasks } = processedData;
    const variables = this.createLPVariables(equipment, tasks);
    const objective = this.createLPObjective(variables);
    const constraints_matrix = this.createLPConstraints(variables, constraints);
    
    // Solve using simplified approach
    const solution = this.solveLinearProgram(variables, objective, constraints_matrix);
    
    return this.convertLPSolutionToAssignments(solution, equipment, tasks, constraints);
  }

  private createLPVariables(equipment: Equipment[], tasks: Task[]): any[] {
    const variables = [];
    
    for (const eq of equipment) {
      for (const task of tasks) {
        variables.push({
          equipmentId: eq.id,
          taskId: task.id,
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
    equipment: Equipment[],
    tasks: Task[],
    constraints: OptimizationConstraints,
  ): Assignment[] {
    const assignments: Assignment[] = [];
    
    for (let i = 0; i < solution.length; i++) {
      if (solution[i] === 1) {
        const variable = this.createLPVariables(equipment, tasks)[i];
        const eq = equipment.find(e => e.id === variable.equipmentId);
        const task = tasks.find(t => t.id === variable.taskId);
        
        if (eq && task) {
          const assignment = this.createAssignment(eq, task, constraints);
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
    const greedy = this.optimizeGreedy(initialSolution, processedData, constraints);
    const genetic = await this.optimizeGenetic(initialSolution, processedData, constraints, options);
    const simulatedAnnealing = await this.optimizeSimulatedAnnealing(initialSolution, processedData, constraints, options);
    
    // Select best solution
    const solutions = [greedy, genetic, simulatedAnnealing];
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
    const coverage = solution.length / processedData.tasks.length;
    const utilization = solution.length / processedData.equipment.length;
    const costEfficiency = this.calculateCostEfficiency(solution);
    const timeEfficiency = this.calculateTimeEfficiency(solution);
    const throughput = this.calculateThroughput(solution);
    const quality = this.calculateQuality(solution);
    
    return {
      coverage,
      utilization,
      costEfficiency,
      timeEfficiency,
      throughput,
      quality,
    };
  }

  private calculateCostEfficiency(solution: Assignment[]): number {
    const totalCost = solution.reduce((sum, assignment) => sum + assignment.cost, 0);
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    
    return averageEfficiency / (totalCost / 1000 + 1);
  }

  private calculateTimeEfficiency(solution: Assignment[]): number {
    const totalTime = solution.reduce((sum, assignment) => sum + assignment.duration, 0);
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    
    return averageEfficiency / (totalTime / 60 + 1);
  }

  private calculateThroughput(solution: Assignment[]): number {
    const totalThroughput = solution.reduce((sum, assignment) => sum + assignment.performance.throughput, 0);
    return totalThroughput / solution.length;
  }

  private calculateQuality(solution: Assignment[]): number {
    const totalQuality = solution.reduce((sum, assignment) => sum + assignment.performance.quality, 0);
    return totalQuality / solution.length;
  }

  private calculateSummary(solution: Assignment[], processedData: any): any {
    const totalEquipment = processedData.equipment.length;
    const assignedEquipment = new Set(solution.map(a => a.equipmentId)).size;
    const totalTasks = processedData.tasks.length;
    const assignedTasks = solution.length;
    const totalCost = solution.reduce((sum, assignment) => sum + assignment.cost, 0);
    const totalDuration = solution.reduce((sum, assignment) => sum + assignment.duration, 0);
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    const averageUtilization = assignedEquipment / totalEquipment;
    
    return {
      totalEquipment,
      assignedEquipment,
      totalTasks,
      assignedTasks,
      totalCost,
      totalDuration,
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
      immediate.push('Low task coverage - consider additional equipment');
    }
    
    if (performance.utilization < 0.7) {
      immediate.push('Low equipment utilization - optimize assignments');
    }
    
    if (performance.costEfficiency < 0.6) {
      shortTerm.push('Low cost efficiency - review equipment selection');
    }
    
    if (performance.timeEfficiency < 0.6) {
      shortTerm.push('Low time efficiency - optimize scheduling');
    }
    
    if (performance.throughput < 50) {
      shortTerm.push('Low throughput - improve equipment efficiency');
    }
    
    if (performance.quality < 0.8) {
      shortTerm.push('Low quality - improve equipment maintenance');
    }
    
    longTerm.push('Implement real-time equipment monitoring');
    longTerm.push('Develop predictive maintenance system');
    longTerm.push('Create dynamic scheduling model');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveOptimizationResult(result: OptimizationResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO equipment_utilization_optimization_results 
        (total_equipment, assigned_equipment, total_tasks, assigned_tasks, 
         total_cost, total_duration, average_efficiency, average_utilization,
         coverage, utilization, cost_efficiency, time_efficiency, throughput, quality, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      `, [
        result.summary.totalEquipment,
        result.summary.assignedEquipment,
        result.summary.totalTasks,
        result.summary.assignedTasks,
        result.summary.totalCost,
        result.summary.totalDuration,
        result.summary.averageEfficiency,
        result.summary.averageUtilization,
        result.performance.coverage,
        result.performance.utilization,
        result.performance.costEfficiency,
        result.performance.timeEfficiency,
        result.performance.throughput,
        result.performance.quality,
      ]);
    } catch (error) {
      this.logger.error('Failed to save equipment utilization optimization result:', error);
    }
  }
}

