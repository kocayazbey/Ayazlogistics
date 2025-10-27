import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  productId: string;
  sku: string;
  plannedQuantity: number;
  producedQuantity: number;
  status: 'planned' | 'in_production' | 'completed' | 'cancelled';
  productionLine: string;
  startDate: Date;
  endDate?: Date;
  pallets: string[];
}

interface ProductionHandover {
  handoverId: string;
  workOrderId: string;
  palletId: string;
  quantity: number;
  productionDate: Date;
  expiryDate?: Date;
  lotNumber: string;
  batchNumber?: string;
  qualityChecked: boolean;
  handoverStatus: 'pending' | 'approved' | 'rejected';
}

@Injectable()
export class ProductionIntegrationService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  async createWorkOrder(data: any, userId: string) {
    const woId = `WO-${Date.now()}`;
    const workOrder: WorkOrder = {
      id: woId,
      workOrderNumber: data.workOrderNumber,
      productId: data.productId,
      sku: data.sku,
      plannedQuantity: data.plannedQuantity,
      producedQuantity: 0,
      status: 'planned',
      productionLine: data.productionLine,
      startDate: data.startDate,
      pallets: [],
    };
    await this.eventBus.emit('work.order.created', { woId, userId });
    return workOrder;
  }

  async createProductionPallet(data: any, userId: string) {
    const palletId = `PROD-PLT-${Date.now()}`;
    await this.eventBus.emit('production.pallet.created', { palletId, userId });
    return { palletId, ...data };
  }

  async handoverToWarehouse(data: any, userId: string) {
    const handoverId = `HO-${Date.now()}`;
    const handover: ProductionHandover = {
      handoverId,
      workOrderId: data.workOrderId,
      palletId: data.palletId,
      quantity: data.quantity,
      productionDate: data.productionDate,
      expiryDate: data.expiryDate,
      lotNumber: data.lotNumber,
      batchNumber: data.batchNumber,
      qualityChecked: data.qualityChecked,
      handoverStatus: 'pending',
    };
    await this.eventBus.emit('production.handover', { handoverId, userId });
    this.wsGateway.broadcast('production:handover', handover);
    return handover;
  }

  async approveHandover(handoverId: string, warehouseId: string, userId: string) {
    await this.eventBus.emit('production.handover.approved', { handoverId, userId });
    return { handoverId, status: 'approved', receivingLocation: 'RECV-001' };
  }

  async rejectHandover(handoverId: string, reason: string, userId: string) {
    await this.eventBus.emit('production.handover.rejected', { handoverId, reason });
    return { handoverId, status: 'rejected', reason };
  }

  async getWorkOrderStatus(workOrderId: string) {
    return { workOrderId, status: 'in_production', progress: 75 };
  }

  async completeWorkOrder(workOrderId: string, userId: string) {
    await this.eventBus.emit('work.order.completed', { workOrderId, userId });
    return { workOrderId, status: 'completed', completedAt: new Date() };
  }
}

