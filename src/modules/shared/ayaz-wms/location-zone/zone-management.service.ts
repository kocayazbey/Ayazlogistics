import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, inArray, sql, gte, lte } from 'drizzle-orm';
import { locations, zones, pickingRoutes, locationGroups, putawayStrategies } from '../../../../database/schema/shared/wms-advanced.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';
import { CacheService } from '../../common/services/cache.service';

interface Zone {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  type: 'pick' | 'storage' | 'reserve' | 'staging' | 'shipping' | 'receiving';
  priority: number;
  velocityClass: 'A' | 'B' | 'C' | 'D';
  accessType: 'VNA' | 'RT' | 'TT' | 'standard';
  maxHeight: number;
  aisleWidth: number;
  aisles: Array<{
    aisleCode: string;
    side: 'left' | 'right' | 'both';
    rackCount: number;
    levelCount: number;
  }>;
  pickingStrategy: 'FIFO' | 'FEFO' | 'LIFO' | 'ZONE_BASED';
  replenishmentType: 'auto' | 'manual' | 'wave_based';
  allowedEquipment: string[];
  restrictions: {
    hazmat: boolean;
    coldChain: boolean;
    heavyItems: boolean;
    maxWeight: number;
  };
}

interface PickingRoute {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  zoneSequence: string[];
  optimizationType: 'distance' | 'time' | 'zone_sequence';
  waypoints: Array<{
    sequence: number;
    locationCode: string;
    zone: string;
    aisle: string;
    estimatedTime: number;
  }>;
  totalDistance: number;
  estimatedDuration: number;
  active: boolean;
}

interface PutawayStrategy {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  priority: number;
  rules: Array<{
    condition: string;
    operator: '=' | '>' | '<' | '>=' | '<=' | 'IN' | 'BETWEEN';
    value: any;
    targetZone?: string;
    targetLocationType?: string;
  }>;
  slottingRules: {
    useVelocity: boolean;
    useCubicUtilization: boolean;
    useWeightDistribution: boolean;
    preferGroundLevel: boolean;
    groupSimilarProducts: boolean;
  };
}

interface LocationGroup {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  locationIds: string[];
  groupType: 'zone' | 'aisle' | 'rack' | 'custom';
  metadata: {
    color?: string;
    icon?: string;
    description?: string;
  };
  restrictions: {
    products?: string[];
    customers?: string[];
    allowedOperations?: string[];
  };
}

interface BulkLocationCreate {
  warehouseId: string;
  prefix: string;
  startZone: string;
  endZone: string;
  aislesPerZone: number;
  racksPerAisle: number;
  levelsPerRack: number;
  positionsPerLevel: number;
  locationType: string;
  capacity: number;
  maxWeight: number;
  height: number;
}

