// =====================================================================================
// AYAZLOGISTICS - PRODUCTION PLANNING & SCHEDULING SERVICE
// =====================================================================================
// Description: Advanced production planning with capacity planning and job scheduling
// Features: MRP, capacity planning, job shop scheduling, finite capacity scheduling
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, between, desc } from 'drizzle-orm';
import { EventBusService } from '../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer, boolean, text, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../database/schema/core/tenants.schema';
import { users } from '../../../database/schema/core/users.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const productionOrders = pgTable('production_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  productionOrderNumber: varchar('production_order_number', { length: 50 }).notNull().unique(),
  orderType: varchar('order_type', { length: 50 }).notNull(),
  productId: uuid('product_id').notNull(),
  productSku: varchar('product_sku', { length: 100 }),
  productName: varchar('product_name', { length: 255 }),
  quantityOrdered: decimal('quantity_ordered', { precision: 18, scale: 3 }).notNull(),
  quantityProduced: decimal('quantity_produced', { precision: 18, scale: 3 }).default('0'),
  unit: varchar('unit', { length: 20 }),
  priority: varchar('priority', { length: 20 }).default('normal'),
  status: varchar('status', { length: 20 }).default('planned'),
  plannedStartDate: date('planned_start_date').notNull(),
  plannedEndDate: date('planned_end_date').notNull(),
  actualStartDate: date('actual_start_date'),
  actualEndDate: date('actual_end_date'),
  salesOrderReference: varchar('sales_order_reference', { length: 50 }),
  customerReference: varchar('customer_reference', { length: 255 }),
  bom: jsonb('bom'),
  routing: jsonb('routing'),
  materialRequirements: jsonb('material_requirements'),
  capacityRequirements: jsonb('capacity_requirements'),
  assignedLine: varchar('assigned_line', { length: 100 }),
  assignedShift: varchar('assigned_shift', { length: 50 }),
  scheduledSlots: jsonb('scheduled_slots'),
  actualCost: decimal('actual_cost', { precision: 18, scale: 2 }),
  standardCost: decimal('standard_cost', { precision: 18, scale: 2 }),
  variance: decimal('variance', { precision: 18, scale: 2 }),
  yieldRate: decimal('yield_rate', { precision: 5, scale: 2 }),
  scrapRate: decimal('scrap_rate', { precision: 5, scale: 2 }),
  efficiency: decimal('efficiency', { precision: 5, scale: 2 }),
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const workCenters = pgTable('work_centers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  workCenterCode: varchar('work_center_code', { length: 50 }).notNull().unique(),
  workCenterName: varchar('work_center_name', { length: 255 }).notNull(),
  workCenterType: varchar('work_center_type', { length: 50 }),
  department: varchar('department', { length: 100 }),
  capacity: decimal('capacity', { precision: 18, scale: 2 }).notNull(),
  capacityUnit: varchar('capacity_unit', { length: 20 }),
  efficiency: decimal('efficiency', { precision: 5, scale: 2 }).default('100'),
  utilization: decimal('utilization', { precision: 5, scale: 2 }),
  setupTime: integer('setup_time'),
  laborCostPerHour: decimal('labor_cost_per_hour', { precision: 10, scale: 2 }),
  overheadCostPerHour: decimal('overhead_cost_per_hour', { precision: 10, scale: 2 }),
  operatingHours: jsonb('operating_hours'),
  isActive: boolean('is_active').default(true),
  capabilities: jsonb('capabilities'),
  equipment: jsonb('equipment'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const capacityPlan = pgTable('capacity_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  planNumber: varchar('plan_number', { length: 50 }).notNull().unique(),
  planDate: date('plan_date').notNull(),
  planHorizon: varchar('plan_horizon', { length: 20 }),
  workCenterId: uuid('work_center_id').references(() => workCenters.id),
  totalCapacity: decimal('total_capacity', { precision: 18, scale: 2 }),
  availableCapacity: decimal('available_capacity', { precision: 18, scale: 2 }),
  requiredCapacity: decimal('required_capacity', { precision: 18, scale: 2 }),
  utilizationRate: decimal('utilization_rate', { precision: 5, scale: 2 }),
  overloadPercentage: decimal('overload_percentage', { precision: 5, scale: 2 }),
  bottlenecks: jsonb('bottlenecks'),
  recommendations: jsonb('recommendations'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface BillOfMaterials {
  bomId: string;
  productId: string;
  version: number;
  effectiveDate: Date;
  components: Array<{
    componentId: string;
    componentSku: string;
    componentName: string;
    quantity: number;
    unit: string;
    scrapFactor: number;
    leadTime: number;
    cost: number;
    isPhantom: boolean;
  }>;
  totalCost: number;
  yieldPercentage: number;
}

interface ProductionRouting {
  routingId: string;
  productId: string;
  version: number;
  operations: Array<{
    operationNumber: number;
    operationName: string;
    workCenterId: string;
    workCenterName: string;
    setupTime: number;
    runTimePerUnit: number;
    queueTime: number;
    moveTime: number;
    laborCost: number;
    overheadCost: number;
    totalCost: number;
    description?: string;
  }>;
  totalLeadTime: number;
  totalCost: number;
}

interface MRPResult {
  productId: string;
  productSku: string;
  productName: string;
  planningHorizon: {
    start: Date;
    end: Date;
  };
  requirements: Array<{
    date: Date;
    grossRequirement: number;
    scheduledReceipts: number;
    projectedOnHand: number;
    netRequirement: number;
    plannedOrderReceipt: number;
    plannedOrderRelease: number;
  }>;
  recommendations: {
    purchaseOrders: Array<{
      componentId: string;
      componentName: string;
      quantity: number;
      releaseDate: Date;
      dueDate: Date;
      estimatedCost: number;
    }>;
    productionOrders: Array<{
      productId: string;
      productName: string;
      quantity: number;
      startDate: Date;
      endDate: Date;
    }>;
  };
}

interface CapacityAnalysis {
  workCenterId: string;
  workCenterName: string;
  planningPeriod: {
    start: Date;
    end: Date;
  };
  capacity: {
    total: number;
    available: number;
    required: number;
    utilization: number;
  };
  loadByPeriod: Array<{
    date: Date;
    capacity: number;
    load: number;
    utilization: number;
    overload: number;
    status: 'underutilized' | 'normal' | 'near_capacity' | 'overloaded';
  }>;
  bottlenecks: Array<{
    date: Date;
    overload: number;
    affectedOrders: string[];
    impact: string;
  }>;
  recommendations: Array<{
    action: string;
    impact: string;
    cost: number;
  }>;
}

interface ProductionSchedule {
  scheduleDate: Date;
  horizon: number;
  workOrders: Array<{
    productionOrderId: string;
    productionOrderNumber: string;
    productName: string;
    quantity: number;
    priority: number;
    workCenterId: string;
    workCenterName: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    duration: number;
    setupTime: number;
    runTime: number;
    predecessors?: string[];
    successors?: string[];
  }>;
  ganttChart: Array<{
    workCenterId: string;
    tasks: Array<{
      taskId: string;
      taskName: string;
      start: Date;
      end: Date;
      progress: number;
    }>;
  }>;
  metrics: {
    makespan: number;
    avgUtilization: number;
    onTimeCompletion: number;
    setupTimePercentage: number;
  };
}

interface JobShopScheduling {
  jobs: Array<{
    jobId: string;
    operations: Array<{
      operationId: string;
      workCenterId: string;
      processingTime: number;
      setupTime: number;
    }>;
    priority: number;
    dueDate: Date;
  }>;
  algorithm: 'fcfs' | 'edd' | 'spt' | 'critical_ratio' | 'genetic_algorithm';
  schedule: Array<{
    workCenterId: string;
    sequence: Array<{
      jobId: string;
      operationId: string;
      startTime: number;
      endTime: number;
    }>;
  }>;
  performance: {
    makespan: number;
    avgFlowTime: number;
    avgLateness: number;
    machineUtilization: Record<string, number>;
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class ProductionSchedulerService {
  private readonly logger = new Logger(ProductionSchedulerService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // PRODUCTION ORDER MANAGEMENT
  // =====================================================================================

  async createProductionOrder(tenantId: string, data: {
    productId: string;
    quantityOrdered: number;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    plannedStartDate: Date;
    plannedEndDate: Date;
    salesOrderReference?: string;
    createdBy: string;
  }): Promise<any> {
    this.logger.log(`Creating production order for product ${data.productId}`);

    const poNumber = await this.generateProductionOrderNumber(tenantId);

    // Get BOM and routing
    const bom = await this.getBOM(data.productId);
    const routing = await this.getRouting(data.productId);

    // Calculate material requirements
    const materialRequirements = bom.components.map(comp => ({
      componentId: comp.componentId,
      componentName: comp.componentName,
      requiredQuantity: comp.quantity * data.quantityOrdered * (1 + comp.scrapFactor),
      unit: comp.unit,
      estimatedCost: comp.cost * comp.quantity * data.quantityOrdered,
    }));

    // Calculate capacity requirements
    const capacityRequirements = routing.operations.map(op => ({
      workCenterId: op.workCenterId,
      workCenterName: op.workCenterName,
      setupTime: op.setupTime,
      runTime: op.runTimePerUnit * data.quantityOrdered,
      totalTime: op.setupTime + (op.runTimePerUnit * data.quantityOrdered),
      estimatedCost: op.totalCost * data.quantityOrdered,
    }));

    const standardCost = bom.totalCost * data.quantityOrdered + 
                         routing.totalCost * data.quantityOrdered;

    const [po] = await this.db.insert(productionOrders).values({
      tenantId,
      productionOrderNumber: poNumber,
      orderType: 'make_to_order',
      productId: data.productId,
      productSku: 'SKU-' + data.productId,
      quantityOrdered: data.quantityOrdered.toString(),
      priority: data.priority,
      status: 'planned',
      plannedStartDate: data.plannedStartDate,
      plannedEndDate: data.plannedEndDate,
      salesOrderReference: data.salesOrderReference,
      bom: bom as any,
      routing: routing as any,
      materialRequirements: materialRequirements as any,
      capacityRequirements: capacityRequirements as any,
      standardCost: standardCost.toFixed(2),
      createdBy: data.createdBy,
    }).returning();

    await this.eventBus.emit('production.order.created', {
      productionOrderId: po.id,
      productionOrderNumber: poNumber,
      productId: data.productId,
      quantity: data.quantityOrdered,
    });

    return po;
  }

  async releaseProductionOrder(productionOrderId: string, releasedBy: string): Promise<any> {
    const [po] = await this.db
      .select()
      .from(productionOrders)
      .where(eq(productionOrders.id, productionOrderId))
      .limit(1);

    if (!po) {
      throw new NotFoundException('Production order not found');
    }

    // Check material availability
    const materialCheck = await this.checkMaterialAvailability(po);

    if (!materialCheck.allAvailable) {
      throw new BadRequestException(`Material shortage: ${materialCheck.shortages.join(', ')}`);
    }

    // Reserve materials
    await this.reserveMaterials(po);

    const [released] = await this.db
      .update(productionOrders)
      .set({
        status: 'released',
        metadata: sql`COALESCE(${productionOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          releasedBy,
          releasedAt: new Date(),
        })}::jsonb`,
      })
      .where(eq(productionOrders.id, productionOrderId))
      .returning();

    await this.eventBus.emit('production.order.released', {
      productionOrderId,
      productionOrderNumber: po.productionOrderNumber,
    });

    return released;
  }

  async startProduction(productionOrderId: string, startedBy: string): Promise<any> {
    const [updated] = await this.db
      .update(productionOrders)
      .set({
        status: 'in_progress',
        actualStartDate: new Date(),
        metadata: sql`COALESCE(${productionOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          startedBy,
        })}::jsonb`,
      })
      .where(eq(productionOrders.id, productionOrderId))
      .returning();

    await this.eventBus.emit('production.started', {
      productionOrderId,
      productionOrderNumber: updated.productionOrderNumber,
    });

    return updated;
  }

  async completeProduction(productionOrderId: string, data: {
    quantityProduced: number;
    quantityScrap: number;
    actualCost: number;
    completedBy: string;
  }): Promise<any> {
    const [po] = await this.db
      .select()
      .from(productionOrders)
      .where(eq(productionOrders.id, productionOrderId))
      .limit(1);

    if (!po) {
      throw new NotFoundException('Production order not found');
    }

    const quantityOrdered = parseFloat(po.quantityOrdered);
    const yieldRate = (data.quantityProduced / quantityOrdered) * 100;
    const scrapRate = (data.quantityScrap / quantityOrdered) * 100;

    const standardCost = parseFloat(po.standardCost || '0');
    const variance = data.actualCost - standardCost;
    const efficiency = standardCost > 0 ? (standardCost / data.actualCost) * 100 : 100;

    const [completed] = await this.db
      .update(productionOrders)
      .set({
        status: 'completed',
        actualEndDate: new Date(),
        quantityProduced: data.quantityProduced.toString(),
        actualCost: data.actualCost.toFixed(2),
        variance: variance.toFixed(2),
        yieldRate: yieldRate.toFixed(2),
        scrapRate: scrapRate.toFixed(2),
        efficiency: efficiency.toFixed(2),
        metadata: sql`COALESCE(${productionOrders.metadata}, '{}'::jsonb) || ${JSON.stringify({
          completedBy: data.completedBy,
          completedAt: new Date(),
          scrapQuantity: data.quantityScrap,
        })}::jsonb`,
      })
      .where(eq(productionOrders.id, productionOrderId))
      .returning();

    await this.eventBus.emit('production.completed', {
      productionOrderId,
      productionOrderNumber: po.productionOrderNumber,
      quantityProduced: data.quantityProduced,
      yieldRate,
    });

    return completed;
  }

  // =====================================================================================
  // MRP (Material Requirements Planning)
  // =====================================================================================

  async runMRP(
    productId: string,
    demandQuantity: number,
    demandDate: Date,
    planningHorizonDays: number = 90,
  ): Promise<MRPResult> {
    this.logger.log(`Running MRP for product ${productId}, demand: ${demandQuantity}`);

    const bom = await this.getBOM(productId);
    const routing = await this.getRouting(productId);

    // Calculate lead time
    const productionLeadTime = routing.totalLeadTime;
    const purchasingLeadTime = Math.max(...bom.components.map(c => c.leadTime));
    const totalLeadTime = productionLeadTime + purchasingLeadTime;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + planningHorizonDays);

    // Generate time-phased requirements
    const requirements: any[] = [];

    for (let i = 0; i < planningHorizonDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const grossRequirement = date.getTime() === demandDate.getTime() ? demandQuantity : 0;
      const scheduledReceipts = 0;
      const previousOnHand = i > 0 ? requirements[i - 1].projectedOnHand : 100;
      const projectedOnHand = previousOnHand + scheduledReceipts - grossRequirement;

      const netRequirement = projectedOnHand < 0 ? Math.abs(projectedOnHand) : 0;

      const plannedOrderReceipt = netRequirement > 0 ? netRequirement : 0;
      const releaseDate = new Date(date);
      releaseDate.setDate(releaseDate.getDate() - totalLeadTime);

      requirements.push({
        date,
        grossRequirement,
        scheduledReceipts,
        projectedOnHand,
        netRequirement,
        plannedOrderReceipt,
        plannedOrderRelease: plannedOrderReceipt,
      });
    }

    // Generate recommendations
    const purchaseOrders = bom.components
      .filter(comp => !comp.isPhantom)
      .map(comp => ({
        componentId: comp.componentId,
        componentName: comp.componentName,
        quantity: comp.quantity * demandQuantity * (1 + comp.scrapFactor),
        releaseDate: new Date(demandDate.getTime() - comp.leadTime * 24 * 60 * 60 * 1000),
        dueDate: new Date(demandDate.getTime() - productionLeadTime * 24 * 60 * 60 * 1000),
        estimatedCost: comp.cost * comp.quantity * demandQuantity,
      }));

    const productionOrders = [{
      productId,
      productName: 'Product Name',
      quantity: demandQuantity,
      startDate: new Date(demandDate.getTime() - productionLeadTime * 24 * 60 * 60 * 1000),
      endDate: demandDate,
    }];

    return {
      productId,
      productSku: `SKU-${productId}`,
      productName: 'Product Name',
      planningHorizon: {
        start: startDate,
        end: endDate,
      },
      requirements,
      recommendations: {
        purchaseOrders,
        productionOrders,
      },
    };
  }

  // =====================================================================================
  // CAPACITY PLANNING
  // =====================================================================================

  async analyzeCapacity(
    workCenterId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CapacityAnalysis> {
    this.logger.log(`Analyzing capacity for work center ${workCenterId}`);

    const [workCenter] = await this.db
      .select()
      .from(workCenters)
      .where(eq(workCenters.id, workCenterId))
      .limit(1);

    if (!workCenter) {
      throw new NotFoundException('Work center not found');
    }

    const dailyCapacity = parseFloat(workCenter.capacity);

    // Get production orders scheduled for this work center
    const scheduledOrders = await this.db
      .select()
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.assignedLine, workCenter.workCenterCode),
          gte(productionOrders.plannedStartDate, startDate),
          lte(productionOrders.plannedEndDate, endDate),
        ),
      );

    const loadByPeriod: any[] = [];
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const dayLoad = scheduledOrders
        .filter(order => {
          const start = new Date(order.plannedStartDate);
          const end = new Date(order.plannedEndDate);
          return date >= start && date <= end;
        })
        .reduce((sum, order) => {
          const capacityReqs = order.capacityRequirements as any[] || [];
          const wcReq = capacityReqs.find(cr => cr.workCenterId === workCenterId);
          return sum + (wcReq?.totalTime || 0);
        }, 0);

      const utilization = (dayLoad / dailyCapacity) * 100;
      const overload = Math.max(0, dayLoad - dailyCapacity);

      let status: 'underutilized' | 'normal' | 'near_capacity' | 'overloaded';
      if (utilization < 60) status = 'underutilized';
      else if (utilization < 85) status = 'normal';
      else if (utilization < 100) status = 'near_capacity';
      else status = 'overloaded';

      loadByPeriod.push({
        date,
        capacity: dailyCapacity,
        load: parseFloat(dayLoad.toFixed(2)),
        utilization: parseFloat(utilization.toFixed(2)),
        overload: parseFloat(overload.toFixed(2)),
        status,
      });
    }

    const totalLoad = loadByPeriod.reduce((sum, p) => sum + p.load, 0);
    const totalCapacity = dailyCapacity * days;
    const avgUtilization = (totalLoad / totalCapacity) * 100;

    const bottlenecks = loadByPeriod
      .filter(p => p.status === 'overloaded')
      .map(p => ({
        date: p.date,
        overload: p.overload,
        affectedOrders: [],
        impact: `${p.overload.toFixed(2)} hours over capacity`,
      }));

    const recommendations: any[] = [];

    if (avgUtilization > 90) {
      recommendations.push({
        action: 'Add overtime shifts or hire temporary workers',
        impact: 'Increase capacity by 20%',
        cost: 15000,
      });
    }

    if (bottlenecks.length > 5) {
      recommendations.push({
        action: 'Outsource excess load to partner facilities',
        impact: 'Relieve bottlenecks',
        cost: 25000,
      });
    }

    return {
      workCenterId,
      workCenterName: workCenter.workCenterName,
      planningPeriod: { start: startDate, end: endDate },
      capacity: {
        total: parseFloat((totalCapacity).toFixed(2)),
        available: parseFloat((totalCapacity - totalLoad).toFixed(2)),
        required: parseFloat(totalLoad.toFixed(2)),
        utilization: parseFloat(avgUtilization.toFixed(2)),
      },
      loadByPeriod,
      bottlenecks,
      recommendations,
    };
  }

  // =====================================================================================
  // JOB SHOP SCHEDULING
  // =====================================================================================

  async scheduleJobs(
    jobs: JobShopScheduling['jobs'],
    algorithm: JobShopScheduling['algorithm'] = 'edd',
  ): Promise<JobShopScheduling> {
    this.logger.log(`Scheduling ${jobs.length} jobs using ${algorithm} algorithm`);

    let schedule: JobShopScheduling['schedule'] = [];

    switch (algorithm) {
      case 'fcfs':
        schedule = this.scheduleFCFS(jobs);
        break;
      case 'edd':
        schedule = this.scheduleEDD(jobs);
        break;
      case 'spt':
        schedule = this.scheduleSPT(jobs);
        break;
      case 'critical_ratio':
        schedule = this.scheduleCriticalRatio(jobs);
        break;
      case 'genetic_algorithm':
        schedule = await this.scheduleGeneticAlgorithm(jobs);
        break;
    }

    const performance = this.calculateSchedulePerformance(schedule, jobs);

    return {
      jobs,
      algorithm,
      schedule,
      performance,
    };
  }

  private scheduleEDD(jobs: JobShopScheduling['jobs']): JobShopScheduling['schedule'] {
    const sortedJobs = [...jobs].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    const workCenterSchedules = new Map<string, any[]>();

    sortedJobs.forEach(job => {
      let currentTime = 0;

      job.operations.forEach(operation => {
        const wcSchedule = workCenterSchedules.get(operation.workCenterId) || [];

        const lastEndTime = wcSchedule.length > 0
          ? wcSchedule[wcSchedule.length - 1].endTime
          : 0;

        const startTime = Math.max(currentTime, lastEndTime);
        const endTime = startTime + operation.setupTime + operation.processingTime;

        wcSchedule.push({
          jobId: job.jobId,
          operationId: operation.operationId,
          startTime,
          endTime,
        });

        workCenterSchedules.set(operation.workCenterId, wcSchedule);
        currentTime = endTime;
      });
    });

    return Array.from(workCenterSchedules.entries()).map(([workCenterId, sequence]) => ({
      workCenterId,
      sequence,
    }));
  }

  private scheduleFCFS(jobs: JobShopScheduling['jobs']): JobShopScheduling['schedule'] {
    return this.scheduleEDD(jobs);
  }

  private scheduleSPT(jobs: JobShopScheduling['jobs']): JobShopScheduling['schedule'] {
    const sortedJobs = [...jobs].sort((a, b) => {
      const totalTimeA = a.operations.reduce((sum, op) => sum + op.processingTime + op.setupTime, 0);
      const totalTimeB = b.operations.reduce((sum, op) => sum + op.processingTime + op.setupTime, 0);
      return totalTimeA - totalTimeB;
    });

    return this.scheduleJobSequence(sortedJobs);
  }

  private scheduleCriticalRatio(jobs: JobShopScheduling['jobs']): JobShopScheduling['schedule'] {
    const now = Date.now();

    const jobsWithCR = jobs.map(job => {
      const totalTime = job.operations.reduce((sum, op) => sum + op.processingTime + op.setupTime, 0);
      const timeRemaining = (job.dueDate.getTime() - now) / (1000 * 60 * 60);
      const criticalRatio = timeRemaining / totalTime;

      return { ...job, criticalRatio };
    });

    const sortedJobs = jobsWithCR.sort((a, b) => a.criticalRatio - b.criticalRatio);

    return this.scheduleJobSequence(sortedJobs);
  }

  private async scheduleGeneticAlgorithm(jobs: JobShopScheduling['jobs']): Promise<JobShopScheduling['schedule']> {
    const populationSize = 50;
    const generations = 100;

    let population = this.initializeJobShopPopulation(jobs, populationSize);

    for (let gen = 0; gen < generations; gen++) {
      population = population.map(individual => {
        const schedule = this.decodeJobShopChromosome(individual, jobs);
        const performance = this.calculateSchedulePerformance(schedule, jobs);
        return {
          ...individual,
          fitness: 10000 / (performance.makespan + 1),
        };
      });

      population.sort((a, b) => b.fitness - a.fitness);

      const selected = population.slice(0, populationSize / 2);
      const offspring = this.crossoverJobShop(selected, populationSize / 2);
      const mutated = offspring.map(child => Math.random() < 0.1 ? this.mutateJobShop(child) : child);

      population = [...selected, ...mutated];
    }

    const bestIndividual = population[0];
    return this.decodeJobShopChromosome(bestIndividual, jobs);
  }

  private scheduleJobSequence(jobs: any[]): JobShopScheduling['schedule'] {
    const workCenterSchedules = new Map<string, any[]>();

    jobs.forEach(job => {
      let currentTime = 0;

      job.operations.forEach((operation: any) => {
        const wcSchedule = workCenterSchedules.get(operation.workCenterId) || [];

        const lastEndTime = wcSchedule.length > 0
          ? wcSchedule[wcSchedule.length - 1].endTime
          : 0;

        const startTime = Math.max(currentTime, lastEndTime);
        const endTime = startTime + operation.setupTime + operation.processingTime;

        wcSchedule.push({
          jobId: job.jobId,
          operationId: operation.operationId,
          startTime,
          endTime,
        });

        workCenterSchedules.set(operation.workCenterId, wcSchedule);
        currentTime = endTime;
      });
    });

    return Array.from(workCenterSchedules.entries()).map(([workCenterId, sequence]) => ({
      workCenterId,
      sequence,
    }));
  }

  private calculateSchedulePerformance(
    schedule: JobShopScheduling['schedule'],
    jobs: JobShopScheduling['jobs'],
  ): JobShopScheduling['performance'] {
    const makespan = Math.max(
      ...schedule.flatMap(wc => wc.sequence.map(s => s.endTime)),
    );

    const completionTimes = jobs.map(job => {
      const lastOp = schedule
        .flatMap(wc => wc.sequence)
        .filter(s => s.jobId === job.jobId)
        .sort((a, b) => b.endTime - a.endTime)[0];

      return lastOp?.endTime || 0;
    });

    const avgFlowTime = completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length;

    const lateness = jobs.map((job, idx) => {
      const completionTime = completionTimes[idx];
      const dueTime = job.dueDate.getTime() / (1000 * 60 * 60);
      return completionTime - dueTime;
    });

    const avgLateness = lateness.reduce((sum, l) => sum + l, 0) / lateness.length;

    const machineUtilization: Record<string, number> = {};
    schedule.forEach(wc => {
      const totalTime = wc.sequence.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
      machineUtilization[wc.workCenterId] = (totalTime / makespan) * 100;
    });

    return {
      makespan: parseFloat(makespan.toFixed(2)),
      avgFlowTime: parseFloat(avgFlowTime.toFixed(2)),
      avgLateness: parseFloat(avgLateness.toFixed(2)),
      machineUtilization,
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async getBOM(productId: string): Promise<BillOfMaterials> {
    return {
      bomId: 'BOM-001',
      productId,
      version: 1,
      effectiveDate: new Date(),
      components: [
        {
          componentId: 'COMP-001',
          componentSku: 'SKU-COMP-001',
          componentName: 'Component A',
          quantity: 2,
          unit: 'pcs',
          scrapFactor: 0.05,
          leadTime: 7,
          cost: 10,
          isPhantom: false,
        },
        {
          componentId: 'COMP-002',
          componentSku: 'SKU-COMP-002',
          componentName: 'Component B',
          quantity: 3,
          unit: 'pcs',
          scrapFactor: 0.03,
          leadTime: 5,
          cost: 15,
          isPhantom: false,
        },
      ],
      totalCost: 65,
      yieldPercentage: 95,
    };
  }

  private async getRouting(productId: string): Promise<ProductionRouting> {
    return {
      routingId: 'ROUTE-001',
      productId,
      version: 1,
      operations: [
        {
          operationNumber: 10,
          operationName: 'Assembly',
          workCenterId: 'WC-001',
          workCenterName: 'Assembly Line 1',
          setupTime: 30,
          runTimePerUnit: 15,
          queueTime: 60,
          moveTime: 10,
          laborCost: 50,
          overheadCost: 25,
          totalCost: 75,
        },
        {
          operationNumber: 20,
          operationName: 'Quality Check',
          workCenterId: 'WC-002',
          workCenterName: 'QC Station',
          setupTime: 15,
          runTimePerUnit: 5,
          queueTime: 30,
          moveTime: 5,
          laborCost: 40,
          overheadCost: 20,
          totalCost: 60,
        },
      ],
      totalLeadTime: 2,
      totalCost: 135,
    };
  }

  private async checkMaterialAvailability(po: any): Promise<{
    allAvailable: boolean;
    shortages: string[];
  }> {
    return {
      allAvailable: true,
      shortages: [],
    };
  }

  private async reserveMaterials(po: any): Promise<void> {
    // Implementation would reserve materials in inventory
  }

  private initializeJobShopPopulation(jobs: any[], size: number): any[] {
    const population: any[] = [];

    for (let i = 0; i < size; i++) {
      const chromosome = jobs.map((_, idx) => idx);
      this.shuffleArray(chromosome);
      population.push({ genes: chromosome, fitness: 0 });
    }

    return population;
  }

  private decodeJobShopChromosome(individual: any, jobs: any[]): JobShopScheduling['schedule'] {
    const orderedJobs = individual.genes.map((idx: number) => jobs[idx]);
    return this.scheduleJobSequence(orderedJobs);
  }

  private crossoverJobShop(parents: any[], count: number): any[] {
    const offspring: any[] = [];

    for (let i = 0; i < count; i++) {
      const p1 = parents[Math.floor(Math.random() * parents.length)];
      const p2 = parents[Math.floor(Math.random() * parents.length)];

      const child = this.orderCrossover(p1.genes, p2.genes);
      offspring.push({ genes: child, fitness: 0 });
    }

    return offspring;
  }

  private mutateJobShop(individual: any): any {
    const genes = [...individual.genes];
    const idx1 = Math.floor(Math.random() * genes.length);
    const idx2 = Math.floor(Math.random() * genes.length);
    [genes[idx1], genes[idx2]] = [genes[idx2], genes[idx1]];

    return { genes, fitness: 0 };
  }

  private orderCrossover(parent1: number[], parent2: number[]): number[] {
    const length = parent1.length;
    const start = Math.floor(Math.random() * length);
    const end = start + Math.floor(Math.random() * (length - start));

    const child = new Array(length).fill(-1);

    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
    }

    let childIndex = (end + 1) % length;
    let parent2Index = (end + 1) % length;

    while (child.includes(-1)) {
      if (!child.includes(parent2[parent2Index])) {
        child[childIndex] = parent2[parent2Index];
        childIndex = (childIndex + 1) % length;
      }
      parent2Index = (parent2Index + 1) % length;
    }

    return child;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private async generateProductionOrderNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const [result] = await this.db
      .select({ count: sql<number>`COUNT(*)` })
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${productionOrders.createdAt}) = ${year}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `PROD-${year}-${String(sequence).padStart(5, '0')}`;
  }
}

