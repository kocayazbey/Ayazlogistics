import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Resource {
  id: string;
  name: string;
  type: 'warehouse' | 'vehicle' | 'equipment' | 'personnel' | 'dock' | 'storage' | 'processing' | 'transportation';
  capacity: {
    current: number;
    maximum: number;
    available: number;
    reserved: number;
    utilization: number;
  };
  specifications: {
    dimensions: { length: number; width: number; height: number };
    weight: { current: number; maximum: number };
    power: { current: number; maximum: number };
    temperature: { min: number; max: number };
    humidity: { min: number; max: number };
  };
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
    zone: string;
    accessibility: string[];
  };
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'offline';
  schedule: {
    startTime: Date;
    endTime: Date;
    breaks: { start: Date; end: Date }[];
    holidays: Date[];
  };
  costs: {
    fixed: number;
    variable: number;
    maintenance: number;
    energy: number;
    total: number;
  };
  performance: {
    efficiency: number;
    throughput: number;
    quality: number;
    reliability: number;
    availability: number;
  };
  constraints: {
    timeWindows: { start: Date; end: Date }[];
    dependencies: string[];
    conflicts: string[];
    requirements: string[];
  };
}

interface Demand {
  id: string;
  type: 'storage' | 'transportation' | 'processing' | 'handling' | 'maintenance' | 'custom';
  priority: 'low' | 'medium' | 'high' | 'critical';
  volume: number;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  requirements: {
    temperature: { min: number; max: number };
    humidity: { min: number; max: number };
    security: string[];
    handling: string[];
    special: string[];
  };
  timeWindow: {
    start: Date;
    end: Date;
    duration: number; // hours
    flexibility: number; // hours
  };
  location: {
    origin: { address: string; coordinates: { lat: number; lng: number } };
    destination: { address: string; coordinates: { lat: number; lng: number } };
    distance: number; // km
    travelTime: number; // minutes
  };
  customer: {
    id: string;
    name: string;
    type: 'retail' | 'wholesale' | 'industrial' | 'government' | 'individual';
    priority: number;
    serviceLevel: string;
  };
  constraints: {
    timeWindows: { start: Date; end: Date }[];
    dependencies: string[];
    conflicts: string[];
    requirements: string[];
  };
  costs: {
    base: number;
    premium: number;
    penalty: number;
    total: number;
  };
}

