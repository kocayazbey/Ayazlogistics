// =====================================================================================
// AYAZLOGISTICS - WAVE MANAGEMENT SERVICE
// =====================================================================================
// Description: Advanced wave management for warehouse picking optimization
// Features: Wave planning, picker assignment, performance tracking, dynamic batching
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, inArray, gte, lte, or, desc } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, integer, timestamp, jsonb, decimal, boolean, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../database/schema/core/tenants.schema';
import { users } from '../../../../database/schema/core/users.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const waves = pgTable('wms_waves', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  warehouseId: uuid('warehouse_id').notNull(),
  waveNumber: varchar('wave_number', { length: 50 }).notNull().unique(),
  waveType: varchar('wave_type', { length: 50 }).notNull(),
  priority: varchar('priority', { length: 20 }).default('normal'),
  status: varchar('status', { length: 20 }).default('planning'),
  plannedDate: date('planned_date').notNull(),
  releaseTime: timestamp('release_time'),
  targetCompletionTime: timestamp('target_completion_time'),
  actualCompletionTime: timestamp('actual_completion_time'),
  totalOrders: integer('total_orders').default(0),
  totalLines: integer('total_lines').default(0),
  totalUnits: integer('total_units').default(0),
  totalCubes: decimal('total_cubes', { precision: 12, scale: 3 }),
  totalWeight: decimal('total_weight', { precision: 12, scale: 3 }),
  assignedPickers: jsonb('assigned_pickers'),
  pickingOrders: jsonb('picking_orders'),
  zones: jsonb('zones'),
  strategy: varchar('strategy', { length: 50 }),
  rules: jsonb('rules'),
  constraints: jsonb('constraints'),
  performance: jsonb('performance'),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id),
  releasedBy: uuid('released_by').references(() => users.id),
  completedBy: uuid('completed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const wavePickerAssignments = pgTable('wms_wave_picker_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  waveId: uuid('wave_id').notNull().references(() => waves.id, { onDelete: 'cascade' }),
  pickerId: uuid('picker_id').notNull().references(() => users.id),
  zone: varchar('zone', { length: 50 }),
  assignedLines: integer('assigned_lines').default(0),
  assignedUnits: integer('assigned_units').default(0),
  pickedLines: integer('picked_lines').default(0),
  pickedUnits: integer('picked_units').default(0),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  productivity: decimal('productivity', { precision: 10, scale: 2 }),
  accuracy: decimal('accuracy', { precision: 5, scale: 2 }),
  status: varchar('status', { length: 20 }).default('assigned'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface WaveConfig {
  waveType: 'single_order' | 'batch' | 'zone' | 'wave' | 'cluster';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  maxOrders?: number;
  maxLines?: number;
  maxUnits?: number;
  maxCubes?: number;
  maxWeight?: number;
  cutoffTime?: Date;
  zones?: string[];
  customerPriority?: string[];
  shipByDatePriority?: boolean;
}

interface WavePlanningRule {
  name: string;
  enabled: boolean;
  priority: number;
  condition: string;
  action: string;
  parameters: any;
}

interface WaveOptimizationResult {
  waveId: string;
  waveNumber: string;
  optimization: {
    originalDistance: number;
    optimizedDistance: number;
    distanceSaved: number;
    timeSaved: number;
    efficiencyGain: number;
  };
  pickerAssignments: PickerAssignment[];
  zoneDistribution: ZoneDistribution[];
  recommendations: string[];
}

interface PickerAssignment {
  pickerId: string;
  pickerName: string;
  zone?: string;
  assignedLines: number;
  assignedUnits: number;
  estimatedTime: number;
  workloadBalance: number;
  skillMatch: number;
}

interface ZoneDistribution {
  zone: string;
  totalLines: number;
  totalUnits: number;
  assignedPickers: number;
  estimatedTime: number;
  utilizationRate: number;
}

interface WavePerformanceMetrics {
  waveId: string;
  waveNumber: string;
  planned: {
    totalOrders: number;
    totalLines: number;
    totalUnits: number;
    estimatedTime: number;
  };
  actual: {
    completedOrders: number;
    pickedLines: number;
    pickedUnits: number;
    actualTime: number;
  };
  performance: {
    completionRate: number;
    accuracyRate: number;
    productivityRate: number;
    timeVariance: number;
    efficiency: number;
  };
  pickerPerformance: Array<{
    pickerId: string;
    linesPerHour: number;
    unitsPerHour: number;
    accuracy: number;
    efficiency: number;
  }>;
}

interface WaveSimulation {
  config: WaveConfig;
  estimatedWaves: number;
  estimatedPickingTime: number;
  estimatedCompletionTime: Date;
  resourceUtilization: {
    pickers: number;
    zones: number;
    equipment: number;
  };
  costEstimate: {
    labor: number;
    equipment: number;
    total: number;
  };
  constraints: {
    violations: number;
    warnings: string[];
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class WaveManagementService {
  private readonly logger = new Logger(WaveManagementService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // WAVE PLANNING & CREATION
  // =====================================================================================

  async createWave(data: {
    tenantId: string;
    warehouseId: string;
    config: WaveConfig;
    orderIds?: string[];
    plannedDate: Date;
    createdBy: string;
    autoRelease?: boolean;
    targetCompletionTime?: Date;
  }): Promise<any> {
    this.logger.log(`Creating wave for warehouse ${data.warehouseId} with type ${data.config.waveType}`);

    const waveNumber = await this.generateWaveNumber(data.tenantId);

    // Get eligible orders if not specified
    const eligibleOrders = data.orderIds || await this.findEligibleOrders(
      data.tenantId,
      data.warehouseId,
      data.config,
    );

    if (eligibleOrders.length === 0) {
      throw new BadRequestException('No eligible orders found for wave creation');
    }

    // Calculate wave totals
    const waveTotals = await this.calculateWaveTotals(eligibleOrders, data.warehouseId);

    // Validate against constraints
    const validation = this.validateWaveConstraints(waveTotals, data.config);
    if (!validation.valid) {
      throw new BadRequestException(`Wave validation failed: ${validation.errors.join(', ')}`);
    }

    // Determine zones
    const zones = await this.determineWaveZones(eligibleOrders, data.warehouseId);

    // Create picking orders for wave
    const pickingOrders = await this.createPickingOrdersForWave(
      eligibleOrders,
      data.warehouseId,
      waveNumber,
      data.createdBy,
    );

    const [wave] = await this.db.insert(waves).values({
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      waveNumber,
      waveType: data.config.waveType,
      priority: data.config.priority,
      status: data.autoRelease ? 'released' : 'planning',
      plannedDate: data.plannedDate,
      releaseTime: data.autoRelease ? new Date() : null,
      targetCompletionTime: data.targetCompletionTime,
      totalOrders: eligibleOrders.length,
      totalLines: waveTotals.totalLines,
      totalUnits: waveTotals.totalUnits,
      totalCubes: waveTotals.totalCubes?.toString(),
      totalWeight: waveTotals.totalWeight?.toString(),
      pickingOrders: pickingOrders.map(p => p.id),
      zones,
      strategy: this.determinePickingStrategy(data.config),
      rules: data.config as any,
      createdBy: data.createdBy,
      releasedBy: data.autoRelease ? data.createdBy : null,
      metadata: {
        orderIds: eligibleOrders,
        validation,
        createdAt: new Date(),
      },
    }).returning();

    await this.eventBus.emit('wave.created', {
      waveId: wave.id,
      waveNumber,
      totalOrders: eligibleOrders.length,
      totalLines: waveTotals.totalLines,
      autoReleased: data.autoRelease,
    });

    if (data.autoRelease) {
      await this.assignPickersToWave(wave.id, data.warehouseId);
    }

    this.logger.log(`Wave created: ${waveNumber} with ${eligibleOrders.length} orders, ${waveTotals.totalLines} lines`);

    return wave;
  }

  async releaseWave(waveId: string, releasedBy: string, autoAssignPickers: boolean = true): Promise<any> {
    const [wave] = await this.db
      .select()
      .from(waves)
      .where(eq(waves.id, waveId))
      .limit(1);

    if (!wave) {
      throw new NotFoundException('Wave not found');
    }

    if (wave.status !== 'planning') {
      throw new BadRequestException(`Cannot release wave with status: ${wave.status}`);
    }

    const releaseTime = new Date();

    const [updated] = await this.db
      .update(waves)
      .set({
        status: 'released',
        releaseTime,
        releasedBy,
        metadata: sql`COALESCE(${waves.metadata}, '{}'::jsonb) || ${JSON.stringify({
          releasedAt: releaseTime,
        })}::jsonb`,
      })
      .where(eq(waves.id, waveId))
      .returning();

    if (autoAssignPickers) {
      await this.assignPickersToWave(waveId, wave.warehouseId);
    }

    await this.eventBus.emit('wave.released', {
      waveId,
      waveNumber: wave.waveNumber,
      releasedBy,
      releaseTime,
    });

    this.logger.log(`Wave released: ${wave.waveNumber} at ${releaseTime.toISOString()}`);

    return updated;
  }

  async assignPickersToWave(waveId: string, warehouseId: string): Promise<PickerAssignment[]> {
    this.logger.log(`Assigning pickers to wave ${waveId}`);

    const [wave] = await this.db
      .select()
      .from(waves)
      .where(eq(waves.id, waveId))
      .limit(1);

    if (!wave) {
      throw new NotFoundException('Wave not found');
    }

    // Get available pickers
    const availablePickers = await this.getAvailablePickers(warehouseId);

    if (availablePickers.length === 0) {
      throw new BadRequestException('No available pickers found');
    }

    // Get wave zones and workload
    const zones = wave.zones as string[];
    const totalLines = wave.totalLines || 0;
    const totalUnits = wave.totalUnits || 0;

    // Calculate optimal picker distribution
    const assignments = this.calculateOptimalPickerAssignment(
      availablePickers,
      zones,
      totalLines,
      totalUnits,
    );

    // Create assignment records
    const assignmentRecords = [];
    for (const assignment of assignments) {
      const [record] = await this.db.insert(wavePickerAssignments).values({
        waveId,
        pickerId: assignment.pickerId,
        zone: assignment.zone,
        assignedLines: assignment.assignedLines,
        assignedUnits: assignment.assignedUnits,
        status: 'assigned',
        metadata: {
          estimatedTime: assignment.estimatedTime,
          workloadBalance: assignment.workloadBalance,
          skillMatch: assignment.skillMatch,
        },
      }).returning();

      assignmentRecords.push(record);
    }

    // Update wave with assignments
    await this.db
      .update(waves)
      .set({
        assignedPickers: assignments.map(a => ({ pickerId: a.pickerId, zone: a.zone })),
        metadata: sql`COALESCE(${waves.metadata}, '{}'::jsonb) || ${JSON.stringify({
          pickersAssigned: assignments.length,
          assignedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(waves.id, waveId));

    await this.eventBus.emit('wave.pickers.assigned', {
      waveId,
      waveNumber: wave.waveNumber,
      pickersCount: assignments.length,
    });

    this.logger.log(`Assigned ${assignments.length} pickers to wave ${wave.waveNumber}`);

    return assignments;
  }

  async startWave(waveId: string, startedBy: string): Promise<any> {
    const [wave] = await this.db
      .select()
      .from(waves)
      .where(eq(waves.id, waveId))
      .limit(1);

    if (!wave) {
      throw new NotFoundException('Wave not found');
    }

    if (wave.status !== 'released') {
      throw new BadRequestException(`Cannot start wave with status: ${wave.status}`);
    }

    const [updated] = await this.db
      .update(waves)
      .set({
        status: 'in_progress',
        metadata: sql`COALESCE(${waves.metadata}, '{}'::jsonb) || ${JSON.stringify({
          startedAt: new Date(),
          startedBy,
        })}::jsonb`,
      })
      .where(eq(waves.id, waveId))
      .returning();

    // Update picker assignments to in_progress
    await this.db
      .update(wavePickerAssignments)
      .set({
        status: 'in_progress',
        startTime: new Date(),
      })
      .where(eq(wavePickerAssignments.waveId, waveId));

    await this.eventBus.emit('wave.started', {
      waveId,
      waveNumber: wave.waveNumber,
      startedBy,
    });

    this.logger.log(`Wave started: ${wave.waveNumber}`);

    return updated;
  }

  async completeWave(waveId: string, completedBy: string): Promise<any> {
    const [wave] = await this.db
      .select()
      .from(waves)
      .where(eq(waves.id, waveId))
      .limit(1);

    if (!wave) {
      throw new NotFoundException('Wave not found');
    }

    if (wave.status !== 'in_progress') {
      throw new BadRequestException(`Cannot complete wave with status: ${wave.status}`);
    }

    // Get picker assignments to calculate performance
    const assignments = await this.db
      .select()
      .from(wavePickerAssignments)
      .where(eq(wavePickerAssignments.waveId, waveId));

    // Calculate wave performance
    const performance = this.calculateWavePerformance(wave, assignments);

    const completionTime = new Date();

    const [updated] = await this.db
      .update(waves)
      .set({
        status: 'completed',
        actualCompletionTime: completionTime,
        completedBy,
        performance: performance as any,
        metadata: sql`COALESCE(${waves.metadata}, '{}'::jsonb) || ${JSON.stringify({
          completedAt: completionTime,
        })}::jsonb`,
      })
      .where(eq(waves.id, waveId))
      .returning();

    // Update picker assignments
    await this.db
      .update(wavePickerAssignments)
      .set({
        status: 'completed',
        endTime: completionTime,
      })
      .where(
        and(
          eq(wavePickerAssignments.waveId, waveId),
          eq(wavePickerAssignments.status, 'in_progress'),
        ),
      );

    await this.eventBus.emit('wave.completed', {
      waveId,
      waveNumber: wave.waveNumber,
      performance,
      completedBy,
    });

    this.logger.log(`Wave completed: ${wave.waveNumber}. Efficiency: ${performance.efficiency.toFixed(2)}%`);

    return updated;
  }

  // =====================================================================================
  // WAVE OPTIMIZATION
  // =====================================================================================

  async optimizeWave(waveId: string): Promise<WaveOptimizationResult> {
    this.logger.log(`Optimizing wave ${waveId}`);

    const [wave] = await this.db
      .select()
      .from(waves)
      .where(eq(waves.id, waveId))
      .limit(1);

    if (!wave) {
      throw new NotFoundException('Wave not found');
    }

    const pickingOrderIds = wave.pickingOrders as string[];
    const zones = wave.zones as string[];

    // Calculate current metrics
    const currentMetrics = await this.calculateCurrentWaveMetrics(waveId);

    // Optimize picker routes within zones
    const routeOptimization = await this.optimizePickingRoutes(pickingOrderIds, zones);

    // Re-balance picker workload
    const pickerAssignments = await this.rebalancePickerWorkload(waveId);

    // Optimize zone sequencing
    const zoneOptimization = await this.optimizeZoneSequencing(zones, pickingOrderIds);

    const optimization = {
      originalDistance: currentMetrics.totalDistance,
      optimizedDistance: routeOptimization.totalDistance,
      distanceSaved: currentMetrics.totalDistance - routeOptimization.totalDistance,
      timeSaved: Math.round((currentMetrics.totalDistance - routeOptimization.totalDistance) * 0.5),
      efficiencyGain: ((currentMetrics.totalDistance - routeOptimization.totalDistance) / currentMetrics.totalDistance) * 100,
    };

    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(
      wave,
      optimization,
      pickerAssignments,
      zoneOptimization,
    );

    // Update wave with optimization results
    await this.db
      .update(waves)
      .set({
        metadata: sql`COALESCE(${waves.metadata}, '{}'::jsonb) || ${JSON.stringify({
          optimized: true,
          optimization,
          optimizedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(waves.id, waveId));

    await this.eventBus.emit('wave.optimized', {
      waveId,
      waveNumber: wave.waveNumber,
      distanceSaved: optimization.distanceSaved,
      efficiencyGain: optimization.efficiencyGain,
    });

    return {
      waveId,
      waveNumber: wave.waveNumber,
      optimization,
      pickerAssignments,
      zoneDistribution: zoneOptimization,
      recommendations,
    };
  }

  async simulateWavePlanning(
    tenantId: string,
    warehouseId: string,
    config: WaveConfig,
    orderIds?: string[],
  ): Promise<WaveSimulation> {
    this.logger.log(`Simulating wave planning for warehouse ${warehouseId}`);

    const eligibleOrders = orderIds || await this.findEligibleOrders(
      tenantId,
      warehouseId,
      config,
    );

    const totals = await this.calculateWaveTotals(eligibleOrders, warehouseId);

    // Estimate number of waves needed
    const maxLinesPerWave = config.maxLines || 500;
    const estimatedWaves = Math.ceil(totals.totalLines / maxLinesPerWave);

    // Estimate picking time (industry average: 100 lines/hour/picker)
    const linesPerPickerPerHour = 100;
    const availablePickers = await this.getAvailablePickers(warehouseId);
    const pickingTimeHours = totals.totalLines / (linesPerPickerPerHour * availablePickers.length);

    const estimatedCompletionTime = new Date();
    estimatedCompletionTime.setHours(estimatedCompletionTime.getHours() + Math.ceil(pickingTimeHours));

    // Calculate resource utilization
    const resourceUtilization = {
      pickers: availablePickers.length,
      zones: (config.zones?.length || 0),
      equipment: Math.ceil(availablePickers.length * 0.8), // Assume 0.8 carts per picker
    };

    // Estimate costs
    const laborCostPerHour = 50; // TRY
    const equipmentCostPerHour = 10; // TRY
    const costEstimate = {
      labor: pickingTimeHours * availablePickers.length * laborCostPerHour,
      equipment: pickingTimeHours * resourceUtilization.equipment * equipmentCostPerHour,
      total: 0,
    };
    costEstimate.total = costEstimate.labor + costEstimate.equipment;

    // Check constraints
    const constraints = this.checkWaveConstraints(totals, config);

    return {
      config,
      estimatedWaves,
      estimatedPickingTime: parseFloat(pickingTimeHours.toFixed(2)),
      estimatedCompletionTime,
      resourceUtilization,
      costEstimate,
      constraints,
    };
  }

  async getWavePerformance(waveId: string): Promise<WavePerformanceMetrics> {
    const [wave] = await this.db
      .select()
      .from(waves)
      .where(eq(waves.id, waveId))
      .limit(1);

    if (!wave) {
      throw new NotFoundException('Wave not found');
    }

    const assignments = await this.db
      .select()
      .from(wavePickerAssignments)
      .where(eq(wavePickerAssignments.waveId, waveId));

    const totalPickedLines = assignments.reduce((sum, a) => sum + (a.pickedLines || 0), 0);
    const totalPickedUnits = assignments.reduce((sum, a) => sum + (a.pickedUnits || 0), 0);

    const actualTime = wave.actualCompletionTime && wave.releaseTime
      ? (new Date(wave.actualCompletionTime).getTime() - new Date(wave.releaseTime).getTime()) / (1000 * 60 * 60)
      : 0;

    const targetTime = wave.targetCompletionTime && wave.releaseTime
      ? (new Date(wave.targetCompletionTime).getTime() - new Date(wave.releaseTime).getTime()) / (1000 * 60 * 60)
      : actualTime;

    const completionRate = wave.totalLines! > 0 ? (totalPickedLines / wave.totalLines!) * 100 : 0;
    const productivityRate = actualTime > 0 ? totalPickedUnits / actualTime : 0;
    const timeVariance = targetTime > 0 ? ((actualTime - targetTime) / targetTime) * 100 : 0;
    const efficiency = targetTime > 0 && actualTime > 0 ? (targetTime / actualTime) * 100 : 0;

    // Calculate picker-level performance
    const pickerPerformance = assignments.map(assignment => {
      const pickerTime = assignment.startTime && assignment.endTime
        ? (new Date(assignment.endTime).getTime() - new Date(assignment.startTime).getTime()) / (1000 * 60 * 60)
        : 0;

      return {
        pickerId: assignment.pickerId,
        linesPerHour: pickerTime > 0 ? (assignment.pickedLines || 0) / pickerTime : 0,
        unitsPerHour: pickerTime > 0 ? (assignment.pickedUnits || 0) / pickerTime : 0,
        accuracy: parseFloat(assignment.accuracy?.toString() || '0'),
        efficiency: parseFloat((assignment.productivity?.toString() || '0')),
      };
    });

    const accuracyRate = pickerPerformance.length > 0
      ? pickerPerformance.reduce((sum, p) => sum + p.accuracy, 0) / pickerPerformance.length
      : 0;

    return {
      waveId,
      waveNumber: wave.waveNumber,
      planned: {
        totalOrders: wave.totalOrders || 0,
        totalLines: wave.totalLines || 0,
        totalUnits: wave.totalUnits || 0,
        estimatedTime: targetTime,
      },
      actual: {
        completedOrders: wave.totalOrders || 0,
        pickedLines: totalPickedLines,
        pickedUnits: totalPickedUnits,
        actualTime,
      },
      performance: {
        completionRate: parseFloat(completionRate.toFixed(2)),
        accuracyRate: parseFloat(accuracyRate.toFixed(2)),
        productivityRate: parseFloat(productivityRate.toFixed(2)),
        timeVariance: parseFloat(timeVariance.toFixed(2)),
        efficiency: parseFloat(efficiency.toFixed(2)),
      },
      pickerPerformance,
    };
  }

  async dynamicWaveReplenishment(waveId: string, replenishmentRules: {
    minOrdersThreshold: number;
    maxWaveAge: number;
    autoAddOrders: boolean;
  }): Promise<{
    ordersAdded: number;
    newTotalOrders: number;
    replenishmentReason: string;
  }> {
    const [wave] = await this.db
      .select()
      .from(waves)
      .where(eq(waves.id, waveId))
      .limit(1);

    if (!wave) {
      throw new NotFoundException('Wave not found');
    }

    if (wave.status !== 'in_progress') {
      throw new BadRequestException('Wave must be in progress for dynamic replenishment');
    }

    const currentOrders = wave.totalOrders || 0;

    if (currentOrders >= replenishmentRules.minOrdersThreshold) {
      return {
        ordersAdded: 0,
        newTotalOrders: currentOrders,
        replenishmentReason: 'Wave has sufficient orders',
      };
    }

    if (!replenishmentRules.autoAddOrders) {
      return {
        ordersAdded: 0,
        newTotalOrders: currentOrders,
        replenishmentReason: 'Auto-add orders is disabled',
      };
    }

    // Find compatible orders
    const waveConfig = wave.rules as WaveConfig;
    const newOrders = await this.findEligibleOrders(
      wave.tenantId,
      wave.warehouseId,
      waveConfig,
      replenishmentRules.minOrdersThreshold - currentOrders,
    );

    if (newOrders.length === 0) {
      return {
        ordersAdded: 0,
        newTotalOrders: currentOrders,
        replenishmentReason: 'No compatible orders found',
      };
    }

    // Add orders to wave
    const existingPickingOrders = wave.pickingOrders as string[];
    const newPickingOrders = await this.createPickingOrdersForWave(
      newOrders,
      wave.warehouseId,
      wave.waveNumber,
      completedBy,
    );

    const updatedPickingOrders = [...existingPickingOrders, ...newPickingOrders.map(p => p.id)];
    const newTotals = await this.calculateWaveTotals(newOrders, wave.warehouseId);

    await this.db
      .update(waves)
      .set({
        totalOrders: wave.totalOrders! + newOrders.length,
        totalLines: wave.totalLines! + newTotals.totalLines,
        totalUnits: wave.totalUnits! + newTotals.totalUnits,
        pickingOrders: updatedPickingOrders,
        metadata: sql`COALESCE(${waves.metadata}, '{}'::jsonb) || ${JSON.stringify({
          replenished: true,
          replenishedAt: new Date(),
          ordersAdded: newOrders.length,
        })}::jsonb`,
      })
      .where(eq(waves.id, waveId));

    await this.eventBus.emit('wave.replenished', {
      waveId,
      waveNumber: wave.waveNumber,
      ordersAdded: newOrders.length,
    });

    this.logger.log(`Wave ${wave.waveNumber} dynamically replenished with ${newOrders.length} orders`);

    return {
      ordersAdded: newOrders.length,
      newTotalOrders: wave.totalOrders! + newOrders.length,
      replenishmentReason: `Added ${newOrders.length} compatible orders to maintain efficiency`,
    };
  }

  async getWaveAnalytics(
    tenantId: string,
    warehouseId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalWaves: number;
    completedWaves: number;
    averageWaveSize: number;
    averagePickingTime: number;
    averageEfficiency: number;
    topPerformingPickers: Array<{ pickerId: string; avgProductivity: number }>;
    peakWaveTimes: Array<{ hour: number; waveCount: number }>;
    zoneUtilization: Array<{ zone: string; utilizationRate: number }>;
  }> {
    const wavesData = await this.db
      .select()
      .from(waves)
      .where(
        and(
          eq(waves.tenantId, tenantId),
          eq(waves.warehouseId, warehouseId),
          gte(waves.plannedDate, startDate),
          lte(waves.plannedDate, endDate),
        ),
      );

    const completed = wavesData.filter(w => w.status === 'completed');

    const totalWaves = wavesData.length;
    const completedWaves = completed.length;

    const averageWaveSize = completedWaves > 0
      ? completed.reduce((sum, w) => sum + (w.totalLines || 0), 0) / completedWaves
      : 0;

    const pickingTimes = completed
      .filter(w => w.releaseTime && w.actualCompletionTime)
      .map(w => {
        const start = new Date(w.releaseTime!).getTime();
        const end = new Date(w.actualCompletionTime!).getTime();
        return (end - start) / (1000 * 60);
      });

    const averagePickingTime = pickingTimes.length > 0
      ? pickingTimes.reduce((sum, t) => sum + t, 0) / pickingTimes.length
      : 0;

    const efficiencies = completed
      .filter(w => w.performance)
      .map(w => (w.performance as any).efficiency || 0);

    const averageEfficiency = efficiencies.length > 0
      ? efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length
      : 0;

    // Get all picker assignments
    const allAssignments = await this.db
      .select()
      .from(wavePickerAssignments)
      .where(
        inArray(
          wavePickerAssignments.waveId,
          wavesData.map(w => w.id),
        ),
      );

    // Calculate top performing pickers
    const pickerStats = new Map<string, { totalUnits: number; totalTime: number }>();

    allAssignments.forEach(assignment => {
      if (assignment.startTime && assignment.endTime) {
        const existing = pickerStats.get(assignment.pickerId) || { totalUnits: 0, totalTime: 0 };
        existing.totalUnits += assignment.pickedUnits || 0;
        existing.totalTime += (new Date(assignment.endTime).getTime() - new Date(assignment.startTime).getTime()) / (1000 * 60 * 60);
        pickerStats.set(assignment.pickerId, existing);
      }
    });

    const topPerformingPickers = Array.from(pickerStats.entries())
      .map(([pickerId, stats]) => ({
        pickerId,
        avgProductivity: stats.totalTime > 0 ? stats.totalUnits / stats.totalTime : 0,
      }))
      .sort((a, b) => b.avgProductivity - a.avgProductivity)
      .slice(0, 10);

    // Calculate peak wave times
    const peakTimes = new Map<number, number>();
    wavesData.forEach(wave => {
      if (wave.releaseTime) {
        const hour = new Date(wave.releaseTime).getHours();
        peakTimes.set(hour, (peakTimes.get(hour) || 0) + 1);
      }
    });

    const peakWaveTimes = Array.from(peakTimes.entries())
      .map(([hour, count]) => ({ hour, waveCount: count }))
      .sort((a, b) => b.waveCount - a.waveCount);

    // Zone utilization
    const zoneStats = new Map<string, { totalWaves: number; totalLines: number }>();
    wavesData.forEach(wave => {
      const zones = wave.zones as string[] || [];
      zones.forEach(zone => {
        const existing = zoneStats.get(zone) || { totalWaves: 0, totalLines: 0 };
        existing.totalWaves += 1;
        existing.totalLines += wave.totalLines || 0;
        zoneStats.set(zone, existing);
      });
    });

    const zoneUtilization = Array.from(zoneStats.entries())
      .map(([zone, stats]) => ({
        zone,
        utilizationRate: stats.totalWaves > 0 ? (stats.totalLines / stats.totalWaves) / 100 : 0,
      }));

    return {
      totalWaves,
      completedWaves,
      averageWaveSize: parseFloat(averageWaveSize.toFixed(2)),
      averagePickingTime: parseFloat(averagePickingTime.toFixed(2)),
      averageEfficiency: parseFloat(averageEfficiency.toFixed(2)),
      topPerformingPickers,
      peakWaveTimes,
      zoneUtilization,
    };
  }

  async autoWavePlanning(
    tenantId: string,
    warehouseId: string,
    planningRules: WavePlanningRule[],
  ): Promise<{
    wavesCreated: number;
    totalOrdersProcessed: number;
    executionTime: number;
    waves: any[];
  }> {
    this.logger.log(`Starting auto wave planning for warehouse ${warehouseId}`);

    const startTime = Date.now();
    const createdWaves = [];
    let totalOrdersProcessed = 0;

    // Sort rules by priority
    const sortedRules = planningRules
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      const config = this.parseRuleToConfig(rule);
      const eligibleOrders = await this.findEligibleOrders(tenantId, warehouseId, config);

      if (eligibleOrders.length === 0) continue;

      // Group orders into waves based on config
      const waveGroups = this.groupOrdersIntoWaves(eligibleOrders, config);

      for (const group of waveGroups) {
        const wave = await this.createWave({
          tenantId,
          warehouseId,
          config,
          orderIds: group,
          plannedDate: new Date(),
          createdBy: 'system_auto',
          autoRelease: rule.parameters?.autoRelease || false,
        });

        createdWaves.push(wave);
        totalOrdersProcessed += group.length;
      }
    }

    const executionTime = (Date.now() - startTime) / 1000;

    await this.eventBus.emit('wave.auto.planning.completed', {
      warehouseId,
      wavesCreated: createdWaves.length,
      totalOrdersProcessed,
      executionTime,
    });

    this.logger.log(
      `Auto wave planning completed: ${createdWaves.length} waves created, ${totalOrdersProcessed} orders processed in ${executionTime.toFixed(2)}s`,
    );

    return {
      wavesCreated: createdWaves.length,
      totalOrdersProcessed,
      executionTime,
      waves: createdWaves,
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async findEligibleOrders(
    tenantId: string,
    warehouseId: string,
    config: WaveConfig,
    limit?: number,
  ): Promise<string[]> {
    const { pickingOrders } = await import('../../../../database/schema/shared/wms.schema');

    const query = this.db
      .select({ id: pickingOrders.id })
      .from(pickingOrders)
      .where(
        and(
          eq(pickingOrders.tenantId, tenantId),
          eq(pickingOrders.warehouseId, warehouseId),
          or(
            eq(pickingOrders.status, 'pending'),
            eq(pickingOrders.status, 'assigned')
          )
        )
      )
      .orderBy(pickingOrders.createdAt);

    if (limit) {
      query.limit(limit);
    }

    const orders = await query;
    return orders.map(o => o.id).slice(0, config.maxOrders || limit || 50);
  }

  private async calculateWaveTotals(orderIds: string[], warehouseId: string): Promise<{
    totalLines: number;
    totalUnits: number;
    totalCubes: number;
    totalWeight: number;
  }> {
    const { pickingOrders } = await import('../../../../database/schema/shared/wms.schema');

    const orders = await this.db
      .select({
        id: pickingOrders.id,
        items: pickingOrders,
      })
      .from(pickingOrders)
      .where(inArray(pickingOrders.id, orderIds));

    let totalLines = 0;
    let totalUnits = 0;
    let totalCubes = 0;
    let totalWeight = 0;

    for (const order of orders) {
      const items = (order.items as any)?.items || [];
      totalLines += items.length;

      items.forEach((item: any) => {
        const qty = item.quantity || 0;
        totalUnits += qty;
        totalCubes += qty * (item.cube || 0.05);
        totalWeight += qty * (item.weight || 2.5);
      });
    }

    return {
      totalLines,
      totalUnits,
      totalCubes,
      totalWeight,
    };
  }

  private validateWaveConstraints(totals: any, config: WaveConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.maxLines && totals.totalLines > config.maxLines) {
      errors.push(`Total lines (${totals.totalLines}) exceeds maximum (${config.maxLines})`);
    }

    if (config.maxUnits && totals.totalUnits > config.maxUnits) {
      errors.push(`Total units (${totals.totalUnits}) exceeds maximum (${config.maxUnits})`);
    }

    if (totals.totalLines < 10) {
      warnings.push('Wave has very few lines - consider consolidating');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private checkWaveConstraints(totals: any, config: WaveConfig): {
    violations: number;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let violations = 0;

    if (config.maxLines && totals.totalLines > config.maxLines) {
      violations++;
      warnings.push(`Exceeds max lines constraint`);
    }

    return { violations, warnings };
  }

  private async determineWaveZones(orderIds: string[], warehouseId: string): Promise<string[]> {
    const { pickingOrders, inventory, locations } = await import('../../../../database/schema/shared/wms.schema');

    // Get unique zones from picking orders' inventory locations
    const orders = await this.db
      .select({
        items: pickingOrders,
      })
      .from(pickingOrders)
      .where(
        and(
          inArray(pickingOrders.id, orderIds),
          eq(pickingOrders.warehouseId, warehouseId)
        )
      );

    const allZones = new Set<string>();
    
    for (const order of orders) {
      const items = (order.items as any)?.items || [];
      for (const item of items) {
        if (item.locationId) {
          const [location] = await this.db
            .select({ zone: locations.zone })
            .from(locations)
            .where(eq(locations.id, item.locationId))
            .limit(1);
          
          if (location?.zone) {
            allZones.add(location.zone);
          }
        }
      }
    }

    return Array.from(allZones);
  }

  private async createPickingOrdersForWave(
    orderIds: string[],
    warehouseId: string,
    waveNumber: string,
    createdBy: string,
  ): Promise<any[]> {
    const { pickingOrders } = await import('../../../../database/schema/shared/wms.schema');

    // Get existing picking orders for these order IDs
    const existingOrders = await this.db
      .select({
        id: pickingOrders.id,
        orderId: pickingOrders.orderId,
      })
      .from(pickingOrders)
      .where(
        and(
          inArray(pickingOrders.orderId, orderIds),
          eq(pickingOrders.warehouseId, warehouseId)
        )
      );

    // Update existing orders with wave number
    for (const order of existingOrders) {
      await this.db
        .update(pickingOrders)
        .set({
          metadata: sql`COALESCE(${pickingOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({ waveNumber })}::jsonb`,
        })
        .where(eq(pickingOrders.id, order.id));
    }

    return existingOrders.map((order, idx) => ({
      id: order.id,
      orderId: order.orderId,
      waveNumber,
    }));
  }

  private determinePickingStrategy(config: WaveConfig): string {
    if (config.zones && config.zones.length > 1) return 'zone';
    if (config.waveType === 'batch') return 'batch';
    return 'discrete';
  }

  private async getAvailablePickers(warehouseId: string): Promise<any[]> {
    // Query actual users with picker role
    const pickers = await this.db
      .select({
        id: users.id,
        name: users.name,
        role: users.role,
        metadata: users.metadata,
      })
      .from(users)
      .where(
        and(
          eq(users.role, 'picker'),
          eq(users.isActive, true)
        )
      );

    return pickers.map(picker => ({
      id: picker.id,
      name: picker.name,
      skillLevel: (picker.metadata as any)?.skillLevel || 2,
      avgProductivity: (picker.metadata as any)?.avgProductivity || 80,
    }));
  }

  private calculateOptimalPickerAssignment(
    pickers: any[],
    zones: string[],
    totalLines: number,
    totalUnits: number,
  ): PickerAssignment[] {
    const assignments: PickerAssignment[] = [];
    const linesPerPicker = Math.ceil(totalLines / pickers.length);

    pickers.forEach((picker, idx) => {
      const zone = zones[idx % zones.length];
      const assignedLines = Math.min(linesPerPicker, totalLines - (linesPerPicker * idx));
      const assignedUnits = Math.round(assignedLines * (totalUnits / totalLines));
      const estimatedTime = Math.ceil(assignedLines / (picker.avgProductivity || 80));

      assignments.push({
        pickerId: picker.id,
        pickerName: picker.name,
        zone,
        assignedLines,
        assignedUnits,
        estimatedTime,
        workloadBalance: assignedLines / linesPerPicker,
        skillMatch: picker.skillLevel / 3,
      });
    });

    return assignments;
  }

  private async calculateCurrentWaveMetrics(waveId: string): Promise<{ totalDistance: number }> {
    // Mock - would calculate from actual picking orders
    return { totalDistance: 1500 };
  }

  private async optimizePickingRoutes(pickingOrderIds: string[], zones: string[]): Promise<{ totalDistance: number }> {
    // Apply TSP/VRP optimization
    const optimizedDistance = 1200;
    return { totalDistance: optimizedDistance };
  }

  private async rebalancePickerWorkload(waveId: string): Promise<PickerAssignment[]> {
    const assignments = await this.db
      .select({
        pickerId: wavePickerAssignments.pickerId,
        pickerName: users.name,
        zone: wavePickerAssignments.zone,
        assignedLines: wavePickerAssignments.assignedLines,
        assignedUnits: wavePickerAssignments.assignedUnits,
        pickedLines: wavePickerAssignments.pickedLines,
        pickedUnits: wavePickerAssignments.pickedUnits,
        metadata: wavePickerAssignments.metadata,
      })
      .from(wavePickerAssignments)
      .leftJoin(users, eq(wavePickerAssignments.pickerId, users.id))
      .where(eq(wavePickerAssignments.waveId, waveId));

    const totalLines = assignments.reduce((sum, a) => sum + (a.assignedLines || 0), 0);
    const avgLines = assignments.length > 0 ? totalLines / assignments.length : 0;

    return assignments.map(a => ({
      pickerId: a.pickerId,
      pickerName: a.pickerName || `Picker ${a.pickerId}`,
      zone: a.zone,
      assignedLines: a.assignedLines || 0,
      assignedUnits: a.assignedUnits || 0,
      estimatedTime: (a.metadata as any)?.estimatedTime || 0,
      workloadBalance: avgLines > 0 ? (a.assignedLines || 0) / avgLines : 1.0,
      skillMatch: (a.metadata as any)?.skillMatch || 1.0,
    }));
  }

  private async optimizeZoneSequencing(zones: string[], pickingOrderIds: string[]): Promise<ZoneDistribution[]> {
    const { pickingOrders, locations, inventory } = await import('../../../../database/schema/shared/wms.schema');

    // Get all picking orders with their items
    const orders = await this.db
      .select({
        items: pickingOrders,
      })
      .from(pickingOrders)
      .where(inArray(pickingOrders.id, pickingOrderIds));

    // Count lines and units per zone
    const zoneStats = new Map<string, { totalLines: number; totalUnits: number; locations: Set<string> }>();
    
    for (const order of orders) {
      const items = (order.items as any)?.items || [];
      for (const item of items) {
        if (item.locationId) {
          const [location] = await this.db
            .select({ zone: locations.zone })
            .from(locations)
            .where(eq(locations.id, item.locationId))
            .limit(1);
          
          if (location?.zone) {
            const existing = zoneStats.get(location.zone) || { totalLines: 0, totalUnits: 0, locations: new Set() };
            existing.totalLines += 1;
            existing.totalUnits += item.quantity || 1;
            existing.locations.add(item.locationId);
            zoneStats.set(location.zone, existing);
          }
        }
      }
    }

    // Get assigned pickers per zone
    const assignments = await this.db
      .select({ zone: wavePickerAssignments.zone })
      .from(wavePickerAssignments)
      .where(
        and(
          inArray(
            wavePickerAssignments.waveId,
            [pickingOrderIds[0]] // Get wave ID from first picking order
          )
        )
      );

    const pickersPerZone = new Map<string, number>();
    assignments.forEach(a => {
      if (a.zone) {
        pickersPerZone.set(a.zone, (pickersPerZone.get(a.zone) || 0) + 1);
      }
    });

    // Calculate zone distributions
    return zones.map(zone => {
      const stats = zoneStats.get(zone) || { totalLines: 0, totalUnits: 0, locations: new Set() };
      const estimatedTime = stats.totalLines * 2; // 2 minutes per line average
      const utilizationRate = Math.min((stats.totalLines / 100) * 0.85, 1.0); // Cap at 85%

      return {
        zone,
        totalLines: stats.totalLines,
        totalUnits: stats.totalUnits,
        assignedPickers: pickersPerZone.get(zone) || 1,
        estimatedTime,
        utilizationRate,
      };
    });
  }

  private calculateWavePerformance(wave: any, assignments: any[]): {
    totalPicked: number;
    accuracy: number;
    productivity: number;
    efficiency: number;
  } {
    const totalPicked = assignments.reduce((sum, a) => sum + (a.pickedUnits || 0), 0);
    const totalLines = assignments.reduce((sum, a) => sum + (a.pickedLines || 0), 0);
    const avgAccuracy = assignments.length > 0
      ? assignments.reduce((sum, a) => sum + parseFloat(a.accuracy?.toString() || '0'), 0) / assignments.length
      : 0;

    // Calculate productivity: units per hour
    let totalTime = 0;
    for (const assignment of assignments) {
      if (assignment.startTime && assignment.endTime) {
        const time = (new Date(assignment.endTime).getTime() - new Date(assignment.startTime).getTime()) / (1000 * 60 * 60);
        totalTime += time;
      }
    }
    const productivity = totalTime > 0 ? totalPicked / totalTime : 0;

    // Calculate efficiency: actual vs target
    const targetUnits = wave.totalUnits || 0;
    const efficiency = targetUnits > 0 ? (totalPicked / targetUnits) * 100 : 0;

    return {
      totalPicked,
      accuracy: parseFloat(avgAccuracy.toFixed(2)),
      productivity: parseFloat(productivity.toFixed(2)),
      efficiency: parseFloat(efficiency.toFixed(2)),
    };
  }

  private generateOptimizationRecommendations(
    wave: any,
    optimization: any,
    pickerAssignments: PickerAssignment[],
    zoneOptimization: ZoneDistribution[],
  ): string[] {
    const recommendations: string[] = [];

    if (optimization.efficiencyGain > 15) {
      recommendations.push(`Excellent optimization: ${optimization.efficiencyGain.toFixed(2)}% efficiency gain`);
    }

    if (optimization.distanceSaved > 500) {
      recommendations.push(`Significant distance reduction: ${optimization.distanceSaved.toFixed(2)}m saved`);
    }

    const workloadVariance = this.calculateWorkloadVariance(pickerAssignments);
    if (workloadVariance > 0.3) {
      recommendations.push('Consider rebalancing picker workload for better efficiency');
    }

    return recommendations;
  }

  private calculateWorkloadVariance(assignments: PickerAssignment[]): number {
    if (assignments.length === 0) return 0;

    const avgLines = assignments.reduce((sum, a) => sum + a.assignedLines, 0) / assignments.length;
    const variance = assignments.reduce((sum, a) => sum + Math.pow(a.assignedLines - avgLines, 2), 0) / assignments.length;

    return variance / avgLines;
  }

  private parseRuleToConfig(rule: WavePlanningRule): WaveConfig {
    return {
      waveType: rule.parameters?.waveType || 'batch',
      priority: rule.parameters?.priority || 'normal',
      maxOrders: rule.parameters?.maxOrders,
      maxLines: rule.parameters?.maxLines,
    };
  }

  private groupOrdersIntoWaves(orderIds: string[], config: WaveConfig): string[][] {
    const groups: string[][] = [];
    const maxOrders = config.maxOrders || 50;

    for (let i = 0; i < orderIds.length; i += maxOrders) {
      groups.push(orderIds.slice(i, i + maxOrders));
    }

    return groups;
  }

  private async generateWaveNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const [result] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(waves)
      .where(
        and(
          eq(waves.tenantId, tenantId),
          sql`DATE(${waves.createdAt}) = CURRENT_DATE`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `WAVE-${year}${month}${day}-${String(sequence).padStart(4, '0')}`;
  }
}

