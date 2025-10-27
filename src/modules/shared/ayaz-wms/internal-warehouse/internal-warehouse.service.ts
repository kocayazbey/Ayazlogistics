import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Internal Warehouse Operations Service
 * İç depoya transfer siparişli, İç depoya çıkış, İç depodan giriş workflows
 * Supports multi-warehouse operations with internal transfers
 */

export interface InternalWarehouse {
  id: string;
  code: string;
  name: string;
  nameTr: string;
  type: 'MAIN' | 'SATELLITE' | 'STAGING' | 'QUARANTINE' | 'RETURNS';
  parentWarehouseId?: string;
  locationCodes: string[];
  isActive: boolean;
}

export interface InternalTransferOrder {
  id: string;
  orderNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  orderType: 'STANDARD' | 'URGENT' | 'SCHEDULED';
  status: 'DRAFT' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  requestedBy: string;
  approvedBy?: string;
  lines: InternalTransferLine[];
  createdAt: Date;
  scheduledDate?: Date;
  completedAt?: Date;
}

export interface InternalTransferLine {
  id: string;
  skuCode: string;
  requestedQuantity: number;
  transferredQuantity: number;
  remainingQuantity: number;
  sourcePalletIds: string[];
  destinationPalletIds: string[];
  status: 'PENDING' | 'PICKING' | 'PACKED' | 'IN_TRANSIT' | 'DELIVERED';
}

export interface InternalWarehouseExit {
  id: string;
  exitNumber: string;
  sourceWarehouseId: string;
  transferOrderId?: string;
  exitType: 'TRANSFER' | 'RETURN' | 'SCRAP' | 'DISPOSAL';
  items: Array<{
    skuCode: string;
    quantity: number;
    palletId: string;
    reason?: string;
  }>;
  exitedBy: string;
  exitedAt: Date;
  status: 'COMPLETED';
}

export interface InternalWarehouseEntry {
  id: string;
  entryNumber: string;
  destinationWarehouseId: string;
  transferOrderId?: string;
  exitId?: string;
  entryType: 'TRANSFER' | 'RETURN' | 'REPLENISHMENT';
  items: Array<{
    skuCode: string;
    quantity: number;
    palletId: string;
    destinationLocationId?: string;
  }>;
  receivedBy: string;
  receivedAt: Date;
  status: 'COMPLETED';
}

