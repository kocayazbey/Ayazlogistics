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
  movements: Movement[];
  lastMovement: Date;
  totalValue: number;
}

interface Movement {
  date: Date;
  type: 'in' | 'out';
  quantity: number;
  value: number;
  reason: string;
  customer?: string;
}

interface SlowMovingItem {
  itemId: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  totalValue: number;
  lastMovementDate: Date;
  daysSinceLastMovement: number;
  movementFrequency: number; // movements per month
  averageMovementValue: number;
  trend: 'declining' | 'stable' | 'increasing' | 'erratic';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  potentialActions: Action[];
}

interface Action {
  type: 'discount' | 'promotion' | 'bundle' | 'liquidate' | 'return' | 'donate' | 'dispose';
  description: string;
  potentialSavings: number;
  implementationCost: number;
  roi: number;
  timeframe: 'immediate' | 'short_term' | 'long_term';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface DetectionResult {
  totalItems: number;
  slowMovingItems: SlowMovingItem[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  totalValueAtRisk: number;
  potentialSavings: number;
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

interface DetectionCriteria {
  daysSinceLastMovement: number;
  movementFrequency: number; // movements per month
  stockTurnover: number; // annual
  valueThreshold: number;
  categoryExclusions: string[];
  includeSeasonalItems: boolean;
}

@Injectable()
export class SlowMovingItemDetectionService {
  private readonly logger = new Logger(SlowMovingItemDetectionService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async detectSlowMovingItems(
    tenantId: string,
    criteria: DetectionCriteria,
    analysisPeriod: { start: Date; end: Date },
  ): Promise<DetectionResult> {
    this.logger.log(`Detecting slow moving items for tenant ${tenantId}`);

    // Get inventory items with movements
    const items = await this.getInventoryItemsWithMovements(tenantId, analysisPeriod);
    
    // Filter out excluded categories
    const filteredItems = items.filter(item => 
      !criteria.categoryExclusions.includes(item.category)
    );
    
    // Detect slow moving items
    const slowMovingItems: SlowMovingItem[] = [];
    
    for (const item of filteredItems) {
      const analysis = this.analyzeItemMovement(item, criteria, analysisPeriod);
      
      if (this.isSlowMoving(analysis, criteria)) {
        const slowMovingItem = this.createSlowMovingItem(item, analysis);
        slowMovingItems.push(slowMovingItem);
      }
    }
    
    // Sort by risk level and value
    slowMovingItems.sort((a, b) => {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
      return b.totalValue - a.totalValue;
    });
    
    // Generate summary and recommendations
    const summary = this.generateSummary(slowMovingItems);
    const totalValueAtRisk = slowMovingItems.reduce((sum, item) => sum + item.totalValue, 0);
    const potentialSavings = this.calculatePotentialSavings(slowMovingItems);
    const recommendations = this.generateRecommendations(slowMovingItems);
    
    const result: DetectionResult = {
      totalItems: filteredItems.length,
      slowMovingItems,
      summary,
      totalValueAtRisk,
      potentialSavings,
      recommendations,
    };

    await this.saveDetectionResult(tenantId, result);
    await this.eventBus.emit('slow.moving.items.detected', { tenantId, result });

    return result;
  }

  private async getInventoryItemsWithMovements(
    tenantId: string,
    period: { start: Date; end: Date },
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
        totalValue: inventory.totalValue,
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

        return {
          ...item,
          movements: movements.map(m => ({
            date: m.date,
            type: m.type,
            quantity: m.quantity,
            value: m.value,
            reason: m.reason,
            customer: m.customer,
          })),
        };
      })
    );

    return itemsWithMovements;
  }

  private generateMockMovements(
    period: { start: Date; end: Date },
    type: 'fast' | 'slow' | 'dead',
  ): Movement[] {
    const movements: Movement[] = [];
    const days = Math.ceil((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24));
    
    let movementFrequency: number;
    switch (type) {
      case 'fast':
        movementFrequency = 0.8; // 80% chance per day
        break;
      case 'slow':
        movementFrequency = 0.1; // 10% chance per day
        break;
      case 'dead':
        movementFrequency = 0.02; // 2% chance per day
        break;
    }
    
    for (let i = 0; i < days; i++) {
      if (Math.random() < movementFrequency) {
        const date = new Date(period.start.getTime() + i * 24 * 60 * 60 * 1000);
        movements.push({
          date,
          type: Math.random() > 0.5 ? 'in' : 'out',
          quantity: Math.floor(Math.random() * 5) + 1,
          value: Math.floor(Math.random() * 1000) + 100,
          reason: 'Regular movement',
          customer: `Customer ${Math.floor(Math.random() * 100)}`,
        });
      }
    }
    
    return movements;
  }

  private analyzeItemMovement(
    item: InventoryItem,
    criteria: DetectionCriteria,
    period: { start: Date; end: Date },
  ): any {
    const movements = item.movements.filter(m => 
      m.date >= period.start && m.date <= period.end
    );
    
    const daysSinceLastMovement = Math.floor(
      (Date.now() - item.lastMovement.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const movementFrequency = movements.length / ((period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24 * 30)); // per month
    
    const stockTurnover = this.calculateStockTurnover(item, movements, period);
    
    const trend = this.calculateTrend(movements);
    
    const averageMovementValue = movements.length > 0 
      ? movements.reduce((sum, m) => sum + m.value, 0) / movements.length 
      : 0;
    
    return {
      daysSinceLastMovement,
      movementFrequency,
      stockTurnover,
      trend,
      averageMovementValue,
      totalMovements: movements.length,
    };
  }

  private calculateStockTurnover(
    item: InventoryItem,
    movements: Movement[],
    period: { start: Date; end: Date },
  ): number {
    const outMovements = movements.filter(m => m.type === 'out');
    const totalOutQuantity = outMovements.reduce((sum, m) => sum + m.quantity, 0);
    
    const averageStock = item.currentStock; // Simplified
    const daysInPeriod = (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24);
    const annualizedOutQuantity = (totalOutQuantity / daysInPeriod) * 365;
    
    return averageStock > 0 ? annualizedOutQuantity / averageStock : 0;
  }

  private calculateTrend(movements: Movement[]): 'declining' | 'stable' | 'increasing' | 'erratic' {
    if (movements.length < 3) return 'stable';
    
    // Calculate trend using linear regression
    const n = movements.length;
    const x = movements.map((_, i) => i);
    const y = movements.map(m => m.quantity);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate R-squared for trend confidence
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssResidual = y.reduce((sum, val, i) => {
      const predicted = slope * i + (sumY - slope * sumX) / n;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (ssResidual / ssTotal);
    
    if (rSquared < 0.3) return 'erratic';
    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'declining';
    return 'stable';
  }

  private isSlowMoving(analysis: any, criteria: DetectionCriteria): boolean {
    return (
      analysis.daysSinceLastMovement >= criteria.daysSinceLastMovement ||
      analysis.movementFrequency <= criteria.movementFrequency ||
      analysis.stockTurnover <= criteria.stockTurnover
    );
  }

  private createSlowMovingItem(item: InventoryItem, analysis: any): SlowMovingItem {
    const riskLevel = this.calculateRiskLevel(item, analysis);
    const recommendations = this.generateItemRecommendations(item, analysis, riskLevel);
    const potentialActions = this.generatePotentialActions(item, analysis, riskLevel);
    
    return {
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      currentStock: item.currentStock,
      totalValue: item.totalValue,
      lastMovementDate: item.lastMovement,
      daysSinceLastMovement: analysis.daysSinceLastMovement,
      movementFrequency: analysis.movementFrequency,
      averageMovementValue: analysis.averageMovementValue,
      trend: analysis.trend,
      riskLevel,
      recommendations,
      potentialActions,
    };
  }

  private calculateRiskLevel(item: InventoryItem, analysis: any): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;
    
    // Days since last movement
    if (analysis.daysSinceLastMovement > 365) riskScore += 4;
    else if (analysis.daysSinceLastMovement > 180) riskScore += 3;
    else if (analysis.daysSinceLastMovement > 90) riskScore += 2;
    else if (analysis.daysSinceLastMovement > 30) riskScore += 1;
    
    // Movement frequency
    if (analysis.movementFrequency < 0.1) riskScore += 3;
    else if (analysis.movementFrequency < 0.5) riskScore += 2;
    else if (analysis.movementFrequency < 1.0) riskScore += 1;
    
    // Stock turnover
    if (analysis.stockTurnover < 0.5) riskScore += 3;
    else if (analysis.stockTurnover < 1.0) riskScore += 2;
    else if (analysis.stockTurnover < 2.0) riskScore += 1;
    
    // Total value
    if (item.totalValue > 100000) riskScore += 2;
    else if (item.totalValue > 50000) riskScore += 1;
    
    // Trend
    if (analysis.trend === 'declining') riskScore += 2;
    else if (analysis.trend === 'erratic') riskScore += 1;
    
    if (riskScore >= 8) return 'critical';
    if (riskScore >= 6) return 'high';
    if (riskScore >= 4) return 'medium';
    return 'low';
  }

  private generateItemRecommendations(
    item: InventoryItem,
    analysis: any,
    riskLevel: string,
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'critical') {
      recommendations.push('Immediate action required - consider liquidation');
      recommendations.push('Review supplier relationship and lead times');
      recommendations.push('Consider returning excess stock to supplier');
    } else if (riskLevel === 'high') {
      recommendations.push('Create promotional campaign');
      recommendations.push('Bundle with fast-moving items');
      recommendations.push('Review pricing strategy');
    } else if (riskLevel === 'medium') {
      recommendations.push('Monitor closely for further deterioration');
      recommendations.push('Consider seasonal promotions');
      recommendations.push('Review demand forecasting');
    } else {
      recommendations.push('Continue monitoring');
      recommendations.push('Review ordering patterns');
    }
    
    if (analysis.trend === 'declining') {
      recommendations.push('Demand is declining - consider phase-out strategy');
    }
    
    if (analysis.daysSinceLastMovement > 180) {
      recommendations.push('No movement for extended period - investigate causes');
    }
    
    return recommendations;
  }

  private generatePotentialActions(
    item: InventoryItem,
    analysis: any,
    riskLevel: string,
  ): Action[] {
    const actions: Action[] = [];
    
    // Discount action
    if (riskLevel === 'critical' || riskLevel === 'high') {
      actions.push({
        type: 'discount',
        description: `Apply ${riskLevel === 'critical' ? '50%' : '25%'} discount to clear stock`,
        potentialSavings: item.totalValue * (riskLevel === 'critical' ? 0.5 : 0.25),
        implementationCost: 0,
        roi: 999, // Immediate return
        timeframe: 'immediate',
        difficulty: 'easy',
      });
    }
    
    // Promotion action
    if (riskLevel === 'high' || riskLevel === 'medium') {
      actions.push({
        type: 'promotion',
        description: 'Create promotional campaign',
        potentialSavings: item.totalValue * 0.3,
        implementationCost: 1000,
        roi: 2.0,
        timeframe: 'short_term',
        difficulty: 'medium',
      });
    }
    
    // Bundle action
    if (riskLevel === 'medium') {
      actions.push({
        type: 'bundle',
        description: 'Bundle with complementary products',
        potentialSavings: item.totalValue * 0.2,
        implementationCost: 500,
        roi: 1.5,
        timeframe: 'short_term',
        difficulty: 'medium',
      });
    }
    
    // Liquidate action
    if (riskLevel === 'critical') {
      actions.push({
        type: 'liquidate',
        description: 'Liquidate through auction or bulk sale',
        potentialSavings: item.totalValue * 0.3,
        implementationCost: 2000,
        roi: 1.0,
        timeframe: 'immediate',
        difficulty: 'hard',
      });
    }
    
    // Return action
    if (analysis.daysSinceLastMovement > 365) {
      actions.push({
        type: 'return',
        description: 'Return to supplier if possible',
        potentialSavings: item.totalValue * 0.8,
        implementationCost: 500,
        roi: 3.0,
        timeframe: 'short_term',
        difficulty: 'medium',
      });
    }
    
    // Donate action
    if (item.unitCost < 100 && riskLevel === 'critical') {
      actions.push({
        type: 'donate',
        description: 'Donate to charity for tax benefits',
        potentialSavings: item.totalValue * 0.1, // Tax benefit
        implementationCost: 200,
        roi: 0.5,
        timeframe: 'long_term',
        difficulty: 'easy',
      });
    }
    
    // Dispose action
    if (riskLevel === 'critical' && item.unitCost < 50) {
      actions.push({
        type: 'dispose',
        description: 'Dispose of obsolete or damaged items',
        potentialSavings: item.totalValue * 0.1, // Storage cost savings
        implementationCost: 100,
        roi: 0.2,
        timeframe: 'immediate',
        difficulty: 'easy',
      });
    }
    
    return actions;
  }

  private generateSummary(slowMovingItems: SlowMovingItem[]): any {
    const critical = slowMovingItems.filter(item => item.riskLevel === 'critical').length;
    const high = slowMovingItems.filter(item => item.riskLevel === 'high').length;
    const medium = slowMovingItems.filter(item => item.riskLevel === 'medium').length;
    const low = slowMovingItems.filter(item => item.riskLevel === 'low').length;
    
    return { critical, high, medium, low };
  }

  private calculatePotentialSavings(slowMovingItems: SlowMovingItem[]): number {
    return slowMovingItems.reduce((sum, item) => {
      const bestAction = item.potentialActions.reduce((best, action) => 
        action.potentialSavings > best.potentialSavings ? action : best
      );
      return sum + bestAction.potentialSavings;
    }, 0);
  }

  private generateRecommendations(slowMovingItems: SlowMovingItem[]): any {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    const criticalItems = slowMovingItems.filter(item => item.riskLevel === 'critical');
    const highRiskItems = slowMovingItems.filter(item => item.riskLevel === 'high');
    
    if (criticalItems.length > 0) {
      immediate.push(`Address ${criticalItems.length} critical slow-moving items immediately`);
      immediate.push('Implement liquidation strategy for critical items');
      immediate.push('Review supplier contracts for return policies');
    }
    
    if (highRiskItems.length > 0) {
      shortTerm.push(`Create promotional campaigns for ${highRiskItems.length} high-risk items`);
      shortTerm.push('Develop bundling strategies for slow-moving items');
      shortTerm.push('Review pricing strategies for high-risk items');
    }
    
    longTerm.push('Implement automated slow-moving item detection');
    longTerm.push('Develop demand forecasting for all items');
    longTerm.push('Establish supplier partnerships for better return policies');
    longTerm.push('Create inventory optimization dashboard');
    
    return { immediate, shortTerm, longTerm };
  }

  private async saveDetectionResult(tenantId: string, result: DetectionResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO slow_moving_item_detection_results 
        (tenant_id, total_items, slow_moving_items, critical_items, high_risk_items, 
         medium_risk_items, low_risk_items, total_value_at_risk, potential_savings, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        tenantId,
        result.totalItems,
        result.slowMovingItems.length,
        result.summary.critical,
        result.summary.high,
        result.summary.medium,
        result.summary.low,
        result.totalValueAtRisk,
        result.potentialSavings,
      ]);
    } catch (error) {
      this.logger.error('Failed to save slow moving item detection result:', error);
    }
  }
}

