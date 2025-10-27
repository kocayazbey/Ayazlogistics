import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { inventory, locations } from '../../../../database/schema/shared/wms.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class PeriodicCountService {
  private countSchedules: Map<string, any> = new Map();
  private countPlans: Map<string, any> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async planPeriodicCount(data: {
    warehouseId: string;
    countType: 'full_warehouse' | 'zone' | 'corridor' | 'category';
    scheduledDate: Date;
    zones?: string[];
    corridors?: string[];
    assignedTeams?: string[];
    estimatedDuration?: number;
  }, tenantId: string, userId: string) {
    const planId = `PLAN-${Date.now()}`;
    this.countPlans.set(planId, { id: planId, ...data, tenantId, createdBy: userId, status: 'planned', createdAt: new Date() });
    await this.eventBus.emit('periodic.count.planned', { planId, scheduledDate: data.scheduledDate, tenantId });
    return this.countPlans.get(planId);
  }

  async dynamicCountPallet(data: {
    palletId: string;
    locationId: string;
    countedQuantity: number;
    counter: string;
  }, tenantId: string) {
    const countId = `DYN-PLT-${Date.now()}`;
    const [inv] = await this.db.select().from(inventory).where(eq(inventory.id, data.palletId)).limit(1);
    const variance = data.countedQuantity - (inv?.quantityOnHand || 0);
    await this.eventBus.emit('dynamic.pallet.counted', { countId, palletId: data.palletId, variance, tenantId });
    return { countId, palletId: data.palletId, systemQty: inv?.quantityOnHand || 0, countedQty: data.countedQuantity, variance, countedAt: new Date() };
  }

  async dynamicCountPickBin(data: {
    locationId: string;
    productId: string;
    countedQuantity: number;
    counter: string;
  }, tenantId: string) {
    const countId = `DYN-BIN-${Date.now()}`;
    const inv = await this.db.select().from(inventory).where(and(eq(inventory.locationId, data.locationId), eq(inventory.productId, data.productId))).limit(1);
    const variance = data.countedQuantity - (inv[0]?.quantityOnHand || 0);
    await this.eventBus.emit('dynamic.pick.bin.counted', { countId, locationId: data.locationId, variance, tenantId });
    return { countId, locationId: data.locationId, productId: data.productId, variance, countedAt: new Date() };
  }

  async periodicNormalCount(data: {
    warehouseId: string;
    locations: string[];
  }, tenantId: string, userId: string) {
    const countId = `PER-NORM-${Date.now()}`;
    const tasks = data.locations.map((locId, idx) => ({
      taskId: `TASK-${countId}-${idx}`,
      locationId: locId,
      status: 'pending',
    }));
    await this.eventBus.emit('periodic.normal.count.started', { countId, taskCount: tasks.length, tenantId });
    return { countId, tasks, startedAt: new Date() };
  }

  async periodicCorridorCount(data: {
    warehouseId: string;
    corridors: string[];
  }, tenantId: string, userId: string) {
    const countId = `PER-COR-${Date.now()}`;
    await this.eventBus.emit('periodic.corridor.count.started', { countId, corridors: data.corridors.length, tenantId });
    return { countId, corridors: data.corridors, startedAt: new Date() };
  }

  async periodicTransportPalletCount(data: {
    warehouseId: string;
    transportArea: string;
  }, tenantId: string, userId: string) {
    const countId = `PER-TRP-${Date.now()}`;
    await this.eventBus.emit('periodic.transport.pallet.count.started', { countId, tenantId });
    return { countId, transportArea: data.transportArea, startedAt: new Date() };
  }

  async periodicCountControl(data: {
    countId: string;
    controlledBy: string;
    variances: Array<{
      locationId: string;
      productId: string;
      systemQty: number;
      countedQty: number;
      approved: boolean;
    }>;
  }, tenantId: string) {
    await this.eventBus.emit('periodic.count.controlled', { countId: data.countId, varianceCount: data.variances.length, tenantId });
    return { countId: data.countId, variancesReviewed: data.variances.length, controlledBy: data.controlledBy, controlledAt: new Date() };
  }

  async quickCount(data: {
    warehouseId: string;
    locationIds: string[];
    productIds?: string[];
  }, tenantId: string, userId: string) {
    const countId = `QUICK-${Date.now()}`;
    const tasks = data.locationIds.map((locId, idx) => ({
      taskId: `QC-${idx}`,
      locationId: locId,
      status: 'pending',
    }));
    await this.eventBus.emit('quick.count.started', { countId, taskCount: tasks.length, tenantId });
    return { countId, tasks, expectedDuration: tasks.length * 2, startedAt: new Date() };
  }

  async approveCountResults(data: {
    countId: string;
    approvedBy: string;
    applyToStock: boolean;
  }, tenantId: string) {
    await this.eventBus.emit('count.approved', { countId: data.countId, applyToStock: data.applyToStock, tenantId });
    return { countId: data.countId, approved: true, approvedBy: data.approvedBy, approvedAt: new Date(), stockUpdated: data.applyToStock };
  }

  async transferCountResultsToStock(countId: string, tenantId: string, userId: string) {
    await this.eventBus.emit('count.results.transferred', { countId, tenantId });
    return { countId, transferred: true, transferredBy: userId, transferredAt: new Date() };
  }

  async transferCountToErp(countId: string, tenantId: string) {
    await this.eventBus.emit('count.erp.transferred', { countId, tenantId });
    return { countId, erpTransferred: true, transferredAt: new Date() };
  }
}