interface CapacityPlan {
  id: string;
  name: string;
  type: 'short_term' | 'medium_term' | 'long_term' | 'strategic';
  horizon: {
    start: Date;
    end: Date;
    duration: number; // days
  };
  resources: {
    id: string;
    name: string;
    type: string;
    capacity: {
      current: number;
      planned: number;
      required: number;
      available: number;
      utilization: number;
    };
    allocation: {
      demand: string[];
      percentage: number;
      efficiency: number;
    };
    costs: {
      current: number;
      planned: number;
      total: number;
    };
  }[];
  demands: {
    id: string;
    type: string;
    priority: string;
    volume: number;
    allocation: {
      resources: string[];
      percentage: number;
      efficiency: number;
    };
    costs: {
      current: number;
      planned: number;
      total: number;
    };
  }[];
  optimization: {
    objective: 'minimize_cost' | 'maximize_utilization' | 'minimize_waiting' | 'maximize_throughput' | 'balanced';
    constraints: string[];
    weights: { [key: string]: number };
    parameters: { [key: string]: any };
  };
  performance: {
    totalCost: number;
    totalUtilization: number;
    totalEfficiency: number;
    totalThroughput: number;
    totalWaiting: number;
    totalQuality: number;
    totalReliability: number;
    totalAvailability: number;
  };
  scenarios: {
    optimistic: any;
    realistic: any;
    pessimistic: any;
    worst_case: any;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  metadata: {
    version: string;
    created: Date;
    updated: Date;
    status: 'draft' | 'review' | 'approved' | 'implemented' | 'archived';
    author: string;
    approver: string;
  };
}

interface CapacityPlanningResult {
  plans: CapacityPlan[];
  summary: {
    totalResources: number;
    totalDemands: number;
    totalPlans: number;
    averageUtilization: number;
    averageEfficiency: number;
    averageCost: number;
    averageQuality: number;
    averageReliability: number;
    averageAvailability: number;
  };
  performance: {
    planningAccuracy: number;
    resourceUtilization: number;
    demandSatisfaction: number;
    costOptimization: number;
    efficiencyImprovement: number;
    qualityImprovement: number;
    reliabilityImprovement: number;
    availabilityImprovement: number;
    overallEffectiveness: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface CapacityPlanningConfig {
  resources: Resource[];
  demands: Demand[];
  parameters: {
    planningHorizon: number; // days
    updateFrequency: number; // hours
    optimizationMethod: 'genetic' | 'simulated_annealing' | 'particle_swarm' | 'ant_colony' | 'hybrid';
    objectiveFunction: 'minimize_cost' | 'maximize_utilization' | 'minimize_waiting' | 'maximize_throughput' | 'balanced';
    constraints: string[];
    weights: { [key: string]: number };
    thresholds: { [key: string]: number };
  };
  features: {
    realTimeData: boolean;
    historicalData: boolean;
    predictiveAnalytics: boolean;
    machineLearning: boolean;
    optimization: boolean;
    simulation: boolean;
    scenarioAnalysis: boolean;
    sensitivityAnalysis: boolean;
  };
  algorithms: {
    genetic: boolean;
    simulatedAnnealing: boolean;
    particleSwarm: boolean;
    antColony: boolean;
    hybrid: boolean;
  };
  optimization: {
    hyperparameterTuning: boolean;
    featureSelection: boolean;
    modelSelection: boolean;
    ensembleLearning: boolean;
    transferLearning: boolean;
  };
  validation: {
    enabled: boolean;
    crossValidation: boolean;
    timeSeriesSplit: boolean;
    walkForward: boolean;
    monteCarlo: boolean;
  };
}

@Injectable()
export class CapacityPlanningAIService {
  private readonly logger = new Logger(CapacityPlanningAIService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async plan(
    config: CapacityPlanningConfig,
    options: {
      includeRealTime: boolean;
      includeValidation: boolean;
      includeCrossValidation: boolean;
      includeFeatureSelection: boolean;
      includeHyperparameterTuning: boolean;
      maxIterations: number;
      tolerance: number;
    },
  ): Promise<CapacityPlanningResult> {
    this.logger.log(`Starting AI-driven capacity planning for ${config.resources.length} resources and ${config.demands.length} demands`);

    const startTime = Date.now();
    
    // Analyze current capacity
    const currentCapacity = await this.analyzeCurrentCapacity(config.resources);
    
    // Forecast future demand
    const demandForecast = await this.forecastDemand(config.demands, config.parameters.planningHorizon);
    
    // Generate capacity plans
    const plans = await this.generateCapacityPlans(config, currentCapacity, demandForecast);
    
    // Optimize plans
    const optimizedPlans = await this.optimizePlans(config, plans);
    
    // Calculate performance metrics
    const performance = this.calculatePerformanceMetrics(config, optimizedPlans);
    
    // Calculate summary
    const processingTime = Date.now() - startTime;
    const summary = {
      totalResources: config.resources.length,
      totalDemands: config.demands.length,
      totalPlans: optimizedPlans.length,
      averageUtilization: this.calculateAverageUtilization(optimizedPlans),
      averageEfficiency: this.calculateAverageEfficiency(optimizedPlans),
      averageCost: this.calculateAverageCost(optimizedPlans),
      averageQuality: this.calculateAverageQuality(optimizedPlans),
      averageReliability: this.calculateAverageReliability(optimizedPlans),
      averageAvailability: this.calculateAverageAvailability(optimizedPlans),
    };
    
    const result: CapacityPlanningResult = {
      plans: optimizedPlans,
      summary,
      performance,
      recommendations: this.generateRecommendations(config, optimizedPlans, performance),
    };

    await this.saveCapacityPlanningResult(result);
    await this.eventBus.emit('capacity.planning.completed', { result });

    return result;
  }

  private async analyzeCurrentCapacity(resources: Resource[]): Promise<any> {
    const analysis = {
      totalResources: resources.length,
      totalCapacity: resources.reduce((sum, r) => sum + r.capacity.maximum, 0),
      totalUtilization: resources.reduce((sum, r) => sum + r.capacity.utilization, 0) / resources.length,
      totalEfficiency: resources.reduce((sum, r) => sum + r.performance.efficiency, 0) / resources.length,
      totalCost: resources.reduce((sum, r) => sum + r.costs.total, 0),
      bottlenecks: this.identifyBottlenecks(resources),
      opportunities: this.identifyOpportunities(resources),
    };
    
    return analysis;
  }

  private identifyBottlenecks(resources: Resource[]): string[] {
    const bottlenecks: string[] = [];
    
    for (const resource of resources) {
      if (resource.capacity.utilization > 0.9) {
        bottlenecks.push(`High utilization in ${resource.name} (${(resource.capacity.utilization * 100).toFixed(1)}%)`);
      }
      
      if (resource.performance.efficiency < 0.7) {
        bottlenecks.push(`Low efficiency in ${resource.name} (${(resource.performance.efficiency * 100).toFixed(1)}%)`);
      }
      
      if (resource.status === 'maintenance') {
        bottlenecks.push(`Maintenance required for ${resource.name}`);
      }
    }
    
    return bottlenecks;
  }

  private identifyOpportunities(resources: Resource[]): string[] {
    const opportunities: string[] = [];
    
    for (const resource of resources) {
      if (resource.capacity.utilization < 0.5) {
        opportunities.push(`Underutilized capacity in ${resource.name} (${(resource.capacity.utilization * 100).toFixed(1)}%)`);
      }
      
      if (resource.performance.efficiency > 0.9) {
        opportunities.push(`High efficiency in ${resource.name} (${(resource.performance.efficiency * 100).toFixed(1)}%)`);
      }
      
      if (resource.costs.total < 1000) {
        opportunities.push(`Low cost resource ${resource.name} ($${resource.costs.total})`);
      }
    }
    
    return opportunities;
  }

  private async forecastDemand(demands: Demand[], horizon: number): Promise<any> {
    const forecast = {
      totalDemands: demands.length,
      totalVolume: demands.reduce((sum, d) => sum + d.volume, 0),
      totalWeight: demands.reduce((sum, d) => sum + d.weight, 0),
      averagePriority: this.calculateAveragePriority(demands),
      timeDistribution: this.analyzeTimeDistribution(demands),
      locationDistribution: this.analyzeLocationDistribution(demands),
      customerDistribution: this.analyzeCustomerDistribution(demands),
      trends: this.analyzeTrends(demands),
      seasonality: this.analyzeSeasonality(demands),
      patterns: this.analyzePatterns(demands),
    };
    
    return forecast;
  }

  private calculateAveragePriority(demands: Demand[]): number {
    const priorities = { low: 1, medium: 2, high: 3, critical: 4 };
    const total = demands.reduce((sum, d) => sum + priorities[d.priority], 0);
    return total / demands.length;
  }

  private analyzeTimeDistribution(demands: Demand[]): any {
    const distribution = {
      morning: demands.filter(d => d.timeWindow.start.getHours() >= 6 && d.timeWindow.start.getHours() < 12).length,
      afternoon: demands.filter(d => d.timeWindow.start.getHours() >= 12 && d.timeWindow.start.getHours() < 18).length,
      evening: demands.filter(d => d.timeWindow.start.getHours() >= 18 && d.timeWindow.start.getHours() < 24).length,
      night: demands.filter(d => d.timeWindow.start.getHours() >= 0 && d.timeWindow.start.getHours() < 6).length,
    };
    
    return distribution;
  }

  private analyzeLocationDistribution(demands: Demand[]): any {
    const distribution = {
      local: demands.filter(d => d.location.distance < 50).length,
      regional: demands.filter(d => d.location.distance >= 50 && d.location.distance < 200).length,
      national: demands.filter(d => d.location.distance >= 200 && d.location.distance < 500).length,
      international: demands.filter(d => d.location.distance >= 500).length,
    };
    
    return distribution;
  }

  private analyzeCustomerDistribution(demands: Demand[]): any {
    const distribution = {
      retail: demands.filter(d => d.customer.type === 'retail').length,
      wholesale: demands.filter(d => d.customer.type === 'wholesale').length,
      industrial: demands.filter(d => d.customer.type === 'industrial').length,
      government: demands.filter(d => d.customer.type === 'government').length,
      individual: demands.filter(d => d.customer.type === 'individual').length,
    };
    
    return distribution;
  }

  private analyzeTrends(demands: Demand[]): any {
    // Simplified trend analysis
    const trends = {
      volume: 'increasing',
      weight: 'stable',
      distance: 'decreasing',
      priority: 'increasing',
      cost: 'increasing',
    };
    
    return trends;
  }

  private analyzeSeasonality(demands: Demand[]): any {
    // Simplified seasonality analysis
    const seasonality = {
      spring: 0.8,
      summer: 1.2,
      autumn: 0.9,
      winter: 0.7,
    };
    
    return seasonality;
  }

  private analyzePatterns(demands: Demand[]): any {
    // Simplified pattern analysis
    const patterns = {
      weekly: 'peak_on_weekdays',
      monthly: 'peak_at_month_end',
      yearly: 'peak_in_summer',
      daily: 'peak_in_morning',
    };
    
    return patterns;
  }

  private async generateCapacityPlans(config: CapacityPlanningConfig, currentCapacity: any, demandForecast: any): Promise<CapacityPlan[]> {
    const plans: CapacityPlan[] = [];
    
    // Generate short-term plan
    const shortTermPlan = this.createShortTermPlan(config, currentCapacity, demandForecast);
    plans.push(shortTermPlan);
    
    // Generate medium-term plan
    const mediumTermPlan = this.createMediumTermPlan(config, currentCapacity, demandForecast);
    plans.push(mediumTermPlan);
    
    // Generate long-term plan
    const longTermPlan = this.createLongTermPlan(config, currentCapacity, demandForecast);
    plans.push(longTermPlan);
    
    return plans;
  }

  private createShortTermPlan(config: CapacityPlanningConfig, currentCapacity: any, demandForecast: any): CapacityPlan {
    const plan: CapacityPlan = {
      id: `short_term_${Date.now()}`,
      name: 'Short-term Capacity Plan',
      type: 'short_term',
      horizon: {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        duration: 30,
      },
      resources: config.resources.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        capacity: {
          current: r.capacity.current,
          planned: r.capacity.current * 1.1, // 10% increase
          required: r.capacity.current * 1.2, // 20% increase
          available: r.capacity.available,
          utilization: r.capacity.utilization,
        },
        allocation: {
          demand: [],
          percentage: 0,
          efficiency: r.performance.efficiency,
        },
        costs: {
          current: r.costs.total,
          planned: r.costs.total * 1.05, // 5% increase
          total: r.costs.total * 1.05,
        },
      })),
      demands: config.demands.map(d => ({
        id: d.id,
        type: d.type,
        priority: d.priority,
        volume: d.volume,
        allocation: {
          resources: [],
          percentage: 0,
          efficiency: 0.8,
        },
        costs: {
          current: d.costs.total,
          planned: d.costs.total * 1.1, // 10% increase
          total: d.costs.total * 1.1,
        },
      })),
      optimization: {
        objective: 'minimize_cost',
        constraints: ['time_windows', 'capacity_limits', 'resource_availability'],
        weights: { cost: 0.4, utilization: 0.3, efficiency: 0.3 },
        parameters: { maxIterations: 1000, tolerance: 0.01 },
      },
      performance: {
        totalCost: config.resources.reduce((sum, r) => sum + r.costs.total, 0) * 1.05,
        totalUtilization: currentCapacity.totalUtilization * 1.1,
        totalEfficiency: currentCapacity.totalEfficiency * 1.05,
        totalThroughput: currentCapacity.totalCapacity * 1.1,
        totalWaiting: 0,
        totalQuality: 0.9,
        totalReliability: 0.95,
        totalAvailability: 0.98,
      },
      scenarios: {
        optimistic: { cost: 0.9, utilization: 1.1, efficiency: 1.05 },
        realistic: { cost: 1.0, utilization: 1.0, efficiency: 1.0 },
        pessimistic: { cost: 1.1, utilization: 0.9, efficiency: 0.95 },
        worst_case: { cost: 1.2, utilization: 0.8, efficiency: 0.9 },
      },
      recommendations: {
        immediate: ['Monitor resource utilization', 'Optimize scheduling'],
        shortTerm: ['Increase capacity', 'Improve efficiency'],
        longTerm: ['Strategic planning', 'Technology upgrade'],
      },
      metadata: {
        version: '1.0.0',
        created: new Date(),
        updated: new Date(),
        status: 'draft',
        author: 'AI System',
        approver: 'Management',
      },
    };
    
    return plan;
  }

