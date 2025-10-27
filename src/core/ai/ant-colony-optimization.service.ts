import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface OptimizationProblem {
  id: string;
  type: 'route_optimization' | 'vehicle_assignment' | 'dock_scheduling' | 'equipment_utilization' | 'inventory_optimization' | 'workforce_scheduling' | 'demand_forecasting' | 'pricing_optimization';
  name: string;
  description: string;
  variables: OptimizationVariable[];
  constraints: OptimizationConstraint[];
  objectives: OptimizationObjective[];
  parameters: {
    colonySize: number;
    maxIterations: number;
    maxTime: number; // minutes
    convergenceThreshold: number;
    alpha: number; // pheromone importance
    beta: number; // heuristic importance
    rho: number; // evaporation rate
    q0: number; // exploitation threshold
  };
  data: any; // Problem-specific data
}

interface OptimizationVariable {
  id: string;
  name: string;
  type: 'continuous' | 'discrete' | 'binary' | 'integer';
  domain: {
    min: number;
    max: number;
    step?: number; // for discrete variables
  };
  value: number;
  weight: number; // importance weight
}

interface OptimizationConstraint {
  id: string;
  name: string;
  type: 'equality' | 'inequality' | 'bound' | 'logical';
  expression: string; // mathematical expression
  bound: number;
  weight: number; // penalty weight
}

interface OptimizationObjective {
  id: string;
  name: string;
  type: 'minimize' | 'maximize';
  expression: string; // mathematical expression
  weight: number; // objective weight
  priority: number; // 1-10, higher is more important
}

interface Ant {
  id: string;
  position: { [variableId: string]: number };
  fitness: number;
  objectives: { [objectiveId: string]: number };
  constraints: { [constraintId: string]: number };
  feasibility: boolean;
  violations: string[];
  path: { [variableId: string]: number }[];
  pheromone: number;
  metadata: {
    iteration: number;
    improvementCount: number;
    stagnationCount: number;
    explorationRate: number;
    exploitationRate: number;
  };
}

interface Colony {
  ants: Ant[];
  bestAnt: Ant;
  pheromoneMatrix: { [variableId: string]: { [variableId: string]: number } };
  averageFitness: number;
  diversity: number;
  convergence: number;
  stability: number;
}

