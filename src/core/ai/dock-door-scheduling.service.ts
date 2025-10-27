import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface DockDoor {
  id: string;
  number: string;
  type: 'inbound' | 'outbound' | 'mixed';
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
  equipment: {
    dockLeveler: boolean;
    dockSeal: boolean;
    dockBumper: boolean;
    dockLight: boolean;
    dockLock: boolean;
    dockPlate: boolean;
    dockRamp: boolean;
    dockShelter: boolean;
    dockTruck: boolean;
    dockWheel: boolean;
  };
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  location: {
    zone: string;
    section: string;
    position: number;
    coordinates: { x: number; y: number };
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
    utilities: number; // per hour
  };
  performance: {
    utilization: number; // percentage
    efficiency: number; // 0-1
    throughput: number; // pallets per hour
    averageWaitTime: number; // minutes
    averageServiceTime: number; // minutes
  };
}

interface Shipment {
  id: string;
  type: 'inbound' | 'outbound';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  carrier: {
    id: string;
    name: string;
    type: 'truck' | 'van' | 'trailer' | 'container';
    size: {
      length: number; // meters
      width: number; // meters
      height: number; // meters
    };
    capacity: {
      weight: number; // kg
      volume: number; // m³
      pallets: number;
    };
    specifications: {
      dockHeight: number; // meters
      dockWidth: number; // meters
      dockDepth: number; // meters
      dockAngle: number; // degrees
      dockClearance: number; // meters
    };
  };
  items: ShipmentItem[];
  constraints: {
    timeWindow: {
      start: Date;
      end: Date;
    };
    specialRequirements: string[];
    temperature: 'ambient' | 'cool' | 'cold' | 'frozen';
    fragility: 'low' | 'medium' | 'high';
    hazardous: boolean;
    security: 'standard' | 'high' | 'maximum';
  };
  location: {
    pickup: {
      address: string;
      coordinates: { lat: number; lon: number };
      timeWindow: { start: Date; end: Date };
    };
    dropoff: {
      address: string;
      coordinates: { lat: number; lon: number };
      timeWindow: { start: Date; end: Date };
    };
  };
  estimatedDuration: number; // minutes
  estimatedCost: number; // currency
  estimatedDistance: number; // km
}

interface ShipmentItem {
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
  handling: {
    stacking: boolean;
    rotation: boolean;
    orientation: 'upright' | 'sideways' | 'upside_down';
    special: string[];
  };
}

interface DockAssignment {
  id: string;
  dockDoorId: string;
  shipmentId: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  cost: number; // currency
  efficiency: number; // 0-1
  feasibility: boolean;
  violations: string[];
  resources: {
    personnel: number;
    equipment: string[];
    utilities: string[];
  };
  performance: {
    throughput: number; // pallets per hour
    utilization: number; // percentage
    waitTime: number; // minutes
    serviceTime: number; // minutes
  };
}

