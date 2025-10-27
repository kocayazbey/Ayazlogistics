import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface Warehouse {
  id: string;
  name: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  zones: Zone[];
  aisles: Aisle[];
  dockDoors: DockDoor[];
}

interface Zone {
  id: string;
  name: string;
  type: 'receiving' | 'storage' | 'picking' | 'shipping' | 'cross_dock';
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  capacity: {
    volume: number;
    weight: number;
    pallets: number;
  };
  location: {
    x: number;
    y: number;
    z: number;
  };
  accessibility: 'high' | 'medium' | 'low';
  temperature: 'ambient' | 'cool' | 'cold' | 'frozen';
  security: 'standard' | 'high' | 'maximum';
}

interface Aisle {
  id: string;
  zoneId: string;
  number: number;
  length: number;
  width: number;
  height: number;
  capacity: {
    volume: number;
    weight: number;
    pallets: number;
  };
  accessibility: 'high' | 'medium' | 'low';
  equipment: string[];
}

interface DockDoor {
  id: string;
  zoneId: string;
  number: string;
  type: 'receiving' | 'shipping';
  capacity: {
    volume: number;
    weight: number;
    pallets: number;
  };
  accessibility: 'high' | 'medium' | 'low';
  equipment: string[];
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  weight: number;
  volume: number;
  currentLocation: Location;
  demandProfile: DemandProfile;
  handlingRequirements: HandlingRequirements;
  compatibility: Compatibility;
}

interface Location {
  zoneId: string;
  aisleId: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  address: string;
}

interface DemandProfile {
  frequency: 'high' | 'medium' | 'low';
  seasonality: 'high' | 'medium' | 'low';
  predictability: 'high' | 'medium' | 'low';
  volume: number; // units per month
  value: number; // total value per month
  trend: 'increasing' | 'stable' | 'decreasing';
}

interface HandlingRequirements {
  equipment: string[];
  temperature: 'ambient' | 'cool' | 'cold' | 'frozen';
  security: 'standard' | 'high' | 'maximum';
  fragility: 'low' | 'medium' | 'high';
  hazardous: boolean;
  expiration: boolean;
}

interface Compatibility {
  canShareLocation: boolean;
  incompatibleProducts: string[];
  preferredNeighbors: string[];
  requiredSeparation: number; // meters
}

interface SlottingRecommendation {
  productId: string;
  sku: string;
  currentLocation: Location;
  recommendedLocation: Location;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  expectedImprovement: {
    travelTime: number; // minutes
    laborCost: number; // currency
    spaceUtilization: number; // percentage
    accessibility: number; // 0-1
  };
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    cost: number;
    timeRequired: number; // hours
    resources: string[];
  };
}

interface OptimizationResult {
  warehouseId: string;
  totalProducts: number;
  optimizedProducts: number;
  recommendations: SlottingRecommendation[];
  summary: {
    totalTravelTimeReduction: number;
    totalLaborCostReduction: number;
    averageSpaceUtilizationImprovement: number;
    highPriorityMoves: number;
    mediumPriorityMoves: number;
    lowPriorityMoves: number;
  };
  implementation: {
    totalCost: number;
    totalTime: number;
    phases: ImplementationPhase[];
  };
}

interface ImplementationPhase {
  phase: number;
  name: string;
  products: string[];
  estimatedTime: number;
  estimatedCost: number;
  dependencies: string[];
}

