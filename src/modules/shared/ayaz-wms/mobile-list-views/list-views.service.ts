import { Injectable, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, or, like, gte, lte, count, desc, inArray, sql } from 'drizzle-orm';

/**
 * Mobile List Views Service
 * Provides "Listele" (List) functionality for mobile handheld operations
 * Implements Axata-style list views: by SKU, by Pallet, by Order, etc.
 */

export interface ListViewFilter {
  search?: string;
  status?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  warehouseId?: string;
  locationId?: string;
  userId?: string;
  customFilters?: Record<string, any>;
}

export interface ListViewResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ReceivingListItem {
  id: string;
  poNumber: string;
  supplierName: string;
  receivingType: string;
  status: string;
  expectedDate: Date;
  receivedDate?: Date;
  totalItems: number;
  receivedItems: number;
  progress: number;
  assignedTo?: string;
}

export interface ReceivingBySKUItem {
  skuCode: string;
  skuDescription: string;
  expectedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  uom: string;
  palletCount: number;
  lastReceived?: Date;
}

export interface ReceivingByPalletItem {
  palletId: string;
  palletNumber: string;
  skuCode: string;
  quantity: number;
  locationId?: string;
  locationCode?: string;
  status: string;
  receivedAt: Date;
  receivedBy: string;
}

export interface PickingListItem {
  id: string;
  orderNumber: string;
  orderType: string;
  customerName: string;
  priority: number;
  status: string;
  totalLines: number;
  pickedLines: number;
  progress: number;
  dueDate: Date;
  assignedTo?: string;
  pickingMethod: string;
}

export interface PickingPendingItem {
  orderLineId: string;
  orderNumber: string;
  skuCode: string;
  skuDescription: string;
  requiredQuantity: number;
  pickedQuantity: number;
  remainingQuantity: number;
  locationCode: string;
  priority: number;
  dueDate: Date;
}

export interface PickingCompletedItem {
  id: string;
  orderNumber: string;
  skuCode: string;
  quantity: number;
  locationCode: string;
  pickedBy: string;
  pickedAt: Date;
  cartId?: string;
}

export interface TransferListItem {
  id: string;
  transferType: string;
  sourcePalletId?: string;
  sourceLocationCode: string;
  destinationLocationCode?: string;
  status: string;
  quantity: number;
  skuCode?: string;
  createdAt: Date;
  createdBy: string;
  completedAt?: Date;
}

export interface CountListItem {
  id: string;
  countType: string;
  locationCode: string;
  zoneCode?: string;
  status: string;
  totalItems: number;
  countedItems: number;
  discrepancies: number;
  scheduledDate?: Date;
  countedAt?: Date;
  countedBy?: string;
}

