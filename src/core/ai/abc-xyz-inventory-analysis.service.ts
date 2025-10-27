import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { inventory, inventoryMovements } from '../../database/schema/shared/wms.schema';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitCost: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  leadTime: number; // days
  supplier: string;
  location: string;
  lastMovement: Date;
  movements: Movement[];
}

interface Movement {
  date: Date;
  type: 'in' | 'out';
  quantity: number;
  value: number;
  reason: string;
}

interface ABCClassification {
  itemId: string;
  sku: string;
  annualValue: number;
  annualQuantity: number;
  percentageOfTotalValue: number;
  percentageOfTotalQuantity: number;
  cumulativeValuePercentage: number;
  cumulativeQuantityPercentage: number;
  classification: 'A' | 'B' | 'C';
  recommendedCycleCountFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
  recommendedOrderFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  priority: 'high' | 'medium' | 'low';
}

interface XYZClassification {
  itemId: string;
  sku: string;
  demandVariability: number; // coefficient of variation
  demandPattern: 'stable' | 'variable' | 'erratic';
  forecastability: 'high' | 'medium' | 'low';
  safetyStockMultiplier: number;
  recommendedForecastingMethod: 'moving_average' | 'exponential_smoothing' | 'seasonal' | 'trend';
  confidence: number;
}

interface CombinedABCXYZAnalysis {
  itemId: string;
  sku: string;
  abcClassification: ABCClassification;
  xyzClassification: XYZClassification;
  combinedCategory: string; // AX, AY, AZ, BX, BY, BZ, CX, CY, CZ
  managementStrategy: string;
  recommendedActions: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface AnalysisResult {
  totalItems: number;
  totalValue: number;
  totalQuantity: number;
  abcAnalysis: ABCClassification[];
  xyzAnalysis: XYZClassification[];
  combinedAnalysis: CombinedABCXYZAnalysis[];
  summary: {
    aItems: number;
    bItems: number;
    cItems: number;
    xItems: number;
    yItems: number;
    zItems: number;
    criticalItems: number;
    highRiskItems: number;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  costSavings: {
    potential: number;
    achievable: number;
    timeframe: string;
  };
}

@Injectable()
export class ABCXYZInventoryAnalysisService {
  private readonly logger = new Logger(ABCXYZInventoryAnalysisService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async performABCXYZAnalysis(
    tenantId: string,
    analysisPeriod: { start: Date; end: Date },
    options: {
      abcThresholds?: { a: number; b: number }; // percentage thresholds
      xyzThresholds?: { x: number; y: number }; // coefficient of variation thresholds
      includeZeroMovement?: boolean;
      minimumMovements?: number;
    } = {},
  ): Promise<AnalysisResult> {
    this.logger.log(`Performing ABC-XYZ analysis for tenant ${tenantId}`);

    // Get inventory items with movements
    const items = await this.getInventoryItemsWithMovements(tenantId, analysisPeriod, options);
    
    // Perform ABC analysis
    const abcAnalysis = await this.performABCAnalysis(items, options.abcThresholds);
    
    // Perform XYZ analysis
    const xyzAnalysis = await this.performXYZAnalysis(items, analysisPeriod, options.xyzThresholds);
    
    // Combine ABC and XYZ analyses
    const combinedAnalysis = this.combineABCXYZAnalysis(abcAnalysis, xyzAnalysis);
    
    // Generate summary and recommendations
    const summary = this.generateSummary(abcAnalysis, xyzAnalysis, combinedAnalysis);
    const recommendations = this.generateRecommendations(combinedAnalysis);
    const costSavings = this.calculatePotentialSavings(combinedAnalysis);
    
    const result: AnalysisResult = {
      totalItems: items.length,
      totalValue: items.reduce((sum, item) => sum + item.annualValue, 0),
      totalQuantity: items.reduce((sum, item) => sum + item.annualQuantity, 0),
      abcAnalysis,
      xyzAnalysis,
      combinedAnalysis,
      summary,
      recommendations,
      costSavings,
    };

    await this.saveAnalysisResult(tenantId, result);
    await this.eventBus.emit('inventory.analyzed', { tenantId, result });

    return result;
  }

  private async getInventoryItemsWithMovements(
    tenantId: string,
    period: { start: Date; end: Date },
    options: any,
  ): Promise<InventoryItem[]> {
    // Query inventory items with their movements from database
    const items = await this.db
      .select({
        id: inventory.id,
        sku: inventory.sku,
        name: inventory.name,
        category: inventory.category,
        unitCost: inventory.unitCost,
        currentStock: inventory.currentStock,
        minStock: inventory.minStock,
        maxStock: inventory.maxStock,
        leadTime: inventory.leadTime,
        supplier: inventory.supplier,
        location: inventory.location,
        lastMovement: inventory.lastMovement,
      })
      .from(inventory)
      .where(eq(inventory.tenantId, tenantId));

    // Get movements for each item
    const itemsWithMovements = await Promise.all(
      items.map(async (item) => {
        const movements = await this.db
          .select()
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.inventoryId, item.id),
              gte(inventoryMovements.date, period.start),
              lte(inventoryMovements.date, period.end)
            )
          )
          .orderBy(desc(inventoryMovements.date));

        // Calculate annual values
        const annualValue = movements.reduce((sum, m) => sum + m.value, 0);
        const annualQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);

        return {
          ...item,
          movements: movements.map(m => ({
            date: m.date,
            type: m.type,
            quantity: m.quantity,
            value: m.value,
            reason: m.reason,
          })),
          annualValue,
          annualQuantity,
        };
      })
    );