@Injectable()
export class SlottingOptimizationService {
  private readonly logger = new Logger(SlottingOptimizationService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimizeSlotting(
    warehouse: Warehouse,
    products: Product[],
    constraints: {
      maxMoves: number;
      budgetLimit: number;
      timeLimit: number; // hours
      priorityProducts: string[];
      excludedProducts: string[];
    },
    options: {
      algorithm: 'abc_xyz' | 'correlation' | 'machine_learning' | 'hybrid';
      includeSeasonality: boolean;
      includeCompatibility: boolean;
      includeAccessibility: boolean;
      includeCost: boolean;
    },
  ): Promise<OptimizationResult> {
    this.logger.log(`Optimizing slotting for warehouse ${warehouse.id} with ${products.length} products`);

    const recommendations: SlottingRecommendation[] = [];
    
    // Filter products based on constraints
    const eligibleProducts = products.filter(product => 
      !constraints.excludedProducts.includes(product.id)
    );
    
    // Sort products by priority
    const sortedProducts = this.sortProductsByPriority(eligibleProducts, constraints.priorityProducts);
    
    // Generate recommendations for each product
    for (const product of sortedProducts) {
      if (recommendations.length >= constraints.maxMoves) break;
      
      const recommendation = await this.generateSlottingRecommendation(
        product,
        warehouse,
        products,
        options,
      );
      
      if (recommendation && this.isRecommendationValid(recommendation, constraints)) {
        recommendations.push(recommendation);
      }
    }
    
    // Sort recommendations by priority and impact
    recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.expectedImprovement.travelTime - a.expectedImprovement.travelTime;
    });
    
    // Generate implementation plan
    const implementation = this.generateImplementationPlan(recommendations, constraints);
    
    // Calculate summary
    const summary = this.calculateSummary(recommendations);
    
    const result: OptimizationResult = {
      warehouseId: warehouse.id,
      totalProducts: products.length,
      optimizedProducts: recommendations.length,
      recommendations,
      summary,
      implementation,
    };

    await this.saveOptimizationResult(result);
    await this.eventBus.emit('slotting.optimized', { result });

