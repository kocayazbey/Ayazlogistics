import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Chromosome {
  id: string;
  genes: number[];
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
    selectionPressure: number;
    elitismRate: number;
  };
}

interface Population {
  id: string;
  chromosomes: Chromosome[];
  generation: number;
  statistics: {
    size: number;
    averageFitness: number;
    bestFitness: number;
    worstFitness: number;
    diversity: number;
    convergence: number;
    selectionPressure: number;
    mutationRate: number;
    crossoverRate: number;
  };
  metrics: {
    hypervolume: number;
    spread: number;
    uniformity: number;
    convergence: number;
    diversity: number;
    efficiency: number;
    quality: number;
  };
}

interface GeneticAlgorithmConfig {
  algorithm: 'standard' | 'nsga2' | 'nsga3' | 'spea2' | 'moea_d' | 'pso' | 'de' | 'hybrid';
  objectives: {
    id: string;
    name: string;
    type: 'minimize' | 'maximize';
    weight: number;
    priority: number;
    expression: string;
    bounds: { min: number; max: number };
  }[];
  variables: {
    id: string;
    name: string;
    type: 'continuous' | 'discrete' | 'binary' | 'integer';
    domain: { min: number; max: number; step?: number };
    value: number;
    weight: number;
    constraints: {
      enabled: boolean;
      bounds: { min: number; max: number };
      dependencies: string[];
    };
  }[];
  constraints: {
    id: string;
    name: string;
    type: 'equality' | 'inequality' | 'bound' | 'logical';
    expression: string;
    bound: number;
    weight: number;
    penalty: number;
  }[];
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
    tournamentSize: number;
    archiveSize: number;
    nichingRadius: number;
    sharingFunction: 'linear' | 'exponential' | 'power' | 'gaussian';
  };
  optimization: {
    method: 'weighted_sum' | 'epsilon_constraint' | 'pareto_ranking' | 'crowding_distance' | 'hypervolume';
    weights: { [objectiveId: string]: number };
    epsilon: number;
    referencePoint: number[];
    utopiaPoint: number[];
    nadirPoint: number[];
  };
  enhancement: {
    adaptiveParameters: boolean;
    dynamicMutation: boolean;
    dynamicCrossover: boolean;
    dynamicSelection: boolean;
    niching: boolean;
    sharing: boolean;
    crowding: boolean;
    elitism: boolean;
    archive: boolean;
    localSearch: boolean;
    hybrid: boolean;
  };
  validation: {
    enabled: boolean;
    testSize: number;
    randomState: number;
    crossValidation: boolean;
  };
}