interface OptimizationResult {
  problem: OptimizationProblem;
  bestAnt: Ant;
  colony: Colony;
  summary: {
    totalIterations: number;
    totalTime: number; // minutes
    finalFitness: number;
    averageFitness: number;
    improvementRate: number;
    convergenceRate: number;
    diversity: number;
    stability: number;
  };
  performance: {
    convergence: boolean;
    stability: number; // 0-1
    diversity: number; // 0-1
    efficiency: number; // 0-1
    quality: number; // 0-1
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface ACOParameters {
  colonySize: number;
  maxIterations: number;
  maxTime: number; // minutes
  convergenceThreshold: number;
  alpha: number; // pheromone importance
  beta: number; // heuristic importance
  rho: number; // evaporation rate
  q0: number; // exploitation threshold
  pheromoneInit: number;
  pheromoneMax: number;
  pheromoneMin: number;
  adaptiveRho: boolean;
  adaptiveAlpha: boolean;
  adaptiveBeta: boolean;
  localSearch: boolean;
  elitism: boolean;
  elitismRate: number;
}

@Injectable()
export class AntColonyOptimizationService {
  private readonly logger = new Logger(AntColonyOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimize(
    problem: OptimizationProblem,
    parameters: ACOParameters,
    options: {
      includeRealTime: boolean;
      includeParallel: boolean;
      includeAdaptive: boolean;
      includeHybrid: boolean;
      includeLocalSearch: boolean;
      includeTabu: boolean;
      includeMultiObjective: boolean;
      maxLocalSearch: number;
      maxTabuSize: number;
    },
  ): Promise<OptimizationResult> {
    this.logger.log(`Starting ant colony optimization for problem: ${problem.name}`);

    // Initialize colony
    const startTime = Date.now();
    const colony = this.initializeColony(problem, parameters);
    let bestAnt = colony.ants[0];
    let iteration = 0;
    let improvementCount = 0;
    let stagnationCount = 0;
    let localSearchCount = 0;
    let tabuList: string[] = [];
    
    // Main optimization loop
    while (iteration < parameters.maxIterations && 
           (Date.now() - startTime) < parameters.maxTime * 60000) {
      
      // Update ants
      for (const ant of colony.ants) {
        // Construct solution
        this.constructSolution(ant, problem, parameters, colony);
        
        // Calculate fitness
        const fitness = this.calculateFitness(ant, problem);
        ant.fitness = fitness;
        
        // Update best ant
        if (fitness > bestAnt.fitness) {
          bestAnt = ant;
          improvementCount++;
        }
        
        // Local search if enabled
        if (options.includeLocalSearch && Math.random() < 0.1) {
          const localSearchAnt = this.performLocalSearch(ant, problem, parameters);
          if (localSearchAnt.fitness > ant.fitness) {
            Object.assign(ant, localSearchAnt);
            localSearchCount++;
          }
        }
        
        // Update metadata
        ant.metadata.iteration = iteration;
        ant.metadata.improvementCount = improvementCount;
        ant.metadata.stagnationCount = stagnationCount;
        ant.metadata.explorationRate = this.calculateExplorationRate(ant, colony);
        ant.metadata.exploitationRate = this.calculateExploitationRate(ant, colony);
      }
      
      // Update pheromone matrix
      this.updatePheromoneMatrix(colony, parameters);
      
      // Update colony metrics
      this.updateColonyMetrics(colony, problem);
      
      // Adaptive parameters
      if (options.includeAdaptive) {
        this.adaptiveParameterUpdate(parameters, colony, iteration);
      }
      
      // Check convergence
      if (this.checkConvergence(colony, parameters)) {
        break;
      }
      
      // Check stagnation
      if (this.checkStagnation(colony, parameters)) {
        stagnationCount++;
        if (stagnationCount > 10) {
          this.restartColony(colony, problem, parameters);
          stagnationCount = 0;
        }
      }
      
      iteration++;
    }
    
    // Calculate final metrics
    const totalTime = (Date.now() - startTime) / 60000; // minutes
    const averageFitness = colony.averageFitness;
    const improvementRate = improvementCount / (iteration * parameters.colonySize);
    const convergenceRate = colony.convergence;
    const diversity = colony.diversity;
    const stability = colony.stability;
    
    const summary = {
      totalIterations: iteration,
      totalTime,
      finalFitness: colony.bestAnt.fitness,
      averageFitness,
      improvementRate,
      convergenceRate,
      diversity,
      stability,
    };
    
    const performance = this.calculatePerformanceMetrics(colony, problem);
    const recommendations = this.generateRecommendations(colony, performance, parameters);
    
    const result: OptimizationResult = {
      problem,
      bestAnt,
      colony,
      summary,
      performance,
      recommendations,
    };

    await this.saveOptimizationResult(result);
    await this.eventBus.emit('ant.colony.optimized', { result });

    return result;
  }

  private initializeColony(problem: OptimizationProblem, parameters: ACOParameters): Colony {
    const ants: Ant[] = [];
    
    for (let i = 0; i < parameters.colonySize; i++) {
      const ant = this.createAnt(problem, i);
      ants.push(ant);
    }
    
    // Initialize pheromone matrix
    const pheromoneMatrix: { [variableId: string]: { [variableId: string]: number } } = {};
    for (const variable1 of problem.variables) {
      pheromoneMatrix[variable1.id] = {};
      for (const variable2 of problem.variables) {
        pheromoneMatrix[variable1.id][variable2.id] = parameters.pheromoneInit;
      }
    }
    
    // Find initial best ant
    let bestFitness = -Infinity;
    let bestAnt = ants[0];
    
    for (const ant of ants) {
      if (ant.fitness > bestFitness) {
        bestFitness = ant.fitness;
        bestAnt = ant;
      }
    }
    
    const colony: Colony = {
      ants,
      bestAnt,
      pheromoneMatrix,
      averageFitness: 0,
      diversity: 0,
      convergence: 0,
      stability: 0,
    };
    
    this.updateColonyMetrics(colony, problem);
    
    return colony;
  }

  private createAnt(problem: OptimizationProblem, index: number): Ant {
    const position: { [variableId: string]: number } = {};
    const path: { [variableId: string]: number }[] = [];
    
    // Initialize position
    for (const variable of problem.variables) {
      switch (variable.type) {
        case 'continuous':
          position[variable.id] = Math.random() * (variable.domain.max - variable.domain.min) + variable.domain.min;
          break;
          
        case 'discrete':
          const steps = Math.floor((variable.domain.max - variable.domain.min) / (variable.domain.step || 1));
          position[variable.id] = variable.domain.min + (Math.floor(Math.random() * steps) * (variable.domain.step || 1));
          break;
          
        case 'binary':
          position[variable.id] = Math.random() < 0.5 ? 0 : 1;
          break;
          
        case 'integer':
          position[variable.id] = Math.floor(Math.random() * (variable.domain.max - variable.domain.min + 1)) + variable.domain.min;
          break;
      }
      
      path.push({ [variable.id]: position[variable.id] });
    }
    
    // Calculate initial fitness
    const objectives = this.calculateObjectives(position, problem);
    const constraints = this.calculateConstraints(position, problem);
    const fitness = this.calculateFitness({ position, objectives, constraints } as Ant, problem);
    const feasibility = this.checkFeasibility(constraints, problem);
    const violations = this.identifyViolations(constraints, problem);
    
    return {
      id: `ant_${index}_${Date.now()}`,
      position,
      fitness,
      objectives,
      constraints,
      feasibility,
      violations,
      path,
      pheromone: 0,
      metadata: {
        iteration: 0,
        improvementCount: 0,
        stagnationCount: 0,
        explorationRate: 0,
        exploitationRate: 0,
      },
    };
  }

  private constructSolution(
    ant: Ant,
    problem: OptimizationProblem,
    parameters: ACOParameters,
    colony: Colony,
  ): void {
    const newPosition: { [variableId: string]: number } = {};
    const newPath: { [variableId: string]: number }[] = [];
    
    // Construct solution step by step
    for (const variable of problem.variables) {
      const currentValue = ant.position[variable.id];
      let newValue: number;
      
      // Calculate transition probabilities
      const probabilities = this.calculateTransitionProbabilities(
        variable,
        currentValue,
        problem,
        parameters,
        colony
      );
      
      // Select next value based on probabilities
      if (Math.random() < parameters.q0) {
        // Exploitation: select best option
        newValue = this.selectBestOption(probabilities);
      } else {
        // Exploration: select based on probabilities
        newValue = this.selectProbabilisticOption(probabilities);
      }
      
      newPosition[variable.id] = newValue;
      newPath.push({ [variable.id]: newValue });
    }
    
    ant.position = newPosition;
    ant.path = newPath;
    ant.objectives = this.calculateObjectives(newPosition, problem);
    ant.constraints = this.calculateConstraints(newPosition, problem);
    ant.fitness = this.calculateFitness(ant, problem);
    ant.feasibility = this.checkFeasibility(ant.constraints, problem);
    ant.violations = this.identifyViolations(ant.constraints, problem);
  }

  private calculateTransitionProbabilities(
    variable: OptimizationVariable,
    currentValue: number,
    problem: OptimizationProblem,
    parameters: ACOParameters,
    colony: Colony,
  ): { [value: number]: number } {
    const probabilities: { [value: number]: number } = {};
    const totalProbability = 0;
    
    // Generate possible values
    const possibleValues = this.generatePossibleValues(variable, currentValue);
    
    for (const value of possibleValues) {
      // Calculate pheromone contribution
      const pheromone = colony.pheromoneMatrix[variable.id][variable.id] || parameters.pheromoneInit;
      const pheromoneContribution = Math.pow(pheromone, parameters.alpha);
      
      // Calculate heuristic contribution
      const heuristic = this.calculateHeuristic(variable, value, problem);
      const heuristicContribution = Math.pow(heuristic, parameters.beta);
      
      // Calculate probability
      probabilities[value] = pheromoneContribution * heuristicContribution;
    }
    
    // Normalize probabilities
    const sum = Object.values(probabilities).reduce((sum, p) => sum + p, 0);
    for (const value in probabilities) {
      probabilities[value] = probabilities[value] / sum;
    }
    
    return probabilities;
  }

  private generatePossibleValues(variable: OptimizationVariable, currentValue: number): number[] {
    const values: number[] = [];
    
    switch (variable.type) {
      case 'continuous': {
        const range = variable.domain.max - variable.domain.min;
        const step = range * 0.1; // 10% of range
        for (let i = -5; i <= 5; i++) {
          const value = currentValue + i * step;
          if (value >= variable.domain.min && value <= variable.domain.max) {
            values.push(value);
          }
        }
        break;
      }
        
      case 'discrete': {
        const step = variable.domain.step || 1;
        for (let i = -2; i <= 2; i++) {
          const value = currentValue + i * step;
          if (value >= variable.domain.min && value <= variable.domain.max) {
            values.push(value);
          }
        }
        break;
      }
        
      case 'binary':
        values.push(0, 1);
        break;
        
      case 'integer':
        for (let i = -2; i <= 2; i++) {
          const value = currentValue + i;
          if (value >= variable.domain.min && value <= variable.domain.max) {
            values.push(value);
          }
        }
        break;
    }
    
    return values;
  }

  private calculateHeuristic(variable: OptimizationVariable, value: number, problem: OptimizationProblem): number {
    // Simplified heuristic calculation
    // In a real implementation, this would be problem-specific
    const normalizedValue = (value - variable.domain.min) / (variable.domain.max - variable.domain.min);
    return 1 / (Math.abs(normalizedValue - 0.5) + 0.1);
  }

  private selectBestOption(probabilities: { [value: number]: number }): number {
    let bestValue = 0;
    let bestProbability = 0;
    
    for (const value in probabilities) {
      if (probabilities[value] > bestProbability) {
        bestProbability = probabilities[value];
        bestValue = parseFloat(value);
      }
    }
    
    return bestValue;
  }

  private selectProbabilisticOption(probabilities: { [value: number]: number }): number {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const value in probabilities) {
      cumulativeProbability += probabilities[value];
      if (random <= cumulativeProbability) {
        return parseFloat(value);
      }
    }
    
    // Fallback to first value
    return parseFloat(Object.keys(probabilities)[0]);
  }

  private calculateObjectives(position: { [variableId: string]: number }, problem: OptimizationProblem): { [objectiveId: string]: number } {
    const objectives: { [objectiveId: string]: number } = {};
    
    for (const objective of problem.objectives) {
      // Simplified objective calculation
      // In a real implementation, this would parse and evaluate the mathematical expression
      let value = 0;
      
      for (const variable of problem.variables) {
        value += position[variable.id] * variable.weight;
      }
      
      objectives[objective.id] = value;
    }
    
    return objectives;
  }

  private calculateConstraints(position: { [variableId: string]: number }, problem: OptimizationProblem): { [constraintId: string]: number } {
    const constraints: { [constraintId: string]: number } = {};
    
    for (const constraint of problem.constraints) {
      // Simplified constraint calculation
      // In a real implementation, this would parse and evaluate the mathematical expression
      let value = 0;
      
      for (const variable of problem.variables) {
        value += position[variable.id] * variable.weight;
      }
      
      constraints[constraint.id] = value;
    }
    
    return constraints;
  }

  private calculateFitness(ant: Ant, problem: OptimizationProblem): number {
    let fitness = 0;
    
    // Objective fitness
    for (const objective of problem.objectives) {
      const value = ant.objectives[objective.id];
      const weightedValue = value * objective.weight * objective.priority;
      
      if (objective.type === 'minimize') {
        fitness += 1000 / (Math.abs(value) + 1);
      } else {
        fitness += value * 100;
      }
    }
    
    // Constraint penalties
    for (const constraint of problem.constraints) {
      const value = ant.constraints[constraint.id];
      const violation = Math.max(0, value - constraint.bound);
      fitness -= violation * constraint.weight * 100;
    }
    
    return fitness;
  }

  private checkFeasibility(constraints: { [constraintId: string]: number }, problem: OptimizationProblem): boolean {
    for (const constraint of problem.constraints) {
      const value = constraints[constraint.id];
      
      if (constraint.type === 'equality') {
        if (Math.abs(value - constraint.bound) > 0.001) {
          return false;
        }
      } else if (constraint.type === 'inequality') {
        if (value > constraint.bound) {
          return false;
        }
      }
    }
    
    return true;
  }

  private identifyViolations(constraints: { [constraintId: string]: number }, problem: OptimizationProblem): string[] {
    const violations: string[] = [];
    
    for (const constraint of problem.constraints) {
      const value = constraints[constraint.id];
      
      if (constraint.type === 'equality') {
        if (Math.abs(value - constraint.bound) > 0.001) {
          violations.push(`Equality constraint ${constraint.name} violated`);
        }
      } else if (constraint.type === 'inequality') {
        if (value > constraint.bound) {
          violations.push(`Inequality constraint ${constraint.name} violated`);
        }
      }
    }
    
    return violations;
  }

  private performLocalSearch(
    ant: Ant,
    problem: OptimizationProblem,
    parameters: ACOParameters,
  ): Ant {
    let bestAnt = { ...ant };
    let improved = true;
    let iterations = 0;
    
    while (improved && iterations < parameters.maxIterations) {
      improved = false;
      iterations++;
      
      // Generate local neighbor
      const neighbor = this.generateLocalNeighbor(ant, problem, parameters);
      
      if (neighbor.fitness > bestAnt.fitness) {
        bestAnt = neighbor;
        improved = true;
      }
    }
    
    return bestAnt;
  }

  private generateLocalNeighbor(
    ant: Ant,
    problem: OptimizationProblem,
    parameters: ACOParameters,
  ): Ant {
    const neighbor = { ...ant };
    const position = { ...ant.position };
    
    // Modify a random variable
    const variableIds = Object.keys(position);
    const randomVariableId = variableIds[Math.floor(Math.random() * variableIds.length)];
    const variable = problem.variables.find(v => v.id === randomVariableId);
    
    if (variable) {
      const perturbation = (Math.random() - 0.5) * (variable.domain.max - variable.domain.min) * 0.1;
      position[randomVariableId] = Math.max(variable.domain.min, Math.min(variable.domain.max, position[randomVariableId] + perturbation));
    }
    
    neighbor.position = position;
    neighbor.objectives = this.calculateObjectives(position, problem);
    neighbor.constraints = this.calculateConstraints(position, problem);
    neighbor.fitness = this.calculateFitness(neighbor, problem);
    neighbor.feasibility = this.checkFeasibility(neighbor.constraints, problem);
    neighbor.violations = this.identifyViolations(neighbor.constraints, problem);
    
    return neighbor;
  }

  private calculateExplorationRate(ant: Ant, colony: Colony): number {
    // Calculate how much the ant is exploring vs exploiting
    const distanceToBest = this.calculateDistance(ant.position, colony.bestAnt.position);
    const distanceToAverage = this.calculateDistance(ant.position, this.calculateAveragePosition(colony));
    
    return distanceToBest / (distanceToAverage + 1);
  }

  private calculateExploitationRate(ant: Ant, colony: Colony): number {
    // Calculate how much the ant is exploiting vs exploring
    const distanceToBest = this.calculateDistance(ant.position, colony.bestAnt.position);
    const distanceToAverage = this.calculateDistance(ant.position, this.calculateAveragePosition(colony));
    
    return distanceToAverage / (distanceToBest + 1);
  }

  private calculateDistance(position1: { [variableId: string]: number }, position2: { [variableId: string]: number }): number {
    let distance = 0;
    
    for (const variableId in position1) {
      distance += Math.pow(position1[variableId] - position2[variableId], 2);
    }
    
    return Math.sqrt(distance);
  }

  private calculateAveragePosition(colony: Colony): { [variableId: string]: number } {
    const averagePosition: { [variableId: string]: number } = {};
    const variableIds = Object.keys(colony.ants[0].position);
    
    for (const variableId of variableIds) {
      const sum = colony.ants.reduce((sum, ant) => sum + ant.position[variableId], 0);
      averagePosition[variableId] = sum / colony.ants.length;
    }
    
    return averagePosition;
  }

  private updatePheromoneMatrix(colony: Colony, parameters: ACOParameters): void {
    // Evaporate pheromone
    for (const variableId1 in colony.pheromoneMatrix) {
      for (const variableId2 in colony.pheromoneMatrix[variableId1]) {
        colony.pheromoneMatrix[variableId1][variableId2] *= (1 - parameters.rho);
        
        // Apply pheromone limits
        colony.pheromoneMatrix[variableId1][variableId2] = Math.max(
          parameters.pheromoneMin,
          Math.min(parameters.pheromoneMax, colony.pheromoneMatrix[variableId1][variableId2])
        );
      }
    }
    
    // Deposit pheromone
    for (const ant of colony.ants) {
      const pheromoneDeposit = ant.fitness / 1000; // Normalize fitness
      
      for (const variableId1 in ant.position) {
        for (const variableId2 in ant.position) {
          if (variableId1 !== variableId2) {
            colony.pheromoneMatrix[variableId1][variableId2] += pheromoneDeposit;
          }
        }
      }
    }
  }

  private updateColonyMetrics(colony: Colony, problem: OptimizationProblem): void {
    // Calculate average fitness
    const totalFitness = colony.ants.reduce((sum, ant) => sum + ant.fitness, 0);
    colony.averageFitness = totalFitness / colony.ants.length;
    
    // Calculate diversity
    colony.diversity = this.calculateColonyDiversity(colony);
    
    // Calculate convergence
    colony.convergence = this.calculateColonyConvergence(colony);
    
    // Calculate stability
    colony.stability = this.calculateColonyStability(colony);
    
    // Update best ant
    for (const ant of colony.ants) {
      if (ant.fitness > colony.bestAnt.fitness) {
        colony.bestAnt = ant;
      }
    }
  }

  private calculateColonyDiversity(colony: Colony): number {
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < colony.ants.length; i++) {
      for (let j = i + 1; j < colony.ants.length; j++) {
        const distance = this.calculateDistance(colony.ants[i].position, colony.ants[j].position);
        totalDistance += distance;
        pairCount++;
      }
    }
    
    return totalDistance / pairCount;
  }

  private calculateColonyConvergence(colony: Colony): number {
    const fitnesses = colony.ants.map(ant => ant.fitness);
    const variance = this.calculateVariance(fitnesses);
    const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateColonyStability(colony: Colony): number {
    const fitnesses = colony.ants.map(ant => ant.fitness);
    const variance = this.calculateVariance(fitnesses);
    const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, sd) => sum + sd, 0) / values.length;
  }