    return result;
  }

  private sortProductsByPriority(
    products: Product[],
    priorityProducts: string[],
  ): Product[] {
    return products.sort((a, b) => {
      const aPriority = priorityProducts.includes(a.id) ? 1 : 0;
      const bPriority = priorityProducts.includes(b.id) ? 1 : 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Sort by demand frequency and value
      const aScore = this.calculateProductScore(a);
      const bScore = this.calculateProductScore(b);
      
      return bScore - aScore;
    });
  }

  private calculateProductScore(product: Product): number {
    const frequencyScore = {
      'high': 3,
      'medium': 2,
      'low': 1,
    }[product.demandProfile.frequency];
    
    const valueScore = Math.log10(product.demandProfile.value + 1);
    const volumeScore = Math.log10(product.demandProfile.volume + 1);
    
    return frequencyScore + valueScore + volumeScore;
  }

  private async generateSlottingRecommendation(
    product: Product,
    warehouse: Warehouse,
    allProducts: Product[],
    options: any,
  ): Promise<SlottingRecommendation | null> {
    // Find best location for the product
    const bestLocation = await this.findBestLocation(product, warehouse, allProducts, options);
    
    if (!bestLocation || this.isSameLocation(product.currentLocation, bestLocation)) {
      return null;
    }
    
    // Calculate expected improvements
    const improvements = await this.calculateImprovements(
      product,
      product.currentLocation,
      bestLocation,
      warehouse,
    );
    
    // Determine priority
    const priority = this.determinePriority(product, improvements);
    
    // Generate reason
    const reason = this.generateReason(product, bestLocation, improvements);
    
    // Calculate implementation details
    const implementation = this.calculateImplementation(product, bestLocation, warehouse);
    
    return {
      productId: product.id,
      sku: product.sku,
      currentLocation: product.currentLocation,
      recommendedLocation: bestLocation,
      reason,
      priority,
      expectedImprovement: improvements,
      implementation,
    };
  }

  private async findBestLocation(
    product: Product,
    warehouse: Warehouse,
    allProducts: Product[],
    options: any,
  ): Promise<Location | null> {
    let bestLocation: Location | null = null;
    let bestScore = -1;
    
    // Consider all zones and aisles
    for (const zone of warehouse.zones) {
      if (!this.isZoneCompatible(product, zone)) continue;
      
      for (const aisle of zone.aisles) {
        if (!this.isAisleCompatible(product, aisle)) continue;
        
        // Find best position in aisle
        const position = this.findBestPositionInAisle(product, aisle, allProducts);
        if (!position) continue;
        
        const location: Location = {
          zoneId: zone.id,
          aisleId: aisle.id,
          position,
          address: this.generateAddress(zone, aisle, position),
        };
        
        const score = this.calculateLocationScore(product, location, warehouse, allProducts, options);
        
        if (score > bestScore) {
          bestScore = score;
          bestLocation = location;
        }
      }
    }
    
    return bestLocation;
  }

  private isZoneCompatible(product: Product, zone: Zone): boolean {
    // Check temperature requirements
    if (product.handlingRequirements.temperature !== zone.temperature) {
      return false;
    }
    
    // Check security requirements
    const securityLevels = { standard: 1, high: 2, maximum: 3 };
    if (securityLevels[product.handlingRequirements.security] > securityLevels[zone.security]) {
      return false;
    }
    
    // Check zone type compatibility
    if (product.demandProfile.frequency === 'high' && zone.accessibility === 'low') {
      return false;
    }
    
    return true;
  }

  private isAisleCompatible(product: Product, aisle: Aisle): boolean {
    // Check capacity
    if (product.volume > aisle.capacity.volume || product.weight > aisle.capacity.weight) {
      return false;
    }
    
    // Check accessibility
    if (product.demandProfile.frequency === 'high' && aisle.accessibility === 'low') {
      return false;
    }
    
    // Check equipment requirements
    for (const equipment of product.handlingRequirements.equipment) {
      if (!aisle.equipment.includes(equipment)) {
        return false;
      }
    }
    
    return true;
  }

  private findBestPositionInAisle(
    product: Product,
    aisle: Aisle,
    allProducts: Product[],
  ): { x: number; y: number; z: number } | null {
    // Find available positions in aisle
    const occupiedPositions = this.getOccupiedPositions(aisle, allProducts);
    
    // Sort positions by accessibility and proximity to aisle entrance
    const availablePositions = this.getAvailablePositions(aisle, occupiedPositions);
    
    if (availablePositions.length === 0) return null;
    
    // Find best position based on accessibility and compatibility
    let bestPosition = availablePositions[0];
    let bestScore = this.calculatePositionScore(product, bestPosition, aisle, allProducts);
    
    for (let i = 1; i < availablePositions.length; i++) {
      const position = availablePositions[i];
      const score = this.calculatePositionScore(product, position, aisle, allProducts);
      
      if (score > bestScore) {
        bestScore = score;
        bestPosition = position;
      }
    }
    
    return bestPosition;
  }

  private getOccupiedPositions(aisle: Aisle, allProducts: Product[]): { x: number; y: number; z: number }[] {
    return allProducts
      .filter(product => product.currentLocation.aisleId === aisle.id)
      .map(product => product.currentLocation.position);
  }

  private getAvailablePositions(
    aisle: Aisle,
    occupiedPositions: { x: number; y: number; z: number }[],
  ): { x: number; y: number; z: number }[] {
    const positions: { x: number; y: number; z: number }[] = [];
    const gridSize = 1; // 1 meter grid
    
    for (let x = 0; x < aisle.length; x += gridSize) {
      for (let y = 0; y < aisle.width; y += gridSize) {
        for (let z = 0; z < aisle.height; z += gridSize) {
          const position = { x, y, z };
          
          // Check if position is occupied
          const isOccupied = occupiedPositions.some(occupied => 
            this.isPositionOccupied(position, occupied, gridSize)
          );
          
          if (!isOccupied) {
            positions.push(position);
          }
        }
      }
    }
    
    return positions;
  }

  private isPositionOccupied(
    position: { x: number; y: number; z: number },
    occupied: { x: number; y: number; z: number },
    gridSize: number,
  ): boolean {
    return (
      Math.abs(position.x - occupied.x) < gridSize &&
      Math.abs(position.y - occupied.y) < gridSize &&
      Math.abs(position.z - occupied.z) < gridSize
    );
  }

  private calculatePositionScore(
    product: Product,
    position: { x: number; y: number; z: number },
    aisle: Aisle,
    allProducts: Product[],
  ): number {
    let score = 0;
    
    // Accessibility score (closer to aisle entrance is better)
    const distanceToEntrance = Math.sqrt(position.x * position.x + position.y * position.y);
    score += 100 / (distanceToEntrance + 1);
    
    // Compatibility with nearby products
    const nearbyProducts = this.getNearbyProducts(position, allProducts, 2); // 2 meter radius
    for (const nearbyProduct of nearbyProducts) {
      if (product.compatibility.preferredNeighbors.includes(nearbyProduct.id)) {
        score += 50;
      }
      if (product.compatibility.incompatibleProducts.includes(nearbyProduct.id)) {
        score -= 100;
      }
    }
    
    // Height preference (ground level is better for heavy items)
    if (product.weight > 100 && position.z === 0) {
      score += 30;
    }
    
    // Zone accessibility
    const zone = this.getZoneById(aisle.zoneId);
    if (zone) {
      const accessibilityScore = { high: 3, medium: 2, low: 1 }[zone.accessibility];
      score += accessibilityScore * 20;
    }
    
    return score;
  }

  private getNearbyProducts(
    position: { x: number; y: number; z: number },
    allProducts: Product[],
    radius: number,
  ): Product[] {
    return allProducts.filter(product => {
      const distance = Math.sqrt(
        Math.pow(position.x - product.currentLocation.position.x, 2) +
        Math.pow(position.y - product.currentLocation.position.y, 2) +
        Math.pow(position.z - product.currentLocation.position.z, 2)
      );
      return distance <= radius;
    });
  }

  private getZoneById(zoneId: string): Zone | null {
    // This would typically query the database
    // For now, returning null
    return null;
  }

  private calculateLocationScore(
    product: Product,
    location: Location,
    warehouse: Warehouse,
    allProducts: Product[],
    options: any,
  ): number {
    let score = 0;
    
    // Demand-based scoring
    if (options.algorithm === 'abc_xyz' || options.algorithm === 'hybrid') {
      score += this.calculateABCScore(product, location);
    }
    
    // Correlation-based scoring
    if (options.algorithm === 'correlation' || options.algorithm === 'hybrid') {
      score += this.calculateCorrelationScore(product, location, allProducts);
    }
    
    // Machine learning scoring
    if (options.algorithm === 'machine_learning' || options.algorithm === 'hybrid') {
      score += this.calculateMLScore(product, location, warehouse);
    }
    
    // Accessibility scoring
    if (options.includeAccessibility) {
      score += this.calculateAccessibilityScore(product, location, warehouse);
    }
    
    // Cost-based scoring
    if (options.includeCost) {
      score += this.calculateCostScore(product, location, warehouse);
    }
    
    return score;
  }

  private calculateABCScore(product: Product, location: Location): number {
    let score = 0;
    
    // A items should be in high accessibility locations
    if (product.demandProfile.frequency === 'high') {
      score += 100;
    }
    
    // B items in medium accessibility locations
    if (product.demandProfile.frequency === 'medium') {
      score += 50;
    }
    
    // C items can be in low accessibility locations
    if (product.demandProfile.frequency === 'low') {
      score += 10;
    }
    
    return score;
  }

  private calculateCorrelationScore(
    product: Product,
    location: Location,
    allProducts: Product[],
  ): number {
    let score = 0;
    
    // Find products that are frequently ordered together
    const correlatedProducts = this.findCorrelatedProducts(product, allProducts);
    
    for (const correlatedProduct of correlatedProducts) {
      const distance = this.calculateDistance(location, correlatedProduct.currentLocation);
      
      // Closer correlated products get higher scores
      if (distance < 5) {
        score += 50;
      } else if (distance < 10) {
        score += 25;
      } else if (distance < 20) {
        score += 10;
      }
    }
    
    return score;
  }

  private findCorrelatedProducts(product: Product, allProducts: Product[]): Product[] {
    // Simplified correlation calculation
    // In a real implementation, this would use historical order data
    return allProducts.filter(p => 
      p.id !== product.id && 
      p.category === product.category
    );
  }

  private calculateMLScore(product: Product, location: Location, warehouse: Warehouse): number {
    // Machine learning-based scoring
    // This would use a trained model to predict the best location
    const features = this.extractLocationFeatures(product, location, warehouse);
    const prediction = this.predictLocationScore(features);
    
    return prediction;
  }

  private extractLocationFeatures(
    product: Product,
    location: Location,
    warehouse: Warehouse,
  ): number[] {
    return [
      product.demandProfile.volume,
      product.demandProfile.value,
      product.dimensions.volume,
      product.weight,
      location.position.x,
      location.position.y,
      location.position.z,
      product.demandProfile.frequency === 'high' ? 1 : 0,
      product.demandProfile.frequency === 'medium' ? 1 : 0,
      product.demandProfile.frequency === 'low' ? 1 : 0,
    ];
  }

  private predictLocationScore(features: number[]): number {
    // Simplified ML prediction
    // In a real implementation, this would use a trained model
    const weights = [0.2, 0.15, 0.1, 0.1, 0.1, 0.1, 0.05, 0.1, 0.05, 0.05];
    return features.reduce((sum, feature, i) => sum + feature * weights[i], 0);
  }

  private calculateAccessibilityScore(
    product: Product,
    location: Location,
    warehouse: Warehouse,
  ): number {
    let score = 0;
    
    // Distance to dock doors
    const dockDoors = warehouse.dockDoors;
    let minDistanceToDock = Infinity;
    
    for (const dockDoor of dockDoors) {
      const distance = this.calculateDistance(location, {
        zoneId: dockDoor.zoneId,
        aisleId: '',
        position: { x: 0, y: 0, z: 0 },
        address: '',
      });
      minDistanceToDock = Math.min(minDistanceToDock, distance);
    }
    
    // Closer to dock doors is better
    score += 100 / (minDistanceToDock + 1);
    
    // Zone accessibility
    const zone = warehouse.zones.find(z => z.id === location.zoneId);
    if (zone) {
      const accessibilityScore = { high: 3, medium: 2, low: 1 }[zone.accessibility];
      score += accessibilityScore * 30;
    }
    
    return score;
  }

  private calculateCostScore(
    product: Product,
    location: Location,
    warehouse: Warehouse,
  ): number {
    let score = 0;
    
    // Storage cost (lower is better)
    const storageCost = this.calculateStorageCost(product, location, warehouse);
    score += 100 / (storageCost + 1);
    
    // Handling cost (lower is better)
    const handlingCost = this.calculateHandlingCost(product, location, warehouse);
    score += 100 / (handlingCost + 1);
    
    return score;
  }

  private calculateStorageCost(
    product: Product,
    location: Location,
    warehouse: Warehouse,
  ): number {
    // Simplified storage cost calculation
    const zone = warehouse.zones.find(z => z.id === location.zoneId);
    if (!zone) return 0;
    
    const baseCost = 10; // Base cost per cubic meter
    const zoneMultiplier = { high: 1.5, medium: 1.0, low: 0.7 }[zone.accessibility];
    
    return product.volume * baseCost * zoneMultiplier;
  }

  private calculateHandlingCost(
    product: Product,
    location: Location,
    warehouse: Warehouse,
  ): number {
    // Simplified handling cost calculation
    const distanceToDock = this.calculateDistanceToDock(location, warehouse);
    const baseCost = 0.5; // Cost per meter
    
    return distanceToDock * baseCost * product.demandProfile.volume;
  }

  private calculateDistanceToDock(location: Location, warehouse: Warehouse): number {
    const dockDoors = warehouse.dockDoors;
    let minDistance = Infinity;
    
    for (const dockDoor of dockDoors) {
      const distance = this.calculateDistance(location, {
        zoneId: dockDoor.zoneId,
        aisleId: '',
        position: { x: 0, y: 0, z: 0 },
        address: '',
      });
      minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
  }

  private calculateDistance(location1: Location, location2: Location): number {
    const dx = location1.position.x - location2.position.x;
    const dy = location1.position.y - location2.position.y;
    const dz = location1.position.z - location2.position.z;
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private generateAddress(zone: Zone, aisle: Aisle, position: { x: number; y: number; z: number }): string {
    return `${zone.name}-${aisle.number}-${position.x}-${position.y}-${position.z}`;
  }

  private isSameLocation(location1: Location, location2: Location): boolean {
    return (
      location1.zoneId === location2.zoneId &&
      location1.aisleId === location2.aisleId &&
      location1.position.x === location2.position.x &&
      location1.position.y === location2.position.y &&
      location1.position.z === location2.position.z
    );
  }

  private async calculateImprovements(
    product: Product,
    currentLocation: Location,
    newLocation: Location,
    warehouse: Warehouse,
  ): Promise<any> {
    const currentTravelTime = this.calculateTravelTime(product, currentLocation, warehouse);
    const newTravelTime = this.calculateTravelTime(product, newLocation, warehouse);
    
    const currentLaborCost = this.calculateLaborCost(product, currentLocation, warehouse);
    const newLaborCost = this.calculateLaborCost(product, newLocation, warehouse);
    
    const currentSpaceUtilization = this.calculateSpaceUtilization(currentLocation, warehouse);
    const newSpaceUtilization = this.calculateSpaceUtilization(newLocation, warehouse);
    
    const currentAccessibility = this.calculateAccessibility(currentLocation, warehouse);
    const newAccessibility = this.calculateAccessibility(newLocation, warehouse);
    
    return {
      travelTime: currentTravelTime - newTravelTime,
      laborCost: currentLaborCost - newLaborCost,
      spaceUtilization: newSpaceUtilization - currentSpaceUtilization,
      accessibility: newAccessibility - currentAccessibility,
    };
  }

  private calculateTravelTime(product: Product, location: Location, warehouse: Warehouse): number {
    // Simplified travel time calculation
    const distanceToDock = this.calculateDistanceToDock(location, warehouse);
    const averageSpeed = 1.5; // meters per second
    
    return distanceToDock / averageSpeed / 60; // minutes
  }

  private calculateLaborCost(product: Product, location: Location, warehouse: Warehouse): number {
    const travelTime = this.calculateTravelTime(product, location, warehouse);
    const laborRate = 50; // TL per hour
    
    return travelTime * laborRate / 60;
  }

  private calculateSpaceUtilization(location: Location, warehouse: Warehouse): number {
    // Simplified space utilization calculation
    const zone = warehouse.zones.find(z => z.id === location.zoneId);
    if (!zone) return 0;
    
    const zoneUtilization = 0.8; // 80% utilization
    const accessibilityFactor = { high: 1.0, medium: 0.8, low: 0.6 }[zone.accessibility];
    
    return zoneUtilization * accessibilityFactor;
  }

  private calculateAccessibility(location: Location, warehouse: Warehouse): number {
    const zone = warehouse.zones.find(z => z.id === location.zoneId);
    if (!zone) return 0;
    
    return { high: 1.0, medium: 0.7, low: 0.4 }[zone.accessibility];
  }

  private determinePriority(product: Product, improvements: any): 'high' | 'medium' | 'low' {
    const totalImprovement = 
      improvements.travelTime * 0.4 +
      improvements.laborCost * 0.3 +
      improvements.spaceUtilization * 0.2 +
      improvements.accessibility * 0.1;
    
    if (totalImprovement > 50) return 'high';
    if (totalImprovement > 20) return 'medium';
    return 'low';
  }

  private generateReason(
    product: Product,
    location: Location,
    improvements: any,
  ): string {
    const reasons = [];
    
    if (improvements.travelTime > 10) {
      reasons.push(`Reduce travel time by ${improvements.travelTime.toFixed(1)} minutes`);
    }
    
    if (improvements.laborCost > 100) {
      reasons.push(`Save ${improvements.laborCost.toFixed(2)} TL in labor costs`);
    }
    
    if (improvements.spaceUtilization > 0.1) {
      reasons.push(`Improve space utilization by ${(improvements.spaceUtilization * 100).toFixed(1)}%`);
    }
    
    if (improvements.accessibility > 0.2) {
      reasons.push(`Improve accessibility by ${(improvements.accessibility * 100).toFixed(1)}%`);
    }
    
    return reasons.join('; ');
  }

  private calculateImplementation(
    product: Product,
    location: Location,
    warehouse: Warehouse,
  ): any {
    const distance = this.calculateDistance(product.currentLocation, location);
    const difficulty = distance > 50 ? 'hard' : distance > 20 ? 'medium' : 'easy';
    const cost = distance * 10; // 10 TL per meter
    const timeRequired = distance * 0.5; // 0.5 hours per meter
    
    return {
      difficulty,
      cost,
      timeRequired,
      resources: ['forklift', 'operator', 'supervisor'],
    };
  }

  private isRecommendationValid(
    recommendation: SlottingRecommendation,
    constraints: any,
  ): boolean {
    return (
      recommendation.implementation.cost <= constraints.budgetLimit &&
      recommendation.implementation.timeRequired <= constraints.timeLimit
    );
  }

  private generateImplementationPlan(
    recommendations: SlottingRecommendation[],
    constraints: any,
  ): any {
    const phases: ImplementationPhase[] = [];
    let currentPhase = 1;
    let currentCost = 0;
    let currentTime = 0;
    let phaseProducts: string[] = [];
    
    for (const recommendation of recommendations) {
      if (
        currentCost + recommendation.implementation.cost > constraints.budgetLimit ||
        currentTime + recommendation.implementation.timeRequired > constraints.timeLimit
      ) {
        // Start new phase
        if (phaseProducts.length > 0) {
          phases.push({
            phase: currentPhase,
            name: `Phase ${currentPhase}`,
            products: [...phaseProducts],
            estimatedTime: currentTime,
            estimatedCost: currentCost,
            dependencies: [],
          });
          
          currentPhase++;
          currentCost = 0;
          currentTime = 0;
          phaseProducts = [];
        }
      }
      
      phaseProducts.push(recommendation.productId);
      currentCost += recommendation.implementation.cost;
      currentTime += recommendation.implementation.timeRequired;
    }
    
    // Add final phase
    if (phaseProducts.length > 0) {
      phases.push({
        phase: currentPhase,
        name: `Phase ${currentPhase}`,
        products: phaseProducts,
        estimatedTime: currentTime,
        estimatedCost: currentCost,
        dependencies: [],
      });
    }
    
    const totalCost = phases.reduce((sum, phase) => sum + phase.estimatedCost, 0);
    const totalTime = phases.reduce((sum, phase) => sum + phase.estimatedTime, 0);
    
    return {
      totalCost,
      totalTime,
      phases,
    };
  }

  private calculateSummary(recommendations: SlottingRecommendation[]): any {
    const totalTravelTimeReduction = recommendations.reduce(
      (sum, rec) => sum + rec.expectedImprovement.travelTime,
      0,
    );
    
    const totalLaborCostReduction = recommendations.reduce(
      (sum, rec) => sum + rec.expectedImprovement.laborCost,
      0,
    );
    
    const averageSpaceUtilizationImprovement = recommendations.reduce(
      (sum, rec) => sum + rec.expectedImprovement.spaceUtilization,
      0,
    ) / recommendations.length;
    
    const highPriorityMoves = recommendations.filter(rec => rec.priority === 'high').length;
    const mediumPriorityMoves = recommendations.filter(rec => rec.priority === 'medium').length;
    const lowPriorityMoves = recommendations.filter(rec => rec.priority === 'low').length;
    
    return {
      totalTravelTimeReduction,
      totalLaborCostReduction,
      averageSpaceUtilizationImprovement,
      highPriorityMoves,
      mediumPriorityMoves,
      lowPriorityMoves,
    };
  }

  private async saveOptimizationResult(result: OptimizationResult): Promise<void> {
    try {
      await this.db.execute(`
        INSERT INTO slotting_optimization_results 
        (warehouse_id, total_products, optimized_products, total_travel_time_reduction,
         total_labor_cost_reduction, average_space_utilization_improvement, high_priority_moves,
         medium_priority_moves, low_priority_moves, total_cost, total_time, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        result.warehouseId,
        result.totalProducts,
        result.optimizedProducts,
        result.summary.totalTravelTimeReduction,
        result.summary.totalLaborCostReduction,
        result.summary.averageSpaceUtilizationImprovement,
        result.summary.highPriorityMoves,
        result.summary.mediumPriorityMoves,
        result.summary.lowPriorityMoves,
        result.implementation.totalCost,
        result.implementation.totalTime,
      ]);
    } catch (error) {
      this.logger.error('Failed to save slotting optimization result:', error);
    }
  }
}