@Injectable()
export class InternalWarehouseService {
  private internalWarehouses: Map<string, InternalWarehouse> = new Map();
  private transferOrders: Map<string, InternalTransferOrder> = new Map();
  private exits: Map<string, InternalWarehouseExit> = new Map();
  private entries: Map<string, InternalWarehouseEntry> = new Map();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeInternalWarehouses();
  }

  private initializeInternalWarehouses(): void {
    const warehouses: InternalWarehouse[] = [
      {
        id: 'IW-001',
        code: 'STAGING-A',
        name: 'Staging Area A',
        nameTr: 'Bekleme Alanı A',
        type: 'STAGING',
        parentWarehouseId: 'WH-MAIN',
        locationCodes: ['STG-A-01', 'STG-A-02', 'STG-A-03'],
        isActive: true,
      },
      {
        id: 'IW-002',
        code: 'QUARANTINE',
        name: 'Quarantine Area',
        nameTr: 'Karantina Alanı',
        type: 'QUARANTINE',
        parentWarehouseId: 'WH-MAIN',
        locationCodes: ['QAR-01', 'QAR-02'],
        isActive: true,
      },
    ];

    warehouses.forEach((wh) => this.internalWarehouses.set(wh.id, wh));
  }

  /**
   * Create internal transfer order (İç Depoya Transfer Siparişli)
   */
  async createInternalTransferOrder(params: {
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    orderType: 'STANDARD' | 'URGENT' | 'SCHEDULED';
    lines: Array<{
      skuCode: string;
      requestedQuantity: number;
    }>;
    scheduledDate?: Date;
    requestedBy: string;
  }): Promise<InternalTransferOrder> {
    const orderNumber = `ITO-${Date.now()}`;

    const order: InternalTransferOrder = {
      id: `${Date.now()}`,
      orderNumber,
      sourceWarehouseId: params.sourceWarehouseId,
      destinationWarehouseId: params.destinationWarehouseId,
      orderType: params.orderType,
      status: 'DRAFT',
      requestedBy: params.requestedBy,
      lines: params.lines.map((line, index) => ({
        id: `LINE-${index + 1}`,
        skuCode: line.skuCode,
        requestedQuantity: line.requestedQuantity,
        transferredQuantity: 0,
        remainingQuantity: line.requestedQuantity,
        sourcePalletIds: [],
        destinationPalletIds: [],
        status: 'PENDING',
      })),
      createdAt: new Date(),
      scheduledDate: params.scheduledDate,
    };

    this.transferOrders.set(order.id, order);

    await this.eventEmitter.emitAsync('internal.transfer.order.created', order);

    return order;
  }

  /**
   * Approve internal transfer order
   */
  async approveInternalTransferOrder(orderId: string, approvedBy: string): Promise<InternalTransferOrder> {
    const order = this.transferOrders.get(orderId);
    if (!order) {
      throw new Error('Transfer order not found');
    }

    order.status = 'APPROVED';
    order.approvedBy = approvedBy;

    await this.eventEmitter.emitAsync('internal.transfer.order.approved', {
      orderId,
      approvedBy,
      approvedAt: new Date(),
    });

    // Auto-start picking process
    await this.startInternalTransferPicking(orderId);

    return order;
  }

  /**
   * Start picking process for internal transfer
   */
  private async startInternalTransferPicking(orderId: string): Promise<void> {
    const order = this.transferOrders.get(orderId);
    if (!order) return;

    for (const line of order.lines) {
      line.status = 'PICKING';
    }

    await this.eventEmitter.emitAsync('internal.transfer.picking.started', {
      orderId,
      totalLines: order.lines.length,
    });
  }

  /**
   * Exit from internal warehouse (İç Depoya Çıkış)
   */
  async processInternalWarehouseExit(params: {
    sourceWarehouseId: string;
    transferOrderId?: string;
    exitType: 'TRANSFER' | 'RETURN' | 'SCRAP' | 'DISPOSAL';
    items: Array<{
      skuCode: string;
      quantity: number;
      palletId: string;
      reason?: string;
    }>;
    exitedBy: string;
  }): Promise<InternalWarehouseExit> {
    const exitNumber = `IWE-${Date.now()}`;

    const exit: InternalWarehouseExit = {
      id: `${Date.now()}`,
      exitNumber,
      sourceWarehouseId: params.sourceWarehouseId,
      transferOrderId: params.transferOrderId,
      exitType: params.exitType,
      items: params.items,
      exitedBy: params.exitedBy,
      exitedAt: new Date(),
      status: 'COMPLETED',
    };

    this.exits.set(exit.id, exit);

    // Update transfer order if linked
    if (params.transferOrderId) {
      const order = this.transferOrders.get(params.transferOrderId);
      if (order) {
        order.status = 'IN_TRANSIT';
        
        // Update line statuses
        for (const item of params.items) {
          const line = order.lines.find((l) => l.skuCode === item.skuCode);
          if (line) {
            line.transferredQuantity += item.quantity;
            line.remainingQuantity -= item.quantity;
            line.sourcePalletIds.push(item.palletId);
            line.status = 'IN_TRANSIT';
          }
        }
      }
    }

    await this.eventEmitter.emitAsync('internal.warehouse.exit.completed', exit);

    return exit;
  }

  /**
   * Entry to internal warehouse (İç Depodan Giriş)
   */
  async processInternalWarehouseEntry(params: {
    destinationWarehouseId: string;
    transferOrderId?: string;
    exitId?: string;
    entryType: 'TRANSFER' | 'RETURN' | 'REPLENISHMENT';
    items: Array<{
      skuCode: string;
      quantity: number;
      palletId: string;
      destinationLocationId?: string;
    }>;
    receivedBy: string;
  }): Promise<InternalWarehouseEntry> {
    const entryNumber = `IWI-${Date.now()}`;

    const entry: InternalWarehouseEntry = {
      id: `${Date.now()}`,
      entryNumber,
      destinationWarehouseId: params.destinationWarehouseId,
      transferOrderId: params.transferOrderId,
      exitId: params.exitId,
      entryType: params.entryType,
      items: params.items,
      receivedBy: params.receivedBy,
      receivedAt: new Date(),
      status: 'COMPLETED',
    };

    this.entries.set(entry.id, entry);

    // Update transfer order if linked
    if (params.transferOrderId) {
      const order = this.transferOrders.get(params.transferOrderId);
      if (order) {
        // Update line statuses
        for (const item of params.items) {
          const line = order.lines.find((l) => l.skuCode === item.skuCode);
          if (line) {
            line.destinationPalletIds.push(item.palletId);
            line.status = 'DELIVERED';
          }
        }

        // Check if all lines are delivered
        const allDelivered = order.lines.every((l) => l.status === 'DELIVERED');
        if (allDelivered) {
          order.status = 'COMPLETED';
          order.completedAt = new Date();
        }
      }
    }

    await this.eventEmitter.emitAsync('internal.warehouse.entry.completed', entry);

    // Create putaway tasks for received items
    await this.createPutawayTasks(entry);

    return entry;
  }

  /**
   * Create putaway tasks for received items
   */
  private async createPutawayTasks(entry: InternalWarehouseEntry): Promise<void> {
    for (const item of entry.items) {
      const task = {
        id: `PUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'INTERNAL_WAREHOUSE_PUTAWAY',
        warehouseId: entry.destinationWarehouseId,
        palletId: item.palletId,
        skuCode: item.skuCode,
        quantity: item.quantity,
        suggestedLocationId: item.destinationLocationId,
        status: 'PENDING',
        createdAt: new Date(),
      };

      await this.eventEmitter.emitAsync('putaway.task.created', task);
    }
  }

  /**
   * Get transfer order status
   */
  getTransferOrder(orderId: string): InternalTransferOrder | undefined {
    return this.transferOrders.get(orderId);
  }

  /**
   * Get all transfer orders
   */
  getAllTransferOrders(filters?: {
    status?: string;
    sourceWarehouseId?: string;
    destinationWarehouseId?: string;
  }): InternalTransferOrder[] {
    let orders = Array.from(this.transferOrders.values());

    if (filters?.status) {
      orders = orders.filter((o) => o.status === filters.status);
    }

    if (filters?.sourceWarehouseId) {
      orders = orders.filter((o) => o.sourceWarehouseId === filters.sourceWarehouseId);
    }

    if (filters?.destinationWarehouseId) {
      orders = orders.filter((o) => o.destinationWarehouseId === filters.destinationWarehouseId);
    }

    return orders;
  }

  /**
   * Cancel transfer order
   */
  async cancelTransferOrder(orderId: string, reason: string, cancelledBy: string): Promise<void> {
    const order = this.transferOrders.get(orderId);
    if (!order) {
      throw new Error('Transfer order not found');
    }

    if (order.status === 'COMPLETED') {
      throw new Error('Cannot cancel completed transfer order');
    }

    order.status = 'CANCELLED';

    await this.eventEmitter.emitAsync('internal.transfer.order.cancelled', {
      orderId,
      reason,
      cancelledBy,
      cancelledAt: new Date(),
    });
  }

  /**
   * Get warehouse statistics
   */
  getWarehouseStatistics(warehouseId: string): {
    totalExits: number;
    totalEntries: number;
    activeTransfers: number;
    pendingTransfers: number;
  } {
    const exits = Array.from(this.exits.values()).filter((e) => e.sourceWarehouseId === warehouseId);
    const entries = Array.from(this.entries.values()).filter((e) => e.destinationWarehouseId === warehouseId);
    const transfers = Array.from(this.transferOrders.values()).filter(
      (t) => t.sourceWarehouseId === warehouseId || t.destinationWarehouseId === warehouseId,
    );

    return {
      totalExits: exits.length,
      totalEntries: entries.length,
      activeTransfers: transfers.filter((t) => t.status === 'IN_TRANSIT').length,
      pendingTransfers: transfers.filter((t) => t.status === 'APPROVED').length,
    };
  }

  /**
   * Get internal warehouse list
   */
  getAllInternalWarehouses(): InternalWarehouse[] {
    return Array.from(this.internalWarehouses.values()).filter((w) => w.isActive);
  }

  /**
   * Get internal warehouse by code
   */
  getInternalWarehouseByCode(code: string): InternalWarehouse | undefined {
    return Array.from(this.internalWarehouses.values()).find((w) => w.code === code);
  }
}