  private adaptiveParameterUpdate(parameters: ACOParameters, colony: Colony, iteration: number): void {
    // Adaptive rho based on diversity
    if (colony.diversity < 0.1) {
      parameters.rho = Math.min(0.9, parameters.rho * 1.1);
    } else if (colony.diversity > 0.5) {
      parameters.rho = Math.max(0.1, parameters.rho * 0.9);
    }
    
    // Adaptive alpha and beta based on convergence
    if (colony.convergence > 0.8) {
      parameters.alpha = Math.max(0.1, parameters.alpha * 0.9);
      parameters.beta = Math.min(4.0, parameters.beta * 1.1);
    } else if (colony.convergence < 0.3) {
      parameters.alpha = Math.min(4.0, parameters.alpha * 1.1);
      parameters.beta = Math.max(0.1, parameters.beta * 0.9);
    }
  }

  private checkConvergence(colony: Colony, parameters: ACOParameters): boolean {
    return colony.convergence > parameters.convergenceThreshold;
  }

  private checkStagnation(colony: Colony, parameters: ACOParameters): boolean {
    // Check if the colony has stagnated
    const recentFitnesses = colony.ants.map(ant => ant.fitness);
    const bestFitness = Math.max(...recentFitnesses);
    const averageFitness = recentFitnesses.reduce((sum, f) => sum + f, 0) / recentFitnesses.length;
    
    return (bestFitness - averageFitness) < 0.01;
  }

