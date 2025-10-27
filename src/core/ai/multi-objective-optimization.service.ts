import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Objective {
  id: string;
  name: string;
  type: 'minimize' | 'maximize';
  weight: number; // 0-1
  priority: number; // 1-10
  expression: string; // Mathematical expression
  bounds: {
    min: number;
    max: number;
  };
  constraints: {
    enabled: boolean;
    threshold: number;
    penalty: number;
  };
}

interface Variable {
  id: string;
  name: string;
  type: 'continuous' | 'discrete' | 'binary' | 'integer';
  domain: {
    min: number;
    max: number;
    step?: number;
  };
  value: number;
  weight: number;
  constraints: {
    enabled: boolean;
    bounds: { min: number; max: number };
    dependencies: string[];
  };
}

interface Constraint {
  id: string;
  name: string;
  type: 'equality' | 'inequality' | 'bound' | 'logical';
  expression: string;
  bound: number;
  weight: number;
  penalty: number;
}

interface Solution {
  id: string;
  variables: { [variableId: string]: number };
  objectives: { [objectiveId: string]: number };
  constraints: { [constraintId: string]: number };
  fitness: number;
  rank: number;
  crowdingDistance: number;
  dominance: number;
  feasibility: boolean;
  violations: string[];
  metadata: {
    generation: number;
    iteration: number;
    parentIds: string[];
    mutationRate: number;
    crossoverRate: number;
  };
}

interface ParetoFront {
  id: string;
  solutions: Solution[];
  objectives: Objective[];
  metrics: {
    hypervolume: number;
    spread: number;
    uniformity: number;
    convergence: number;
    diversity: number;
  };
  statistics: {
    size: number;
    averageFitness: number;
    bestFitness: number;
    worstFitness: number;
    averageRank: number;
    averageCrowdingDistance: number;
  };
}

