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
    swarmSize: number;
    maxIterations: number;
    maxTime: number; // minutes
    convergenceThreshold: number;
    inertiaWeight: number;
    cognitiveWeight: number;
    socialWeight: number;
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

interface Particle {
  id: string;
  position: { [variableId: string]: number };
  velocity: { [variableId: string]: number };
  fitness: number;
  bestPosition: { [variableId: string]: number };
  bestFitness: number;
  objectives: { [objectiveId: string]: number };
  constraints: { [constraintId: string]: number };
  feasibility: boolean;
  violations: string[];
  metadata: {
    iteration: number;
    improvementCount: number;
    stagnationCount: number;
    explorationRate: number;
    exploitationRate: number;
  };
}

interface Swarm {
  particles: Particle[];
  globalBestPosition: { [variableId: string]: number };
  globalBestFitness: number;
  averageFitness: number;
  diversity: number;
  convergence: number;
  stability: number;
}

interface OptimizationResult {
  problem: OptimizationProblem;
  bestParticle: Particle;
  swarm: Swarm;
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

interface PSOParameters {
  swarmSize: number;
  maxIterations: number;
  maxTime: number; // minutes
  convergenceThreshold: number;
  inertiaWeight: number;
  cognitiveWeight: number;
  socialWeight: number;
  velocityLimit: number;
  positionLimit: number;
  adaptiveInertia: boolean;
  adaptiveWeights: boolean;
  neighborhoodSize: number;
  topology: 'global' | 'ring' | 'star' | 'wheel' | 'random';
}

@Injectable()
export class ParticleSwarmOptimizationService {
  private readonly logger = new Logger(ParticleSwarmOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimize(
    problem: OptimizationProblem,
    parameters: PSOParameters,
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
    this.logger.log(`Starting particle swarm optimization for problem: ${problem.name}`);

    // Initialize swarm
    const startTime = Date.now();
    const swarm = this.initializeSwarm(problem, parameters);
    let bestParticle = swarm.particles[0];
    let iteration = 0;
    let improvementCount = 0;
    let stagnationCount = 0;
    let localSearchCount = 0;
    let tabuList: string[] = [];
    
    // Main optimization loop
    while (iteration < parameters.maxIterations && 
           (Date.now() - startTime) < parameters.maxTime * 60000) {
      
      // Update particles
      for (const particle of swarm.particles) {
        // Update velocity
        this.updateVelocity(particle, swarm, parameters, iteration);
        
        // Update position
        this.updatePosition(particle, problem, parameters);
        
        // Calculate fitness
        const fitness = this.calculateFitness(particle, problem);
        particle.fitness = fitness;
        
        // Update personal best
        if (fitness > particle.bestFitness) {
          particle.bestPosition = { ...particle.position };
          particle.bestFitness = fitness;
          improvementCount++;
        }
        
        // Update global best
        if (fitness > swarm.globalBestFitness) {
          swarm.globalBestPosition = { ...particle.position };
          swarm.globalBestFitness = fitness;
          bestParticle = particle;
        }
        
        // Local search if enabled
        if (options.includeLocalSearch && Math.random() < 0.1) {
          const localSearchParticle = this.performLocalSearch(particle, problem, parameters);
          if (localSearchParticle.fitness > particle.fitness) {
            Object.assign(particle, localSearchParticle);
            localSearchCount++;
          }
        }
        
        // Update metadata
        particle.metadata.iteration = iteration;
        particle.metadata.improvementCount = improvementCount;
        particle.metadata.stagnationCount = stagnationCount;
        particle.metadata.explorationRate = this.calculateExplorationRate(particle, swarm);
        particle.metadata.exploitationRate = this.calculateExploitationRate(particle, swarm);
      }
      
      // Update swarm metrics
      this.updateSwarmMetrics(swarm, problem);
      
      // Adaptive parameters
      if (options.includeAdaptive) {
        this.adaptiveParameterUpdate(parameters, swarm, iteration);
      }
      
      // Check convergence
      if (this.checkConvergence(swarm, parameters)) {
        break;
      }
      
      // Check stagnation
      if (this.checkStagnation(swarm, parameters)) {
        stagnationCount++;
        if (stagnationCount > 10) {
          this.restartSwarm(swarm, problem, parameters);
          stagnationCount = 0;
        }
      }
      
      iteration++;
    }
    
    // Calculate final metrics
    const totalTime = (Date.now() - startTime) / 60000; // minutes
    const averageFitness = swarm.averageFitness;
    const improvementRate = improvementCount / (iteration * parameters.swarmSize);
    const convergenceRate = swarm.convergence;
    const diversity = swarm.diversity;
    const stability = swarm.stability;
    
    const summary = {
      totalIterations: iteration,
      totalTime,
      finalFitness: swarm.globalBestFitness,
      averageFitness,
      improvementRate,
      convergenceRate,
      diversity,
      stability,
    };
    
    const performance = this.calculatePerformanceMetrics(swarm, problem);
    const recommendations = this.generateRecommendations(swarm, performance, parameters);
    
    const result: OptimizationResult = {
      problem,
      bestParticle,
      swarm,
      summary,
      performance,
      recommendations,
    };

    await this.saveOptimizationResult(result);
    await this.eventBus.emit('particle.swarm.optimized', { result });

    return result;
  }

  private initializeSwarm(problem: OptimizationProblem, parameters: PSOParameters): Swarm {
    const particles: Particle[] = [];
    
    for (let i = 0; i < parameters.swarmSize; i++) {
      const particle = this.createParticle(problem, i);
      particles.push(particle);
    }
    
    // Find initial global best
    let globalBestFitness = -Infinity;
    let globalBestPosition: { [variableId: string]: number } = {};
    
    for (const particle of particles) {
      if (particle.fitness > globalBestFitness) {
        globalBestFitness = particle.fitness;
        globalBestPosition = { ...particle.position };
      }
    }
    
    const swarm: Swarm = {
      particles,
      globalBestPosition,
      globalBestFitness,
      averageFitness: 0,
      diversity: 0,
      convergence: 0,
      stability: 0,
    };
    
    this.updateSwarmMetrics(swarm, problem);
    
    return swarm;
  }

  private createParticle(problem: OptimizationProblem, index: number): Particle {
    const position: { [variableId: string]: number } = {};
    const velocity: { [variableId: string]: number } = {};
    
    // Initialize position and velocity
    for (const variable of problem.variables) {
      switch (variable.type) {
        case 'continuous':
          position[variable.id] = Math.random() * (variable.domain.max - variable.domain.min) + variable.domain.min;
          velocity[variable.id] = (Math.random() - 0.5) * (variable.domain.max - variable.domain.min) * 0.1;
          break;
          
        case 'discrete':
          const steps = Math.floor((variable.domain.max - variable.domain.min) / (variable.domain.step || 1));
          position[variable.id] = variable.domain.min + (Math.floor(Math.random() * steps) * (variable.domain.step || 1));
          velocity[variable.id] = (Math.random() - 0.5) * (variable.domain.step || 1);
          break;
          
        case 'binary':
          position[variable.id] = Math.random() < 0.5 ? 0 : 1;
          velocity[variable.id] = (Math.random() - 0.5) * 2;
          break;
          
        case 'integer':
          position[variable.id] = Math.floor(Math.random() * (variable.domain.max - variable.domain.min + 1)) + variable.domain.min;
          velocity[variable.id] = (Math.random() - 0.5) * 2;
          break;
      }
    }
    
    // Calculate initial fitness
    const objectives = this.calculateObjectives(position, problem);
    const constraints = this.calculateConstraints(position, problem);
    const fitness = this.calculateFitness({ position, objectives, constraints } as Particle, problem);
    const feasibility = this.checkFeasibility(constraints, problem);
    const violations = this.identifyViolations(constraints, problem);
    
    return {
      id: `particle_${index}_${Date.now()}`,
      position,
      velocity,
      fitness,
      bestPosition: { ...position },
      bestFitness: fitness,
      objectives,
      constraints,
      feasibility,
      violations,
      metadata: {
        iteration: 0,
        improvementCount: 0,
        stagnationCount: 0,
        explorationRate: 0,
        exploitationRate: 0,
      },
    };
  }

  private updateVelocity(
    particle: Particle,
    swarm: Swarm,
    parameters: PSOParameters,
    iteration: number,
  ): void {
    const inertia = parameters.adaptiveInertia ? 
      this.adaptiveInertiaWeight(parameters.inertiaWeight, iteration, parameters.maxIterations) :
      parameters.inertiaWeight;
    
    const cognitive = parameters.adaptiveWeights ?
      this.adaptiveCognitiveWeight(parameters.cognitiveWeight, iteration, parameters.maxIterations) :
      parameters.cognitiveWeight;
    
    const social = parameters.adaptiveWeights ?
      this.adaptiveSocialWeight(parameters.socialWeight, iteration, parameters.maxIterations) :
      parameters.socialWeight;
    
    for (const variableId in particle.position) {
      const r1 = Math.random();
      const r2 = Math.random();
      
      const cognitiveComponent = cognitive * r1 * (particle.bestPosition[variableId] - particle.position[variableId]);
      const socialComponent = social * r2 * (swarm.globalBestPosition[variableId] - particle.position[variableId]);
      
      particle.velocity[variableId] = inertia * particle.velocity[variableId] + cognitiveComponent + socialComponent;
      
      // Apply velocity limits
      if (Math.abs(particle.velocity[variableId]) > parameters.velocityLimit) {
        particle.velocity[variableId] = Math.sign(particle.velocity[variableId]) * parameters.velocityLimit;
      }
    }
  }

  private updatePosition(particle: Particle, problem: OptimizationProblem, parameters: PSOParameters): void {
    for (const variableId in particle.position) {
      const variable = problem.variables.find(v => v.id === variableId);
      if (!variable) continue;
      
      // Update position
      particle.position[variableId] += particle.velocity[variableId];
      
      // Apply position limits
      if (particle.position[variableId] < variable.domain.min) {
        particle.position[variableId] = variable.domain.min;
        particle.velocity[variableId] = 0;
      } else if (particle.position[variableId] > variable.domain.max) {
        particle.position[variableId] = variable.domain.max;
        particle.velocity[variableId] = 0;
      }
      
      // Handle discrete variables
      if (variable.type === 'discrete' && variable.domain.step) {
        const steps = Math.round(particle.position[variableId] / variable.domain.step);
        particle.position[variableId] = variable.domain.min + steps * variable.domain.step;
      } else if (variable.type === 'integer') {
        particle.position[variableId] = Math.round(particle.position[variableId]);
      } else if (variable.type === 'binary') {
        particle.position[variableId] = particle.position[variableId] > 0.5 ? 1 : 0;
      }
    }
  }

  private adaptiveInertiaWeight(initialWeight: number, iteration: number, maxIterations: number): number {
    // Linear decrease
    return initialWeight * (1 - iteration / maxIterations);
  }

  private adaptiveCognitiveWeight(initialWeight: number, iteration: number, maxIterations: number): number {
    // Linear decrease
    return initialWeight * (1 - iteration / maxIterations);
  }

  private adaptiveSocialWeight(initialWeight: number, iteration: number, maxIterations: number): number {
    // Linear increase
    return initialWeight * (iteration / maxIterations);
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

  private calculateFitness(particle: Particle, problem: OptimizationProblem): number {
    let fitness = 0;
    
    // Objective fitness
    for (const objective of problem.objectives) {
      const value = particle.objectives[objective.id];
      const weightedValue = value * objective.weight * objective.priority;
      
      if (objective.type === 'minimize') {
        fitness += 1000 / (Math.abs(value) + 1);
      } else {
        fitness += value * 100;
      }
    }
    
    // Constraint penalties
    for (const constraint of problem.constraints) {
      const value = particle.constraints[constraint.id];
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
    particle: Particle,
    problem: OptimizationProblem,
    parameters: PSOParameters,
  ): Particle {
    let bestParticle = { ...particle };
    let improved = true;
    let iterations = 0;
    
    while (improved && iterations < parameters.maxIterations) {
      improved = false;
      iterations++;
      
      // Generate local neighbor
      const neighbor = this.generateLocalNeighbor(particle, problem, parameters);
      
      if (neighbor.fitness > bestParticle.fitness) {
        bestParticle = neighbor;
        improved = true;
      }
    }
    
    return bestParticle;
  }

  private generateLocalNeighbor(
    particle: Particle,
    problem: OptimizationProblem,
    parameters: PSOParameters,
  ): Particle {
    const neighbor = { ...particle };
    const position = { ...particle.position };
    
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

  private calculateExplorationRate(particle: Particle, swarm: Swarm): number {
    // Calculate how much the particle is exploring vs exploiting
    const distanceToGlobalBest = this.calculateDistance(particle.position, swarm.globalBestPosition);
    const distanceToPersonalBest = this.calculateDistance(particle.position, particle.bestPosition);
    
    return distanceToGlobalBest / (distanceToPersonalBest + 1);
  }

  private calculateExploitationRate(particle: Particle, swarm: Swarm): number {
    // Calculate how much the particle is exploiting vs exploring
    const distanceToGlobalBest = this.calculateDistance(particle.position, swarm.globalBestPosition);
    const distanceToPersonalBest = this.calculateDistance(particle.position, particle.bestPosition);
    
    return distanceToPersonalBest / (distanceToGlobalBest + 1);
  }

  private calculateDistance(position1: { [variableId: string]: number }, position2: { [variableId: string]: number }): number {
    let distance = 0;
    
    for (const variableId in position1) {
      distance += Math.pow(position1[variableId] - position2[variableId], 2);
    }
    
    return Math.sqrt(distance);
  }

  private updateSwarmMetrics(swarm: Swarm, problem: OptimizationProblem): void {
    // Calculate average fitness
    const totalFitness = swarm.particles.reduce((sum, particle) => sum + particle.fitness, 0);
    swarm.averageFitness = totalFitness / swarm.particles.length;
    
    // Calculate diversity
    swarm.diversity = this.calculateSwarmDiversity(swarm);
    
    // Calculate convergence
    swarm.convergence = this.calculateSwarmConvergence(swarm);
    
    // Calculate stability
    swarm.stability = this.calculateSwarmStability(swarm);
  }

  private calculateSwarmDiversity(swarm: Swarm): number {
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < swarm.particles.length; i++) {
      for (let j = i + 1; j < swarm.particles.length; j++) {
        const distance = this.calculateDistance(swarm.particles[i].position, swarm.particles[j].position);
        totalDistance += distance;
        pairCount++;
      }
    }
    
    return totalDistance / pairCount;
  }

  private calculateSwarmConvergence(swarm: Swarm): number {
    const fitnesses = swarm.particles.map(p => p.fitness);
    const variance = this.calculateVariance(fitnesses);
    const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateSwarmStability(swarm: Swarm): number {
    const fitnesses = swarm.particles.map(p => p.fitness);
    const variance = this.calculateVariance(fitnesses);
    const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    return 1 - (variance / (mean * mean + 1));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, sd) => sum + sd, 0) / values.length;
  }

  private adaptiveParameterUpdate(parameters: PSOParameters, swarm: Swarm, iteration: number): void {
    // Adaptive inertia weight based on swarm diversity
    if (swarm.diversity < 0.1) {
      parameters.inertiaWeight = Math.max(0.1, parameters.inertiaWeight * 0.9);
    } else if (swarm.diversity > 0.5) {
      parameters.inertiaWeight = Math.min(0.9, parameters.inertiaWeight * 1.1);
    }
    
    // Adaptive cognitive and social weights based on convergence
    if (swarm.convergence > 0.8) {
      parameters.cognitiveWeight = Math.max(0.1, parameters.cognitiveWeight * 0.9);
      parameters.socialWeight = Math.min(4.0, parameters.socialWeight * 1.1);
    } else if (swarm.convergence < 0.3) {
      parameters.cognitiveWeight = Math.min(4.0, parameters.cognitiveWeight * 1.1);
      parameters.socialWeight = Math.max(0.1, parameters.socialWeight * 0.9);
    }
  }

  private checkConvergence(swarm: Swarm, parameters: PSOParameters): boolean {
    return swarm.convergence > parameters.convergenceThreshold;
  }

  private checkStagnation(swarm: Swarm, parameters: PSOParameters): boolean {
    // Check if the swarm has stagnated
    const recentFitnesses = swarm.particles.map(p => p.fitness);
    const bestFitness = Math.max(...recentFitnesses);
    const averageFitness = recentFitnesses.reduce((sum, f) => sum + f, 0) / recentFitnesses.length;
    
    return (bestFitness - averageFitness) < 0.01;
  }

  private restartSwarm(swarm: Swarm, problem: OptimizationProblem, parameters: PSOParameters): void {
    // Restart particles with random positions
    for (const particle of swarm.particles) {
      const newParticle = this.createParticle(problem, Math.floor(Math.random() * 1000));
      Object.assign(particle, newParticle);
    }
    
    // Update global best
    let globalBestFitness = -Infinity;
    let globalBestPosition: { [variableId: string]: number } = {};
    
    for (const particle of swarm.particles) {
      if (particle.fitness > globalBestFitness) {
        globalBestFitness = particle.fitness;
        globalBestPosition = { ...particle.position };
      }
    }
    
    swarm.globalBestPosition = globalBestPosition;
    swarm.globalBestFitness = globalBestFitness;
  }

  private calculatePerformanceMetrics(swarm: Swarm, problem: OptimizationProblem): any {
    const fitnesses = swarm.particles.map(p => p.fitness);
    const bestFitness = Math.max(...fitnesses);
    const averageFitness = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
    
    // Convergence
    const convergence = swarm.convergence;
    
    // Stability
    const stability = swarm.stability;
    
    // Diversity
    const diversity = swarm.diversity;
    
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
    swarm: Swarm,
    performance: any,
    parameters: PSOParameters,
  ): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (performance.convergence < 0.8) {
      immediate.push('Low convergence - increase swarm size or adjust parameters');
    }
    
    if (performance.stability < 0.7) {
      immediate.push('Low stability - adjust inertia weight');
    }
    
    if (performance.diversity < 0.5) {
      shortTerm.push('Low diversity - increase cognitive weight');
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
        INSERT INTO particle_swarm_optimization_results 
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
      this.logger.error('Failed to save particle swarm optimization result:', error);
    }
  }
}