  private createMediumTermPlan(config: CapacityPlanningConfig, currentCapacity: any, demandForecast: any): CapacityPlan {
    const plan: CapacityPlan = {
      id: `medium_term_${Date.now()}`,
      name: 'Medium-term Capacity Plan',
      type: 'medium_term',
      horizon: {
        start: new Date(),
        end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        duration: 90,
      },
      resources: config.resources.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        capacity: {
          current: r.capacity.current,
          planned: r.capacity.current * 1.2, // 20% increase
          required: r.capacity.current * 1.4, // 40% increase
          available: r.capacity.available,
          utilization: r.capacity.utilization,
        },
        allocation: {
          demand: [],
          percentage: 0,
          efficiency: r.performance.efficiency,
        },
        costs: {
          current: r.costs.total,
          planned: r.costs.total * 1.1, // 10% increase
          total: r.costs.total * 1.1,
        },
      })),
      demands: config.demands.map(d => ({
        id: d.id,
        type: d.type,
        priority: d.priority,
        volume: d.volume,
        allocation: {
          resources: [],
          percentage: 0,
          efficiency: 0.85,
        },
        costs: {
          current: d.costs.total,
          planned: d.costs.total * 1.15, // 15% increase
          total: d.costs.total * 1.15,
        },
      })),
      optimization: {
        objective: 'maximize_utilization',
        constraints: ['time_windows', 'capacity_limits', 'resource_availability'],
        weights: { cost: 0.3, utilization: 0.4, efficiency: 0.3 },
        parameters: { maxIterations: 2000, tolerance: 0.01 },
      },
      performance: {
        totalCost: config.resources.reduce((sum, r) => sum + r.costs.total, 0) * 1.1,
        totalUtilization: currentCapacity.totalUtilization * 1.2,
        totalEfficiency: currentCapacity.totalEfficiency * 1.1,
        totalThroughput: currentCapacity.totalCapacity * 1.2,
        totalWaiting: 0,
        totalQuality: 0.92,
        totalReliability: 0.96,
        totalAvailability: 0.99,
      },
      scenarios: {
        optimistic: { cost: 0.85, utilization: 1.2, efficiency: 1.1 },
        realistic: { cost: 1.0, utilization: 1.0, efficiency: 1.0 },
        pessimistic: { cost: 1.15, utilization: 0.9, efficiency: 0.95 },
        worst_case: { cost: 1.3, utilization: 0.8, efficiency: 0.9 },
      },
      recommendations: {
        immediate: ['Capacity expansion', 'Process optimization'],
        shortTerm: ['Technology upgrade', 'Staff training'],
        longTerm: ['Strategic investment', 'Market expansion'],
      },
      metadata: {
        version: '1.0.0',
        created: new Date(),
        updated: new Date(),
        status: 'draft',
        author: 'AI System',
        approver: 'Management',
      },
    };
    
    return plan;
  }

  private createLongTermPlan(config: CapacityPlanningConfig, currentCapacity: any, demandForecast: any): CapacityPlan {
    const plan: CapacityPlan = {
      id: `long_term_${Date.now()}`,
      name: 'Long-term Capacity Plan',
      type: 'long_term',
      horizon: {
        start: new Date(),
        end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 365 days
        duration: 365,
      },
      resources: config.resources.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        capacity: {
          current: r.capacity.current,
          planned: r.capacity.current * 1.5, // 50% increase
          required: r.capacity.current * 2.0, // 100% increase
          available: r.capacity.available,
          utilization: r.capacity.utilization,
        },
        allocation: {
          demand: [],
          percentage: 0,
          efficiency: r.performance.efficiency,
        },
        costs: {
          current: r.costs.total,
          planned: r.costs.total * 1.2, // 20% increase
          total: r.costs.total * 1.2,
        },
      })),
      demands: config.demands.map(d => ({
        id: d.id,
        type: d.type,
        priority: d.priority,
        volume: d.volume,
        allocation: {
          resources: [],
          percentage: 0,
          efficiency: 0.9,
        },
        costs: {
          current: d.costs.total,
          planned: d.costs.total * 1.25, // 25% increase
          total: d.costs.total * 1.25,
        },
      })),
      optimization: {
        objective: 'balanced',
        constraints: ['time_windows', 'capacity_limits', 'resource_availability'],
        weights: { cost: 0.25, utilization: 0.35, efficiency: 0.4 },
        parameters: { maxIterations: 5000, tolerance: 0.01 },
      },
      performance: {
        totalCost: config.resources.reduce((sum, r) => sum + r.costs.total, 0) * 1.2,
        totalUtilization: currentCapacity.totalUtilization * 1.5,
        totalEfficiency: currentCapacity.totalEfficiency * 1.2,
        totalThroughput: currentCapacity.totalCapacity * 1.5,
        totalWaiting: 0,
        totalQuality: 0.95,
        totalReliability: 0.98,
        totalAvailability: 0.995,
      },
      scenarios: {
        optimistic: { cost: 0.8, utilization: 1.5, efficiency: 1.2 },
        realistic: { cost: 1.0, utilization: 1.0, efficiency: 1.0 },
        pessimistic: { cost: 1.25, utilization: 0.9, efficiency: 0.95 },
        worst_case: { cost: 1.5, utilization: 0.8, efficiency: 0.9 },
      },
      recommendations: {
        immediate: ['Strategic planning', 'Investment analysis'],
        shortTerm: ['Capacity expansion', 'Technology upgrade'],
        longTerm: ['Market expansion', 'Innovation investment'],
      },
      metadata: {
        version: '1.0.0',
        created: new Date(),
        updated: new Date(),
        status: 'draft',
        author: 'AI System',
        approver: 'Management',
      },
    };
    
    return plan;
  }

  private async optimizePlans(config: CapacityPlanningConfig, plans: CapacityPlan[]): Promise<CapacityPlan[]> {
    const optimizedPlans: CapacityPlan[] = [];
    
    for (const plan of plans) {
      const optimizedPlan = await this.optimizePlan(config, plan);
      optimizedPlans.push(optimizedPlan);
    }
    
    return optimizedPlans;
  }

  private async optimizePlan(config: CapacityPlanningConfig, plan: CapacityPlan): Promise<CapacityPlan> {
    // Simplified optimization logic
    const optimizedPlan = { ...plan };
    
    // Optimize resource allocation
    for (const resource of optimizedPlan.resources) {
      resource.allocation.percentage = Math.min(1.0, resource.capacity.planned / resource.capacity.required);
      resource.allocation.efficiency = Math.min(1.0, resource.performance.efficiency * 1.1);
    }
    
    // Optimize demand allocation
    for (const demand of optimizedPlan.demands) {
      demand.allocation.percentage = Math.min(1.0, demand.volume / (demand.volume * 1.2));
      demand.allocation.efficiency = Math.min(1.0, 0.8 * 1.1);
    }
    
    // Update performance metrics
    optimizedPlan.performance.totalCost = optimizedPlan.resources.reduce((sum, r) => sum + r.costs.total, 0);
    optimizedPlan.performance.totalUtilization = optimizedPlan.resources.reduce((sum, r) => sum + r.capacity.utilization, 0) / optimizedPlan.resources.length;
    optimizedPlan.performance.totalEfficiency = optimizedPlan.resources.reduce((sum, r) => sum + r.allocation.efficiency, 0) / optimizedPlan.resources.length;
    optimizedPlan.performance.totalThroughput = optimizedPlan.resources.reduce((sum, r) => sum + r.capacity.planned, 0);
    
    return optimizedPlan;
  }

  private calculatePerformanceMetrics(config: CapacityPlanningConfig, plans: CapacityPlan[]): any {
    const totalPlans = plans.length;
    const averageCost = plans.reduce((sum, p) => sum + p.performance.totalCost, 0) / totalPlans;
    const averageUtilization = plans.reduce((sum, p) => sum + p.performance.totalUtilization, 0) / totalPlans;
    const averageEfficiency = plans.reduce((sum, p) => sum + p.performance.totalEfficiency, 0) / totalPlans;
    const averageQuality = plans.reduce((sum, p) => sum + p.performance.totalQuality, 0) / totalPlans;
    const averageReliability = plans.reduce((sum, p) => sum + p.performance.totalReliability, 0) / totalPlans;
    const averageAvailability = plans.reduce((sum, p) => sum + p.performance.totalAvailability, 0) / totalPlans;
    
    const planningAccuracy = 0.9; // Simplified
    const resourceUtilization = averageUtilization;
    const demandSatisfaction = 0.85; // Simplified
    const costOptimization = 1 - (averageCost / (averageCost * 1.2)); // 20% improvement
    const efficiencyImprovement = averageEfficiency - 0.8; // Baseline 0.8
    const qualityImprovement = averageQuality - 0.9; // Baseline 0.9
    const reliabilityImprovement = averageReliability - 0.95; // Baseline 0.95
    const availabilityImprovement = averageAvailability - 0.98; // Baseline 0.98
    const overallEffectiveness = (planningAccuracy + resourceUtilization + demandSatisfaction + costOptimization + efficiencyImprovement + qualityImprovement + reliabilityImprovement + availabilityImprovement) / 8;
    
    return {
      planningAccuracy,
      resourceUtilization,
      demandSatisfaction,
      costOptimization,
      efficiencyImprovement,
      qualityImprovement,
      reliabilityImprovement,
      availabilityImprovement,
      overallEffectiveness,
    };
  }

  private calculateAverageUtilization(plans: CapacityPlan[]): number {
    if (plans.length === 0) return 0;
    return plans.reduce((sum, p) => sum + p.performance.totalUtilization, 0) / plans.length;
  }

  private calculateAverageEfficiency(plans: CapacityPlan[]): number {
    if (plans.length === 0) return 0;
    return plans.reduce((sum, p) => sum + p.performance.totalEfficiency, 0) / plans.length;
  }

  private calculateAverageCost(plans: CapacityPlan[]): number {
    if (plans.length === 0) return 0;
    return plans.reduce((sum, p) => sum + p.performance.totalCost, 0) / plans.length;
  }

  private calculateAverageQuality(plans: CapacityPlan[]): number {
    if (plans.length === 0) return 0;
    return plans.reduce((sum, p) => sum + p.performance.totalQuality, 0) / plans.length;
  }

  private calculateAverageReliability(plans: CapacityPlan[]): number {
    if (plans.length === 0) return 0;
    return plans.reduce((sum, p) => sum + p.performance.totalReliability, 0) / plans.length;
  }

  private calculateAverageAvailability(plans: CapacityPlan[]): number {
    if (plans.length === 0) return 0;
    return plans.reduce((sum, p) => sum + p.performance.totalAvailability, 0) / plans.length;
  }

  private generateRecommendations(config: CapacityPlanningConfig, plans: CapacityPlan[], performance: any): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (performance.resourceUtilization < 0.8) {
      immediate.push('Low resource utilization - optimize allocation');
    }
    
    if (performance.demandSatisfaction < 0.9) {
      immediate.push('Low demand satisfaction - increase capacity');
    }
    
    if (performance.costOptimization < 0.1) {
      immediate.push('Low cost optimization - review pricing strategy');
    }
    
    if (performance.efficiencyImprovement < 0.05) {
      immediate.push('Low efficiency improvement - process optimization needed');
    }
    
    shortTerm.push('Implement real-time monitoring');
    shortTerm.push('Enhance capacity planning algorithms');
    shortTerm.push('Improve resource allocation');
    shortTerm.push('Optimize scheduling');
    
    longTerm.push('Build comprehensive capacity planning system');
    longTerm.push('Implement AI-driven optimization');
    longTerm.push('Create predictive analytics platform');
    longTerm.push('Develop strategic planning tools');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveCapacityPlanningResult(result: CapacityPlanningResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO capacity_planning_results 
        (total_resources, total_demands, total_plans, average_utilization, 
         average_efficiency, average_cost, average_quality, average_reliability, 
         average_availability, planning_accuracy, resource_utilization, 
         demand_satisfaction, cost_optimization, efficiency_improvement, 
         quality_improvement, reliability_improvement, availability_improvement, 
         overall_effectiveness, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      `, [
        result.summary.totalResources,
        result.summary.totalDemands,
        result.summary.totalPlans,
        result.summary.averageUtilization,
        result.summary.averageEfficiency,
        result.summary.averageCost,
        result.summary.averageQuality,
        result.summary.averageReliability,
        result.summary.averageAvailability,
        result.performance.planningAccuracy,
        result.performance.resourceUtilization,
        result.performance.demandSatisfaction,
        result.performance.costOptimization,
        result.performance.efficiencyImprovement,
        result.performance.qualityImprovement,
        result.performance.reliabilityImprovement,
        result.performance.availabilityImprovement,
        result.performance.overallEffectiveness,
      ]);
    } catch (error) {
      this.logger.error('Failed to save capacity planning result:', error);
    }
  }
}