interface MultiObjectiveResult {
  paretoFront: ParetoFront;
  summary: {
    totalSolutions: number;
    paretoSolutions: number;
    totalGenerations: number;
    totalIterations: number;
    processingTime: number; // milliseconds
    convergenceRate: number;
    diversityRate: number;
  };
  performance: {
    hypervolume: number;
    spread: number;
    uniformity: number;
    convergence: number;
    diversity: number;
    efficiency: number;
    quality: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface MultiObjectiveConfig {
  algorithm: 'nsga2' | 'nsga3' | 'spea2' | 'moea_d' | 'pso' | 'de' | 'ga' | 'hybrid';
  objectives: Objective[];
  variables: Variable[];
  constraints: Constraint[];
  parameters: {
    populationSize: number;
    maxGenerations: number;
    maxIterations: number;
    maxTime: number; // minutes
    convergenceThreshold: number;
    diversityThreshold: number;
    mutationRate: number;
    crossoverRate: number;
    selectionPressure: number;
    elitismRate: number;
  };
  optimization: {
    method: 'weighted_sum' | 'epsilon_constraint' | 'pareto_ranking' | 'crowding_distance' | 'hypervolume';
    weights: { [objectiveId: string]: number };
    epsilon: number;
    referencePoint: number[];
    utopiaPoint: number[];
    nadirPoint: number[];
  };
  validation: {
    enabled: boolean;
    testSize: number;
    randomState: number;
    crossValidation: boolean;
  };
}

@Injectable()
export class MultiObjectiveOptimizationService {
  private readonly logger = new Logger(MultiObjectiveOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimize(
    config: MultiObjectiveConfig,
    options: {
      includeRealTime: boolean;
      includeValidation: boolean;
      includeCrossValidation: boolean;
      includeFeatureSelection: boolean;
      includeHyperparameterTuning: boolean;
      maxIterations: number;
      tolerance: number;
    },
  ): Promise<MultiObjectiveResult> {
    this.logger.log(`Starting multi-objective optimization with ${config.objectives.length} objectives and ${config.variables.length} variables`);

    const startTime = Date.now();
    
    // Initialize population
    let population = this.initializePopulation(config);
    
    // Main optimization loop
    let generation = 0;
    let iteration = 0;
    let converged = false;
    let diversified = false;
    
    while (generation < config.parameters.maxGenerations && 
           iteration < config.parameters.maxIterations && 
           (Date.now() - startTime) < config.parameters.maxTime * 60000) {
      
      // Evaluate population
      this.evaluatePopulation(population, config);
      
      // Apply selection
      const selected = this.selectSolutions(population, config);
      
      // Apply crossover
      const offspring = this.crossoverSolutions(selected, config);
      
      // Apply mutation
      const mutated = this.mutateSolutions(offspring, config);
      
      // Evaluate offspring
      this.evaluatePopulation(mutated, config);
      
      // Combine parent and offspring populations
      const combined = [...population, ...mutated];
      
      // Apply environmental selection
      population = this.environmentalSelection(combined, config);
      
      // Check convergence
      converged = this.checkConvergence(population, config);
      
      // Check diversity
      diversified = this.checkDiversity(population, config);
      
      generation++;
      iteration++;
    }
    
    // Create Pareto front
    const paretoFront = this.createParetoFront(population, config);
    
    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(paretoFront, config);
    
    // Calculate summary
    const processingTime = Date.now() - startTime;
    const summary = {
      totalSolutions: population.length,
      paretoSolutions: paretoFront.solutions.length,
      totalGenerations: generation,
      totalIterations: iteration,
      processingTime,
      convergenceRate: this.calculateConvergenceRate(population),
      diversityRate: this.calculateDiversityRate(population),
    };
    
    const recommendations = this.generateRecommendations(paretoFront, performance, config);
    
    const result: MultiObjectiveResult = {
      paretoFront,
      summary,
      performance,
      recommendations,
    };

    await this.saveMultiObjectiveResult(result);
    await this.eventBus.emit('multi.objective.optimized', { result });

    return result;
  }

  private initializePopulation(config: MultiObjectiveConfig): Solution[] {
    const population: Solution[] = [];
    const populationSize = config.parameters.populationSize;
    
    for (let i = 0; i < populationSize; i++) {
      const solution = this.createRandomSolution(config);
      population.push(solution);
    }
    
    return population;
  }

  private createRandomSolution(config: MultiObjectiveConfig): Solution {
    const variables: { [variableId: string]: number } = {};
    
    for (const variable of config.variables) {
      let value = 0;
      
      switch (variable.type) {
        case 'continuous':
          value = Math.random() * (variable.domain.max - variable.domain.min) + variable.domain.min;
          break;
        case 'discrete':
          const steps = Math.floor((variable.domain.max - variable.domain.min) / (variable.domain.step || 1));
          value = variable.domain.min + (Math.floor(Math.random() * steps) * (variable.domain.step || 1));
          break;
        case 'binary':
          value = Math.random() < 0.5 ? 0 : 1;
          break;
        case 'integer':
          value = Math.floor(Math.random() * (variable.domain.max - variable.domain.min + 1)) + variable.domain.min;
          break;
      }
      
      variables[variable.id] = value;
    }
    
    return {
      id: `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      variables,
      objectives: {},
      constraints: {},
      fitness: 0,
      rank: 0,
      crowdingDistance: 0,
      dominance: 0,
      feasibility: true,
      violations: [],
      metadata: {
        generation: 0,
        iteration: 0,
        parentIds: [],
        mutationRate: config.parameters.mutationRate,
        crossoverRate: config.parameters.crossoverRate,
      },
    };
  }

  private evaluatePopulation(population: Solution[], config: MultiObjectiveConfig): void {
    for (const solution of population) {
      this.evaluateSolution(solution, config);
    }
  }

  private evaluateSolution(solution: Solution, config: MultiObjectiveConfig): void {
    // Calculate objectives
    for (const objective of config.objectives) {
      const value = this.calculateObjective(solution, objective);
      solution.objectives[objective.id] = value;
    }
    
    // Calculate constraints
    for (const constraint of config.constraints) {
      const value = this.calculateConstraint(solution, constraint);
      solution.constraints[constraint.id] = value;
    }
    
    // Check feasibility
    solution.feasibility = this.checkFeasibility(solution, config);
    
    // Identify violations
    solution.violations = this.identifyViolations(solution, config);
    
    // Calculate fitness
    solution.fitness = this.calculateFitness(solution, config);
  }

  private calculateObjective(solution: Solution, objective: Objective): number {
    // Simplified objective calculation
    // In a real implementation, this would parse and evaluate the mathematical expression
    let value = 0;
    
    for (const [variableId, variableValue] of Object.entries(solution.variables)) {
      value += variableValue * objective.weight;
    }
    
    // Apply bounds
    value = Math.max(objective.bounds.min, Math.min(objective.bounds.max, value));
    
    return value;
  }

  private calculateConstraint(solution: Solution, constraint: Constraint): number {
    // Simplified constraint calculation
    // In a real implementation, this would parse and evaluate the mathematical expression
    let value = 0;
    
    for (const [variableId, variableValue] of Object.entries(solution.variables)) {
      value += variableValue * constraint.weight;
    }
    
    return value;
  }

  private checkFeasibility(solution: Solution, config: MultiObjectiveConfig): boolean {
    for (const constraint of config.constraints) {
      const value = solution.constraints[constraint.id];
      
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

  private identifyViolations(solution: Solution, config: MultiObjectiveConfig): string[] {
    const violations: string[] = [];
    
    for (const constraint of config.constraints) {
      const value = solution.constraints[constraint.id];
      
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

  private calculateFitness(solution: Solution, config: MultiObjectiveConfig): number {
    let fitness = 0;
    
    // Objective fitness
    for (const objective of config.objectives) {
      const value = solution.objectives[objective.id];
      const weightedValue = value * objective.weight * objective.priority;
      
      if (objective.type === 'minimize') {
        fitness += 1000 / (Math.abs(value) + 1);
      } else {
        fitness += value * 100;
      }
    }
    
    // Constraint penalties
    for (const constraint of config.constraints) {
      const value = solution.constraints[constraint.id];
      const violation = Math.max(0, value - constraint.bound);
      fitness -= violation * constraint.weight * constraint.penalty;
    }
    
    return fitness;
  }

  private selectSolutions(population: Solution[], config: MultiObjectiveConfig): Solution[] {
    const selected: Solution[] = [];
    const selectionSize = Math.floor(population.length * config.parameters.selectionPressure);
    
    // Tournament selection
    for (let i = 0; i < selectionSize; i++) {
      const tournament = this.selectTournament(population, 3);
      const best = tournament.reduce((a, b) => a.fitness > b.fitness ? a : b);
      selected.push(best);
    }
    
    return selected;
  }

  private selectTournament(population: Solution[], tournamentSize: number): Solution[] {
    const tournament: Solution[] = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(population[randomIndex]);
    }
    
    return tournament;
  }

  private crossoverSolutions(parents: Solution[], config: MultiObjectiveConfig): Solution[] {
    const offspring: Solution[] = [];
    
    for (let i = 0; i < parents.length; i += 2) {
      if (i + 1 < parents.length) {
        const parent1 = parents[i];
        const parent2 = parents[i + 1];
        
        if (Math.random() < config.parameters.crossoverRate) {
          const children = this.crossover(parent1, parent2, config);
          offspring.push(...children);
        } else {
          offspring.push(parent1, parent2);
        }
      }
    }
    
    return offspring;
  }

  private crossover(parent1: Solution, parent2: Solution, config: MultiObjectiveConfig): Solution[] {
    const child1 = this.createChild(parent1, parent2, config);
    const child2 = this.createChild(parent2, parent1, config);
    
    return [child1, child2];
  }

  private createChild(parent1: Solution, parent2: Solution, config: MultiObjectiveConfig): Solution {
    const variables: { [variableId: string]: number } = {};
    
    for (const variable of config.variables) {
      const value1 = parent1.variables[variable.id];
      const value2 = parent2.variables[variable.id];
      
      // Uniform crossover
      const value = Math.random() < 0.5 ? value1 : value2;
      
      // Apply bounds
      const boundedValue = Math.max(variable.domain.min, Math.min(variable.domain.max, value));
      variables[variable.id] = boundedValue;
    }
    
    return {
      id: `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      variables,
      objectives: {},
      constraints: {},
      fitness: 0,
      rank: 0,
      crowdingDistance: 0,
      dominance: 0,
      feasibility: true,
      violations: [],
      metadata: {
        generation: parent1.metadata.generation + 1,
        iteration: parent1.metadata.iteration + 1,
        parentIds: [parent1.id, parent2.id],
        mutationRate: parent1.metadata.mutationRate,
        crossoverRate: parent1.metadata.crossoverRate,
      },
    };
  }

  private mutateSolutions(solutions: Solution[], config: MultiObjectiveConfig): Solution[] {
    const mutated: Solution[] = [];
    
    for (const solution of solutions) {
      if (Math.random() < config.parameters.mutationRate) {
        const mutatedSolution = this.mutate(solution, config);
        mutated.push(mutatedSolution);
      } else {
        mutated.push(solution);
      }
    }
    
    return mutated;
  }

  private mutate(solution: Solution, config: MultiObjectiveConfig): Solution {
    const variables: { [variableId: string]: number } = { ...solution.variables };
    
    for (const variable of config.variables) {
      if (Math.random() < 0.1) { // 10% chance to mutate each variable
        const currentValue = variables[variable.id];
        let newValue = currentValue;
        
        switch (variable.type) {
          case 'continuous':
            const range = variable.domain.max - variable.domain.min;
            const perturbation = (Math.random() - 0.5) * range * 0.1;
            newValue = currentValue + perturbation;
            break;
          case 'discrete':
            const step = variable.domain.step || 1;
            const direction = Math.random() < 0.5 ? -1 : 1;
            newValue = currentValue + direction * step;
            break;
          case 'binary':
            newValue = currentValue === 0 ? 1 : 0;
            break;
          case 'integer':
            const direction2 = Math.random() < 0.5 ? -1 : 1;
            newValue = currentValue + direction2;
            break;
        }
        
        // Apply bounds
        newValue = Math.max(variable.domain.min, Math.min(variable.domain.max, newValue));
        variables[variable.id] = newValue;
      }
    }
    
    return {
      ...solution,
      id: `mutated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      variables,
      metadata: {
        ...solution.metadata,
        generation: solution.metadata.generation + 1,
        iteration: solution.metadata.iteration + 1,
      },
    };
  }

  private environmentalSelection(combined: Solution[], config: MultiObjectiveConfig): Solution[] {
    // Apply Pareto ranking
    this.applyParetoRanking(combined, config);
    
    // Apply crowding distance
    this.applyCrowdingDistance(combined, config);
    
    // Select best solutions
    const sorted = combined.sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return b.crowdingDistance - a.crowdingDistance;
    });
    
    return sorted.slice(0, config.parameters.populationSize);
  }

  private applyParetoRanking(solutions: Solution[], config: MultiObjectiveConfig): void {
    // Initialize ranks
    for (const solution of solutions) {
      solution.rank = 0;
      solution.dominance = 0;
    }
    
    // Calculate dominance relationships
    for (let i = 0; i < solutions.length; i++) {
      for (let j = 0; j < solutions.length; j++) {
        if (i !== j) {
          const dominates = this.dominates(solutions[i], solutions[j], config);
          if (dominates) {
            solutions[i].dominance++;
          }
        }
      }
    }
    
    // Assign ranks
    let currentRank = 0;
    let remaining = solutions.filter(s => s.rank === 0);
    
    while (remaining.length > 0) {
      const nonDominated = remaining.filter(s => s.dominance === 0);
      
      for (const solution of nonDominated) {
        solution.rank = currentRank;
      }
      
      currentRank++;
      remaining = remaining.filter(s => s.rank === 0);
      
      // Update dominance counts
      for (const solution of remaining) {
        solution.dominance = 0;
        for (const other of solutions) {
          if (other.rank < currentRank && this.dominates(other, solution, config)) {
            solution.dominance++;
          }
        }
      }
    }
  }

  private dominates(solution1: Solution, solution2: Solution, config: MultiObjectiveConfig): boolean {
    let better = false;
    let worse = false;
    
    for (const objective of config.objectives) {
      const value1 = solution1.objectives[objective.id];
      const value2 = solution2.objectives[objective.id];
      
      if (objective.type === 'minimize') {
        if (value1 < value2) better = true;
        if (value1 > value2) worse = true;
      } else {
        if (value1 > value2) better = true;
        if (value1 < value2) worse = true;
      }
    }
    
    return better && !worse;
  }

  private applyCrowdingDistance(solutions: Solution[], config: MultiObjectiveConfig): void {
    // Initialize crowding distances
    for (const solution of solutions) {
      solution.crowdingDistance = 0;
    }
    
    // Calculate crowding distance for each objective
    for (const objective of config.objectives) {
      const sorted = solutions.sort((a, b) => {
        const valueA = a.objectives[objective.id];
        const valueB = b.objectives[objective.id];
        return objective.type === 'minimize' ? valueA - valueB : valueB - valueA;
      });
      
      // Set boundary solutions
      sorted[0].crowdingDistance = Infinity;
      sorted[sorted.length - 1].crowdingDistance = Infinity;
      
      // Calculate distances
      const minValue = sorted[0].objectives[objective.id];
      const maxValue = sorted[sorted.length - 1].objectives[objective.id];
      const range = maxValue - minValue;
      
      if (range > 0) {
        for (let i = 1; i < sorted.length - 1; i++) {
          const distance = (sorted[i + 1].objectives[objective.id] - sorted[i - 1].objectives[objective.id]) / range;
          sorted[i].crowdingDistance += distance;
        }
      }
    }
  }

  private checkConvergence(population: Solution[], config: MultiObjectiveConfig): boolean {
    // Simplified convergence check
    const averageFitness = population.reduce((sum, s) => sum + s.fitness, 0) / population.length;
    const variance = population.reduce((sum, s) => sum + Math.pow(s.fitness - averageFitness, 2), 0) / population.length;
    
    return variance < config.parameters.convergenceThreshold;
  }

  private checkDiversity(population: Solution[], config: MultiObjectiveConfig): boolean {
    // Simplified diversity check
    const uniqueSolutions = new Set(population.map(s => JSON.stringify(s.variables))).size;
    const diversityRate = uniqueSolutions / population.length;
    
    return diversityRate > config.parameters.diversityThreshold;
  }

  private createParetoFront(population: Solution[], config: MultiObjectiveConfig): ParetoFront {
    // Filter Pareto optimal solutions
    const paretoSolutions = population.filter(s => s.rank === 0);
    
    // Calculate metrics
    const metrics = this.calculateParetoMetrics(paretoSolutions, config);
    
    // Calculate statistics
    const statistics = this.calculateParetoStatistics(paretoSolutions);
    
    return {
      id: `pareto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      solutions: paretoSolutions,
      objectives: config.objectives,
      metrics,
      statistics,
    };
  }

  private calculateParetoMetrics(solutions: Solution[], config: MultiObjectiveConfig): any {
    const hypervolume = this.calculateHypervolume(solutions, config);
    const spread = this.calculateSpread(solutions, config);
    const uniformity = this.calculateUniformity(solutions, config);
    const convergence = this.calculateConvergence(solutions, config);
    const diversity = this.calculateDiversity(solutions, config);
    
    return {
      hypervolume,
      spread,
      uniformity,
      convergence,
      diversity,
    };
  }

  private calculateHypervolume(solutions: Solution[], config: MultiObjectiveConfig): number {
    // Simplified hypervolume calculation
    // In a real implementation, this would use the actual hypervolume algorithm
    let hypervolume = 0;
    
    for (const solution of solutions) {
      let volume = 1;
      for (const objective of config.objectives) {
        const value = solution.objectives[objective.id];
        volume *= value;
      }
      hypervolume += volume;
    }
    
    return hypervolume;
  }

  private calculateSpread(solutions: Solution[], config: MultiObjectiveConfig): number {
    if (solutions.length < 2) return 0;
    
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < solutions.length; i++) {
      for (let j = i + 1; j < solutions.length; j++) {
        const distance = this.calculateSolutionDistance(solutions[i], solutions[j], config);
        totalDistance += distance;
        pairCount++;
      }
    }
    
    return totalDistance / pairCount;
  }

  private calculateUniformity(solutions: Solution[], config: MultiObjectiveConfig): number {
    if (solutions.length < 3) return 1;
    
    const distances = [];
    for (let i = 0; i < solutions.length - 1; i++) {
      const distance = this.calculateSolutionDistance(solutions[i], solutions[i + 1], config);
      distances.push(distance);
    }
    
    const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateConvergence(solutions: Solution[], config: MultiObjectiveConfig): number {
    if (solutions.length < 2) return 1;
    
    const fitnesses = solutions.map(s => s.fitness);
    const variance = this.calculateVariance(fitnesses);
    const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateDiversity(solutions: Solution[], config: MultiObjectiveConfig): number {
    if (solutions.length < 2) return 0;
    
    const uniqueSolutions = new Set(solutions.map(s => JSON.stringify(s.variables))).size;
    return uniqueSolutions / solutions.length;
  }

  private calculateSolutionDistance(solution1: Solution, solution2: Solution, config: MultiObjectiveConfig): number {
    let distance = 0;
    
    for (const variable of config.variables) {
      const value1 = solution1.variables[variable.id];
      const value2 = solution2.variables[variable.id];
      distance += Math.pow(value1 - value2, 2);
    }
    
    return Math.sqrt(distance);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, sd) => sum + sd, 0) / values.length;
  }

  private calculateParetoStatistics(solutions: Solution[]): any {
    if (solutions.length === 0) {
      return {
        size: 0,
        averageFitness: 0,
        bestFitness: 0,
        worstFitness: 0,
        averageRank: 0,
        averageCrowdingDistance: 0,
      };
    }
    
    const fitnesses = solutions.map(s => s.fitness);
    const ranks = solutions.map(s => s.rank);
    const crowdingDistances = solutions.map(s => s.crowdingDistance);
    
    return {
      size: solutions.length,
      averageFitness: fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length,
      bestFitness: Math.max(...fitnesses),
      worstFitness: Math.min(...fitnesses),
      averageRank: ranks.reduce((sum, r) => sum + r, 0) / ranks.length,
      averageCrowdingDistance: crowdingDistances.reduce((sum, d) => sum + d, 0) / crowdingDistances.length,
    };
  }

  private calculatePerformanceMetrics(paretoFront: ParetoFront, config: MultiObjectiveConfig): any {
    const hypervolume = paretoFront.metrics.hypervolume;
    const spread = paretoFront.metrics.spread;
    const uniformity = paretoFront.metrics.uniformity;
    const convergence = paretoFront.metrics.convergence;
    const diversity = paretoFront.metrics.diversity;
    const efficiency = hypervolume / (spread + 1);
    const quality = (convergence + diversity + uniformity) / 3;
    
    return {
      hypervolume,
      spread,
      uniformity,
      convergence,
      diversity,
      efficiency,
      quality,
    };
  }

  private calculateConvergenceRate(population: Solution[]): number {
    const fitnesses = population.map(s => s.fitness);
    const variance = this.calculateVariance(fitnesses);
    const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateDiversityRate(population: Solution[]): number {
    const uniqueSolutions = new Set(population.map(s => JSON.stringify(s.variables))).size;
    return uniqueSolutions / population.length;
  }

  private generateRecommendations(paretoFront: ParetoFront, performance: any, config: MultiObjectiveConfig): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (performance.hypervolume < 0.5) {
      immediate.push('Low hypervolume - consider adjusting objective weights');
    }
    
    if (performance.spread < 0.3) {
      immediate.push('Low spread - increase population diversity');
    }
    
    if (performance.uniformity < 0.5) {
      immediate.push('Low uniformity - adjust selection pressure');
    }
    
    if (performance.convergence < 0.8) {
      immediate.push('Low convergence - increase generations');
    }
    
    if (performance.diversity < 0.5) {
      immediate.push('Low diversity - adjust mutation rate');
    }
    
    shortTerm.push('Implement adaptive parameter tuning');
    shortTerm.push('Add more objective functions');
    shortTerm.push('Improve constraint handling');
    
    longTerm.push('Build interactive optimization system');
    longTerm.push('Develop real-time optimization');
    longTerm.push('Create automated parameter tuning');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveMultiObjectiveResult(result: MultiObjectiveResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO multi_objective_optimization_results 
        (total_solutions, pareto_solutions, total_generations, total_iterations, 
         processing_time, convergence_rate, diversity_rate, hypervolume, spread, 
         uniformity, convergence, diversity, efficiency, quality, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      `, [
        result.summary.totalSolutions,
        result.summary.paretoSolutions,
        result.summary.totalGenerations,
        result.summary.totalIterations,
        result.summary.processingTime,
        result.summary.convergenceRate,
        result.summary.diversityRate,
        result.performance.hypervolume,
        result.performance.spread,
        result.performance.uniformity,
        result.performance.convergence,
        result.performance.diversity,
        result.performance.efficiency,
        result.performance.quality,
      ]);
    } catch (error) {
      this.logger.error('Failed to save multi-objective optimization result:', error);
    }
  }
}