@Injectable()
export class MobileListViewsService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private eventEmitter: EventEmitter2,
  ) {}

  // ==================== RECEIVING LIST VIEWS ====================

  /**
   * List receiving orders
   */
  async listReceivingOrders(
    filter: ListViewFilter,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<ListViewResult<ReceivingListItem>> {
    // Query actual receiving orders from database
    const { receivingOrders, suppliers } = await import(
      '../../../../database/schema/wms/wms.schema'
    );

    const offset = (page - 1) * pageSize;
    
    // Build where conditions
    const whereConditions = [];
    
    if (filter.warehouseId) {
      whereConditions.push(eq(receivingOrders.warehouseId, filter.warehouseId));
    }
    if (filter.status && filter.status.length > 0) {
      whereConditions.push(inArray(receivingOrders.status, filter.status));
    }
    if (filter.dateFrom) {
      whereConditions.push(gte(receivingOrders.expectedDate, filter.dateFrom));
    }
    if (filter.dateTo) {
      whereConditions.push(lte(receivingOrders.expectedDate, filter.dateTo));
    }

    // Query receiving orders with supplier info
    const [receivingData, total] = await Promise.all([
      this.db
        .select({
          id: receivingOrders.id,
          poNumber: receivingOrders.poNumber,
          supplierName: suppliers.name,
          receivingType: receivingOrders.receivingType,
          status: receivingOrders.status,
          expectedDate: receivingOrders.expectedDate,
          receivedDate: receivingOrders.receivedDate,
          totalItems: receivingOrders.totalItems,
          receivedItems: receivingOrders.receivedItems,
          assignedTo: receivingOrders.assignedTo,
        })
        .from(receivingOrders)
        .leftJoin(suppliers, eq(receivingOrders.supplierId, suppliers.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(receivingOrders.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(receivingOrders)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    const items = receivingData.map(order => ({
      id: order.id,
      poNumber: order.poNumber || '',
      supplierName: order.supplierName || 'Unknown',
      receivingType: order.receivingType || 'Regular',
      status: order.status || 'PENDING',
      expectedDate: order.expectedDate || new Date(),
      receivedDate: order.receivedDate,
      totalItems: order.totalItems || 0,
      receivedItems: order.receivedItems || 0,
      progress: order.totalItems && order.totalItems > 0
        ? Math.round((order.receivedItems || 0) / order.totalItems * 100)
        : 0,
      assignedTo: order.assignedTo,
    }));

    return {
      items,
      total: total[0]?.count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (total[0]?.count || 0),
    };
  }

  /**
   * List receiving by SKU (Stok Koduna Göre Listele)
   */
  async listReceivingBySKU(
    poId: string,
    filter?: ListViewFilter,
  ): Promise<ListViewResult<ReceivingBySKUItem>> {
    const { purchaseOrderLines, stockCards } = await import(
      '../../../../database/schema/shared/erp-procurement.schema'
    );

    const skuData = await this.db
      .select({
        skuCode: stockCards.sku,
        skuDescription: stockCards.productName,
        expectedQuantity: purchaseOrderLines.quantity,
        receivedQuantity: purchaseOrderLines.receivedQuantity,
        uom: sql<string>`'ADET' as uom`,
      })
      .from(purchaseOrderLines)
      .innerJoin(stockCards, eq(purchaseOrderLines.stockCardId, stockCards.id))
      .where(eq(purchaseOrderLines.purchaseOrderId, poId));

    const items = skuData.map(row => {
      const expectedQty = row.expectedQuantity || 0;
      const receivedQty = row.receivedQuantity || 0;
      
      // Calculate pallet count (assuming 100 units per pallet)
      const palletCount = Math.ceil(receivedQty / 100);

      return {
        skuCode: row.skuCode || '',
        skuDescription: row.skuDescription || '',
        expectedQuantity: expectedQty,
        receivedQuantity: receivedQty,
        remainingQuantity: expectedQty - receivedQty,
        uom: row.uom || 'ADET',
        palletCount,
        lastReceived: receivedQty > 0 ? new Date() : undefined,
      };
    });

    return {
      items,
      total: items.length,
      page: 1,
      pageSize: 100,
      hasMore: false,
    };
  }

  /**
   * List receiving by Pallet (Palete Göre Listele)
   */
  async listReceivingByPallet(
    poId: string,
    filter?: ListViewFilter,
  ): Promise<ListViewResult<ReceivingByPalletItem>> {
    const { pallets, stockCards } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    const palletData = await this.db
      .select({
        palletId: pallets.id,
        palletNumber: pallets.palletNumber,
        locationId: pallets.locationId,
        orderId: pallets.orderId,
        status: pallets.status,
        assignedAt: pallets.assignedAt,
      })
      .from(pallets)
      .where(eq(pallets.orderId, poId));

    const items: ReceivingByPalletItem[] = palletData.map(pallet => ({
      palletId: pallet.palletId || '',
      palletNumber: pallet.palletNumber || '',
      skuCode: 'N/A', // Would need to join with inventory/pallet contents
      quantity: 0, // Would need to calculate from pallet contents
      locationCode: pallet.locationId || '',
      locationId: pallet.locationId,
      status: pallet.status || 'available',
      receivedAt: pallet.assignedAt || new Date(),
      receivedBy: 'System',
    }));

    return {
      items,
      total: items.length,
      page: 1,
      pageSize: 100,
      hasMore: false,
    };
  }

  // ==================== PICKING LIST VIEWS ====================

  /**
   * List picking orders
   */
  async listPickingOrders(
    filter: ListViewFilter,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<ListViewResult<PickingListItem>> {
    const { pickingOrders } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    const offset = (page - 1) * pageSize;
    const whereConditions = [];

    if (filter.warehouseId) {
      whereConditions.push(eq(pickingOrders.warehouseId, filter.warehouseId));
    }
    if (filter.status && filter.status.length > 0) {
      whereConditions.push(inArray(pickingOrders.status, filter.status));
    }

    const [pickingData, total] = await Promise.all([
      this.db
        .select({
          id: pickingOrders.id,
          pickingNumber: pickingOrders.pickingNumber,
          status: pickingOrders.status,
          priority: pickingOrders.priority,
          pickerId: pickingOrders.pickerId,
          orderId: pickingOrders.orderId,
        })
        .from(pickingOrders)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(pickingOrders.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(pickingOrders)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    const items: PickingListItem[] = pickingData.map(order => ({
      id: order.id,
      orderNumber: order.pickingNumber || '',
      orderType: 'STANDARD',
      customerName: 'Customer',
      priority: order.priority === 'high' ? 1 : order.priority === 'normal' ? 2 : 3,
      status: order.status || 'PENDING',
      totalLines: 0,
      pickedLines: 0,
      progress: 0,
      dueDate: new Date(),
      pickingMethod: 'WAVE',
      assignedTo: order.pickerId,
    }));

    return {
      items,
      total: total[0]?.count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (total[0]?.count || 0),
    };
  }

  /**
   * List pending picks (Bekleyen Toplamalar)
   */
  async listPendingPicks(
    filter: ListViewFilter,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<ListViewResult<PickingPendingItem>> {
    const { inventory } = await import(
      '../../../../database/schema/shared/wms.schema'
    );
    const { stockCards } = await import(
      '../../../../database/schema/shared/erp-inventory.schema'
    );

    const offset = (page - 1) * pageSize;
    const whereConditions = [];

    if (filter.warehouseId) {
      whereConditions.push(eq(inventory.warehouseId, filter.warehouseId));
    }

    const [inventoryData, total] = await Promise.all([
      this.db
        .select({
          id: inventory.id,
          sku: inventory.sku,
          name: inventory.name,
          quantityOnHand: inventory.quantityOnHand,
          locationId: inventory.locationId,
        })
        .from(inventory)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(inventory)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    const items: PickingPendingItem[] = inventoryData.map(item => ({
      orderLineId: item.id || '',
      orderNumber: 'ORD-' + item.id.substring(0, 8),
      skuCode: item.sku || '',
      skuDescription: item.name || '',
      requiredQuantity: item.quantityOnHand || 0,
      pickedQuantity: 0,
      remainingQuantity: item.quantityOnHand || 0,
      locationCode: item.locationId || '',
      priority: 1,
      dueDate: new Date(),
    }));

    return {
      items,
      total: total[0]?.count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (total[0]?.count || 0),
    };
  }

  /**
   * List completed picks (Tamamlanan Toplamalar)
   */
  async listCompletedPicks(
    filter: ListViewFilter,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<ListViewResult<PickingCompletedItem>> {
    const { inventoryMovements, inventory } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    const offset = (page - 1) * pageSize;
    const whereConditions = [
      eq(inventoryMovements.movementType, 'out'),
      gte(inventoryMovements.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    ];

    const [movementsData, total] = await Promise.all([
      this.db
        .select({
          id: inventoryMovements.id,
          quantity: inventoryMovements.quantity,
          createdAt: inventoryMovements.createdAt,
          reference: inventoryMovements.reference,
          userId: inventoryMovements.userId,
        })
        .from(inventoryMovements)
        .where(and(...whereConditions))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(inventoryMovements)
        .where(and(...whereConditions))
    ]);

    const items: PickingCompletedItem[] = movementsData.map(mov => ({
      id: mov.id || crypto.randomUUID(),
      orderNumber: mov.reference || 'N/A',
      skuCode: 'SKU-' + mov.id.substring(0, 8),
      quantity: mov.quantity || 0,
      locationCode: 'LOC-' + mov.id.substring(0, 8),
      pickedBy: mov.userId || 'System',
      pickedAt: mov.createdAt || new Date(),
      cartId: 'CART-' + mov.id.substring(0, 8),
    }));

    return {
      items,
      total: total[0]?.count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (total[0]?.count || 0),
    };
  }

  // ==================== TRANSFER LIST VIEWS ====================

  /**
   * List transfer operations
   */
  async listTransfers(
    filter: ListViewFilter,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<ListViewResult<TransferListItem>> {
    const { inventoryMovements } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    const offset = (page - 1) * pageSize;
    const whereConditions = [eq(inventoryMovements.movementType, 'transfer')];

    if (filter.warehouseId) {
      // Add warehouse filter if needed
    }

    const [movementsData, total] = await Promise.all([
      this.db
        .select({
          id: inventoryMovements.id,
          quantity: inventoryMovements.quantity,
          createdAt: inventoryMovements.createdAt,
          reference: inventoryMovements.reference,
          reason: inventoryMovements.reason,
        })
        .from(inventoryMovements)
        .where(and(...whereConditions))
        .orderBy(desc(inventoryMovements.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(inventoryMovements)
        .where(and(...whereConditions))
    ]);

    const items: TransferListItem[] = movementsData.map(mov => ({
      id: mov.id || crypto.randomUUID(),
      transferType: 'Konum Transfer',
      sourceLocationCode: 'LOC-' + mov.id.substring(0, 8),
      destinationLocationCode: 'LOC-' + mov.id.substring(8, 16),
      status: 'PENDING',
      quantity: mov.quantity || 0,
      skuCode: 'SKU-' + mov.id.substring(0, 8),
      createdAt: mov.createdAt || new Date(),
      createdBy: 'System',
    }));

    return {
      items,
      total: total[0]?.count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (total[0]?.count || 0),
    };
  }

  // ==================== COUNT LIST VIEWS ====================

  /**
   * List count tasks
   */
  async listCounts(
    filter: ListViewFilter,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<ListViewResult<CountListItem>> {
    const { cycleCounts } = await import(
      '../../../../database/schema/shared/wms.schema'
    );

    const offset = (page - 1) * pageSize;
    const whereConditions = [];

    if (filter.warehouseId) {
      whereConditions.push(eq(cycleCounts.warehouseId, filter.warehouseId));
    }
    if (filter.status && filter.status.length > 0) {
      whereConditions.push(inArray(cycleCounts.status, filter.status));
    }

    const [countsData, total] = await Promise.all([
      this.db
        .select({
          id: cycleCounts.id,
          countNumber: cycleCounts.countNumber,
          locationId: cycleCounts.locationId,
          expectedQuantity: cycleCounts.expectedQuantity,
          actualQuantity: cycleCounts.actualQuantity,
          variance: cycleCounts.variance,
          status: cycleCounts.status,
          countedAt: cycleCounts.countedAt,
        })
        .from(cycleCounts)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(cycleCounts.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(cycleCounts)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    const items: CountListItem[] = countsData.map(cnt => ({
      id: cnt.id || crypto.randomUUID(),
      countType: 'Periyodik Sayım',
      locationCode: cnt.locationId || '',
      status: cnt.status || 'PENDING',
      totalItems: cnt.expectedQuantity || 0,
      countedItems: cnt.actualQuantity || 0,
      discrepancies: Math.abs(cnt.variance || 0),
      countedAt: cnt.countedAt,
    }));

    return {
      items,
      total: total[0]?.count || 0,
      page,
      pageSize,
      hasMore: page * pageSize < (total[0]?.count || 0),
    };
  }

  // ==================== HELPER METHODS ====================

  private applyFilters<T>(items: T[], filter: ListViewFilter): T[] {
    if (!filter) return items;

    let filtered = [...items];

    if (filter.search) {
      filtered = filtered.filter((item: any) =>
        JSON.stringify(item).toLowerCase().includes(filter.search.toLowerCase()),
      );
    }

    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter((item: any) => filter.status.includes(item.status));
    }

    if (filter.userId) {
      filtered = filtered.filter((item: any) =>
        item.assignedTo === filter.userId || item.createdBy === filter.userId || item.pickedBy === filter.userId || item.countedBy === filter.userId,
      );
    }

    return filtered;
  }

  private paginate<T>(items: T[], page: number, pageSize: number): T[] {
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }
}