@Injectable()
export class ZoneManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Toplu Göz Oluşturma İşlemi
   * Bulk location creation with zone/aisle/rack/level structure
   */
  async bulkCreateLocations(data: BulkLocationCreate, userId: string): Promise<any> {
    const createdLocations = [];
    let totalCreated = 0;
    const errors = [];

    try {
      // Parse zone range
      const zones = this.generateZoneRange(data.startZone, data.endZone);

      for (const zoneCode of zones) {
        // Create or get zone
        let zone = await this.getZoneByCode(zoneCode, data.warehouseId);
        if (!zone) {
          zone = await this.createZone({
            code: zoneCode,
            name: `Zone ${zoneCode}`,
            warehouseId: data.warehouseId,
            type: 'storage',
            velocityClass: this.determineVelocityClass(zoneCode),
          }, userId);
        }

        // Create aisles
        for (let aisleNum = 1; aisleNum <= data.aislesPerZone; aisleNum++) {
          const aisleCode = `${zoneCode}-${String(aisleNum).padStart(2, '0')}`;

          // Create racks
          for (let rackNum = 1; rackNum <= data.racksPerAisle; rackNum++) {
            const side = rackNum % 2 === 0 ? 'R' : 'L';
            const rackCode = `${aisleCode}-${side}${String(Math.ceil(rackNum / 2)).padStart(2, '0')}`;

            // Create levels
            for (let level = 1; level <= data.levelsPerRack; level++) {
              const levelCode = `${rackCode}-L${String(level).padStart(2, '0')}`;

              // Create positions
              for (let pos = 1; pos <= data.positionsPerLevel; pos++) {
                const locationCode = `${levelCode}-P${String(pos).padStart(2, '0')}`;

                try {
                  const location = await this.createSingleLocation({
                    code: locationCode,
                    warehouseId: data.warehouseId,
                    zone: zoneCode,
                    aisle: aisleCode,
                    rack: rackCode,
                    level: String(level),
                    position: String(pos),
                    locationType: data.locationType,
                    capacity: data.capacity,
                    maxWeight: data.maxWeight,
                    height: data.height,
                    side,
                  });

                  createdLocations.push(location);
                  totalCreated++;

                  if (totalCreated % 100 === 0) {
                    this.wsGateway.sendToRoom(`warehouse:${data.warehouseId}`, 'bulk:progress', {
                      created: totalCreated,
                      zone: zoneCode,
                      aisle: aisleNum,
                    });
                  }
                } catch (error) {
                  errors.push({
                    locationCode,
                    error: error.message,
                  });
                }
              }
            }
          }
        }
      }

      await this.eventBus.emit('locations.bulk.created', {
        warehouseId: data.warehouseId,
        totalCreated,
        zones: zones.length,
        userId,
      });

      // Invalidate cache
      await this.cacheService.del(`locations:${data.warehouseId}`);

      return {
        success: true,
        totalCreated,
        zones: zones.length,
        aislesPerZone: data.aislesPerZone,
        racksPerAisle: data.racksPerAisle,
        levelsPerRack: data.levelsPerRack,
        positionsPerLevel: data.positionsPerLevel,
        expectedTotal: zones.length * data.aislesPerZone * data.racksPerAisle * data.levelsPerRack * data.positionsPerLevel,
        actualTotal: totalCreated,
        errors: errors.length > 0 ? errors : undefined,
        generatedCodes: createdLocations.slice(0, 10).map(l => l.code),
      };
    } catch (error) {
      throw new BadRequestException(`Bulk creation failed: ${error.message}`);
    }
  }

  /**
   * Zone Kodları Tanımlama
   * Define and manage warehouse zones
   */
  async createZone(data: Partial<Zone>, userId: string): Promise<Zone> {
    const zoneId = `ZONE-${Date.now()}`;

    const zone: Zone = {
      id: zoneId,
      code: data.code,
      name: data.name,
      warehouseId: data.warehouseId,
      type: data.type || 'storage',
      priority: data.priority || 50,
      velocityClass: data.velocityClass || 'C',
      accessType: data.accessType || 'standard',
      maxHeight: data.maxHeight || 6,
      aisleWidth: data.aisleWidth || 3,
      aisles: data.aisles || [],
      pickingStrategy: data.pickingStrategy || 'FIFO',
      replenishmentType: data.replenishmentType || 'manual',
      allowedEquipment: data.allowedEquipment || ['standard', 'RT'],
      restrictions: data.restrictions || {
        hazmat: false,
        coldChain: false,
        heavyItems: false,
        maxWeight: 1000,
      },
    };

    await this.eventBus.emit('zone.created', { zoneId, code: zone.code, warehouseId: zone.warehouseId });

    return zone;
  }

  /**
   * Toplama Rotaları Tanımlama İşlemi
   * Define optimized picking routes through warehouse
   */
  async createPickingRoute(data: {
    code: string;
    name: string;
    warehouseId: string;
    zones: string[];
    optimizationType: 'distance' | 'time' | 'zone_sequence';
  }, userId: string): Promise<PickingRoute> {
    const routeId = `ROUTE-${Date.now()}`;

    // Get all locations in specified zones
    const zoneLocations = await this.getLocationsByZones(data.zones, data.warehouseId);

    // Calculate waypoints
    const waypoints = await this.calculateOptimalWaypoints(zoneLocations, data.optimizationType);

    // Calculate total distance
    const totalDistance = waypoints.reduce((sum, wp, idx) => {
      if (idx === 0) return 0;
      return sum + this.calculateDistance(waypoints[idx - 1], wp);
    }, 0);

    // Estimate duration (assuming 100m/min walking speed + 30sec per pick)
    const estimatedDuration = (totalDistance / 100) + (waypoints.length * 0.5);

    const route: PickingRoute = {
      id: routeId,
      code: data.code,
      name: data.name,
      warehouseId: data.warehouseId,
      zoneSequence: data.zones,
      optimizationType: data.optimizationType,
      waypoints,
      totalDistance,
      estimatedDuration,
      active: true,
    };

    await this.eventBus.emit('picking.route.created', {
      routeId,
      code: data.code,
      warehouseId: data.warehouseId,
      waypoints: waypoints.length,
    });

    return route;
  }

  /**
   * Yerleştirme Stratejileri Tanımlama
   * Define putaway strategies with complex rules
   */
  async createPutawayStrategy(data: {
    code: string;
    name: string;
    warehouseId: string;
    priority: number;
    rules: any[];
    slottingRules: any;
  }, userId: string): Promise<PutawayStrategy> {
    const strategyId = `STRAT-${Date.now()}`;

    const strategy: PutawayStrategy = {
      id: strategyId,
      code: data.code,
      name: data.name,
      warehouseId: data.warehouseId,
      priority: data.priority,
      rules: data.rules,
      slottingRules: data.slottingRules || {
        useVelocity: true,
        useCubicUtilization: true,
        useWeightDistribution: true,
        preferGroundLevel: false,
        groupSimilarProducts: true,
      },
    };

    await this.eventBus.emit('putaway.strategy.created', {
      strategyId,
      code: data.code,
      warehouseId: data.warehouseId,
    });

    return strategy;
  }

  /**
   * Evaluate putaway strategy for product
   */
  async evaluatePutawayStrategy(data: {
    productId: string;
    quantity: number;
    weight: number;
    dimensions: { length: number; width: number; height: number };
    warehouseId: string;
    velocity?: number;
  }): Promise<any> {
    const strategies = await this.getPutawayStrategies(data.warehouseId);

    // Sort by priority
    strategies.sort((a, b) => b.priority - a.priority);

    for (const strategy of strategies) {
      const matchResult = await this.evaluateStrategyRules(strategy, data);

      if (matchResult.matched) {
        const suggestedLocation = await this.findLocationByStrategy(strategy, data);

        return {
          strategyId: strategy.id,
          strategyName: strategy.name,
          matched: true,
          suggestedLocation,
          reasoning: matchResult.reasoning,
        };
      }
    }

    // Fallback to default strategy
    return {
      strategyId: 'default',
      strategyName: 'Default Strategy',
      matched: true,
      suggestedLocation: await this.findFirstAvailableLocation(data.warehouseId),
      reasoning: 'No specific strategy matched, using default',
    };
  }

  /**
   * Adresleri Gruplama
   * Group locations for easier management
   */
  async createLocationGroup(data: {
    code: string;
    name: string;
    warehouseId: string;
    groupType: 'zone' | 'aisle' | 'rack' | 'custom';
    locationCodes?: string[];
    zoneCode?: string;
    aisleCode?: string;
    restrictions?: any;
  }, userId: string): Promise<LocationGroup> {
    const groupId = `GRP-${Date.now()}`;

    let locationIds: string[] = [];

    if (data.locationCodes) {
      // Explicit location list
      locationIds = await this.getLocationIdsByCodes(data.locationCodes, data.warehouseId);
    } else if (data.zoneCode) {
      // All locations in zone
      locationIds = await this.getLocationIdsByZone(data.zoneCode, data.warehouseId);
    } else if (data.aisleCode) {
      // All locations in aisle
      locationIds = await this.getLocationIdsByAisle(data.aisleCode, data.warehouseId);
    }

    const group: LocationGroup = {
      id: groupId,
      code: data.code,
      name: data.name,
      warehouseId: data.warehouseId,
      locationIds,
      groupType: data.groupType,
      metadata: {
        color: this.generateGroupColor(data.groupType),
        icon: this.getGroupIcon(data.groupType),
        description: `Auto-generated ${data.groupType} group`,
      },
      restrictions: data.restrictions || {},
    };

    await this.eventBus.emit('location.group.created', {
      groupId,
      code: data.code,
      locationCount: locationIds.length,
    });

    return group;
  }

  /**
   * Adresleri Açma/Kapatma
   * Bulk open/close locations
   */
  async bulkToggleLocations(data: {
    locationIds?: string[];
    groupId?: string;
    zoneCode?: string;
    action: 'open' | 'close';
    reason: string;
    warehouseId: string;
  }, userId: string): Promise<any> {
    let targetLocationIds: string[] = [];

    if (data.locationIds) {
      targetLocationIds = data.locationIds;
    } else if (data.groupId) {
      const group = await this.getLocationGroup(data.groupId);
      targetLocationIds = group.locationIds;
    } else if (data.zoneCode) {
      targetLocationIds = await this.getLocationIdsByZone(data.zoneCode, data.warehouseId);
    } else {
      throw new BadRequestException('Must specify locationIds, groupId, or zoneCode');
    }

    const isLocked = data.action === 'close';
    const updated = [];

    for (const locationId of targetLocationIds) {
      try {
        // Check if location has inventory when closing
        if (isLocked) {
          const hasInventory = await this.checkLocationHasInventory(locationId);
          if (hasInventory) {
            errors.push({
              locationId,
              error: 'Location has inventory, cannot close',
            });
            continue;
          }
        }

        await this.updateLocationLockStatus(locationId, isLocked, data.reason);
        updated.push(locationId);
      } catch (error) {
        errors.push({
          locationId,
          error: error.message,
        });
      }
    }

    await this.eventBus.emit('locations.bulk.toggled', {
      warehouseId: data.warehouseId,
      action: data.action,
      updated: updated.length,
      failed: errors.length,
      userId,
    });

    this.wsGateway.sendToRoom(`warehouse:${data.warehouseId}`, 'locations:bulk:update', {
      action: data.action,
      updated: updated.length,
    });

    return {
      action: data.action,
      requested: targetLocationIds.length,
      updated: updated.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Göz Bilgilerini Toplu Halde Değiştirme İşlemi
   * Bulk update location attributes
   */
  async bulkUpdateLocations(data: {
    locationIds?: string[];
    groupId?: string;
    zoneCode?: string;
    updates: {
      locationType?: string;
      capacity?: number;
      maxWeight?: number;
      height?: number;
      allowMixedProducts?: boolean;
      pickingPriority?: number;
      replenishmentLevel?: number;
    };
    warehouseId: string;
  }, userId: string): Promise<any> {
    let targetLocationIds: string[] = [];

    if (data.locationIds) {
      targetLocationIds = data.locationIds;
    } else if (data.groupId) {
      const group = await this.getLocationGroup(data.groupId);
      targetLocationIds = group.locationIds;
    } else if (data.zoneCode) {
      targetLocationIds = await this.getLocationIdsByZone(data.zoneCode, data.warehouseId);
    }

    const updated = [];

    for (const locationId of targetLocationIds) {
      await this.updateLocation(locationId, data.updates);
      updated.push(locationId);
    }

    await this.eventBus.emit('locations.bulk.updated', {
      warehouseId: data.warehouseId,
      updated: updated.length,
      userId,
    });

    await this.cacheService.del(`locations:${data.warehouseId}`);

    return {
      updated: updated.length,
      updatedFields: Object.keys(data.updates),
    };
  }

  /**
   * Toplama Alanları Reorganizasyon İşlemi
   * Reorganize picking areas based on velocity analysis
   */
  async reorganizePickingAreas(data: {
    warehouseId: string;
    zoneCode: string;
    strategy: 'velocity' | 'abc' | 'manual';
    dryRun?: boolean;
  }, userId: string): Promise<any> {
    // Get all inventory in zone
    const zoneInventory = await this.getZoneInventory(data.zoneCode, data.warehouseId);

    // Calculate velocity for each product
    const productVelocities = await Promise.all(
      zoneInventory.map(async (inv) => ({
        productId: inv.productId,
        currentLocationId: inv.locationId,
        velocity: await this.calculateProductVelocity(inv.productId, data.warehouseId),
        quantity: inv.quantityOnHand,
      })),
    );

    // Sort by velocity
    productVelocities.sort((a, b) => b.velocity - a.velocity);

    // Classify into A, B, C
    const totalVelocity = productVelocities.reduce((sum, p) => sum + p.velocity, 0);
    let cumulative = 0;
    const classifications = productVelocities.map((p) => {
      cumulative += p.velocity;
      const cumulativePercent = (cumulative / totalVelocity) * 100;

      let classification: 'A' | 'B' | 'C';
      if (cumulativePercent <= 80) {
        classification = 'A';
      } else if (cumulativePercent <= 95) {
        classification = 'B';
      } else {
        classification = 'C';
      }

      return {
        ...p,
        classification,
        cumulativePercent,
      };
    });

    // Generate reorganization plan
    const reorganizationPlan = [];

    for (const item of classifications) {
      const currentLoc = await this.getLocationById(item.currentLocationId);
      const targetZoneSuffix = item.classification;

      if (!currentLoc.zone.endsWith(targetZoneSuffix)) {
        const targetLocation = await this.findAvailableLocationInZone(
          `${data.zoneCode}-${targetZoneSuffix}`,
          data.warehouseId,
        );

        if (targetLocation) {
          reorganizationPlan.push({
            productId: item.productId,
            currentLocation: currentLoc.code,
            targetLocation: targetLocation.code,
            reason: `Velocity ${item.velocity.toFixed(2)} items/day → Zone ${targetZoneSuffix}`,
            priority: item.classification === 'A' ? 'high' : item.classification === 'B' ? 'medium' : 'low',
          });
        }
      }
    }

    if (data.dryRun) {
      return {
        dryRun: true,
        totalProducts: productVelocities.length,
        aCount: classifications.filter(c => c.classification === 'A').length,
        bCount: classifications.filter(c => c.classification === 'B').length,
        cCount: classifications.filter(c => c.classification === 'C').length,
        reorganizationPlan,
        estimatedMoves: reorganizationPlan.length,
        estimatedDuration: reorganizationPlan.length * 5,
      };
    }

    // Execute reorganization (would create transfer tasks)
    await this.eventBus.emit('picking.area.reorganized', {
      warehouseId: data.warehouseId,
      zoneCode: data.zoneCode,
      moves: reorganizationPlan.length,
      userId,
    });

    return {
      reorganizationId: `REORG-${Date.now()}`,
      executed: true,
      totalMoves: reorganizationPlan.length,
      plan: reorganizationPlan,
    };
  }

  /**
   * Göz Kapasite Bilgileri Tanımlama
   * Define location capacity constraints
   */
  async defineLocationCapacities(data: {
    warehouseId: string;
    rules: Array<{
      locationType: string;
      heightRange: { min: number; max: number };
      defaultCapacity: number;
      maxWeight: number;
      volumeCapacity?: number;
    }>;
  }, userId: string): Promise<any> {
    const applied = [];

    for (const rule of data.rules) {
      const matchingLocations = await this.findLocationsByHeightAndType(
        data.warehouseId,
        rule.locationType,
        rule.heightRange,
      );

      for (const location of matchingLocations) {
        await this.updateLocation(location.id, {
          capacity: rule.defaultCapacity,
          maxWeight: rule.maxWeight,
          metadata: {
            ...location.metadata,
            volumeCapacity: rule.volumeCapacity,
          },
        });

        applied.push(location.code);
      }
    }

    return {
      rulesApplied: data.rules.length,
      locationsUpdated: applied.length,
      locations: applied,
    };
  }

  /**
   * Göz Yükseklik Grubu Tanımlama
   * Define location height groups for equipment matching
   */
  async defineHeightGroups(data: {
    warehouseId: string;
    groups: Array<{
      code: string;
      name: string;
      minHeight: number;
      maxHeight: number;
      requiredEquipment: string[];
      accessRestrictions?: string[];
    }>;
  }, userId: string): Promise<any> {
    const created = [];

    for (const group of data.groups) {
      const groupId = `HG-${Date.now()}-${created.length}`;

      // Find all locations in height range
      const matchingLocs = await this.findLocationsByHeightRange(
        data.warehouseId,
        group.minHeight,
        group.maxHeight,
      );

      // Update locations with height group
      for (const loc of matchingLocs) {
        await this.updateLocation(loc.id, {
          metadata: {
            ...loc.metadata,
            heightGroup: group.code,
            requiredEquipment: group.requiredEquipment,
          },
        });
      }

      created.push({
        groupId,
        ...group,
        locationCount: matchingLocs.length,
      });
    }

    return {
      created: created.length,
      groups: created,
    };
  }

  /**
   * Adres Yerleştirme Seviyeleri Tanımlama
   * Define putaway level preferences
   */
  async definePutawayLevels(data: {
    warehouseId: string;
    productType: string;
    levelPreferences: Array<{
      level: number;
      priority: number;
      reason: string;
    }>;
  }, userId: string): Promise<any> {
    return {
      productType: data.productType,
      levelPreferences: data.levelPreferences,
      applied: true,
    };
  }

  /**
   * Forklift Çalışma Alanları Seçimi
   * Assign forklift working areas
   */
  async assignForkliftWorkAreas(data: {
    forkliftId: string;
    warehouseId: string;
    zones: string[];
    aisles?: string[];
    restrictions?: {
      maxHeight?: number;
      minHeight?: number;
      aisleTypes?: string[];
    };
  }, userId: string): Promise<any> {
    await this.eventBus.emit('forklift.work.areas.assigned', {
      forkliftId: data.forkliftId,
      zones: data.zones,
      userId,
    });

    return {
      forkliftId: data.forkliftId,
      assignedZones: data.zones,
      assignedAisles: data.aisles || [],
      restrictions: data.restrictions,
      assignedAt: new Date(),
      assignedBy: userId,
    };
  }

  /**
   * TT'nin Ters Girecegi Adresleri Seçme İşlemi
   * Define locations where TT enters in reverse
   */
  async defineTTReverseLocations(data: {
    warehouseId: string;
    locationCodes: string[];
    reason: string;
  }, userId: string): Promise<any> {
    const updated = [];

    for (const code of data.locationCodes) {
      const location = await this.getLocationByCode(code, data.warehouseId);
      
      await this.updateLocation(location.id, {
        metadata: {
          ...location.metadata,
          ttReverseEntry: true,
          reverseReason: data.reason,
        },
      });

      updated.push(location.code);
    }

    return {
      updated: updated.length,
      locations: updated,
      reason: data.reason,
    };
  }

  /**
   * Özel Bölge Tanımlama
   * Define special zones (hazmat, cold chain, etc.)
   */
  async defineSpecialZone(data: {
    warehouseId: string;
    code: string;
    name: string;
    specialType: 'hazmat' | 'cold_chain' | 'quarantine' | 'high_value' | 'custom';
    temperature?: { min: number; max: number };
    certifications?: string[];
    accessControl?: {
      requiredClearance: string[];
      restrictedPersonnel?: string[];
    };
    locationCodes: string[];
  }, userId: string): Promise<any> {
    const zoneId = `SPEC-${Date.now()}`;

    // Create special zone
    const specialZone = {
      id: zoneId,
      code: data.code,
      name: data.name,
      warehouseId: data.warehouseId,
      specialType: data.specialType,
      temperature: data.temperature,
      certifications: data.certifications || [],
      accessControl: data.accessControl,
      locationCodes: data.locationCodes,
      createdAt: new Date(),
      createdBy: userId,
    };

    // Update locations
    for (const code of data.locationCodes) {
      const loc = await this.getLocationByCode(code, data.warehouseId);
      await this.updateLocation(loc.id, {
        metadata: {
          ...loc.metadata,
          specialZone: data.code,
          specialType: data.specialType,
        },
      });
    }

    await this.eventBus.emit('special.zone.created', {
      zoneId,
      specialType: data.specialType,
      locationCount: data.locationCodes.length,
    });

    return specialZone;
  }

  /**
   * Cross-Dock Adrese Firma Atama İşlemi
   * Assign customer to cross-dock location
   */
  async assignCustomerToCrossDock(data: {
    locationCode: string;
    customerId: string;
    customerName: string;
    warehouseId: string;
    exclusive: boolean;
  }, userId: string): Promise<any> {
    const location = await this.getLocationByCode(data.locationCode, data.warehouseId);

    if (location.locationType !== 'cross_dock') {
      throw new BadRequestException('Location must be cross-dock type');
    }

    await this.updateLocation(location.id, {
      metadata: {
        ...location.metadata,
        assignedCustomer: data.customerId,
        customerName: data.customerName,
        exclusiveUse: data.exclusive,
        assignedAt: new Date(),
        assignedBy: userId,
      },
    });

    return {
      locationCode: data.locationCode,
      customerId: data.customerId,
      customerName: data.customerName,
      exclusive: data.exclusive,
      assignedAt: new Date(),
    };
  }

  /**
   * Toplama Alanları Tanımlama
   * Define picking areas with specific configurations
   */
  async definePickingArea(data: {
    warehouseId: string;
    code: string;
    name: string;
    zoneCode: string;
    pickingType: 'discrete' | 'batch' | 'wave' | 'zone' | 'cluster';
    capacity: number;
    maxPickers: number;
    equipmentType: string[];
    replenishmentConfig: {
      triggerLevel: number;
      targetLevel: number;
      autoReplenish: boolean;
    };
  }, userId: string): Promise<any> {
    const areaId = `PA-${Date.now()}`;

    const pickingArea = {
      id: areaId,
      code: data.code,
      name: data.name,
      warehouseId: data.warehouseId,
      zoneCode: data.zoneCode,
      pickingType: data.pickingType,
      capacity: data.capacity,
      maxPickers: data.maxPickers,
      equipmentType: data.equipmentType,
      replenishmentConfig: data.replenishmentConfig,
      active: true,
      createdAt: new Date(),
      createdBy: userId,
    };

    await this.eventBus.emit('picking.area.defined', {
      areaId,
      code: data.code,
      warehouseId: data.warehouseId,
    });

    return pickingArea;
  }

  /**
   * Sevk Peronları Tanımlama
   * Define shipping docks
   */
  async defineShippingDock(data: {
    warehouseId: string;
    dockNumber: string;
    dockType: 'receiving' | 'shipping' | 'both';
    vehicleTypes: string[];
    maxVehicleSize: { length: number; width: number; height: number };
    features: {
      hasRamp: boolean;
      hasLevelingDock: boolean;
      hasCoverageRoof: boolean;
      hasWeighbridge: boolean;
    };
    operatingHours: {
      start: string;
      end: string;
      days: string[];
    };
  }, userId: string): Promise<any> {
    const dockId = `DOCK-${Date.now()}`;

    const dock = {
      id: dockId,
      warehouseId: data.warehouseId,
      dockNumber: data.dockNumber,
      dockType: data.dockType,
      vehicleTypes: data.vehicleTypes,
      maxVehicleSize: data.maxVehicleSize,
      features: data.features,
      operatingHours: data.operatingHours,
      status: 'available',
      createdAt: new Date(),
      createdBy: userId,
    };

    await this.eventBus.emit('dock.defined', {
      dockId,
      dockNumber: data.dockNumber,
      warehouseId: data.warehouseId,
    });

    return dock;
  }

  /**
   * Çıkış Emir Öncelik Kodu Tanımlama
   * Define shipment priority codes
   */
  async defineShipmentPriorityCodes(data: {
    warehouseId: string;
    codes: Array<{
      code: string;
      name: string;
      priority: number;
      sla: number;
      color: string;
      autoEscalate: boolean;
    }>;
  }, userId: string): Promise<any> {
    return {
      warehouseId: data.warehouseId,
      defined: data.codes.length,
      codes: data.codes,
    };
  }

  /**
   * Dar Koridor Bilgileri Tanımlama
   * Define narrow aisle configurations
   */
  async defineNarrowAisle(data: {
    warehouseId: string;
    aisleCode: string;
    width: number;
    maxHeight: number;
    allowedEquipment: string[];
    trafficControl: 'one_way' | 'two_way' | 'time_based';
    entryPoints: string[];
    exitPoints: string[];
  }, userId: string): Promise<any> {
    const aisleId = `NA-${Date.now()}`;

    const narrowAisle = {
      id: aisleId,
      warehouseId: data.warehouseId,
      aisleCode: data.aisleCode,
      width: data.width,
      maxHeight: data.maxHeight,
      allowedEquipment: data.allowedEquipment,
      trafficControl: data.trafficControl,
      entryPoints: data.entryPoints,
      exitPoints: data.exitPoints,
      currentStatus: {
        occupied: false,
        currentEquipment: null,
        queueLength: 0,
      },
      createdAt: new Date(),
    };

    await this.eventBus.emit('narrow.aisle.defined', {
      aisleId,
      aisleCode: data.aisleCode,
      warehouseId: data.warehouseId,
    });

    return narrowAisle;
  }

  /**
   * Get zone summary
   */
  async getZoneSummary(zoneCode: string, warehouseId: string): Promise<any> {
    const zone = await this.getZoneByCode(zoneCode, warehouseId);
    const locations = await this.getLocationIdsByZone(zoneCode, warehouseId);
    const inventory = await this.getZoneInventory(zoneCode, warehouseId);

    return {
      zone,
      totalLocations: locations.length,
      occupiedLocations: inventory.length,
      utilizationRate: locations.length > 0 ? (inventory.length / locations.length) * 100 : 0,
      totalPallets: inventory.reduce((sum, inv) => sum + 1, 0),
      totalUnits: inventory.reduce((sum, inv) => sum + (inv.quantityOnHand || 0), 0),
    };
  }

  // Helper methods
  private generateZoneRange(start: string, end: string): string[] {
    const zones = [];
    const startChar = start.charCodeAt(0);
    const endChar = end.charCodeAt(0);

    for (let i = startChar; i <= endChar; i++) {
      zones.push(String.fromCharCode(i));
    }

    return zones;
  }

  private determineVelocityClass(zoneCode: string): 'A' | 'B' | 'C' | 'D' {
    if (zoneCode.includes('A')) return 'A';
    if (zoneCode.includes('B')) return 'B';
    if (zoneCode.includes('C')) return 'C';
    return 'D';
  }

  private async createSingleLocation(data: any): Promise<any> {
    return { id: `LOC-${Date.now()}`, ...data };
  }

  private async getZoneByCode(code: string, warehouseId: string): Promise<Zone | null> {
    return null;
  }

  private async getLocationsByZones(zoneCodes: string[], warehouseId: string): Promise<any[]> {
    return [];
  }

  private async calculateOptimalWaypoints(locations: any[], optimizationType: string): Promise<any[]> {
    return locations.map((loc, idx) => ({
      sequence: idx + 1,
      locationCode: loc.code,
      zone: loc.zone,
      aisle: loc.aisle,
      estimatedTime: 2,
    }));
  }

  private calculateDistance(wp1: any, wp2: any): number {
    return 10;
  }

  private async getPutawayStrategies(warehouseId: string): Promise<PutawayStrategy[]> {
    return [];
  }

  private async evaluateStrategyRules(strategy: PutawayStrategy, data: any): Promise<any> {
    return { matched: false, reasoning: [] };
  }

  private async findLocationByStrategy(strategy: PutawayStrategy, data: any): Promise<any> {
    return null;
  }

  private async findFirstAvailableLocation(warehouseId: string): Promise<any> {
    return null;
  }

  private async getLocationIdsByCodes(codes: string[], warehouseId: string): Promise<string[]> {
    return [];
  }

  private async getLocationIdsByZone(zoneCode: string, warehouseId: string): Promise<string[]> {
    return [];
  }

  private async getLocationIdsByAisle(aisleCode: string, warehouseId: string): Promise<string[]> {
    return [];
  }

  private generateGroupColor(groupType: string): string {
    const colors = { zone: '#3b82f6', aisle: '#10b981', rack: '#f59e0b', custom: '#8b5cf6' };
    return colors[groupType] || '#6b7280';
  }

  private getGroupIcon(groupType: string): string {
    const icons = { zone: 'grid', aisle: 'list', rack: 'layers', custom: 'star' };
    return icons[groupType] || 'folder';
  }

  private async getLocationGroup(groupId: string): Promise<LocationGroup> {
    throw new NotFoundException('Group not found');
  }

  private async checkLocationHasInventory(locationId: string): Promise<boolean> {
    return false;
  }

  private async updateLocationLockStatus(locationId: string, isLocked: boolean, reason: string): Promise<void> {
  }

  private async updateLocation(locationId: string, updates: any): Promise<void> {
  }

  private async getZoneInventory(zoneCode: string, warehouseId: string): Promise<any[]> {
    return [];
  }

  private async calculateProductVelocity(productId: string, warehouseId: string): Promise<number> {
    return 0;
  }

  private async getLocationById(locationId: string): Promise<any> {
    return { id: locationId, code: 'LOC-001', zone: 'A' };
  }

  private async findAvailableLocationInZone(zoneCode: string, warehouseId: string): Promise<any> {
    return null;
  }

  private async findLocationsByHeightAndType(warehouseId: string, type: string, heightRange: any): Promise<any[]> {
    return [];
  }

  private async findLocationsByHeightRange(warehouseId: string, min: number, max: number): Promise<any[]> {
    return [];
  }

  private async getLocationByCode(code: string, warehouseId: string): Promise<any> {
    return { id: 'LOC-1', code, metadata: {} };
  }
}

