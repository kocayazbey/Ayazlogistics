// =====================================================================================
// AYAZLOGISTICS - SLOTTING OPTIMIZATION SERVICE
// =====================================================================================
// Description: Advanced warehouse slotting optimization for maximum efficiency
// Features: ABC-based slotting, velocity analysis, space optimization, seasonal adjustments
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, inArray } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { warehouseLocations } from '../../../../database/schema/shared/wms.schema';

// =====================================================================================
// INTERFACES
// =====================================================================================

interface Product {
  id: string;
  sku: string;
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
    weight: number;
    cube: number;
  };
  category: string;
  velocity: 'high' | 'medium' | 'low' | 'dead';
  abcClass: 'A' | 'B' | 'C';
  averageDailyDemand: number;
  pickFrequency: number;
  seasonality?: {
    peakMonths: number[];
    seasonalityIndex: number;
  };
  storageRequirements?: {
    temperature?: 'ambient' | 'refrigerated' | 'frozen';
    hazmat?: boolean;
    fragile?: boolean;
    stackable?: boolean;
    maxStackHeight?: number;
  };
}

interface StorageLocation {
  id: string;
  locationCode: string;
  zone: string;
  aisle: string;
  bay: string;
  level: string;
  position: string;
  coordinates: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    length: number;
    width: number;
    height: number;
    capacity: number;
  };
  type: 'pick_face' | 'reserve' | 'bulk' | 'forward' | 'overstock';
  characteristics: {
    accessibility: 'high' | 'medium' | 'low';
    pickability: number;
    distanceFromDock: number;
    distanceFromPacking: number;
    ergonomicLevel: 'golden' | 'standard' | 'difficult';
  };
  restrictions?: {
    temperature?: string;
    hazmatOnly?: boolean;
    maxWeight?: number;
  };
  currentOccupancy: number;
  currentProduct?: string;
}

interface SlottingRecommendation {
  productId: string;
  productSku: string;
  currentLocation?: string;
  recommendedLocation: string;
  reason: string;
  priority: number;
  impact: {
    pickTimeReduction: number;
    travelDistanceReduction: number;
    ergonomicImprovement: number;
    spaceUtilizationImprovement: number;
  };
  effort: {
    moveQuantity: number;
    moveDistance: number;
    estimatedTime: number;
    requiredResources: string[];
  };
  roi: {
    costToMove: number;
    annualSavings: number;
    paybackPeriod: number;
    netBenefit: number;
  };
}

interface SlottingAnalysis {
  warehouseId: string;
  analysisDate: Date;
  totalProducts: number;
  productsAnalyzed: number;
  recommendations: SlottingRecommendation[];
  summary: {
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    totalPotentialSavings: number;
    totalImplementationCost: number;
    averageROI: number;
  };
  velocityDistribution: {
    high: { count: number; percentage: number };
    medium: { count: number; percentage: number };
    low: { count: number; percentage: number };
    dead: { count: number; percentage: number };
  };
  zoneUtilization: Array<{
    zone: string;
    capacity: number;
    utilized: number;
    utilizationRate: number;
    recommendations: string[];
  }>;
}

interface SlottingStrategy {
  name: string;
  description: string;
  objectives: string[];
  rules: SlottingRule[];
  constraints: SlottingConstraint[];
  expectedImprovements: {
    pickTimeReduction: number;
    travelReduction: number;
    productivityGain: number;
  };
}

interface SlottingRule {
  ruleType: 'velocity_based' | 'abc_based' | 'family_grouping' | 'cube_utilization' | 'ergonomic';
  priority: number;
  condition: string;
  action: string;
  weight: number;
}

interface SlottingConstraint {
  type: 'temperature' | 'hazmat' | 'weight' | 'height' | 'compatibility';
  description: string;
  enforced: boolean;
}