interface GeneticAlgorithmResult {
  population: Population;
  summary: {
    totalChromosomes: number;
    totalGenerations: number;
    totalIterations: number;
    processingTime: number; // milliseconds
    convergenceRate: number;
    diversityRate: number;
    enhancementRate: number;
  };
  performance: {
    hypervolume: number;
    spread: number;
    uniformity: number;
    convergence: number;
    diversity: number;
    efficiency: number;
    quality: number;
    enhancement: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

@Injectable()
export class GeneticAlgorithmEnhancementService {
  private readonly logger = new Logger(GeneticAlgorithmEnhancementService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async enhance(
    config: GeneticAlgorithmConfig,
    options: {
      includeRealTime: boolean;
      includeValidation: boolean;
      includeCrossValidation: boolean;
      includeFeatureSelection: boolean;
      includeHyperparameterTuning: boolean;
      maxIterations: number;
      tolerance: number;
    },
  ): Promise<GeneticAlgorithmResult> {
    this.logger.log(`Starting genetic algorithm enhancement with ${config.objectives.length} objectives and ${config.variables.length} variables`);

    const startTime = Date.now();
    
    // Initialize population
    let population = this.initializePopulation(config);
    
    // Main optimization loop
    let generation = 0;
    let iteration = 0;
    let converged = false;
    let diversified = false;
    let enhanced = false;
    
    while (generation < config.parameters.maxGenerations && 
           iteration < config.parameters.maxIterations && 
           (Date.now() - startTime) < config.parameters.maxTime * 60000) {
      
      // Evaluate population
      this.evaluatePopulation(population, config);
      
      // Apply selection
      const selected = this.selectChromosomes(population, config);
      
      // Apply crossover
      const offspring = this.crossoverChromosomes(selected, config);
      
      // Apply mutation
      const mutated = this.mutateChromosomes(offspring, config);
      
      // Evaluate offspring
      this.evaluatePopulation(mutated, config);
      
      // Combine parent and offspring populations
      const combined = [...population.chromosomes, ...mutated];
      
      // Apply environmental selection
      const newPopulation = this.environmentalSelection(combined, config);
      
      // Update population
      population = this.updatePopulation(population, newPopulation, config);
      
      // Check convergence
      converged = this.checkConvergence(population, config);
      
      // Check diversity
      diversified = this.checkDiversity(population, config);
      
      // Check enhancement
      enhanced = this.checkEnhancement(population, config);
      
      generation++;
      iteration++;
    }
    
    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(population, config);
    
    // Calculate summary
    const processingTime = Date.now() - startTime;
    const summary = {
      totalChromosomes: population.chromosomes.length,
      totalGenerations: generation,
      totalIterations: iteration,
      processingTime,
      convergenceRate: this.calculateConvergenceRate(population),
      diversityRate: this.calculateDiversityRate(population),
      enhancementRate: this.calculateEnhancementRate(population),
    };
    
    const recommendations = this.generateRecommendations(population, performance, config);
    
    const result: GeneticAlgorithmResult = {
      population,
      summary,
      performance,
      recommendations,
    };

    await this.saveGeneticAlgorithmResult(result);
    await this.eventBus.emit('genetic.algorithm.enhanced', { result });

    return result;
  }

  private initializePopulation(config: GeneticAlgorithmConfig): Population {
    const chromosomes: Chromosome[] = [];
    const populationSize = config.parameters.populationSize;
    
    for (let i = 0; i < populationSize; i++) {
      const chromosome = this.createRandomChromosome(config);
      chromosomes.push(chromosome);
    }
    
    return {
      id: `population_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chromosomes,
      generation: 0,
      statistics: this.calculatePopulationStatistics(chromosomes),
      metrics: this.calculatePopulationMetrics(chromosomes, config),
    };
  }

  private createRandomChromosome(config: GeneticAlgorithmConfig): Chromosome {
    const genes: number[] = [];
    
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
      
      genes.push(value);
    }
    
    return {
      id: `chromosome_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      genes,
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
        selectionPressure: config.parameters.selectionPressure,
        elitismRate: config.parameters.elitismRate,
      },
    };
  }

  private evaluatePopulation(population: Population, config: GeneticAlgorithmConfig): void {
    for (const chromosome of population.chromosomes) {
      this.evaluateChromosome(chromosome, config);
    }
  }

  private evaluateChromosome(chromosome: Chromosome, config: GeneticAlgorithmConfig): void {
    // Calculate objectives
    let fitness = 0;
    
    for (const objective of config.objectives) {
      const value = this.calculateObjective(chromosome, objective);
      const weightedValue = value * objective.weight * objective.priority;
      
      if (objective.type === 'minimize') {
        fitness += 1000 / (Math.abs(value) + 1);
      } else {
        fitness += value * 100;
      }
    }
    
    // Calculate constraints
    for (const constraint of config.constraints) {
      const value = this.calculateConstraint(chromosome, constraint);
      const violation = Math.max(0, value - constraint.bound);
      fitness -= violation * constraint.weight * constraint.penalty;
    }
    
    // Check feasibility
    chromosome.feasibility = this.checkFeasibility(chromosome, config);
    
    // Identify violations
    chromosome.violations = this.identifyViolations(chromosome, config);
    
    // Update fitness
    chromosome.fitness = fitness;
  }

  private calculateObjective(chromosome: Chromosome, objective: any): number {
    // Simplified objective calculation
    // In a real implementation, this would parse and evaluate the mathematical expression
    let value = 0;
    
    for (let i = 0; i < chromosome.genes.length; i++) {
      value += chromosome.genes[i] * objective.weight;
    }
    
    // Apply bounds
    value = Math.max(objective.bounds.min, Math.min(objective.bounds.max, value));
    
    return value;
  }

  private calculateConstraint(chromosome: Chromosome, constraint: any): number {
    // Simplified constraint calculation
    // In a real implementation, this would parse and evaluate the mathematical expression
    let value = 0;
    
    for (let i = 0; i < chromosome.genes.length; i++) {
      value += chromosome.genes[i] * constraint.weight;
    }
    
    return value;
  }

  private checkFeasibility(chromosome: Chromosome, config: GeneticAlgorithmConfig): boolean {
    for (const constraint of config.constraints) {
      const value = this.calculateConstraint(chromosome, constraint);
      
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

  private identifyViolations(chromosome: Chromosome, config: GeneticAlgorithmConfig): string[] {
    const violations: string[] = [];
    
    for (const constraint of config.constraints) {
      const value = this.calculateConstraint(chromosome, constraint);
      
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

  private selectChromosomes(population: Population, config: GeneticAlgorithmConfig): Chromosome[] {
    const selected: Chromosome[] = [];
    const selectionSize = Math.floor(population.chromosomes.length * config.parameters.selectionPressure);
    
    // Tournament selection
    for (let i = 0; i < selectionSize; i++) {
      const tournament = this.selectTournament(population.chromosomes, config.parameters.tournamentSize);
      const best = tournament.reduce((a, b) => a.fitness > b.fitness ? a : b);
      selected.push(best);
    }
    
    return selected;
  }

  private selectTournament(chromosomes: Chromosome[], tournamentSize: number): Chromosome[] {
    const tournament: Chromosome[] = [];
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * chromosomes.length);
      tournament.push(chromosomes[randomIndex]);
    }
    
    return tournament;
  }

  private crossoverChromosomes(parents: Chromosome[], config: GeneticAlgorithmConfig): Chromosome[] {
    const offspring: Chromosome[] = [];
    
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

  private crossover(parent1: Chromosome, parent2: Chromosome, config: GeneticAlgorithmConfig): Chromosome[] {
    const child1 = this.createChild(parent1, parent2, config);
    const child2 = this.createChild(parent2, parent1, config);
    
    return [child1, child2];
  }

  private createChild(parent1: Chromosome, parent2: Chromosome, config: GeneticAlgorithmConfig): Chromosome {
    const genes: number[] = [];
    
    for (let i = 0; i < parent1.genes.length; i++) {
      const gene1 = parent1.genes[i];
      const gene2 = parent2.genes[i];
      
      // Uniform crossover
      const gene = Math.random() < 0.5 ? gene1 : gene2;
      genes.push(gene);
    }
    
    return {
      id: `child_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      genes,
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
        selectionPressure: parent1.metadata.selectionPressure,
        elitismRate: parent1.metadata.elitismRate,
      },
    };
  }

  private mutateChromosomes(chromosomes: Chromosome[], config: GeneticAlgorithmConfig): Chromosome[] {
    const mutated: Chromosome[] = [];
    
    for (const chromosome of chromosomes) {
      if (Math.random() < config.parameters.mutationRate) {
        const mutatedChromosome = this.mutate(chromosome, config);
        mutated.push(mutatedChromosome);
      } else {
        mutated.push(chromosome);
      }
    }
    
    return mutated;
  }

  private mutate(chromosome: Chromosome, config: GeneticAlgorithmConfig): Chromosome {
    const genes: number[] = [...chromosome.genes];
    
    for (let i = 0; i < genes.length; i++) {
      if (Math.random() < 0.1) { // 10% chance to mutate each gene
        const currentValue = genes[i];
        let newValue = currentValue;
        
        // Gaussian mutation
        const perturbation = (Math.random() - 0.5) * 0.1;
        newValue = currentValue + perturbation;
        
        // Apply bounds
        newValue = Math.max(0, Math.min(1, newValue));
        genes[i] = newValue;
      }
    }
    
    return {
      ...chromosome,
      id: `mutated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      genes,
      metadata: {
        ...chromosome.metadata,
        generation: chromosome.metadata.generation + 1,
        iteration: chromosome.metadata.iteration + 1,
      },
    };
  }

  private environmentalSelection(combined: Chromosome[], config: GeneticAlgorithmConfig): Chromosome[] {
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

  private applyParetoRanking(chromosomes: Chromosome[], config: GeneticAlgorithmConfig): void {
    // Initialize ranks
    for (const chromosome of chromosomes) {
      chromosome.rank = 0;
      chromosome.dominance = 0;
    }
    
    // Calculate dominance relationships
    for (let i = 0; i < chromosomes.length; i++) {
      for (let j = 0; j < chromosomes.length; j++) {
        if (i !== j) {
          const dominates = this.dominates(chromosomes[i], chromosomes[j], config);
          if (dominates) {
            chromosomes[i].dominance++;
          }
        }
      }
    }
    
    // Assign ranks
    let currentRank = 0;
    let remaining = chromosomes.filter(c => c.rank === 0);
    
    while (remaining.length > 0) {
      const nonDominated = remaining.filter(c => c.dominance === 0);
      
      for (const chromosome of nonDominated) {
        chromosome.rank = currentRank;
      }
      
      currentRank++;
      remaining = remaining.filter(c => c.rank === 0);
      
      // Update dominance counts
      for (const chromosome of remaining) {
        chromosome.dominance = 0;
        for (const other of chromosomes) {
          if (other.rank < currentRank && this.dominates(other, chromosome, config)) {
            chromosome.dominance++;
          }
        }
      }
    }
  }

  private dominates(chromosome1: Chromosome, chromosome2: Chromosome, config: GeneticAlgorithmConfig): boolean {
    let better = false;
    let worse = false;
    
    for (const objective of config.objectives) {
      const value1 = this.calculateObjective(chromosome1, objective);
      const value2 = this.calculateObjective(chromosome2, objective);
      
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

  private applyCrowdingDistance(chromosomes: Chromosome[], config: GeneticAlgorithmConfig): void {
    // Initialize crowding distances
    for (const chromosome of chromosomes) {
      chromosome.crowdingDistance = 0;
    }
    
    // Calculate crowding distance for each objective
    for (const objective of config.objectives) {
      const sorted = chromosomes.sort((a, b) => {
        const valueA = this.calculateObjective(a, objective);
        const valueB = this.calculateObjective(b, objective);
        return objective.type === 'minimize' ? valueA - valueB : valueB - valueA;
      });
      
      // Set boundary solutions
      sorted[0].crowdingDistance = Infinity;
      sorted[sorted.length - 1].crowdingDistance = Infinity;
      
      // Calculate distances
      const minValue = this.calculateObjective(sorted[0], objective);
      const maxValue = this.calculateObjective(sorted[sorted.length - 1], objective);
      const range = maxValue - minValue;
      
      if (range > 0) {
        for (let i = 1; i < sorted.length - 1; i++) {
          const distance = (this.calculateObjective(sorted[i + 1], objective) - this.calculateObjective(sorted[i - 1], objective)) / range;
          sorted[i].crowdingDistance += distance;
        }
      }
    }
  }

  private updatePopulation(oldPopulation: Population, newChromosomes: Chromosome[], config: GeneticAlgorithmConfig): Population {
    const updatedChromosomes = [...newChromosomes];
    
    // Apply elitism
    if (config.enhancement.elitism) {
      const eliteSize = Math.floor(updatedChromosomes.length * config.parameters.elitismRate);
      const elite = oldPopulation.chromosomes
        .sort((a, b) => b.fitness - a.fitness)
        .slice(0, eliteSize);
      
      updatedChromosomes.splice(0, eliteSize, ...elite);
    }
    
    return {
      ...oldPopulation,
      chromosomes: updatedChromosomes,
      generation: oldPopulation.generation + 1,
      statistics: this.calculatePopulationStatistics(updatedChromosomes),
      metrics: this.calculatePopulationMetrics(updatedChromosomes, config),
    };
  }

  private checkConvergence(population: Population, config: GeneticAlgorithmConfig): boolean {
    const fitnesses = population.chromosomes.map(c => c.fitness);
    const variance = this.calculateVariance(fitnesses);
    const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    return variance < config.parameters.convergenceThreshold;
  }

  private checkDiversity(population: Population, config: GeneticAlgorithmConfig): boolean {
    const uniqueChromosomes = new Set(population.chromosomes.map(c => JSON.stringify(c.genes))).size;
    const diversityRate = uniqueChromosomes / population.chromosomes.length;
    
    return diversityRate > config.parameters.diversityThreshold;
  }

  private checkEnhancement(population: Population, config: GeneticAlgorithmConfig): boolean {
    // Simplified enhancement check
    const averageFitness = population.statistics.averageFitness;
    const bestFitness = population.statistics.bestFitness;
    const improvement = (bestFitness - averageFitness) / averageFitness;
    
    return improvement > 0.1; // 10% improvement threshold
  }

  private calculatePopulationStatistics(chromosomes: Chromosome[]): any {
    if (chromosomes.length === 0) {
      return {
        size: 0,
        averageFitness: 0,
        bestFitness: 0,
        worstFitness: 0,
        diversity: 0,
        convergence: 0,
        selectionPressure: 0,
        mutationRate: 0,
        crossoverRate: 0,
      };
    }
    
    const fitnesses = chromosomes.map(c => c.fitness);
    const ranks = chromosomes.map(c => c.rank);
    const crowdingDistances = chromosomes.map(c => c.crowdingDistance);
    
    return {
      size: chromosomes.length,
      averageFitness: fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length,
      bestFitness: Math.max(...fitnesses),
      worstFitness: Math.min(...fitnesses),
      diversity: this.calculateDiversity(chromosomes),
      convergence: this.calculateConvergence(chromosomes),
      selectionPressure: chromosomes[0]?.metadata.selectionPressure || 0,
      mutationRate: chromosomes[0]?.metadata.mutationRate || 0,
      crossoverRate: chromosomes[0]?.metadata.crossoverRate || 0,
    };
  }

  private calculatePopulationMetrics(chromosomes: Chromosome[], config: GeneticAlgorithmConfig): any {
    const hypervolume = this.calculateHypervolume(chromosomes, config);
    const spread = this.calculateSpread(chromosomes, config);
    const uniformity = this.calculateUniformity(chromosomes, config);
    const convergence = this.calculateConvergence(chromosomes);
    const diversity = this.calculateDiversity(chromosomes);
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

  private calculateHypervolume(chromosomes: Chromosome[], config: GeneticAlgorithmConfig): number {
    // Simplified hypervolume calculation
    let hypervolume = 0;
    
    for (const chromosome of chromosomes) {
      let volume = 1;
      for (const objective of config.objectives) {
        const value = this.calculateObjective(chromosome, objective);
        volume *= value;
      }
      hypervolume += volume;
    }
    
    return hypervolume;
  }

  private calculateSpread(chromosomes: Chromosome[], config: GeneticAlgorithmConfig): number {
    if (chromosomes.length < 2) return 0;
    
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < chromosomes.length; i++) {
      for (let j = i + 1; j < chromosomes.length; j++) {
        const distance = this.calculateChromosomeDistance(chromosomes[i], chromosomes[j]);
        totalDistance += distance;
        pairCount++;
      }
    }
    
    return totalDistance / pairCount;
  }

  private calculateUniformity(chromosomes: Chromosome[], config: GeneticAlgorithmConfig): number {
    if (chromosomes.length < 3) return 1;
    
    const distances = [];
    for (let i = 0; i < chromosomes.length - 1; i++) {
      const distance = this.calculateChromosomeDistance(chromosomes[i], chromosomes[i + 1]);
      distances.push(distance);
    }
    
    const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / distances.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateConvergence(chromosomes: Chromosome[]): number {
    if (chromosomes.length < 2) return 1;
    
    const fitnesses = chromosomes.map(c => c.fitness);
    const variance = this.calculateVariance(fitnesses);
    const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateDiversity(chromosomes: Chromosome[]): number {
    if (chromosomes.length < 2) return 0;
    
    const uniqueChromosomes = new Set(chromosomes.map(c => JSON.stringify(c.genes))).size;
    return uniqueChromosomes / chromosomes.length;
  }

  private calculateChromosomeDistance(chromosome1: Chromosome, chromosome2: Chromosome): number {
    let distance = 0;
    
    for (let i = 0; i < chromosome1.genes.length; i++) {
      distance += Math.pow(chromosome1.genes[i] - chromosome2.genes[i], 2);
    }
    
    return Math.sqrt(distance);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, sd) => sum + sd, 0) / values.length;
  }

  private calculatePerformanceMetrics(population: Population, config: GeneticAlgorithmConfig): any {
    const hypervolume = population.metrics.hypervolume;
    const spread = population.metrics.spread;
    const uniformity = population.metrics.uniformity;
    const convergence = population.metrics.convergence;
    const diversity = population.metrics.diversity;
    const efficiency = population.metrics.efficiency;
    const quality = population.metrics.quality;
    const enhancement = this.calculateEnhancement(population, config);
    
    return {
      hypervolume,
      spread,
      uniformity,
      convergence,
      diversity,
      efficiency,
      quality,
      enhancement,
    };
  }

  private calculateEnhancement(population: Population, config: GeneticAlgorithmConfig): number {
    const averageFitness = population.statistics.averageFitness;
    const bestFitness = population.statistics.bestFitness;
    const improvement = (bestFitness - averageFitness) / averageFitness;
    
    return Math.max(0, improvement);
  }

  private calculateConvergenceRate(population: Population): number {
    const fitnesses = population.chromosomes.map(c => c.fitness);
    const variance = this.calculateVariance(fitnesses);
    const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateDiversityRate(population: Population): number {
    const uniqueChromosomes = new Set(population.chromosomes.map(c => JSON.stringify(c.genes))).size;
    return uniqueChromosomes / population.chromosomes.length;
  }

  private calculateEnhancementRate(population: Population): number {
    const averageFitness = population.statistics.averageFitness;
    const bestFitness = population.statistics.bestFitness;
    const improvement = (bestFitness - averageFitness) / averageFitness;
    
    return Math.max(0, improvement);
  }

  private generateRecommendations(population: Population, performance: any, config: GeneticAlgorithmConfig): any {
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
    
    if (performance.enhancement < 0.1) {
      immediate.push('Low enhancement - improve genetic operators');
    }
    
    shortTerm.push('Implement adaptive parameter tuning');
    shortTerm.push('Add more objective functions');
    shortTerm.push('Improve constraint handling');
    shortTerm.push('Enhance genetic operators');
    
    longTerm.push('Build interactive optimization system');
    longTerm.push('Develop real-time optimization');
    longTerm.push('Create automated parameter tuning');
    longTerm.push('Implement hybrid algorithms');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveGeneticAlgorithmResult(result: GeneticAlgorithmResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO genetic_algorithm_enhancement_results 
        (total_chromosomes, total_generations, total_iterations, processing_time, 
         convergence_rate, diversity_rate, enhancement_rate, hypervolume, spread, 
         uniformity, convergence, diversity, efficiency, quality, enhancement, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      `, [
        result.summary.totalChromosomes,
        result.summary.totalGenerations,
        result.summary.totalIterations,
        result.summary.processingTime,
        result.summary.convergenceRate,
        result.summary.diversityRate,
        result.summary.enhancementRate,
        result.performance.hypervolume,
        result.performance.spread,
        result.performance.uniformity,
        result.performance.convergence,
        result.performance.diversity,
        result.performance.efficiency,
        result.performance.quality,
        result.performance.enhancement,
      ]);
    } catch (error) {
      this.logger.error('Failed to save genetic algorithm enhancement result:', error);
    }
  }
}

