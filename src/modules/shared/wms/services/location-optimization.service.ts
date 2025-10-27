// =====================================================================================
// AYAZLOGISTICS - WMS LOCATION OPTIMIZATION SERVICE
// =====================================================================================
// Description: Intelligent warehouse location management and slotting optimization
// Features: ABC analysis, location finding, replenishment, slotting algorithms
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, isNull, inArray, sql, or } from 'drizzle-orm';
import * as schema from '@/database/schema';
import { wmsWarehouses, wmsLocations, wmsInventory } from '@/database/schema/shared/wms.schema';

// =====================================================================================
// INTERFACES & TYPES
// =====================================================================================

interface Location {
  id: string;
  code: string;
  warehouseId: string;
  type: 'picking' | 'rack' | 'bulk' | 'overflow' | 'receiving' | 'staging' | 'quarantine' | 'damaged';
  zone: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  capacity: number;
  currentQuantity: number;
  availableCapacity: number;
  maxWeight?: number;
  currentWeight?: number;
  coordinates?: { x: number; y: number; z: number };
  temperatureZone?: string;
  isPickingFace: boolean;
  isBulkStorage: boolean;
  reservedForSku?: string;
  status: 'available' | 'occupied' | 'reserved' | 'damaged' | 'maintenance';
}

interface StockItem {
  sku: string;
  productName: string;
  quantity: number;
  weight?: number;
  volume?: number;
  dimensions?: { length: number; width: number; height: number };
  temperatureRequirement?: string;
  hazmat?: boolean;
  fastMoving?: boolean;
  abcClassification?: 'A' | 'B' | 'C';
  lotNumber?: string;
  expiryDate?: Date;
}

interface LocationSuggestion {
  location: Location;
  score: number;
  reasons: string[];
  distance: number;
  utilizationAfter: number;
  conflicts: string[];
}

interface SlottingRecommendation {
  sku: string;
  productName: string;
  currentLocations: Location[];
  recommendedLocations: Location[];
  reasoning: string;
  priorityScore: number;
  estimatedImpact: {
    pickingTimeReduction: number; // percentage
    travelDistanceReduction: number; // meters
    laborCostSaving: number; // TRY per month
  };
}

interface ABCAnalysisResult {
  sku: string;
  productName: string;
  classification: 'A' | 'B' | 'C';
  annualRevenue: number;
  annualQuantity: number;
  pickFrequency: number;
  revenuePercentage: number;
  quantityPercentage: number;
  cumulativePercentage: number;
  currentZone?: string;
  recommendedZone: string;
}

interface ReplenishmentTask {
  sku: string;
  fromLocation: Location;
  toLocation: Location;
  quantity: number;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  reason: string;
  estimatedTime: number; // minutes
  assignedTo?: string;
}

interface WavePickingBatch {
  batchId: string;
  orders: string[];
  totalItems: number;
  totalQuantity: number;
  locations: Location[];
  estimatedTime: number;
  estimatedDistance: number;
  efficiency: number;
  priority: string;
}