  private restartColony(colony: Colony, problem: OptimizationProblem, parameters: ACOParameters): void {
    // Restart ants with random positions
    for (const ant of colony.ants) {
      const newAnt = this.createAnt(problem, Math.floor(Math.random() * 1000));
      Object.assign(ant, newAnt);
    }
    
    // Update best ant
    let bestFitness = -Infinity;
    let bestAnt = colony.ants[0];
    
    for (const ant of colony.ants) {
      if (ant.fitness > bestFitness) {
        bestFitness = ant.fitness;
        bestAnt = ant;
      }
    }
    
    colony.bestAnt = bestAnt;
  }

  private calculatePerformanceMetrics(colony: Colony, problem: OptimizationProblem): any {
    const fitnesses = colony.ants.map(ant => ant.fitness);
    const bestFitness = Math.max(...fitnesses);
    const averageFitness = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    // Convergence
    const convergence = colony.convergence;
    
    // Stability
    const stability = colony.stability;
    
    // Diversity
    const diversity = colony.diversity;
    
    // Efficiency
    const efficiency = bestFitness / (averageFitness + 1);
    
    // Quality
    const quality = bestFitness / (problem.objectives.length * 1000 + 1);
    
    return {
      convergence,
      stability,
      diversity,
      efficiency,
      quality,
    };
  }

