import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitCost: number;
  currentStock: number;
  leadTime: number; // days
  supplier: string;
  location: string;
  demandHistory: DemandPoint[];
  leadTimeHistory: LeadTimePoint[];
  serviceLevel: number; // 0-1
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

interface DemandPoint {
  date: Date;
  demand: number;
  seasonality: number;
  trend: number;
  random: number;
}

interface LeadTimePoint {
  date: Date;
  leadTime: number;
  supplier: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface SafetyStockCalculation {
  productId: string;
  sku: string;
  method: 'basic' | 'advanced' | 'simulation' | 'machine_learning';
  demandStatistics: {
    mean: number;
    standardDeviation: number;
    coefficientOfVariation: number;
    skewness: number;
    kurtosis: number;
  };
  leadTimeStatistics: {
    mean: number;
    standardDeviation: number;
    coefficientOfVariation: number;
    min: number;
    max: number;
  };
  safetyStock: number;
  reorderPoint: number;
  economicOrderQuantity: number;
  serviceLevel: number;
  stockoutProbability: number;
  expectedStockouts: number;
  holdingCost: number;
  stockoutCost: number;
  totalCost: number;
  confidence: number;
  recommendations: string[];
}

interface OptimizationResult {
  productId: string;
  sku: string;
  currentSafetyStock: number;
  optimizedSafetyStock: number;
  improvement: {
    safetyStockReduction: number;
    costReduction: number;
    serviceLevelImprovement: number;
  };
  method: string;
  confidence: number;
  implementation: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface BatchOptimizationResult {
  totalProducts: number;
  optimizedProducts: number;
  totalCostSavings: number;
  averageServiceLevelImprovement: number;
  results: OptimizationResult[];
  summary: {
    highImpact: number;
    mediumImpact: number;
    lowImpact: number;
    noChange: number;
  };
}

@Injectable()
export class SafetyStockOptimizationService {
  private readonly logger = new Logger(SafetyStockOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimizeSafetyStock(
    products: Product[],
    constraints: {
      maxServiceLevel: number;
      minServiceLevel: number;
      maxHoldingCost: number;
      maxStockoutCost: number;
      budgetLimit?: number;
    },
    options: {
      method: 'basic' | 'advanced' | 'simulation' | 'machine_learning';
      includeSeasonality: boolean;
      includeTrend: boolean;
      includeSupplierVariability: boolean;
      confidenceLevel: number;
    },
  ): Promise<BatchOptimizationResult> {
    this.logger.log(`Optimizing safety stock for ${products.length} products`);

    const results: OptimizationResult[] = [];
    let totalCostSavings = 0;
    let totalServiceLevelImprovement = 0;
    let optimizedCount = 0;

    for (const product of products) {
      try {
        const currentCalculation = await this.calculateCurrentSafetyStock(product);
        const optimizedCalculation = await this.calculateOptimizedSafetyStock(
          product,
          constraints,
          options,
        );

        if (optimizedCalculation.safetyStock !== currentCalculation.safetyStock) {
          const improvement = this.calculateImprovement(currentCalculation, optimizedCalculation);
          
          results.push({
            productId: product.id,
            sku: product.sku,
            currentSafetyStock: currentCalculation.safetyStock,
            optimizedSafetyStock: optimizedCalculation.safetyStock,
            improvement,
            method: options.method,
            confidence: optimizedCalculation.confidence,
            implementation: this.generateImplementationPlan(product, improvement),
          });

          totalCostSavings += improvement.costReduction;
          totalServiceLevelImprovement += improvement.serviceLevelImprovement;
          optimizedCount++;
        }
      } catch (error) {
        this.logger.error(`Failed to optimize safety stock for product ${product.sku}:`, error);
      }
    }

    const summary = this.generateSummary(results);
    
    const batchResult: BatchOptimizationResult = {
      totalProducts: products.length,
      optimizedProducts: optimizedCount,
      totalCostSavings,
      averageServiceLevelImprovement: totalServiceLevelImprovement / optimizedCount,
      results,
      summary,
    };

    await this.saveOptimizationResult(batchResult);
    await this.eventBus.emit('safety.stock.optimized', { result: batchResult });

    return batchResult;
  }

  private async calculateCurrentSafetyStock(product: Product): Promise<SafetyStockCalculation> {
    // Calculate current safety stock using basic method
    const demandStats = this.calculateDemandStatistics(product.demandHistory);
    const leadTimeStats = this.calculateLeadTimeStatistics(product.leadTimeHistory);
    
    // Basic safety stock calculation
    const safetyStock = Math.ceil(
      Math.sqrt(leadTimeStats.mean) * demandStats.standardDeviation * 
      this.getZScore(product.serviceLevel)
    );
    
    const reorderPoint = Math.ceil(demandStats.mean * leadTimeStats.mean + safetyStock);
    const eoq = this.calculateEOQ(product, demandStats.mean);
    
    return {
      productId: product.id,
      sku: product.sku,
      method: 'basic',
      demandStatistics: demandStats,
      leadTimeStatistics: leadTimeStats,
      safetyStock,
      reorderPoint,
      economicOrderQuantity: eoq,
      serviceLevel: product.serviceLevel,
      stockoutProbability: 1 - product.serviceLevel,
      expectedStockouts: this.calculateExpectedStockouts(demandStats, leadTimeStats, safetyStock),
      holdingCost: safetyStock * product.unitCost * 0.25, // 25% annual holding cost
      stockoutCost: this.calculateStockoutCost(product, demandStats.mean),
      totalCost: 0, // Will be calculated
      confidence: 0.7,
      recommendations: [],
    };
  }

  private async calculateOptimizedSafetyStock(
    product: Product,
    constraints: any,
    options: any,
  ): Promise<SafetyStockCalculation> {
    const demandStats = this.calculateDemandStatistics(product.demandHistory);
    const leadTimeStats = this.calculateLeadTimeStatistics(product.leadTimeHistory);
    
    let safetyStock: number;
    let method: string;
    let confidence: number;
    
    switch (options.method) {
      case 'basic':
        safetyStock = this.calculateBasicSafetyStock(demandStats, leadTimeStats, product.serviceLevel);
        method = 'basic';
        confidence = 0.7;
        break;
        
      case 'advanced':
        safetyStock = this.calculateAdvancedSafetyStock(
          demandStats,
          leadTimeStats,
          product,
          options,
        );
        method = 'advanced';
        confidence = 0.8;
        break;
        
      case 'simulation':
        safetyStock = await this.calculateSimulationSafetyStock(
          demandStats,
          leadTimeStats,
          product,
          constraints,
        );
        method = 'simulation';
        confidence = 0.85;
        break;
        
      case 'machine_learning':
        safetyStock = await this.calculateMLSafetyStock(
          demandStats,
          leadTimeStats,
          product,
          options,
        );
        method = 'machine_learning';
        confidence = 0.9;
        break;
        
      default:
        safetyStock = this.calculateBasicSafetyStock(demandStats, leadTimeStats, product.serviceLevel);
        method = 'basic';
        confidence = 0.7;
    }
    
    // Apply constraints
    safetyStock = Math.max(0, Math.min(safetyStock, constraints.maxHoldingCost / product.unitCost));
    
    const reorderPoint = Math.ceil(demandStats.mean * leadTimeStats.mean + safetyStock);
    const eoq = this.calculateEOQ(product, demandStats.mean);
    const serviceLevel = this.calculateServiceLevel(demandStats, leadTimeStats, safetyStock);
    
    return {
      productId: product.id,
      sku: product.sku,
      method,
      demandStatistics: demandStats,
      leadTimeStatistics: leadTimeStats,
      safetyStock,
      reorderPoint,
      economicOrderQuantity: eoq,
      serviceLevel,
      stockoutProbability: 1 - serviceLevel,
      expectedStockouts: this.calculateExpectedStockouts(demandStats, leadTimeStats, safetyStock),
      holdingCost: safetyStock * product.unitCost * 0.25,
      stockoutCost: this.calculateStockoutCost(product, demandStats.mean),
      totalCost: 0, // Will be calculated
      confidence,
      recommendations: this.generateRecommendations(product, demandStats, leadTimeStats, safetyStock),
    };
  }

  private calculateBasicSafetyStock(
    demandStats: any,
    leadTimeStats: any,
    serviceLevel: number,
  ): number {
    const zScore = this.getZScore(serviceLevel);
    return Math.ceil(
      zScore * Math.sqrt(
        leadTimeStats.mean * Math.pow(demandStats.standardDeviation, 2) +
        Math.pow(demandStats.mean, 2) * Math.pow(leadTimeStats.standardDeviation, 2)
      )
    );
  }

  private calculateAdvancedSafetyStock(
    demandStats: any,
    leadTimeStats: any,
    product: Product,
    options: any,
  ): number {
    let safetyStock = this.calculateBasicSafetyStock(demandStats, leadTimeStats, product.serviceLevel);
    
    // Adjust for seasonality
    if (options.includeSeasonality) {
      const seasonalityFactor = this.calculateSeasonalityFactor(product.demandHistory);
      safetyStock *= seasonalityFactor;
    }
    
    // Adjust for trend
    if (options.includeTrend) {
      const trendFactor = this.calculateTrendFactor(product.demandHistory);
      safetyStock *= trendFactor;
    }
    
    // Adjust for supplier variability
    if (options.includeSupplierVariability) {
      const supplierFactor = this.calculateSupplierVariabilityFactor(product.leadTimeHistory);
      safetyStock *= supplierFactor;
    }
    
    return Math.ceil(safetyStock);
  }

  private async calculateSimulationSafetyStock(
    demandStats: any,
    leadTimeStats: any,
    product: Product,
    constraints: any,
  ): Promise<number> {
    const simulations = 10000;
    const results: number[] = [];
    
    for (let i = 0; i < simulations; i++) {
      // Simulate demand and lead time
      const simulatedDemand = this.simulateDemand(demandStats);
      const simulatedLeadTime = this.simulateLeadTime(leadTimeStats);
      
      // Calculate required safety stock for this simulation
      const requiredStock = Math.ceil(
        simulatedDemand * simulatedLeadTime * 
        this.getZScore(product.serviceLevel)
      );
      
      results.push(requiredStock);
    }
    
    // Return 95th percentile of simulation results
    results.sort((a, b) => a - b);
    const percentile95 = Math.ceil(results.length * 0.95);
    return results[percentile95];
  }

  private async calculateMLSafetyStock(
    demandStats: any,
    leadTimeStats: any,
    product: Product,
    options: any,
  ): Promise<number> {
    // Machine learning approach using historical patterns
    const features = this.extractFeatures(product, demandStats, leadTimeStats);
    const prediction = await this.predictSafetyStock(features);
    
    return Math.ceil(prediction);
  }

  private calculateDemandStatistics(demandHistory: DemandPoint[]): any {
    if (demandHistory.length === 0) {
      return {
        mean: 0,
        standardDeviation: 0,
        coefficientOfVariation: 0,
        skewness: 0,
        kurtosis: 0,
      };
    }
    
    const demands = demandHistory.map(d => d.demand);
    const mean = demands.reduce((sum, d) => sum + d, 0) / demands.length;
    const variance = demands.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / demands.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    
    // Calculate skewness
    const skewness = this.calculateSkewness(demands, mean, standardDeviation);
    
    // Calculate kurtosis
    const kurtosis = this.calculateKurtosis(demands, mean, standardDeviation);
    
    return {
      mean,
      standardDeviation,
      coefficientOfVariation,
      skewness,
      kurtosis,
    };
  }

  private calculateLeadTimeStatistics(leadTimeHistory: LeadTimePoint[]): any {
    if (leadTimeHistory.length === 0) {
      return {
        mean: 0,
        standardDeviation: 0,
        coefficientOfVariation: 0,
        min: 0,
        max: 0,
      };
    }
    
    const leadTimes = leadTimeHistory.map(l => l.leadTime);
    const mean = leadTimes.reduce((sum, l) => sum + l, 0) / leadTimes.length;
    const variance = leadTimes.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / leadTimes.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 0;
    
    return {
      mean,
      standardDeviation,
      coefficientOfVariation,
      min: Math.min(...leadTimes),
      max: Math.max(...leadTimes),
    };
  }

  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    
    const n = values.length;
    const skewness = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 3);
    }, 0) / n;
    