interface CycleCountPlan {
  planId: string;
  type: 'full' | 'partial' | 'abc' | 'targeted';
  locations: Location[];
  skus: string[];
  frequency: string;
  nextCountDate: Date;
  estimatedDuration: number;
  assignedTo?: string;
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class LocationOptimizationService {
  private readonly logger = new Logger(LocationOptimizationService.name);
  
  // Configuration constants
  private readonly PICKING_ZONE_DISTANCE_WEIGHT = 0.4;
  private readonly CAPACITY_UTILIZATION_WEIGHT = 0.3;
  private readonly SLOT_COMPATIBILITY_WEIGHT = 0.2;
  private readonly FEFO_COMPLIANCE_WEIGHT = 0.1;
  
  private readonly ABC_A_THRESHOLD = 0.8; // 80% of revenue
  private readonly ABC_B_THRESHOLD = 0.95; // 95% of revenue
  
  private readonly REPLENISHMENT_MIN_THRESHOLD = 0.2; // 20% capacity
  private readonly REPLENISHMENT_MAX_THRESHOLD = 0.9; // 90% capacity

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // =====================================================================================
  // LOCATION FINDING - MAIN METHOD
  // =====================================================================================

  async findOptimalLocation(
    warehouseId: string,
    item: StockItem,
    options?: {
      preferredZone?: string;
      minCapacity?: number;
      maxDistance?: number;
      allowMixedSku?: boolean;
      requirePickingFace?: boolean;
      considerABC?: boolean;
    },
  ): Promise<LocationSuggestion[]> {
    this.logger.log(`Finding optimal location for SKU: ${item.sku} in warehouse: ${warehouseId}`);

    const opts = {
      preferredZone: options?.preferredZone,
      minCapacity: options?.minCapacity || item.quantity,
      maxDistance: options?.maxDistance || 1000, // meters
      allowMixedSku: options?.allowMixedSku ?? false,
      requirePickingFace: options?.requirePickingFace ?? item.fastMoving,
      considerABC: options?.considerABC ?? true,
    };

    // Fetch available locations
    const locations = await this.getAvailableLocations(warehouseId, item, opts);

    if (locations.length === 0) {
      throw new BadRequestException('No suitable locations available');
    }

    // Score and rank locations
    const suggestions: LocationSuggestion[] = [];

    for (const location of locations) {
      const score = await this.calculateLocationScore(location, item, opts);
      const reasons = this.generateReasons(location, item, score);
      const distance = this.calculateDistanceFromReceiving(location);
      const utilizationAfter = ((location.currentQuantity + item.quantity) / location.capacity) * 100;
      const conflicts = await this.checkConflicts(location, item);

      suggestions.push({
        location,
        score,
        reasons,
        distance,
        utilizationAfter,
        conflicts,
      });
    }

    // Sort by score (descending)
    suggestions.sort((a, b) => b.score - a.score);

    this.logger.log(`Found ${suggestions.length} location suggestions for ${item.sku}`);

    return suggestions.slice(0, 10); // Return top 10 suggestions
  }

  private async getAvailableLocations(
    warehouseId: string,
    item: StockItem,
    options: Required<Exclude<Parameters<typeof this.findOptimalLocation>[2], undefined>>,
  ): Promise<Location[]> {
    const conditions = [
      eq(wmsLocations.warehouseId, warehouseId),
      eq(wmsLocations.status, 'available'),
    ];

    // Filter by zone if specified
    if (options.preferredZone) {
      conditions.push(eq(wmsLocations.zone, options.preferredZone));
    }

    // Filter by picking face requirement
    if (options.requirePickingFace) {
      conditions.push(eq(wmsLocations.isPickingFace, true));
    }

    const dbLocations = await this.db
      .select()
      .from(wmsLocations)
      .where(and(...conditions));

    // Convert to Location type and filter by capacity
    const locations: Location[] = dbLocations
      .map(loc => ({
        id: loc.id,
        code: loc.code,
        warehouseId: loc.warehouseId,
        type: loc.type as any,
        zone: loc.zone,
        aisle: loc.aisle || undefined,
        rack: loc.rack || undefined,
        shelf: loc.shelf || undefined,
        bin: loc.bin || undefined,
        capacity: Number(loc.capacity),
        currentQuantity: Number(loc.currentQuantity),
        availableCapacity: Number(loc.capacity) - Number(loc.currentQuantity),
        maxWeight: loc.maxWeight ? Number(loc.maxWeight) : undefined,
        currentWeight: loc.currentWeight ? Number(loc.currentWeight) : undefined,
        temperatureZone: loc.temperatureZone || undefined,
        isPickingFace: loc.isPickingFace,
        isBulkStorage: loc.isBulkStorage,
        reservedForSku: loc.reservedForSku || undefined,
        status: loc.status as any,
      }))
      .filter(loc => {
        // Check capacity
        if (loc.availableCapacity < options.minCapacity) return false;

        // Check temperature compatibility
        if (item.temperatureRequirement && loc.temperatureZone !== item.temperatureRequirement) {
          return false;
        }

        // Check if location is reserved for different SKU
        if (loc.reservedForSku && loc.reservedForSku !== item.sku && !options.allowMixedSku) {
          return false;
        }

        // Check weight limit
        if (item.weight && loc.maxWeight && loc.currentWeight) {
          if (loc.currentWeight + item.weight > loc.maxWeight) {
            return false;
          }
        }

        return true;
      });

    return locations;
  }

  private async calculateLocationScore(
    location: Location,
    item: StockItem,
    options: Required<Exclude<Parameters<typeof this.findOptimalLocation>[2], undefined>>,
  ): Promise<number> {
    let score = 0;

    // 1. Distance score (40% weight) - prefer locations closer to receiving/shipping
    const distance = this.calculateDistanceFromReceiving(location);
    const maxDistance = options.maxDistance;
    const distanceScore = Math.max(0, (1 - distance / maxDistance)) * 100;
    score += distanceScore * this.PICKING_ZONE_DISTANCE_WEIGHT;

    // 2. Capacity utilization score (30% weight) - prefer locations with good fit
    const utilizationAfter = (location.currentQuantity + item.quantity) / location.capacity;
    const optimalUtilization = 0.85; // Target 85% utilization
    const utilizationDeviation = Math.abs(utilizationAfter - optimalUtilization);
    const capacityScore = Math.max(0, (1 - utilizationDeviation) * 100);
    score += capacityScore * this.CAPACITY_UTILIZATION_WEIGHT;

    // 3. Slot compatibility score (20% weight)
    let compatibilityScore = 100;
    
    // Prefer picking faces for fast-moving items
    if (item.fastMoving && !location.isPickingFace) {
      compatibilityScore -= 30;
    }

    // Prefer bulk storage for slow-moving items
    if (!item.fastMoving && location.isPickingFace) {
      compatibilityScore -= 20;
    }

    // Prefer dedicated slots (reserved for this SKU)
    if (location.reservedForSku === item.sku) {
      compatibilityScore += 20;
    }

    // Prefer empty locations for new SKUs
    if (location.currentQuantity === 0) {
      compatibilityScore += 10;
    }

    score += Math.max(0, compatibilityScore) * this.SLOT_COMPATIBILITY_WEIGHT;

    // 4. FEFO compliance score (10% weight) - for items with expiry dates
    let fefoScore = 100;
    if (item.expiryDate) {
      // Check if other items in location have compatible expiry dates
      const existingInventory = await this.getLocationInventory(location.id);
      if (existingInventory.length > 0) {
        const hasNewerItems = existingInventory.some(inv => 
          inv.expiryDate && item.expiryDate && inv.expiryDate > item.expiryDate
        );
        if (hasNewerItems) {
          fefoScore -= 50; // Penalty for violating FEFO
        }
      }
    }
    score += fefoScore * this.FEFO_COMPLIANCE_WEIGHT;

    // Bonus for ABC classification match
    if (options.considerABC && item.abcClassification) {
      const zoneMatch = this.checkABCZoneMatch(location.zone, item.abcClassification);
      if (zoneMatch) {
        score += 10; // 10 point bonus
      }
    }

    return Math.min(100, Math.max(0, score));
  }

  private calculateDistanceFromReceiving(location: Location): number {
    // Simplified distance calculation based on zone and aisle
    // In real implementation, would use actual coordinates
    const baseDistance = location.zone === 'A' ? 10 : location.zone === 'B' ? 30 : 50;
    const aisleDistance = location.aisle ? parseInt(location.aisle) * 5 : 0;
    return baseDistance + aisleDistance;
  }

  private generateReasons(location: Location, item: StockItem, score: number): string[] {
    const reasons: string[] = [];

    if (score >= 90) {
      reasons.push('Excellent match for this item');
    } else if (score >= 75) {
      reasons.push('Good match for this item');
    } else if (score >= 60) {
      reasons.push('Acceptable match');
    } else {
      reasons.push('Suboptimal location');
    }

    if (location.isPickingFace && item.fastMoving) {
      reasons.push('Picking face location for fast-moving item');
    }

    if (location.currentQuantity === 0) {
      reasons.push('Empty location - clean slate');
    }

    if (location.reservedForSku === item.sku) {
      reasons.push('Reserved for this SKU');
    }

    const utilization = ((location.currentQuantity + item.quantity) / location.capacity) * 100;
    if (utilization >= 80 && utilization <= 95) {
      reasons.push('Optimal capacity utilization');
    }

    if (location.zone === 'A') {
      reasons.push('Premium zone - close to shipping');
    }

    return reasons;
  }

  private async checkConflicts(location: Location, item: StockItem): Promise<string[]> {
    const conflicts: string[] = [];

    // Check if hazmat can be stored with other items
    if (item.hazmat) {
      const inventory = await this.getLocationInventory(location.id);
      if (inventory.length > 0 && !inventory.every(inv => inv.hazmat)) {
        conflicts.push('Hazmat items cannot be mixed with non-hazmat items');
      }
    }

    // Check temperature compatibility
    if (item.temperatureRequirement && location.temperatureZone !== item.temperatureRequirement) {
      conflicts.push(`Temperature mismatch: requires ${item.temperatureRequirement}, location is ${location.temperatureZone}`);
    }

    return conflicts;
  }

  private checkABCZoneMatch(zone: string, classification: 'A' | 'B' | 'C'): boolean {
    // A items should be in zone A, B items in zone B, C items in zone C
    return zone.toUpperCase() === classification;
  }

  private async getLocationInventory(locationId: string): Promise<StockItem[]> {
    const inventory = await this.db
      .select()
      .from(wmsInventory)
      .where(eq(wmsInventory.locationId, locationId));

    return inventory.map(inv => ({
      sku: inv.sku,
      productName: '', // Would fetch from stock cards
      quantity: Number(inv.quantity),
      lotNumber: inv.lotNumber || undefined,
      expiryDate: inv.expiryDate ? new Date(inv.expiryDate) : undefined,
      hazmat: false, // Would fetch from stock cards
    }));
  }

  // =====================================================================================
  // ABC ANALYSIS
  // =====================================================================================

  async performABCAnalysis(
    warehouseId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ABCAnalysisResult[]> {
    this.logger.log(`Performing ABC analysis for warehouse: ${warehouseId}`);

    // Fetch sales/movement data for period
    // This is simplified - in reality would join with order and movement tables
    const inventory = await this.db
      .select()
      .from(wmsInventory)
      .where(eq(wmsInventory.warehouseId, warehouseId));

    // Calculate metrics for each SKU
    const skuMetrics = new Map<string, {
      sku: string;
      productName: string;
      annualRevenue: number;
      annualQuantity: number;
      pickFrequency: number;
      currentZone?: string;
    }>();

    // Aggregate by SKU
    inventory.forEach(inv => {
      const existing = skuMetrics.get(inv.sku) || {
        sku: inv.sku,
        productName: '', // Would fetch from stock cards
        annualRevenue: 0,
        annualQuantity: 0,
        pickFrequency: 0,
        currentZone: undefined,
      };

      // In real implementation, would calculate from actual sales data
      existing.annualQuantity += Number(inv.quantity);
      existing.annualRevenue += Number(inv.quantity) * 100; // Placeholder price
      existing.pickFrequency += Math.floor(Math.random() * 100); // Placeholder

      skuMetrics.set(inv.sku, existing);
    });

    // Sort by revenue (descending)
    const sorted = Array.from(skuMetrics.values()).sort((a, b) => b.annualRevenue - a.annualRevenue);

    // Calculate cumulative percentages
    const totalRevenue = sorted.reduce((sum, item) => sum + item.annualRevenue, 0);
    const totalQuantity = sorted.reduce((sum, item) => sum + item.annualQuantity, 0);

    let cumulativeRevenue = 0;
    const results: ABCAnalysisResult[] = sorted.map(item => {
      cumulativeRevenue += item.annualRevenue;
      const cumulativePercentage = (cumulativeRevenue / totalRevenue) * 100;

      // Classify
      let classification: 'A' | 'B' | 'C';
      let recommendedZone: string;

      if (cumulativePercentage <= this.ABC_A_THRESHOLD * 100) {
        classification = 'A';
        recommendedZone = 'A';
      } else if (cumulativePercentage <= this.ABC_B_THRESHOLD * 100) {
        classification = 'B';
        recommendedZone = 'B';
      } else {
        classification = 'C';
        recommendedZone = 'C';
      }

      return {
        sku: item.sku,
        productName: item.productName,
        classification,
        annualRevenue: item.annualRevenue,
        annualQuantity: item.annualQuantity,
        pickFrequency: item.pickFrequency,
        revenuePercentage: (item.annualRevenue / totalRevenue) * 100,
        quantityPercentage: (item.annualQuantity / totalQuantity) * 100,
        cumulativePercentage,
        currentZone: item.currentZone,
        recommendedZone,
      };
    });

    this.logger.log(
      `ABC Analysis complete: A=${results.filter(r => r.classification === 'A').length}, ` +
      `B=${results.filter(r => r.classification === 'B').length}, ` +
      `C=${results.filter(r => r.classification === 'C').length}`,
    );

    return results;
  }

  // =====================================================================================
  // SLOTTING OPTIMIZATION
  // =====================================================================================

  async generateSlottingRecommendations(
    warehouseId: string,
    options?: {
      considerSeasonality?: boolean;
      minImpactThreshold?: number;
      maxRecommendations?: number;
    },
  ): Promise<SlottingRecommendation[]> {
    this.logger.log(`Generating slotting recommendations for warehouse: ${warehouseId}`);

    const opts = {
      considerSeasonality: options?.considerSeasonality ?? true,
      minImpactThreshold: options?.minImpactThreshold || 10, // minimum 10% improvement
      maxRecommendations: options?.maxRecommendations || 50,
    };

    // Perform ABC analysis
    const abcResults = await this.performABCAnalysis(
      warehouseId,
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      new Date(),
    );

    // Generate recommendations
    const recommendations: SlottingRecommendation[] = [];

    for (const item of abcResults) {
      // Find current locations
      const currentInventory = await this.db
        .select()
        .from(wmsInventory)
        .where(and(
          eq(wmsInventory.warehouseId, warehouseId),
          eq(wmsInventory.sku, item.sku),
        ));

      if (currentInventory.length === 0) continue;

      const currentLocations = await Promise.all(
        currentInventory.map(async inv => {
          const [loc] = await this.db
            .select()
            .from(wmsLocations)
            .where(eq(wmsLocations.id, inv.locationId))
            .limit(1);
          return loc;
        }),
      );

      // Check if item is in wrong zone based on ABC classification
      const isInWrongZone = currentLocations.some(loc =>
        loc && !this.checkABCZoneMatch(loc.zone, item.classification)
      );

      if (!isInWrongZone) continue;

      // Find recommended locations
      const stockItem: StockItem = {
        sku: item.sku,
        productName: item.productName,
        quantity: item.annualQuantity,
        fastMoving: item.classification === 'A',
        abcClassification: item.classification,
      };

      const suggestions = await this.findOptimalLocation(warehouseId, stockItem, {
        preferredZone: item.recommendedZone,
        considerABC: true,
      });

      if (suggestions.length === 0) continue;

      // Calculate estimated impact
      const currentZoneDistance = Math.max(...currentLocations.map(loc => 
        loc ? this.calculateDistanceFromReceiving(this.dbLocationToLocation(loc)) : 0
      ));
      const newZoneDistance = suggestions[0].distance;
      const distanceReduction = ((currentZoneDistance - newZoneDistance) / currentZoneDistance) * 100;

      if (distanceReduction < opts.minImpactThreshold) continue;

      recommendations.push({
        sku: item.sku,
        productName: item.productName,
        currentLocations: currentLocations.map(loc => this.dbLocationToLocation(loc)),
        recommendedLocations: suggestions.slice(0, 3).map(s => s.location),
        reasoning: `${item.classification}-class item currently in ${currentLocations[0]?.zone} zone, should be in ${item.recommendedZone} zone`,
        priorityScore: item.pickFrequency * distanceReduction,
        estimatedImpact: {
          pickingTimeReduction: distanceReduction * 0.5, // 50% of distance reduction
          travelDistanceReduction: currentZoneDistance - newZoneDistance,
          laborCostSaving: (distanceReduction / 100) * item.pickFrequency * 2, // TRY per month
        },
      });
    }

    // Sort by priority score
    recommendations.sort((a, b) => b.priorityScore - a.priorityScore);

    this.logger.log(`Generated ${recommendations.length} slotting recommendations`);

    return recommendations.slice(0, opts.maxRecommendations);
  }

  // =====================================================================================
  // REPLENISHMENT MANAGEMENT
  // =====================================================================================

  async generateReplenishmentTasks(
    warehouseId: string,
    options?: {
      minThreshold?: number;
      maxThreshold?: number;
      prioritizeAItems?: boolean;
    },
  ): Promise<ReplenishmentTask[]> {
    this.logger.log(`Generating replenishment tasks for warehouse: ${warehouseId}`);

    const opts = {
      minThreshold: options?.minThreshold || this.REPLENISHMENT_MIN_THRESHOLD,
      maxThreshold: options?.maxThreshold || this.REPLENISHMENT_MAX_THRESHOLD,
      prioritizeAItems: options?.prioritizeAItems ?? true,
    };

    const tasks: ReplenishmentTask[] = [];

    // Find picking locations that need replenishment
    const pickingLocations = await this.db
      .select()
      .from(wmsLocations)
      .where(and(
        eq(wmsLocations.warehouseId, warehouseId),
        eq(wmsLocations.isPickingFace, true),
        eq(wmsLocations.status, 'available'),
      ));

    for (const pickLoc of pickingLocations) {
      const utilization = Number(pickLoc.currentQuantity) / Number(pickLoc.capacity);

      if (utilization > opts.minThreshold) continue; // Not below threshold

      // Find inventory in this location
      const inventory = await this.db
        .select()
        .from(wmsInventory)
        .where(eq(wmsInventory.locationId, pickLoc.id));

      if (inventory.length === 0) continue;

      for (const inv of inventory) {
        // Find bulk storage with same SKU
        const bulkInventory = await this.db
          .select()
          .from(wmsInventory)
          .where(and(
            eq(wmsInventory.warehouseId, warehouseId),
            eq(wmsInventory.sku, inv.sku),
          ));

        const bulkLocationsWithStock = await Promise.all(
          bulkInventory
            .filter(b => b.locationId !== inv.locationId)
            .map(async b => {
              const [loc] = await this.db
                .select()
                .from(wmsLocations)
                .where(and(
                  eq(wmsLocations.id, b.locationId),
                  eq(wmsLocations.isBulkStorage, true),
                ))
                .limit(1);
              return { inventory: b, location: loc };
            }),
        );

        const validBulkLocations = bulkLocationsWithStock.filter(b => b.location);

        if (validBulkLocations.length === 0) continue;

        // Use first bulk location (could be optimized)
        const source = validBulkLocations[0];

        // Calculate quantity to replenish
        const neededQty = Number(pickLoc.capacity) * opts.maxThreshold - Number(pickLoc.currentQuantity);
        const availableQty = Number(source.inventory.quantity);
        const replenishQty = Math.min(neededQty, availableQty);

        if (replenishQty <= 0) continue;

        // Determine priority
        let priority: 'urgent' | 'high' | 'normal' | 'low';
        if (utilization < 0.1) {
          priority = 'urgent';
        } else if (utilization < 0.15) {
          priority = 'high';
        } else {
          priority = 'normal';
        }

        tasks.push({
          sku: inv.sku,
          fromLocation: this.dbLocationToLocation(source.location),
          toLocation: this.dbLocationToLocation(pickLoc),
          quantity: replenishQty,
          priority,
          reason: `Picking location below ${(opts.minThreshold * 100).toFixed(0)}% capacity`,
          estimatedTime: 10, // minutes (simplified)
        });
      }
    }

    // Sort by priority
    const priorityOrder = { urgent: 1, high: 2, normal: 3, low: 4 };
    tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    this.logger.log(`Generated ${tasks.length} replenishment tasks`);

    return tasks;
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  private dbLocationToLocation(dbLoc: any): Location {
    return {
      id: dbLoc.id,
      code: dbLoc.code,
      warehouseId: dbLoc.warehouseId,
      type: dbLoc.type,
      zone: dbLoc.zone,
      aisle: dbLoc.aisle || undefined,
      rack: dbLoc.rack || undefined,
      shelf: dbLoc.shelf || undefined,
      bin: dbLoc.bin || undefined,
      capacity: Number(dbLoc.capacity),
      currentQuantity: Number(dbLoc.currentQuantity),
      availableCapacity: Number(dbLoc.capacity) - Number(dbLoc.currentQuantity),
      maxWeight: dbLoc.maxWeight ? Number(dbLoc.maxWeight) : undefined,
      currentWeight: dbLoc.currentWeight ? Number(dbLoc.currentWeight) : undefined,
      temperatureZone: dbLoc.temperatureZone || undefined,
      isPickingFace: dbLoc.isPickingFace,
      isBulkStorage: dbLoc.isBulkStorage,
      reservedForSku: dbLoc.reservedForSku || undefined,
      status: dbLoc.status,
    };
  }
}

// =====================================================================================
// END OF SERVICE
// =====================================================================================