    return itemsWithMovements;
  }

  private generateMockMovements(period: { start: Date; end: Date }): Movement[] {
    const movements: Movement[] = [];
    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(period.start.getTime() + i * 24 * 60 * 60 * 1000);
      if (Math.random() > 0.7) { // 30% chance of movement per day
        movements.push({
          date,
          type: Math.random() > 0.5 ? 'in' : 'out',
          quantity: Math.floor(Math.random() * 10) + 1,
          value: Math.floor(Math.random() * 1000) + 100,
          reason: 'Regular movement',
        });
      }
    }
    
    return movements;
  }

  private async performABCAnalysis(
    items: InventoryItem[],
    thresholds?: { a: number; b: number },
  ): Promise<ABCClassification[]> {
    const defaultThresholds = { a: 80, b: 95 };
    const { a: aThreshold, b: bThreshold } = thresholds || defaultThresholds;
    
    // Calculate annual values and sort by value
    const itemsWithValues = items.map(item => ({
      ...item,
      annualValue: item.unitCost * item.annualQuantity,
    }));
    
    itemsWithValues.sort((a, b) => b.annualValue - a.annualValue);
    
    const totalValue = itemsWithValues.reduce((sum, item) => sum + item.annualValue, 0);
    const totalQuantity = itemsWithValues.reduce((sum, item) => sum + item.annualQuantity, 0);
    
    const classifications: ABCClassification[] = [];
    let cumulativeValue = 0;
    let cumulativeQuantity = 0;
    
    for (let i = 0; i < itemsWithValues.length; i++) {
      const item = itemsWithValues[i];
      cumulativeValue += item.annualValue;
      cumulativeQuantity += item.annualQuantity;
      
      const valuePercentage = (item.annualValue / totalValue) * 100;
      const quantityPercentage = (item.annualQuantity / totalQuantity) * 100;
      const cumulativeValuePercentage = (cumulativeValue / totalValue) * 100;
      const cumulativeQuantityPercentage = (cumulativeQuantity / totalQuantity) * 100;
      
      let classification: 'A' | 'B' | 'C';
      let recommendedCycleCountFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually';
      let recommendedOrderFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
      let priority: 'high' | 'medium' | 'low';
      
      if (cumulativeValuePercentage <= aThreshold) {
        classification = 'A';
        recommendedCycleCountFrequency = 'weekly';
        recommendedOrderFrequency = 'daily';
        priority = 'high';
      } else if (cumulativeValuePercentage <= bThreshold) {
        classification = 'B';
        recommendedCycleCountFrequency = 'monthly';
        recommendedOrderFrequency = 'weekly';
        priority = 'medium';
      } else {
        classification = 'C';
        recommendedCycleCountFrequency = 'quarterly';
        recommendedOrderFrequency = 'monthly';
        priority = 'low';
      }
      
      classifications.push({
        itemId: item.id,
        sku: item.sku,
        annualValue: item.annualValue,
        annualQuantity: item.annualQuantity,
        percentageOfTotalValue: valuePercentage,
        percentageOfTotalQuantity: quantityPercentage,
        cumulativeValuePercentage,
        cumulativeQuantityPercentage,
        classification,
        recommendedCycleCountFrequency,
        recommendedOrderFrequency,
        priority,
      });
    }
    
    return classifications;
  }

  private async performXYZAnalysis(
    items: InventoryItem[],
    period: { start: Date; end: Date },
    thresholds?: { x: number; y: number },
  ): Promise<XYZClassification[]> {
    const defaultThresholds = { x: 0.25, y: 0.5 };
    const { x: xThreshold, y: yThreshold } = thresholds || defaultThresholds;
    
    const classifications: XYZClassification[] = [];
    
    for (const item of items) {
      // Calculate demand variability
      const demandVariability = this.calculateDemandVariability(item.movements, period);
      
      let demandPattern: 'stable' | 'variable' | 'erratic';
      let forecastability: 'high' | 'medium' | 'low';
      let safetyStockMultiplier: number;
      let recommendedForecastingMethod: 'moving_average' | 'exponential_smoothing' | 'seasonal' | 'trend';
      let confidence: number;
      
      if (demandVariability <= xThreshold) {
        demandPattern = 'stable';
        forecastability = 'high';
        safetyStockMultiplier = 1.0;
        recommendedForecastingMethod = 'moving_average';
        confidence = 0.9;
      } else if (demandVariability <= yThreshold) {
        demandPattern = 'variable';
        forecastability = 'medium';
        safetyStockMultiplier = 1.5;
        recommendedForecastingMethod = 'exponential_smoothing';
        confidence = 0.7;
      } else {
        demandPattern = 'erratic';
        forecastability = 'low';
        safetyStockMultiplier = 2.0;
        recommendedForecastingMethod = 'seasonal';
        confidence = 0.5;
      }
      
      classifications.push({
        itemId: item.id,
        sku: item.sku,
        demandVariability,
        demandPattern,
        forecastability,
        safetyStockMultiplier,
        recommendedForecastingMethod,
        confidence,
      });
    }
    
    return classifications;
  }

  private calculateDemandVariability(
    movements: Movement[],
    period: { start: Date; end: Date },
  ): number {
    if (movements.length === 0) return 1.0;
    
    // Calculate daily demand
    const dailyDemands = new Map<string, number>();
    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < days; i++) {
      const date = new Date(period.start.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyDemands.set(dateStr, 0);
    }
    
    // Aggregate movements by day
    for (const movement of movements) {
      if (movement.type === 'out') {
        const dateStr = movement.date.toISOString().split('T')[0];
        const current = dailyDemands.get(dateStr) || 0;
        dailyDemands.set(dateStr, current + movement.quantity);
      }
    }
    
    const demands = Array.from(dailyDemands.values());
    const mean = demands.reduce((sum, d) => sum + d, 0) / demands.length;
    const variance = demands.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / demands.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Coefficient of variation
    return mean > 0 ? standardDeviation / mean : 1.0;
  }

  private combineABCXYZAnalysis(
    abcAnalysis: ABCClassification[],
    xyzAnalysis: XYZClassification[],
  ): CombinedABCXYZAnalysis[] {
    const combined: CombinedABCXYZAnalysis[] = [];
    
    for (const abc of abcAnalysis) {
      const xyz = xyzAnalysis.find(x => x.itemId === abc.itemId);
      if (!xyz) continue;
      
      const combinedCategory = `${abc.classification}${xyz.demandPattern.charAt(0).toUpperCase()}`;
      
      let managementStrategy: string;
      let recommendedActions: string[];
      let priority: 'critical' | 'high' | 'medium' | 'low';
      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      
      // Determine management strategy based on combined category
      switch (combinedCategory) {
        case 'AX':
          managementStrategy = 'Tight control, frequent monitoring';
          recommendedActions = [
            'Daily cycle counting',
            'Just-in-time ordering',
            'High security storage',
            'Regular supplier communication',
          ];
          priority = 'critical';
          riskLevel = 'low';
          break;
          
        case 'AY':
          managementStrategy = 'Regular monitoring, moderate control';
          recommendedActions = [
            'Weekly cycle counting',
            'Regular ordering',
            'Standard security',
            'Monthly supplier review',
          ];
          priority = 'high';
          riskLevel = 'medium';
          break;
          
        case 'AZ':
          managementStrategy = 'Careful monitoring, flexible control';
          recommendedActions = [
            'Monthly cycle counting',
            'Flexible ordering',
            'Standard security',
            'Quarterly supplier review',
          ];
          priority = 'high';
          riskLevel = 'high';
          break;
          
        case 'BX':
          managementStrategy = 'Moderate control, regular monitoring';
          recommendedActions = [
            'Monthly cycle counting',
            'Regular ordering',
            'Standard security',
            'Quarterly supplier review',
          ];
          priority = 'medium';
          riskLevel = 'low';
          break;
          
        case 'BY':
          managementStrategy = 'Standard control, periodic monitoring';
          recommendedActions = [
            'Quarterly cycle counting',
            'Standard ordering',
            'Basic security',
            'Semi-annual supplier review',
          ];
          priority = 'medium';
          riskLevel = 'medium';
          break;
          
        case 'BZ':
          managementStrategy = 'Flexible control, careful monitoring';
          recommendedActions = [
            'Quarterly cycle counting',
            'Flexible ordering',
            'Basic security',
            'Annual supplier review',
          ];
          priority = 'medium';
          riskLevel = 'high';
          break;
          
        case 'CX':
          managementStrategy = 'Basic control, minimal monitoring';
          recommendedActions = [
            'Annual cycle counting',
            'Bulk ordering',
            'Basic security',
            'Annual supplier review',
          ];
          priority = 'low';
          riskLevel = 'low';
          break;
          
        case 'CY':
          managementStrategy = 'Minimal control, basic monitoring';
          recommendedActions = [
            'Annual cycle counting',
            'Bulk ordering',
            'Basic security',
            'Annual supplier review',
          ];
          priority = 'low';
          riskLevel = 'medium';
          break;
          
        case 'CZ':
          managementStrategy = 'Minimal control, basic monitoring';
          recommendedActions = [
            'Annual cycle counting',
            'Bulk ordering',
            'Basic security',
            'Annual supplier review',
          ];
          priority = 'low';
          riskLevel = 'high';
          break;
          
        default:
          managementStrategy = 'Standard control';
          recommendedActions = ['Regular monitoring'];
          priority = 'medium';
          riskLevel = 'medium';
      }
      
      combined.push({
        itemId: abc.itemId,
        sku: abc.sku,
        abcClassification: abc,
        xyzClassification: xyz,
        combinedCategory,
        managementStrategy,
        recommendedActions,
        priority,
        riskLevel,
      });
    }
    
    return combined;
  }

  private generateSummary(
    abcAnalysis: ABCClassification[],
    xyzAnalysis: XYZClassification[],
    combinedAnalysis: CombinedABCXYZAnalysis[],
  ): any {
    const aItems = abcAnalysis.filter(item => item.classification === 'A').length;
    const bItems = abcAnalysis.filter(item => item.classification === 'B').length;
    const cItems = abcAnalysis.filter(item => item.classification === 'C').length;
    
    const xItems = xyzAnalysis.filter(item => item.demandPattern === 'stable').length;
    const yItems = xyzAnalysis.filter(item => item.demandPattern === 'variable').length;
    const zItems = xyzAnalysis.filter(item => item.demandPattern === 'erratic').length;
    
    const criticalItems = combinedAnalysis.filter(item => item.priority === 'critical').length;
    const highRiskItems = combinedAnalysis.filter(item => item.riskLevel === 'high' || item.riskLevel === 'critical').length;
    
    return {
      aItems,
      bItems,
      cItems,
      xItems,
      yItems,
      zItems,
      criticalItems,
      highRiskItems,
    };
  }

  private generateRecommendations(combinedAnalysis: CombinedABCXYZAnalysis[]): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    // Critical items need immediate attention
    const criticalItems = combinedAnalysis.filter(item => item.priority === 'critical');
    if (criticalItems.length > 0) {
      immediate.push(`Review ${criticalItems.length} critical items (AX category)`);
      immediate.push('Implement daily cycle counting for critical items');
      immediate.push('Establish just-in-time ordering for critical items');
    }
    
    // High risk items need short-term attention
    const highRiskItems = combinedAnalysis.filter(item => item.riskLevel === 'high' || item.riskLevel === 'critical');
    if (highRiskItems.length > 0) {
      shortTerm.push(`Address ${highRiskItems.length} high-risk items`);
      shortTerm.push('Implement flexible ordering strategies for erratic demand items');
      shortTerm.push('Increase safety stock for high-risk items');
    }
    
    // Long-term improvements
    longTerm.push('Implement automated ABC-XYZ analysis');
    longTerm.push('Develop supplier partnerships for critical items');
    longTerm.push('Optimize warehouse layout based on ABC-XYZ classification');
    longTerm.push('Implement demand forecasting for all items');
    
    return {
      immediate,
      shortTerm,
      longTerm,
    };
  }

  private calculatePotentialSavings(combinedAnalysis: CombinedABCXYZAnalysis[]): any {
    // Calculate potential cost savings based on classification
    let potentialSavings = 0;
    let achievableSavings = 0;
    
    for (const item of combinedAnalysis) {
      const annualValue = item.abcClassification.annualValue;
      
      // Potential savings based on category
      let savingsRate = 0;
      switch (item.combinedCategory) {
        case 'AX':
          savingsRate = 0.05; // 5% savings through tight control
          break;
        case 'AY':
          savingsRate = 0.03; // 3% savings through regular monitoring
          break;
        case 'AZ':
          savingsRate = 0.02; // 2% savings through careful monitoring
          break;
        case 'BX':
          savingsRate = 0.02; // 2% savings through moderate control
          break;
        case 'BY':
          savingsRate = 0.01; // 1% savings through standard control
          break;
        case 'BZ':
          savingsRate = 0.01; // 1% savings through flexible control
          break;
        case 'CX':
        case 'CY':
        case 'CZ':
          savingsRate = 0.005; // 0.5% savings through basic control
          break;
      }
      
      potentialSavings += annualValue * savingsRate;
      achievableSavings += annualValue * savingsRate * 0.7; // 70% achievable
    }
    
    return {
      potential: Math.round(potentialSavings),
      achievable: Math.round(achievableSavings),
      timeframe: '12 months',
    };
  }

  private async saveAnalysisResult(tenantId: string, result: AnalysisResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO abc_xyz_analysis_results 
        (tenant_id, total_items, total_value, total_quantity, a_items, b_items, c_items, 
         x_items, y_items, z_items, critical_items, high_risk_items, potential_savings, 
         achievable_savings, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      `, [
        tenantId,
        result.totalItems,
        result.totalValue,
        result.totalQuantity,
        result.summary.aItems,
        result.summary.bItems,
        result.summary.cItems,
        result.summary.xItems,
        result.summary.yItems,
        result.summary.zItems,
        result.summary.criticalItems,
        result.summary.highRiskItems,
        result.costSavings.potential,
        result.costSavings.achievable,
      ]);
    } catch (error) {
      this.logger.error('Failed to save ABC-XYZ analysis result:', error);
    }
  }
}