    return skewness;
  }

  private calculateKurtosis(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    
    const n = values.length;
    const kurtosis = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 4);
    }, 0) / n - 3; // Excess kurtosis
    
    return kurtosis;
  }

  private getZScore(serviceLevel: number): number {
    // Common z-scores for service levels
    const zScores: { [key: number]: number } = {
      0.5: 0.0,
      0.6: 0.25,
      0.7: 0.52,
      0.8: 0.84,
      0.85: 1.04,
      0.9: 1.28,
      0.95: 1.65,
      0.96: 1.75,
      0.97: 1.88,
      0.98: 2.05,
      0.99: 2.33,
      0.995: 2.58,
      0.999: 3.09,
    };
    
    return zScores[serviceLevel] || 1.65; // Default to 95% service level
  }

  private calculateEOQ(product: Product, annualDemand: number): number {
    const orderingCost = 100; // Fixed ordering cost
    const holdingCostRate = 0.25; // 25% annual holding cost
    const holdingCost = product.unitCost * holdingCostRate;
    
    return Math.ceil(Math.sqrt((2 * annualDemand * orderingCost) / holdingCost));
  }

  private calculateExpectedStockouts(demandStats: any, leadTimeStats: any, safetyStock: number): number {
    // Simplified calculation
    const meanDemand = demandStats.mean;
    const meanLeadTime = leadTimeStats.mean;
    const stdDevDemand = demandStats.standardDeviation;
    
    const reorderPoint = meanDemand * meanLeadTime + safetyStock;
    const stockoutProbability = this.calculateStockoutProbability(reorderPoint, meanDemand, stdDevDemand);
    
    return stockoutProbability * meanDemand;
  }

  private calculateStockoutProbability(reorderPoint: number, meanDemand: number, stdDevDemand: number): number {
    // Simplified normal distribution calculation
    const z = (reorderPoint - meanDemand) / stdDevDemand;
    return Math.max(0, 1 - this.normalCDF(z));
  }

  private normalCDF(z: number): number {
    // Approximation of normal CDF
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }

  private calculateStockoutCost(product: Product, meanDemand: number): number {
    // Stockout cost calculation
    const stockoutCostPerUnit = product.unitCost * 0.1; // 10% of unit cost
    return meanDemand * stockoutCostPerUnit;
  }

  private calculateServiceLevel(demandStats: any, leadTimeStats: any, safetyStock: number): number {
    // Calculate service level based on safety stock
    const reorderPoint = demandStats.mean * leadTimeStats.mean + safetyStock;
    const stockoutProbability = this.calculateStockoutProbability(reorderPoint, demandStats.mean, demandStats.standardDeviation);
    
    return Math.max(0, Math.min(1, 1 - stockoutProbability));
  }

  private calculateSeasonalityFactor(demandHistory: DemandPoint[]): number {
    if (demandHistory.length < 12) return 1.0;
    
    // Calculate seasonal variation
    const monthlyDemands = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);
    
    for (const point of demandHistory) {
      const month = point.date.getMonth();
      monthlyDemands[month] += point.demand;
      monthlyCounts[month]++;
    }
    
    // Calculate average demand per month
    const avgDemand = monthlyDemands.reduce((sum, d) => sum + d, 0) / 12;
    
    // Calculate seasonal factors
    const seasonalFactors = monthlyDemands.map((demand, month) => {
      const count = monthlyCounts[month];
      return count > 0 ? demand / count / avgDemand : 1.0;
    });
    
    // Return maximum seasonal factor
    return Math.max(...seasonalFactors);
  }

  private calculateTrendFactor(demandHistory: DemandPoint[]): number {
    if (demandHistory.length < 2) return 1.0;
    
    // Calculate trend using linear regression
    const n = demandHistory.length;
    const x = demandHistory.map((_, i) => i);
    const y = demandHistory.map(d => d.demand);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Return trend factor (1 + slope percentage)
    return 1 + slope * 0.1; // Scale down the trend impact
  }

  private calculateSupplierVariabilityFactor(leadTimeHistory: LeadTimePoint[]): number {
    if (leadTimeHistory.length < 2) return 1.0;
    
    const leadTimes = leadTimeHistory.map(l => l.leadTime);
    const mean = leadTimes.reduce((sum, l) => sum + l, 0) / leadTimes.length;
    const variance = leadTimes.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / leadTimes.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Higher variability increases safety stock
    return 1 + coefficientOfVariation * 0.5;
  }

  private simulateDemand(demandStats: any): number {
    // Generate random demand using normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return Math.max(0, demandStats.mean + demandStats.standardDeviation * z0);
  }

  private simulateLeadTime(leadTimeStats: any): number {
    // Generate random lead time using normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    return Math.max(1, Math.round(leadTimeStats.mean + leadTimeStats.standardDeviation * z0));
  }

  private extractFeatures(product: Product, demandStats: any, leadTimeStats: any): number[] {
    return [
      demandStats.mean,
      demandStats.standardDeviation,
      demandStats.coefficientOfVariation,
      leadTimeStats.mean,
      leadTimeStats.standardDeviation,
      product.unitCost,
      product.serviceLevel,
      product.criticality === 'critical' ? 1 : 0,
    ];
  }

  private async predictSafetyStock(features: number[]): Promise<number> {
    // Simplified ML prediction (would use actual ML model in production)
    const weights = [0.3, 0.2, 0.1, 0.2, 0.1, 0.05, 0.03, 0.02];
    const prediction = features.reduce((sum, feature, i) => sum + feature * weights[i], 0);
    
    return Math.max(0, prediction);
  }

  private generateRecommendations(
    product: Product,
    demandStats: any,
    leadTimeStats: any,
    safetyStock: number,
  ): string[] {
    const recommendations: string[] = [];
    
    if (demandStats.coefficientOfVariation > 0.5) {
      recommendations.push('High demand variability - consider demand forecasting');
    }
    
    if (leadTimeStats.coefficientOfVariation > 0.3) {
      recommendations.push('High lead time variability - work with suppliers to reduce variability');
    }
    
    if (product.criticality === 'critical') {
      recommendations.push('Critical item - consider higher safety stock or alternative suppliers');
    }
    
    if (safetyStock > demandStats.mean * 2) {
      recommendations.push('High safety stock - consider reducing lead time or improving demand forecasting');
    }
    
    return recommendations;
  }

  private calculateImprovement(
    current: SafetyStockCalculation,
    optimized: SafetyStockCalculation,
  ): any {
    const safetyStockReduction = current.safetyStock - optimized.safetyStock;
    const costReduction = (current.holdingCost - optimized.holdingCost) * 12; // Annual
    const serviceLevelImprovement = optimized.serviceLevel - current.serviceLevel;
    
    return {
      safetyStockReduction,
      costReduction,
      serviceLevelImprovement,
    };
  }

  private generateImplementationPlan(product: Product, improvement: any): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    if (improvement.safetyStockReduction > 0) {
      immediate.push(`Reduce safety stock by ${improvement.safetyStockReduction} units`);
      immediate.push('Update reorder point in system');
    }
    
    if (improvement.costReduction > 0) {
      shortTerm.push(`Implement cost reduction measures (${improvement.costReduction.toFixed(2)} TL annual savings)`);
    }
    
    if (improvement.serviceLevelImprovement > 0) {
      shortTerm.push(`Improve service level by ${(improvement.serviceLevelImprovement * 100).toFixed(1)}%`);
    }
    
    longTerm.push('Implement automated demand forecasting');
    longTerm.push('Establish supplier partnerships for better lead times');
    longTerm.push('Develop risk management strategies');
    
    return {
      immediate,
      shortTerm,
      longTerm,
    };
  }

  private generateSummary(results: OptimizationResult[]): any {
    const highImpact = results.filter(r => r.improvement.costReduction > 1000).length;
    const mediumImpact = results.filter(r => r.improvement.costReduction > 500 && r.improvement.costReduction <= 1000).length;
    const lowImpact = results.filter(r => r.improvement.costReduction > 0 && r.improvement.costReduction <= 500).length;
    const noChange = results.filter(r => r.improvement.costReduction <= 0).length;
    
    return {
      highImpact,
      mediumImpact,
      lowImpact,
      noChange,
    };
  }

  private async saveOptimizationResult(result: BatchOptimizationResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO safety_stock_optimization_results 
        (total_products, optimized_products, total_cost_savings, average_service_level_improvement,
         high_impact, medium_impact, low_impact, no_change, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        result.totalProducts,
        result.optimizedProducts,
        result.totalCostSavings,
        result.averageServiceLevelImprovement,
        result.summary.highImpact,
        result.summary.mediumImpact,
        result.summary.lowImpact,
        result.summary.noChange,
      ]);
    } catch (error) {
      this.logger.error('Failed to save safety stock optimization result:', error);
    }
  }
}