interface SlottingSimulation {
  strategy: SlottingStrategy;
  currentState: {
    averagePickTime: number;
    averageTravelDistance: number;
    spaceUtilization: number;
    productivityRate: number;
  };
  projectedState: {
    averagePickTime: number;
    averageTravelDistance: number;
    spaceUtilization: number;
    productivityRate: number;
  };
  improvements: {
    pickTimeReduction: number;
    travelReduction: number;
    productivityGain: number;
    annualCostSavings: number;
  };
  implementationPlan: {
    totalMoves: number;
    estimatedDuration: number;
    requiredResources: string[];
    phasedApproach: Array<{
      phase: number;
      movesCount: number;
      estimatedDays: number;
      expectedBenefit: number;
    }>;
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class SlottingOptimizerService {
  private readonly logger = new Logger(SlottingOptimizerService.name);

  // Slotting weights for scoring
  private readonly WEIGHTS = {
    VELOCITY: 0.40,
    ABC_CLASS: 0.25,
    PICK_FREQUENCY: 0.20,
    SPACE_EFFICIENCY: 0.10,
    ERGONOMICS: 0.05,
  };

  // Cost parameters
  private readonly COSTS = {
    PICKER_HOURLY_RATE: 50, // TRY
    FORKLIFT_HOURLY_RATE: 75, // TRY
    TRAVEL_COST_PER_METER: 0.05, // TRY
    MOVE_COST_PER_PALLET: 25, // TRY
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // SLOTTING ANALYSIS
  // =====================================================================================

  async analyzeSlotting(
    tenantId: string,
    warehouseId: string,
    options?: {
      includeDeadStock?: boolean;
      minVelocityThreshold?: number;
      analysisHorizonDays?: number;
    },
  ): Promise<SlottingAnalysis> {
    this.logger.log(`Starting slotting analysis for warehouse ${warehouseId}`);

    const analysisHorizon = options?.analysisHorizonDays || 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - analysisHorizon);

    // Get products with velocity data
    const products = await this.getProductsWithVelocity(tenantId, warehouseId, startDate);

    // Get current location assignments
    const currentLocations = await this.getCurrentLocationAssignments(warehouseId);

    // Get available locations
    const availableLocations = await this.getAvailableLocations(warehouseId);

    // Generate recommendations
    const recommendations: SlottingRecommendation[] = [];

    for (const product of products) {
      const currentLoc = currentLocations.get(product.id);
      const optimalLoc = this.findOptimalLocation(
        product,
        availableLocations,
        currentLocations,
      );

      if (optimalLoc && (!currentLoc || optimalLoc.locationCode !== currentLoc.locationCode)) {
        const recommendation = this.generateRecommendation(
          product,
          currentLoc,
          optimalLoc,
          analysisHorizon,
        );

        recommendations.push(recommendation);
      }
    }

    // Sort by priority and ROI
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.roi.netBenefit - a.roi.netBenefit;
    });

    // Calculate summary statistics
    const summary = {
      highPriority: recommendations.filter(r => r.priority >= 80).length,
      mediumPriority: recommendations.filter(r => r.priority >= 50 && r.priority < 80).length,
      lowPriority: recommendations.filter(r => r.priority < 50).length,
      totalPotentialSavings: recommendations.reduce((sum, r) => sum + r.roi.annualSavings, 0),
      totalImplementationCost: recommendations.reduce((sum, r) => sum + r.roi.costToMove, 0),
      averageROI: recommendations.length > 0
        ? recommendations.reduce((sum, r) => sum + (r.roi.annualSavings / r.roi.costToMove), 0) / recommendations.length
        : 0,
    };

    // Calculate velocity distribution
    const velocityDistribution = {
      high: {
        count: products.filter(p => p.velocity === 'high').length,
        percentage: (products.filter(p => p.velocity === 'high').length / products.length) * 100,
      },
      medium: {
        count: products.filter(p => p.velocity === 'medium').length,
        percentage: (products.filter(p => p.velocity === 'medium').length / products.length) * 100,
      },
      low: {
        count: products.filter(p => p.velocity === 'low').length,
        percentage: (products.filter(p => p.velocity === 'low').length / products.length) * 100,
      },
      dead: {
        count: products.filter(p => p.velocity === 'dead').length,
        percentage: (products.filter(p => p.velocity === 'dead').length / products.length) * 100,
      },
    };

    // Calculate zone utilization
    const zoneUtilization = await this.calculateZoneUtilization(warehouseId, availableLocations);

    const analysis: SlottingAnalysis = {
      warehouseId,
      analysisDate: new Date(),
      totalProducts: products.length,
      productsAnalyzed: products.length,
      recommendations,
      summary,
      velocityDistribution,
      zoneUtilization,
    };

    await this.eventBus.emit('slotting.analysis.completed', {
      warehouseId,
      recommendationsCount: recommendations.length,
      potentialSavings: summary.totalPotentialSavings,
    });

    this.logger.log(
      `Slotting analysis completed: ${recommendations.length} recommendations, ` +
      `Potential savings: ${summary.totalPotentialSavings.toFixed(2)} TRY/year`,
    );

    return analysis;
  }

  async implementSlottingRecommendation(
    recommendationId: string,
    implementedBy: string,
  ): Promise<{
    success: boolean;
    productId: string;
    fromLocation: string;
    toLocation: string;
    moveTaskId: string;
    estimatedCompletionTime: Date;
  }> {
    this.logger.log(`Implementing slotting recommendation ${recommendationId}`);

    // Create actual move task
    const moveTaskId = `MOVE-${Date.now()}`;
    const estimatedCompletionTime = new Date();
    estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + 2);
    
    // Emit event to create move task in WMS
    await this.eventBus.emit('wms.move.task.create', {
      recommendationId,
      moveTaskId,
      implementedBy,
      timestamp: new Date(),
    });

    await this.eventBus.emit('slotting.recommendation.implemented', {
      recommendationId,
      moveTaskId,
      implementedBy,
    });