interface SchedulingResult {
  assignments: DockAssignment[];
  summary: {
    totalDockDoors: number;
    assignedDockDoors: number;
    totalShipments: number;
    assignedShipments: number;
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
    throughput: number; // pallets per hour
    waitTime: number; // minutes
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface SchedulingConstraints {
  maxCost: number;
  maxDuration: number; // hours
  minEfficiency: number;
  maxWaitTime: number; // minutes
  maxViolations: number;
  priorityWeight: number;
  costWeight: number;
  timeWeight: number;
  qualityWeight: number;
  throughputWeight: number;
}

@Injectable()
export class DockDoorSchedulingService {
  private readonly logger = new Logger(DockDoorSchedulingService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimizeDockDoorScheduling(
    dockDoors: DockDoor[],
    shipments: Shipment[],
    constraints: SchedulingConstraints,
    options: {
      algorithm: 'first_come_first_served' | 'priority_based' | 'shortest_job_first' | 'earliest_deadline_first' | 'genetic' | 'simulated_annealing' | 'linear_programming' | 'hybrid';
      includeRealTime: boolean;
      includeTraffic: boolean;
      includeWeather: boolean;
      includeCarrierPreferences: boolean;
      includeEnvironmental: boolean;
      maxIterations: number;
      timeLimit: number; // minutes
    },
  ): Promise<SchedulingResult> {
    this.logger.log(`Optimizing dock door scheduling for ${dockDoors.length} dock doors and ${shipments.length} shipments`);

    // Preprocess data
    const processedData = this.preprocessData(dockDoors, shipments, constraints);
    
    // Generate initial solution
    const initialSolution = this.generateInitialSolution(processedData, constraints);
    
    // Optimize using selected algorithm
    let optimizedSolution: DockAssignment[];
    
    switch (options.algorithm) {
      case 'first_come_first_served':
        optimizedSolution = this.optimizeFirstComeFirstServed(initialSolution, processedData, constraints);
        break;
        
      case 'priority_based':
        optimizedSolution = this.optimizePriorityBased(initialSolution, processedData, constraints);
        break;
        
      case 'shortest_job_first':
        optimizedSolution = this.optimizeShortestJobFirst(initialSolution, processedData, constraints);
        break;
        
      case 'earliest_deadline_first':
        optimizedSolution = this.optimizeEarliestDeadlineFirst(initialSolution, processedData, constraints);
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
    
    const result: SchedulingResult = {
      assignments: optimizedSolution,
      summary,
      performance,
      recommendations,
    };

    await this.saveSchedulingResult(result);
    await this.eventBus.emit('dock.door.scheduling.optimized', { result });

    return result;
  }

  private preprocessData(
    dockDoors: DockDoor[],
    shipments: Shipment[],
    constraints: SchedulingConstraints,
  ): any {
    // Filter available dock doors
    const availableDockDoors = dockDoors.filter(dockDoor => 
      dockDoor.status === 'available' &&
      dockDoor.performance.efficiency > constraints.minEfficiency
    );
    
    // Filter feasible shipments
    const feasibleShipments = shipments.filter(shipment => 
      shipment.constraints.timeWindow.end > new Date() &&
      shipment.estimatedCost <= constraints.maxCost
    );
    
    // Sort shipments by priority
    const sortedShipments = feasibleShipments.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    return {
      dockDoors: availableDockDoors,
      shipments: sortedShipments,
      constraints,
    };
  }

  private generateInitialSolution(processedData: any, constraints: SchedulingConstraints): DockAssignment[] {
    const assignments: DockAssignment[] = [];
    const { dockDoors, shipments } = processedData;
    
    // Simple greedy assignment
    for (const shipment of shipments) {
      const suitableDockDoors = this.findSuitableDockDoors(dockDoors, shipment, constraints);
      
      if (suitableDockDoors.length > 0) {
        const bestDockDoor = this.selectBestDockDoor(suitableDockDoors, shipment, constraints);
        const assignment = this.createAssignment(bestDockDoor, shipment, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private findSuitableDockDoors(
    dockDoors: DockDoor[],
    shipment: Shipment,
    constraints: SchedulingConstraints,
  ): DockDoor[] {
    return dockDoors.filter(dockDoor => {
      // Check capacity constraints
      const totalWeight = shipment.items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
      const totalVolume = shipment.items.reduce((sum, item) => sum + item.volume * item.quantity, 0);
      
      if (totalWeight > dockDoor.capacity.weight || totalVolume > dockDoor.capacity.volume) {
        return false;
      }
      
      // Check type compatibility
      if (shipment.type === 'inbound' && dockDoor.type === 'outbound') {
        return false;
      }
      
      if (shipment.type === 'outbound' && dockDoor.type === 'inbound') {
        return false;
      }
      
      // Check special requirements
      if (shipment.constraints.temperature !== 'ambient' && !dockDoor.equipment.dockLeveler) {
        return false;
      }
      
      if (shipment.constraints.hazardous && !dockDoor.equipment.dockSeal) {
        return false;
      }
      
      // Check security requirements
      if (shipment.constraints.security === 'maximum' && !dockDoor.equipment.dockLock) {
        return false;
      }
      
      return true;
    });
  }

  private selectBestDockDoor(
    dockDoors: DockDoor[],
    shipment: Shipment,
    constraints: SchedulingConstraints,
  ): DockDoor {
    let bestDockDoor = dockDoors[0];
    let bestScore = this.calculateDockDoorScore(dockDoors[0], shipment, constraints);
    
    for (let i = 1; i < dockDoors.length; i++) {
      const score = this.calculateDockDoorScore(dockDoors[i], shipment, constraints);
      if (score > bestScore) {
        bestScore = score;
        bestDockDoor = dockDoors[i];
      }
    }
    
    return bestDockDoor;
  }

  private calculateDockDoorScore(
    dockDoor: DockDoor,
    shipment: Shipment,
    constraints: SchedulingConstraints,
  ): number {
    let score = 0;
    
    // Cost score (lower is better)
    const costScore = 100 / (dockDoor.costs.fixed + dockDoor.costs.variable * (shipment.estimatedDuration / 60) + 1);
    score += costScore * constraints.costWeight;
    
    // Efficiency score
    score += dockDoor.performance.efficiency * constraints.qualityWeight;
    
    // Throughput score
    const throughputScore = dockDoor.performance.throughput / 100; // normalize
    score += throughputScore * constraints.throughputWeight;
    
    // Utilization score (prefer less utilized dock doors)
    const utilizationScore = (100 - dockDoor.performance.utilization) / 100;
    score += utilizationScore * constraints.timeWeight;
    
    // Equipment compatibility score
    const equipmentScore = this.calculateEquipmentCompatibility(dockDoor, shipment);
    score += equipmentScore * constraints.qualityWeight;
    
    return score;
  }

  private calculateEquipmentCompatibility(dockDoor: DockDoor, shipment: Shipment): number {
    let compatibility = 0;
    
    // Check required equipment
    if (shipment.constraints.temperature !== 'ambient' && dockDoor.equipment.dockLeveler) {
      compatibility += 0.2;
    }
    
    if (shipment.constraints.hazardous && dockDoor.equipment.dockSeal) {
      compatibility += 0.2;
    }
    
    if (shipment.constraints.security === 'high' && dockDoor.equipment.dockLock) {
      compatibility += 0.2;
    }
    
    if (shipment.carrier.specifications.dockHeight > 0 && dockDoor.equipment.dockLeveler) {
      compatibility += 0.2;
    }
    
    if (shipment.carrier.specifications.dockWidth > 0 && dockDoor.equipment.dockBumper) {
      compatibility += 0.2;
    }
    
    return compatibility;
  }

  private createAssignment(
    dockDoor: DockDoor,
    shipment: Shipment,
    constraints: SchedulingConstraints,
  ): DockAssignment {
    const assignmentId = `assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate start and end times
    const startTime = shipment.constraints.timeWindow.start;
    const endTime = new Date(startTime.getTime() + shipment.estimatedDuration * 60000);
    
    // Calculate costs
    const cost = this.calculateAssignmentCost(dockDoor, shipment);
    
    // Calculate efficiency
    const efficiency = this.calculateAssignmentEfficiency(dockDoor, shipment);
    
    // Check feasibility
    const feasibility = this.checkAssignmentFeasibility(dockDoor, shipment, constraints);
    
    // Identify violations
    const violations = this.identifyViolations(dockDoor, shipment, constraints);
    
    // Calculate resources
    const resources = this.calculateRequiredResources(dockDoor, shipment);
    
    // Calculate performance
    const performance = this.calculateAssignmentPerformance(dockDoor, shipment);
    
    return {
      id: assignmentId,
      dockDoorId: dockDoor.id,
      shipmentId: shipment.id,
      startTime,
      endTime,
      duration: shipment.estimatedDuration,
      cost,
      efficiency,
      feasibility,
      violations,
      resources,
      performance,
    };
  }

  private calculateAssignmentCost(dockDoor: DockDoor, shipment: Shipment): number {
    const duration = shipment.estimatedDuration / 60; // hours
    
    const fixedCost = dockDoor.costs.fixed;
    const variableCost = dockDoor.costs.variable * duration;
    const maintenanceCost = dockDoor.costs.maintenance * duration;
    const utilitiesCost = dockDoor.costs.utilities * duration;
    
    return fixedCost + variableCost + maintenanceCost + utilitiesCost;
  }

  private calculateAssignmentEfficiency(dockDoor: DockDoor, shipment: Shipment): number {
    let efficiency = 0.5; // Base efficiency
    
    // Dock door efficiency factor
    efficiency += dockDoor.performance.efficiency * 0.3;
    
    // Shipment complexity factor
    const complexityFactor = this.calculateShipmentComplexity(shipment);
    efficiency += complexityFactor * 0.2;
    
    // Equipment compatibility factor
    const equipmentCompatibility = this.calculateEquipmentCompatibility(dockDoor, shipment);
    efficiency += equipmentCompatibility * 0.3;
    
    return Math.max(0, Math.min(1, efficiency));
  }

  private calculateShipmentComplexity(shipment: Shipment): number {
    let complexity = 0.5; // Base complexity
    
    // Item count factor
    complexity += Math.min(shipment.items.length / 100, 0.3);
    
    // Special requirements factor
    if (shipment.constraints.temperature !== 'ambient') {
      complexity += 0.1;
    }
    
    if (shipment.constraints.hazardous) {
      complexity += 0.1;
    }
    
    if (shipment.constraints.security === 'high') {
      complexity += 0.1;
    }
    
    // Fragility factor
    const fragileItems = shipment.items.filter(item => item.fragility === 'high').length;
    complexity += Math.min(fragileItems / shipment.items.length, 0.2);
    
    return Math.max(0, Math.min(1, complexity));
  }

  private checkAssignmentFeasibility(
    dockDoor: DockDoor,
    shipment: Shipment,
    constraints: SchedulingConstraints,
  ): boolean {
    // Check time constraints
    const duration = shipment.estimatedDuration / 60; // hours
    if (duration > constraints.maxDuration) {
      return false;
    }
    
    // Check cost constraints
    const cost = this.calculateAssignmentCost(dockDoor, shipment);
    if (cost > constraints.maxCost) {
      return false;
    }
    
    // Check efficiency constraints
    const efficiency = this.calculateAssignmentEfficiency(dockDoor, shipment);
    if (efficiency < constraints.minEfficiency) {
      return false;
    }
    
    // Check wait time constraints
    const waitTime = this.calculateWaitTime(dockDoor, shipment);
    if (waitTime > constraints.maxWaitTime) {
      return false;
    }
    
    return true;
  }

  private calculateWaitTime(dockDoor: DockDoor, shipment: Shipment): number {
    // Simplified wait time calculation
    const currentUtilization = dockDoor.performance.utilization;
    const baseWaitTime = 30; // minutes
    
    return baseWaitTime * (currentUtilization / 100);
  }

  private identifyViolations(
    dockDoor: DockDoor,
    shipment: Shipment,
    constraints: SchedulingConstraints,
  ): string[] {
    const violations: string[] = [];
    
    // Check time violations
    const duration = shipment.estimatedDuration / 60; // hours
    if (duration > constraints.maxDuration) {
      violations.push('Exceeds maximum duration limit');
    }
    
    // Check cost violations
    const cost = this.calculateAssignmentCost(dockDoor, shipment);
    if (cost > constraints.maxCost) {
      violations.push('Exceeds maximum cost limit');
    }
    
    // Check efficiency violations
    const efficiency = this.calculateAssignmentEfficiency(dockDoor, shipment);
    if (efficiency < constraints.minEfficiency) {
      violations.push('Below minimum efficiency threshold');
    }
    
    // Check wait time violations
    const waitTime = this.calculateWaitTime(dockDoor, shipment);
    if (waitTime > constraints.maxWaitTime) {
      violations.push('Exceeds maximum wait time limit');
    }
    
    return violations;
  }

  private calculateRequiredResources(dockDoor: DockDoor, shipment: Shipment): any {
    const personnel = Math.ceil(shipment.items.length / 50); // 1 person per 50 items
    const equipment: string[] = [];
    const utilities: string[] = [];
    
    // Required equipment
    if (shipment.constraints.temperature !== 'ambient') {
      equipment.push('temperature_control');
    }
    
    if (shipment.constraints.hazardous) {
      equipment.push('hazardous_material_handling');
    }
    
    if (shipment.constraints.security === 'high') {
      equipment.push('security_system');
    }
    
    // Required utilities
    if (shipment.constraints.temperature === 'cold' || shipment.constraints.temperature === 'frozen') {
      utilities.push('refrigeration');
    }
    
    if (shipment.constraints.hazardous) {
      utilities.push('ventilation');
    }
    
    return {
      personnel,
      equipment,
      utilities,
    };
  }

  private calculateAssignmentPerformance(dockDoor: DockDoor, shipment: Shipment): any {
    const throughput = dockDoor.performance.throughput * this.calculateAssignmentEfficiency(dockDoor, shipment);
    const utilization = Math.min(dockDoor.performance.utilization + 10, 100); // Increase utilization
    const waitTime = this.calculateWaitTime(dockDoor, shipment);
    const serviceTime = shipment.estimatedDuration;
    
    return {
      throughput,
      utilization,
      waitTime,
      serviceTime,
    };
  }

  private optimizeFirstComeFirstServed(
    initialSolution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
  ): DockAssignment[] {
    const { dockDoors, shipments } = processedData;
    const assignments: DockAssignment[] = [];
    
    // Sort shipments by arrival time
    const sortedShipments = shipments.sort((a, b) => 
      a.constraints.timeWindow.start.getTime() - b.constraints.timeWindow.start.getTime()
    );
    
    // Assign to first available dock door
    for (const shipment of sortedShipments) {
      const suitableDockDoors = this.findSuitableDockDoors(dockDoors, shipment, constraints);
      
      if (suitableDockDoors.length > 0) {
        const firstAvailable = suitableDockDoors[0];
        const assignment = this.createAssignment(firstAvailable, shipment, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private optimizePriorityBased(
    initialSolution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
  ): DockAssignment[] {
    const { dockDoors, shipments } = processedData;
    const assignments: DockAssignment[] = [];
    
    // Sort shipments by priority
    const sortedShipments = shipments.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    // Assign to best available dock door
    for (const shipment of sortedShipments) {
      const suitableDockDoors = this.findSuitableDockDoors(dockDoors, shipment, constraints);
      
      if (suitableDockDoors.length > 0) {
        const bestDockDoor = this.selectBestDockDoor(suitableDockDoors, shipment, constraints);
        const assignment = this.createAssignment(bestDockDoor, shipment, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private optimizeShortestJobFirst(
    initialSolution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
  ): DockAssignment[] {
    const { dockDoors, shipments } = processedData;
    const assignments: DockAssignment[] = [];
    
    // Sort shipments by duration
    const sortedShipments = shipments.sort((a, b) => a.estimatedDuration - b.estimatedDuration);
    
    // Assign to best available dock door
    for (const shipment of sortedShipments) {
      const suitableDockDoors = this.findSuitableDockDoors(dockDoors, shipment, constraints);
      
      if (suitableDockDoors.length > 0) {
        const bestDockDoor = this.selectBestDockDoor(suitableDockDoors, shipment, constraints);
        const assignment = this.createAssignment(bestDockDoor, shipment, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private optimizeEarliestDeadlineFirst(
    initialSolution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
  ): DockAssignment[] {
    const { dockDoors, shipments } = processedData;
    const assignments: DockAssignment[] = [];
    
    // Sort shipments by deadline
    const sortedShipments = shipments.sort((a, b) => 
      a.constraints.timeWindow.end.getTime() - b.constraints.timeWindow.end.getTime()
    );
    
    // Assign to best available dock door
    for (const shipment of sortedShipments) {
      const suitableDockDoors = this.findSuitableDockDoors(dockDoors, shipment, constraints);
      
      if (suitableDockDoors.length > 0) {
        const bestDockDoor = this.selectBestDockDoor(suitableDockDoors, shipment, constraints);
        const assignment = this.createAssignment(bestDockDoor, shipment, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private async optimizeGenetic(
    initialSolution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
    options: any,
  ): Promise<DockAssignment[]> {
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
      const newPopulation: DockAssignment[] = [];
      
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
    initialSolution: DockAssignment[],
    size: number,
    processedData: any,
    constraints: SchedulingConstraints,
  ): DockAssignment[][] {
    const population: DockAssignment[][] = [];
    
    for (let i = 0; i < size; i++) {
      const solution = this.generateRandomSolution(processedData, constraints);
      population.push(solution);
    }
    
    return population;
  }

  private generateRandomSolution(
    processedData: any,
    constraints: SchedulingConstraints,
  ): DockAssignment[] {
    const { dockDoors, shipments } = processedData;
    const assignments: DockAssignment[] = [];
    
    for (const shipment of shipments) {
      const suitableDockDoors = this.findSuitableDockDoors(dockDoors, shipment, constraints);
      
      if (suitableDockDoors.length > 0) {
        const randomDockDoor = suitableDockDoors[Math.floor(Math.random() * suitableDockDoors.length)];
        const assignment = this.createAssignment(randomDockDoor, shipment, constraints);
        assignments.push(assignment);
      }
    }
    
    return assignments;
  }

  private calculateFitness(
    solution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
  ): number {
    let fitness = 0;
    
    // Cost fitness (lower is better)
    const totalCost = solution.reduce((sum, assignment) => sum + assignment.cost, 0);
    fitness += 1000 / (totalCost + 1);
    
    // Efficiency fitness
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    fitness += averageEfficiency * 100;
    
    // Coverage fitness
    const coverage = solution.length / processedData.shipments.length;
    fitness += coverage * 100;
    
    // Constraint violations
    const violations = solution.reduce((sum, assignment) => sum + assignment.violations.length, 0);
    fitness -= violations * 50;
    
    return fitness;
  }

  private selectParent(fitnessScores: { individual: DockAssignment[]; fitness: number }[]): DockAssignment[] {
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
    parent1: DockAssignment[],
    parent2: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
  ): DockAssignment[] {
    // Uniform crossover
    const offspring: DockAssignment[] = [];
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
    solution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
  ): DockAssignment[] {
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
    constraints: SchedulingConstraints,
  ): DockAssignment {
    const { dockDoors, shipments } = processedData;
    const randomShipment = shipments[Math.floor(Math.random() * shipments.length)];
    const suitableDockDoors = this.findSuitableDockDoors(dockDoors, randomShipment, constraints);
    const randomDockDoor = suitableDockDoors[Math.floor(Math.random() * suitableDockDoors.length)];
    
    return this.createAssignment(randomDockDoor, randomShipment, constraints);
  }

  private async optimizeSimulatedAnnealing(
    initialSolution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
    options: any,
  ): Promise<DockAssignment[]> {
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
    current: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
  ): DockAssignment[] {
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
    solution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
  ): number {
    // Energy is inverse of fitness
    return -this.calculateFitness(solution, processedData, constraints);
  }

  private async optimizeLinearProgramming(
    initialSolution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
    options: any,
  ): Promise<DockAssignment[]> {
    // Simplified linear programming approach
    const { dockDoors, shipments } = processedData;
    const variables = this.createLPVariables(dockDoors, shipments);
    const objective = this.createLPObjective(variables);
    const constraints_matrix = this.createLPConstraints(variables, constraints);
    
    // Solve using simplified approach
    const solution = this.solveLinearProgram(variables, objective, constraints_matrix);
    
    return this.convertLPSolutionToAssignments(solution, dockDoors, shipments, constraints);
  }

  private createLPVariables(dockDoors: DockDoor[], shipments: Shipment[]): any[] {
    const variables = [];
    
    for (const dockDoor of dockDoors) {
      for (const shipment of shipments) {
        variables.push({
          dockDoorId: dockDoor.id,
          shipmentId: shipment.id,
          coefficient: 1,
        });
      }
    }
    
    return variables;
  }

  private createLPObjective(variables: any[]): number[] {
    return variables.map(v => v.coefficient);
  }

  private createLPConstraints(variables: any[], constraints: SchedulingConstraints): number[][] {
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
    dockDoors: DockDoor[],
    shipments: Shipment[],
    constraints: SchedulingConstraints,
  ): DockAssignment[] {
    const assignments: DockAssignment[] = [];
    
    for (let i = 0; i < solution.length; i++) {
      if (solution[i] === 1) {
        const variable = this.createLPVariables(dockDoors, shipments)[i];
        const dockDoor = dockDoors.find(d => d.id === variable.dockDoorId);
        const shipment = shipments.find(s => s.id === variable.shipmentId);
        
        if (dockDoor && shipment) {
          const assignment = this.createAssignment(dockDoor, shipment, constraints);
          assignments.push(assignment);
        }
      }
    }
    
    return assignments;
  }

  private async optimizeHybrid(
    initialSolution: DockAssignment[],
    processedData: any,
    constraints: SchedulingConstraints,
    options: any,
  ): Promise<DockAssignment[]> {
    // Combine multiple algorithms
    const firstComeFirstServed = this.optimizeFirstComeFirstServed(initialSolution, processedData, constraints);
    const priorityBased = this.optimizePriorityBased(initialSolution, processedData, constraints);
    const genetic = await this.optimizeGenetic(initialSolution, processedData, constraints, options);
    const simulatedAnnealing = await this.optimizeSimulatedAnnealing(initialSolution, processedData, constraints, options);
    
    // Select best solution
    const solutions = [firstComeFirstServed, priorityBased, genetic, simulatedAnnealing];
    const bestSolution = solutions.reduce((best, current) => 
      this.calculateFitness(current, processedData, constraints) > 
      this.calculateFitness(best, processedData, constraints) ? current : best
    );
    
    return bestSolution;
  }

  private calculatePerformanceMetrics(
    solution: DockAssignment[],
    processedData: any,
  ): any {
    const coverage = solution.length / processedData.shipments.length;
    const utilization = solution.length / processedData.dockDoors.length;
    const costEfficiency = this.calculateCostEfficiency(solution);
    const timeEfficiency = this.calculateTimeEfficiency(solution);
    const throughput = this.calculateThroughput(solution);
    const waitTime = this.calculateAverageWaitTime(solution);
    
    return {
      coverage,
      utilization,
      costEfficiency,
      timeEfficiency,
      throughput,
      waitTime,
    };
  }

  private calculateCostEfficiency(solution: DockAssignment[]): number {
    const totalCost = solution.reduce((sum, assignment) => sum + assignment.cost, 0);
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    
    return averageEfficiency / (totalCost / 1000 + 1);
  }

  private calculateTimeEfficiency(solution: DockAssignment[]): number {
    const totalTime = solution.reduce((sum, assignment) => sum + assignment.duration, 0);
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    
    return averageEfficiency / (totalTime / 60 + 1);
  }

  private calculateThroughput(solution: DockAssignment[]): number {
    const totalThroughput = solution.reduce((sum, assignment) => sum + assignment.performance.throughput, 0);
    return totalThroughput / solution.length;
  }

  private calculateAverageWaitTime(solution: DockAssignment[]): number {
    const totalWaitTime = solution.reduce((sum, assignment) => sum + assignment.performance.waitTime, 0);
    return totalWaitTime / solution.length;
  }

  private calculateSummary(solution: DockAssignment[], processedData: any): any {
    const totalDockDoors = processedData.dockDoors.length;
    const assignedDockDoors = new Set(solution.map(a => a.dockDoorId)).size;
    const totalShipments = processedData.shipments.length;
    const assignedShipments = solution.length;
    const totalCost = solution.reduce((sum, assignment) => sum + assignment.cost, 0);
    const totalDuration = solution.reduce((sum, assignment) => sum + assignment.duration, 0);
    const averageEfficiency = solution.reduce((sum, assignment) => sum + assignment.efficiency, 0) / solution.length;
    const averageUtilization = assignedDockDoors / totalDockDoors;
    
    return {
      totalDockDoors,
      assignedDockDoors,
      totalShipments,
      assignedShipments,
      totalCost,
      totalDuration,
      averageEfficiency,
      averageUtilization,
    };
  }

  private generateRecommendations(
    solution: DockAssignment[],
    performance: any,
    constraints: SchedulingConstraints,
  ): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (performance.coverage < 0.8) {
      immediate.push('Low shipment coverage - consider additional dock doors');
    }
    
    if (performance.utilization < 0.7) {
      immediate.push('Low dock door utilization - optimize assignments');
    }
    
    if (performance.costEfficiency < 0.6) {
      shortTerm.push('Low cost efficiency - review dock door selection');
    }
    
    if (performance.timeEfficiency < 0.6) {
      shortTerm.push('Low time efficiency - optimize scheduling');
    }
    
    if (performance.throughput < 50) {
      shortTerm.push('Low throughput - improve dock door efficiency');
    }
    
    if (performance.waitTime > 60) {
      shortTerm.push('High wait time - optimize dock door availability');
    }
    
    longTerm.push('Implement real-time dock door monitoring');
    longTerm.push('Develop predictive maintenance system');
    longTerm.push('Create dynamic scheduling model');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveSchedulingResult(result: SchedulingResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO dock_door_scheduling_results 
        (total_dock_doors, assigned_dock_doors, total_shipments, assigned_shipments, 
         total_cost, total_duration, average_efficiency, average_utilization,
         coverage, utilization, cost_efficiency, time_efficiency, throughput, wait_time, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      `, [
        result.summary.totalDockDoors,
        result.summary.assignedDockDoors,
        result.summary.totalShipments,
        result.summary.assignedShipments,
        result.summary.totalCost,
        result.summary.totalDuration,
        result.summary.averageEfficiency,
        result.summary.averageUtilization,
        result.performance.coverage,
        result.performance.utilization,
        result.performance.costEfficiency,
        result.performance.timeEfficiency,
        result.performance.throughput,
        result.performance.waitTime,
      ]);
    } catch (error) {
      this.logger.error('Failed to save dock door scheduling result:', error);
    }
  }
}