  private generateRecommendations(
    colony: Colony,
    performance: any,
    parameters: ACOParameters,
  ): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (performance.convergence < 0.8) {
      immediate.push('Low convergence - increase colony size or adjust parameters');
    }
    
    if (performance.stability < 0.7) {
      immediate.push('Low stability - adjust pheromone parameters');
    }
    
    if (performance.diversity < 0.5) {
      shortTerm.push('Low diversity - increase exploration rate');
    }
    
    if (performance.efficiency < 0.6) {
      shortTerm.push('Low efficiency - optimize objective weights');
    }
    
    if (performance.quality < 0.8) {
      shortTerm.push('Low quality - improve constraint handling');
    }
    
    longTerm.push('Implement hybrid optimization algorithms');
    longTerm.push('Develop adaptive parameter tuning');
    longTerm.push('Create multi-objective optimization framework');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveOptimizationResult(result: OptimizationResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO ant_colony_optimization_results 
        (problem_id, problem_type, total_iterations, total_time, final_fitness, 
         average_fitness, improvement_rate, convergence_rate, diversity, stability,
         convergence, stability_metric, diversity_metric, efficiency, quality, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      `, [
        result.problem.id,
        result.problem.type,
        result.summary.totalIterations,
        result.summary.totalTime,
        result.summary.finalFitness,
        result.summary.averageFitness,
        result.summary.improvementRate,
        result.summary.convergenceRate,
        result.summary.diversity,
        result.summary.stability,
        result.performance.convergence,
        result.performance.stability,
        result.performance.diversity,
        result.performance.efficiency,
        result.performance.quality,
      ]);
    } catch (error) {
      this.logger.error('Failed to save ant colony optimization result:', error);
    }
  }
}