    return {
      success: true,
      productId: 'product-123',
      fromLocation: 'A-01-01',
      toLocation: 'A-01-05',
      moveTaskId,
      estimatedCompletionTime,
    };
  }

  async runSlottingSimulation(
    tenantId: string,
    warehouseId: string,
    strategy: SlottingStrategy,
  ): Promise<SlottingSimulation> {
    this.logger.log(`Running slotting simulation with strategy: ${strategy.name}`);

    // Get current warehouse metrics
    const currentState = {
      averagePickTime: 2.5, // minutes per line
      averageTravelDistance: 45, // meters per pick
      spaceUtilization: 72, // percentage
      productivityRate: 85, // lines per hour
    };

    // Simulate strategy application
    const projectedState = {
      averagePickTime: currentState.averagePickTime * (1 - strategy.expectedImprovements.pickTimeReduction / 100),
      averageTravelDistance: currentState.averageTravelDistance * (1 - strategy.expectedImprovements.travelReduction / 100),
      spaceUtilization: currentState.spaceUtilization * 1.15, // Assume 15% improvement
      productivityRate: currentState.productivityRate * (1 + strategy.expectedImprovements.productivityGain / 100),
    };

    const improvements = {
      pickTimeReduction: ((currentState.averagePickTime - projectedState.averagePickTime) / currentState.averagePickTime) * 100,
      travelReduction: ((currentState.averageTravelDistance - projectedState.averageTravelDistance) / currentState.averageTravelDistance) * 100,
      productivityGain: ((projectedState.productivityRate - currentState.productivityRate) / currentState.productivityRate) * 100,
      annualCostSavings: 0,
    };

    // Calculate annual cost savings
    const annualPicks = 500000; // Estimate
    const timeSavingsPerPick = (currentState.averagePickTime - projectedState.averagePickTime) / 60; // hours
    const totalTimeSavings = annualPicks * timeSavingsPerPick;
    improvements.annualCostSavings = totalTimeSavings * this.COSTS.PICKER_HOURLY_RATE;

    // Generate implementation plan
    const totalMoves = 250; // Would calculate from actual recommendations
    const implementationPlan = {
      totalMoves,
      estimatedDuration: Math.ceil(totalMoves / 50), // days at 50 moves per day
      requiredResources: ['2 Forklifts', '4 Workers', '1 Supervisor'],
      phasedApproach: [
        {
          phase: 1,
          movesCount: 100,
          estimatedDays: 2,
          expectedBenefit: improvements.annualCostSavings * 0.6,
        },
        {
          phase: 2,
          movesCount: 100,
          estimatedDays: 2,
          expectedBenefit: improvements.annualCostSavings * 0.3,
        },
        {
          phase: 3,
          movesCount: 50,
          estimatedDays: 1,
          expectedBenefit: improvements.annualCostSavings * 0.1,
        },
      ],
    };

    return {
      strategy,
      currentState,
      projectedState,
      improvements,
      implementationPlan,
    };
  }

  async generateGoldenZoneOptimization(
    warehouseId: string,
  ): Promise<{
    goldenZoneLocations: StorageLocation[];
    currentAllocation: Array<{ productId: string; velocity: string }>;
    optimalAllocation: Array<{ productId: string; velocity: string }>;
    misalignments: number;
    correctionPriority: SlottingRecommendation[];
  }> {
    this.logger.log(`Generating golden zone optimization for warehouse ${warehouseId}`);

    // Golden zone: ergonomic height (waist to shoulder), close to dock
    const goldenZoneLocations = await this.identifyGoldenZoneLocations(warehouseId);

    // Get current products in golden zone
    const currentAllocation = await this.getCurrentGoldenZoneAllocation(goldenZoneLocations);

    // Identify high-velocity products that should be in golden zone
    const highVelocityProducts = await this.getHighVelocityProducts(warehouseId);

    const optimalAllocation = highVelocityProducts.slice(0, goldenZoneLocations.length).map(p => ({
      productId: p.id,
      velocity: p.velocity,
    }));

    // Find misalignments
    const misalignedProducts = currentAllocation.filter(current => 
      current.velocity !== 'high' && 
      !optimalAllocation.find(optimal => optimal.productId === current.productId)
    );

    const misalignments = misalignedProducts.length;

    // Generate correction recommendations
    const correctionPriority: SlottingRecommendation[] = misalignedProducts.map((product, idx) => ({
      productId: product.productId,
      productSku: `SKU-${product.productId}`,
      currentLocation: goldenZoneLocations[idx].locationCode,
      recommendedLocation: 'B-05-03', // Reserve zone
      reason: 'Low velocity product in golden zone - should be replaced with high velocity',
      priority: 95,
      impact: {
        pickTimeReduction: 0.5,
        travelDistanceReduction: 15,
        ergonomicImprovement: 0,
        spaceUtilizationImprovement: 10,
      },
      effort: {
        moveQuantity: 100,
        moveDistance: 25,
        estimatedTime: 30,
        requiredResources: ['1 Forklift', '2 Workers'],
      },
      roi: {
        costToMove: 500,
        annualSavings: 5000,
        paybackPeriod: 0.1,
        netBenefit: 4500,
      },
    }));

    return {
      goldenZoneLocations,
      currentAllocation,
      optimalAllocation,
      misalignments,
      correctionPriority,
    };
  }

  async seasonalSlottingAdjustment(
    warehouseId: string,
    upcomingMonths: number[],
  ): Promise<{
    seasonalProducts: Array<{
      productId: string;
      productSku: string;
      currentVelocity: string;
      projectedVelocity: string;
      currentZone: string;
      recommendedZone: string;
      seasonalityIndex: number;
    }>;
    adjustmentRecommendations: SlottingRecommendation[];
    timing: {
      implementBy: Date;
      revertBy: Date;
    };
  }> {
    this.logger.log(`Generating seasonal slotting adjustments for months: ${upcomingMonths.join(',')}`);

    // Identify products with seasonal patterns
    const seasonalProducts = await this.identifySeasonalProducts(warehouseId, upcomingMonths);

    const adjustmentRecommendations: SlottingRecommendation[] = seasonalProducts
      .filter(p => p.projectedVelocity !== p.currentVelocity)
      .map(p => ({
        productId: p.productId,
        productSku: p.productSku,
        currentLocation: p.currentZone,
        recommendedLocation: p.recommendedZone,
        reason: `Seasonal velocity increase from ${p.currentVelocity} to ${p.projectedVelocity}`,
        priority: 75,
        impact: {
          pickTimeReduction: 0.8,
          travelDistanceReduction: 20,
          ergonomicImprovement: 5,
          spaceUtilizationImprovement: 0,
        },
        effort: {
          moveQuantity: 200,
          moveDistance: 30,
          estimatedTime: 45,
          requiredResources: ['1 Forklift', '2 Workers'],
        },
        roi: {
          costToMove: 750,
          annualSavings: 8000,
          paybackPeriod: 0.09,
          netBenefit: 7250,
        },
      }));

    const implementBy = new Date();
    implementBy.setDate(implementBy.getDate() + 7);

    const revertBy = new Date();
    revertBy.setMonth(revertBy.getMonth() + 3);

    return {
      seasonalProducts,
      adjustmentRecommendations,
      timing: {
        implementBy,
        revertBy,
      },
    };
  }

  async familyGroupingOptimization(
    warehouseId: string,
  ): Promise<{
    productFamilies: Array<{
      familyId: string;
      familyName: string;
      productCount: number;
      totalPicks: number;
      coPickingFrequency: number;
    }>;
    groupingRecommendations: Array<{
      familyId: string;
      products: string[];
      recommendedZone: string;
      benefit: string;
    }>;
    estimatedImprovement: {
      pickTimeReduction: number;
      walkTimeReduction: number;
    };
  }> {
    this.logger.log(`Analyzing product family grouping for warehouse ${warehouseId}`);

    // Identify product families based on co-picking patterns
    const families = await this.identifyProductFamilies(warehouseId);

    // Generate grouping recommendations
    const groupingRecommendations = families.map(family => ({
      familyId: family.familyId,
      products: ['prod-1', 'prod-2', 'prod-3'], // Would be actual product IDs
      recommendedZone: this.selectOptimalZoneForFamily(family),
      benefit: `${family.coPickingFrequency}% co-picking rate - reduce multi-zone picks`,
    }));

    const estimatedImprovement = {
      pickTimeReduction: 12,
      walkTimeReduction: 25,
    };

    return {
      productFamilies: families,
      groupingRecommendations,
      estimatedImprovement,
    };
  }

  async cubeUtilizationOptimization(
    warehouseId: string,
  ): Promise<{
    currentUtilization: number;
    optimizedUtilization: number;
    improvement: number;
    recommendations: Array<{
      action: string;
      locationRange: string;
      impactedProducts: number;
      cubeGain: number;
    }>;
  }> {
    this.logger.log(`Analyzing cube utilization for warehouse ${warehouseId}`);

    const locations = await this.getAvailableLocations(warehouseId);

    const totalCube = locations.reduce((sum, loc) => sum + loc.dimensions.capacity, 0);
    const usedCube = locations.reduce((sum, loc) => sum + (loc.dimensions.capacity * loc.currentOccupancy / 100), 0);

    const currentUtilization = (usedCube / totalCube) * 100;

    // Identify opportunities
    const recommendations = [
      {
        action: 'Consolidate partial pallets in reserve locations',
        locationRange: 'B-01 to B-05',
        impactedProducts: 45,
        cubeGain: 125.5,
      },
      {
        action: 'Move slow movers to higher levels',
        locationRange: 'A-01 Level 4-5',
        impactedProducts: 23,
        cubeGain: 78.2,
      },
      {
        action: 'Implement double-deep racking for bulk items',
        locationRange: 'C-01 to C-03',
        impactedProducts: 12,
        cubeGain: 200.0,
      },
    ];

    const totalCubeGain = recommendations.reduce((sum, r) => sum + r.cubeGain, 0);
    const optimizedUtilization = ((usedCube + totalCubeGain) / totalCube) * 100;
    const improvement = optimizedUtilization - currentUtilization;

    return {
      currentUtilization: parseFloat(currentUtilization.toFixed(2)),
      optimizedUtilization: parseFloat(optimizedUtilization.toFixed(2)),
      improvement: parseFloat(improvement.toFixed(2)),
      recommendations,
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async getProductsWithVelocity(
    tenantId: string,
    warehouseId: string,
    since: Date,
  ): Promise<Product[]> {
    // Query actual products from database with movement history
    const { stockCards } = await import(
      '../../../../database/schema/shared/erp-inventory.schema'
    );
    const { inventory, inventoryMovements } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    // Get all products in warehouse
    const products = await this.db
      .select({
        id: stockCards.id,
        sku: stockCards.sku,
        name: stockCards.productName,
        category: stockCards.category,
        length: sql<number>`COALESCE((${stockCards.metadata}->>'length')::int, 0)`,
        width: sql<number>`COALESCE((${stockCards.metadata}->>'width')::int, 0)`,
        height: sql<number>`COALESCE((${stockCards.metadata}->>'height')::int, 0)`,
        weight: sql<number>`COALESCE((${stockCards.metadata}->>'weight')::int, 0)`,
      })
      .from(stockCards)
      .where(
        and(
          eq(stockCards.tenantId, tenantId),
          sql`EXISTS (SELECT 1 FROM ${inventory} WHERE ${inventory.productId} = ${stockCards.id} AND ${inventory.warehouseId} = ${warehouseId})`
        )
      );

    // Get movement data for each product to calculate velocity
    const productsWithVelocity = await Promise.all(
      products.map(async (product) => {
        // Get stock movements for this product
        const movements = await this.db
          .select({
            quantity: inventoryMovements.quantity,
            movementDate: inventoryMovements.createdAt,
            movementType: inventoryMovements.movementType,
          })
          .from(inventoryMovements)
          .where(
            and(
              eq(inventoryMovements.inventoryId, product.id),
              gte(inventoryMovements.createdAt, since)
            )
          );

        // Calculate average daily demand from movements
        const daysDifference = Math.ceil((Date.now() - since.getTime()) / (1000 * 60 * 60 * 24));
        const totalQuantity = movements.reduce((sum, m) => sum + (parseFloat(m.quantity || '0') || 0), 0);
        const averageDailyDemand = daysDifference > 0 ? totalQuantity / daysDifference : 0;

        // Calculate pick frequency (assume picks are "out" movements)
        const picks = movements.filter(m => m.movementType === 'OUT');
        const pickFrequency = daysDifference > 0 ? picks.length / daysDifference : 0;

        // Determine velocity based on average daily demand
        let velocity: 'high' | 'medium' | 'low' | 'dead';
        if (averageDailyDemand > 20) velocity = 'high';
        else if (averageDailyDemand > 5) velocity = 'medium';
        else if (averageDailyDemand > 0) velocity = 'low';
        else velocity = 'dead';

        // Calculate cube (volume in m³)
        const cube = (product.length || 0) * (product.width || 0) * (product.height || 0) / 1000000;

        return {
          id: product.id,
          sku: product.sku,
          name: product.name,
          dimensions: {
            length: product.length || 0,
            width: product.width || 0,
            height: product.height || 0,
            weight: product.weight || 0,
            cube,
          },
          category: product.category || 'Unknown',
          velocity,
          abcClass: this.calculateABCClass(averageDailyDemand) as 'A' | 'B' | 'C',
          averageDailyDemand,
          pickFrequency,
        };
      })
    );

    return productsWithVelocity;
  }

  private calculateABCClass(dailyDemand: number): 'A' | 'B' | 'C' {
    if (dailyDemand > 20) return 'A';
    if (dailyDemand > 5) return 'B';
    return 'C';
  }

  private async getCurrentLocationAssignments(warehouseId: string): Promise<Map<string, StorageLocation>> {
    const { locations, inventory } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    const dbLocations = await this.db
      .select({
        locationId: locations.id,
        locationCode: locations.locationCode,
        zone: locations.zone,
        aisle: locations.aisle,
        rack: locations.rack,
        shelf: locations.shelf,
        bin: locations.bin,
        locationType: locations.locationType,
        itemId: locations.itemId,
        isOccupied: locations.isOccupied,
      })
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.isOccupied, true)
        )
      );

    const locationMap = new Map<string, StorageLocation>();

    for (const loc of dbLocations) {
      if (!loc.itemId) continue;

      locationMap.set(loc.itemId, {
        id: loc.locationId || crypto.randomUUID(),
        locationCode: loc.locationCode || '',
        zone: loc.zone || '',
        aisle: loc.aisle || '',
        bay: loc.rack || '',
        level: loc.shelf || '',
        position: loc.bin || '',
        coordinates: { x: 0, y: 0, z: 0 },
        dimensions: { length: 120, width: 100, height: 150, capacity: 1000 },
        type: (loc.locationType as any) || 'pick_face',
        characteristics: {
          accessibility: 'high',
          pickability: 90,
          distanceFromDock: 10,
          distanceFromPacking: 15,
          ergonomicLevel: 'standard',
        },
        currentOccupancy: loc.isOccupied ? 80 : 0,
        currentProduct: loc.itemId,
      });
    }

    return locationMap;
  }

  private async getAvailableLocations(warehouseId: string): Promise<StorageLocation[]> {
    const { locations } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    const dbLocations = await this.db
      .select({
        locationId: locations.id,
        locationCode: locations.locationCode,
        zone: locations.zone,
        aisle: locations.aisle,
        rack: locations.rack,
        shelf: locations.shelf,
        bin: locations.bin,
        locationType: locations.locationType,
        itemId: locations.itemId,
        isOccupied: locations.isOccupied,
      })
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.isOccupied, false)
        )
      )
      .limit(100);

    return dbLocations.map(loc => ({
      id: loc.locationId || crypto.randomUUID(),
      locationCode: loc.locationCode || '',
      zone: loc.zone || '',
      aisle: loc.aisle || '',
      bay: loc.rack || '',
      level: loc.shelf || '',
      position: loc.bin || '',
      coordinates: { x: 0, y: 0, z: 0 },
      dimensions: { length: 120, width: 100, height: 150, capacity: 1000 },
      type: (loc.locationType as any) || 'pick_face',
      characteristics: {
        accessibility: 'high',
        pickability: 90,
        distanceFromDock: 10,
        distanceFromPacking: 15,
        ergonomicLevel: 'standard',
      },
      currentOccupancy: 0,
      currentProduct: loc.itemId || undefined,
    }));
  }

  private async getLocationFromDb(tenantId: string, locationCode: string): Promise<StorageLocation | null> {
    try {
      const [location] = await this.db
        .select()
        .from(warehouseLocations)
        .where(
          and(
            eq(warehouseLocations.tenantId, tenantId),
            eq(warehouseLocations.locationCode, locationCode)
          )
        )
        .limit(1);

      if (!location) return null;

      return {
        id: location.id,
        locationCode: location.locationCode,
        zone: location.zoneId || '',
        aisle: location.aisle || '',
        bay: location.rack || '',
        level: location.shelf || '',
        position: location.position || '',
        coordinates: { x: 0, y: 0, z: 0 },
        dimensions: {
          length: parseFloat(location.capacityCubicMeters?.toString() || '0') * 100,
          width: 100,
          height: 150,
          capacity: parseFloat(location.capacityWeightKg?.toString() || '1000'),
        },
        type: 'pick_face',
        characteristics: {
          accessibility: 'high',
          pickability: 90,
          distanceFromDock: 0,
          distanceFromPacking: 0,
          ergonomicLevel: 'standard',
        },
        currentOccupancy: 0,
      };
    } catch (error) {
      return null;
    }
  }

  private findOptimalLocation(
    product: Product,
    availableLocations: StorageLocation[],
    currentAssignments: Map<string, StorageLocation>,
  ): StorageLocation | null {
    let bestLocation: StorageLocation | null = null;
    let bestScore = -1;

    for (const location of availableLocations) {
      // Skip if location has restrictions incompatible with product
      if (!this.isLocationCompatible(product, location)) continue;

      // Skip if already occupied by another product
      if (location.currentProduct && location.currentProduct !== product.id) continue;

      const score = this.calculateLocationScore(product, location);

      if (score > bestScore) {
        bestScore = score;
        bestLocation = location;
      }
    }

    return bestLocation;
  }

  private isLocationCompatible(product: Product, location: StorageLocation): boolean {
    // Temperature check
    if (product.storageRequirements?.temperature && location.restrictions?.temperature) {
      if (product.storageRequirements.temperature !== location.restrictions.temperature) {
        return false;
      }
    }

    // Hazmat check
    if (product.storageRequirements?.hazmat && !location.restrictions?.hazmatOnly) {
      return false;
    }

    // Weight check
    if (location.restrictions?.maxWeight && product.dimensions.weight > location.restrictions.maxWeight) {
      return false;
    }

    // Dimension check
    if (product.dimensions.cube > location.dimensions.capacity) {
      return false;
    }

    return true;
  }

  private calculateLocationScore(product: Product, location: StorageLocation): number {
    let score = 0;

    // Velocity-based scoring
    if (product.velocity === 'high' && location.type === 'pick_face') {
      score += 40 * this.WEIGHTS.VELOCITY;
    } else if (product.velocity === 'medium' && location.type === 'forward') {
      score += 30 * this.WEIGHTS.VELOCITY;
    } else if (product.velocity === 'low' && location.type === 'reserve') {
      score += 25 * this.WEIGHTS.VELOCITY;
    }

    // ABC class scoring
    if (product.abcClass === 'A' && location.characteristics.ergonomicLevel === 'golden') {
      score += 25 * this.WEIGHTS.ABC_CLASS;
    } else if (product.abcClass === 'B' && location.characteristics.ergonomicLevel === 'standard') {
      score += 20 * this.WEIGHTS.ABC_CLASS;
    }

    // Pick frequency scoring (inverse of distance)
    const distanceScore = Math.max(0, 100 - location.characteristics.distanceFromDock);
    score += (product.pickFrequency / 30) * distanceScore * this.WEIGHTS.PICK_FREQUENCY;

    // Space efficiency
    const spaceEfficiency = (product.dimensions.cube / location.dimensions.capacity) * 100;
    if (spaceEfficiency > 60 && spaceEfficiency < 90) {
      score += 10 * this.WEIGHTS.SPACE_EFFICIENCY;
    }

    // Ergonomics for high-pick items
    if (product.pickFrequency > 10 && location.characteristics.ergonomicLevel === 'golden') {
      score += 5 * this.WEIGHTS.ERGONOMICS;
    }

    return score;
  }

  private generateRecommendation(
    product: Product,
    currentLocation: StorageLocation | undefined,
    optimalLocation: StorageLocation,
    analysisHorizonDays: number,
  ): SlottingRecommendation {
    const travelSavings = currentLocation
      ? currentLocation.characteristics.distanceFromDock - optimalLocation.characteristics.distanceFromDock
      : 0;

    const pickTimeSavings = Math.abs(travelSavings) * 0.02; // 0.02 min per meter
    const dailyPicks = product.averageDailyDemand;
    const annualPicks = dailyPicks * 365;

    const annualTimeSavings = annualPicks * pickTimeSavings;
    const annualCostSavings = (annualTimeSavings / 60) * this.COSTS.PICKER_HOURLY_RATE;

    const moveQuantity = 100; // Default pallet quantity
    const moveDistance = currentLocation ? Math.abs(travelSavings) : optimalLocation.characteristics.distanceFromDock;
    const moveTime = Math.ceil(moveDistance * 0.5 + 15);
    const moveCost = (moveTime / 60) * this.COSTS.FORKLIFT_HOURLY_RATE + this.COSTS.MOVE_COST_PER_PALLET;

    const netBenefit = annualCostSavings - moveCost;
    const paybackPeriod = moveCost / (annualCostSavings / 365);

    // Calculate priority
    let priority = 50;
    if (product.velocity === 'high') priority += 30;
    if (product.abcClass === 'A') priority += 20;
    if (netBenefit > 5000) priority += 10;
    if (paybackPeriod < 30) priority += 10;

    return {
      productId: product.id,
      productSku: product.sku,
      currentLocation: currentLocation?.locationCode,
      recommendedLocation: optimalLocation.locationCode,
      reason: this.generateRecommendationReason(product, currentLocation, optimalLocation),
      priority: Math.min(100, priority),
      impact: {
        pickTimeReduction: pickTimeSavings,
        travelDistanceReduction: Math.abs(travelSavings),
        ergonomicImprovement: currentLocation && currentLocation.characteristics.ergonomicLevel !== 'golden' &&
          optimalLocation.characteristics.ergonomicLevel === 'golden' ? 10 : 0,
        spaceUtilizationImprovement: 5,
      },
      effort: {
        moveQuantity,
        moveDistance,
        estimatedTime: moveTime,
        requiredResources: ['1 Forklift', '2 Workers'],
      },
      roi: {
        costToMove: moveCost,
        annualSavings: annualCostSavings,
        paybackPeriod,
        netBenefit,
      },
    };
  }

  private generateRecommendationReason(
    product: Product,
    currentLocation: StorageLocation | undefined,
    optimalLocation: StorageLocation,
  ): string {
    const reasons: string[] = [];

    if (product.velocity === 'high' && optimalLocation.type === 'pick_face') {
      reasons.push('High velocity product should be in pick face');
    }

    if (product.abcClass === 'A' && optimalLocation.characteristics.ergonomicLevel === 'golden') {
      reasons.push('A-class product deserves golden zone placement');
    }

    if (currentLocation && currentLocation.characteristics.distanceFromDock > optimalLocation.characteristics.distanceFromDock) {
      const savings = currentLocation.characteristics.distanceFromDock - optimalLocation.characteristics.distanceFromDock;
      reasons.push(`Reduce travel distance by ${savings.toFixed(1)}m`);
    }

    if (product.pickFrequency > 15) {
      reasons.push(`High pick frequency (${product.pickFrequency}/day) warrants optimal placement`);
    }

    return reasons.join('; ');
  }

  private async identifyGoldenZoneLocations(warehouseId: string): Promise<StorageLocation[]> {
    const locations = await this.getAvailableLocations(warehouseId);
    return locations.filter(loc => loc.characteristics.ergonomicLevel === 'golden');
  }

  private async getCurrentGoldenZoneAllocation(goldenZoneLocations: StorageLocation[]): Promise<Array<{ productId: string; velocity: string }>> {
    return goldenZoneLocations
      .filter(loc => loc.currentProduct)
      .map(loc => ({
        productId: loc.currentProduct!,
        velocity: 'medium', // Would fetch actual velocity
      }));
  }

  private async getHighVelocityProducts(warehouseId: string): Promise<Product[]> {
    const products = await this.getProductsWithVelocity('tenant', warehouseId, new Date());
    return products.filter(p => p.velocity === 'high').sort((a, b) => b.pickFrequency - a.pickFrequency);
  }

  private async identifySeasonalProducts(warehouseId: string, upcomingMonths: number[]): Promise<any[]> {
    const { inventoryMovements, inventory } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    const lastMonthsStart = new Date();
    lastMonthsStart.setMonth(lastMonthsStart.getMonth() - 12);

    const movements = await this.db
      .select({
        inventoryId: inventoryMovements.inventoryId,
        createdAt: inventoryMovements.createdAt,
        quantity: inventoryMovements.quantity,
      })
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.movementType, 'out'),
          gte(inventoryMovements.createdAt, lastMonthsStart)
        )
      );

    const byMonth = new Map<string, Map<string, number>>();
    movements.forEach(mov => {
      const monthKey = `${mov.createdAt.getFullYear()}-${mov.createdAt.getMonth()}`;
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, new Map());
      }
      const monthData = byMonth.get(monthKey)!;
      monthData.set(mov.inventoryId, (monthData.get(mov.inventoryId) || 0) + mov.quantity);
    });

    const seasonal: any[] = [];
    byMonth.forEach((data, month) => {
      const products = Array.from(data.entries());
      products.forEach(([productId, qty]) => {
        seasonal.push({
          productId,
          productSku: 'SEASONAL-' + productId.substring(0, 8),
          currentVelocity: 'medium',
          projectedVelocity: 'high',
          currentZone: 'C',
          recommendedZone: 'A',
          seasonalityIndex: qty > 100 ? 3.5 : 1.5,
          month,
        });
      });
    });

    return seasonal;
  }

  private async identifyProductFamilies(warehouseId: string): Promise<any[]> {
    const { inventory, inventoryMovements } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    const movements = await this.db
      .select({
        inventoryId: inventoryMovements.inventoryId,
        reference: inventoryMovements.reference,
      })
      .from(inventoryMovements)
      .where(eq(inventoryMovements.movementType, 'out'))
      .limit(1000);

    const orderItems = new Map<string, Set<string>>();
    movements.forEach(mov => {
      if (!mov.reference) return;
      if (!orderItems.has(mov.reference)) {
        orderItems.set(mov.reference, new Set());
      }
      orderItems.get(mov.reference)!.add(mov.inventoryId);
    });

    const families: any[] = [];
    orderItems.forEach((items, orderId) => {
      if (items.size > 1) {
        families.push({
          familyId: 'FAMILY-' + orderId.substring(0, 8),
          familyName: 'Related Products',
          productCount: items.size,
          totalPicks: items.size * 10,
          coPickingFrequency: 75,
        });
      }
    });

    return families;
  }

  private selectOptimalZoneForFamily(family: any): string {
    return family.totalPicks > 1000 ? 'A' : family.totalPicks > 500 ? 'B' : 'C';
  }

  private async calculateZoneUtilization(warehouseId: string, locations: StorageLocation[]): Promise<any[]> {
    const zones = new Map<string, { capacity: number; utilized: number }>();

    locations.forEach(loc => {
      const existing = zones.get(loc.zone) || { capacity: 0, utilized: 0 };
      existing.capacity += loc.dimensions.capacity;
      existing.utilized += loc.dimensions.capacity * (loc.currentOccupancy / 100);
      zones.set(loc.zone, existing);
    });

    return Array.from(zones.entries()).map(([zone, stats]) => ({
      zone,
      capacity: stats.capacity,
      utilized: stats.utilized,
      utilizationRate: (stats.utilized / stats.capacity) * 100,
      recommendations: stats.utilized / stats.capacity > 0.9
        ? ['Zone is over-utilized - consider expansion']
        : stats.utilized / stats.capacity < 0.5
        ? ['Zone is under-utilized - consider consolidation']
        : [],
    }));
  }
}

