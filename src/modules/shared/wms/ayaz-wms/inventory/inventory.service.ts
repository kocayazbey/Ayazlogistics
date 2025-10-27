import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, desc, asc, like, sql, count, sum, avg } from 'drizzle-orm';
import { inventory, inventoryMovements, warehouses, products } from '../../../../database/schema/shared/wms.schema';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryAdjustmentDto } from './dto/inventory-adjustment.dto';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getInventoryItems(filters: {
    tenantId: string;
    warehouseId?: string;
    category?: string;
    status?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    let whereConditions = [eq(inventory.tenantId, filters.tenantId)];

    if (filters.warehouseId) {
      whereConditions.push(eq(inventory.warehouseId, filters.warehouseId));
    }

    if (filters.category) {
      whereConditions.push(eq(inventory.category, filters.category));
    }

    if (filters.status) {
      whereConditions.push(eq(inventory.status, filters.status));
    }

    if (filters.search) {
      whereConditions.push(
        like(inventory.name, `%${filters.search}%`)
      );
    }

    const [items, totalCount] = await Promise.all([
      this.db
        .select({
          inventory,
          warehouse: warehouses,
          product: products,
        })
        .from(inventory)
        .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
        .leftJoin(products, eq(inventory.productId, products.id))
        .where(and(...whereConditions))
        .orderBy(desc(inventory.updatedAt))
        .limit(filters.limit)
        .offset((filters.page - 1) * filters.limit),
      
      this.db
        .select({ count: count() })
        .from(inventory)
        .where(and(...whereConditions))
    ]);

    const total = totalCount[0]?.count || 0;

    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    };
  }

  async getInventoryStats(tenantId: string, warehouseId?: string) {
    let whereConditions = [eq(inventory.tenantId, tenantId)];

    if (warehouseId) {
      whereConditions.push(eq(inventory.warehouseId, warehouseId));
    }

    const [stats, statusStats, lowStockCount] = await Promise.all([
      this.db
        .select({
          totalItems: count(),
          totalQuantity: sum(inventory.quantityOnHand),
          totalValue: sql<number>`SUM(${inventory.quantityOnHand} * ${inventory.unitCost})`,
          avgQuantity: avg(inventory.quantityOnHand),
        })
        .from(inventory)
        .where(and(...whereConditions)),
      
      this.db
        .select({
          status: inventory.status,
          count: count(),
        })
        .from(inventory)
        .where(and(...whereConditions))
        .groupBy(inventory.status),
      
      this.db
        .select({ count: count() })
        .from(inventory)
        .where(and(...whereConditions, lte(inventory.quantityOnHand, inventory.minStockLevel)))
    ]);

    const statsResult = stats[0];
    const lowStockItems = lowStockCount[0]?.count || 0;

    return {
      totalItems: statsResult?.totalItems || 0,
      totalQuantity: Number(statsResult?.totalQuantity) || 0,
      totalValue: Number(statsResult?.totalValue) || 0,
      avgQuantity: Number(statsResult?.avgQuantity) || 0,
      lowStockItems,
      statusBreakdown: statusStats.reduce((acc, stat) => {
        acc[stat.status || 'unknown'] = stat.count;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  async getABCAnalysis(tenantId: string, warehouseId?: string) {
    let whereConditions = [
      eq(inventory.tenantId, tenantId),
      gte(inventory.quantityOnHand, 1)
    ];

    if (warehouseId) {
      whereConditions.push(eq(inventory.warehouseId, warehouseId));
    }

    const items = await this.db
      .select({
        id: inventory.id,
        name: inventory.name,
        sku: inventory.sku,
        quantity: inventory.quantityOnHand,
        unitCost: inventory.unitCost,
        totalValue: sql<number>`${inventory.quantityOnHand} * ${inventory.unitCost}`,
      })
      .from(inventory)
      .where(and(...whereConditions))
      .orderBy(desc(sql`${inventory.quantityOnHand} * ${inventory.unitCost}`));

    const totalValue = items.reduce((sum, item) => sum + Number(item.totalValue), 0);
    let cumulativeValue = 0;

    const abcAnalysis = items.map((item, index) => {
      const itemValue = Number(item.totalValue);
      const percentage = (itemValue / totalValue) * 100;
      cumulativeValue += itemValue;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;

      let category = 'C';
      if (cumulativePercentage <= 80) {
        category = 'A';
      } else if (cumulativePercentage <= 95) {
        category = 'B';
      }

      return {
        rank: index + 1,
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        totalValue: itemValue,
        percentage,
        cumulativePercentage,
        category
      };
    });

    return {
      totalItems: items.length,
      totalValue,
      abcAnalysis,
      summary: {
        A: abcAnalysis.filter(item => item.category === 'A').length,
        B: abcAnalysis.filter(item => item.category === 'B').length,
        C: abcAnalysis.filter(item => item.category === 'C').length
      }
    };
  }

  async getLowStockItems(tenantId: string, warehouseId?: string, threshold: number = 10) {
    let whereConditions = [
      eq(inventory.tenantId, tenantId),
      lte(inventory.quantityOnHand, threshold)
    ];

    if (warehouseId) {
      whereConditions.push(eq(inventory.warehouseId, warehouseId));
    }

    return this.db
      .select({
        inventory,
        warehouse: warehouses,
      })
      .from(inventory)
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(and(...whereConditions))
      .orderBy(asc(inventory.quantityOnHand));
  }

  async getSlowMovingItems(tenantId: string, warehouseId?: string, days: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let whereConditions = [
      eq(inventory.tenantId, tenantId),
      lte(inventory.lastMovementDate, cutoffDate)
    ];

    if (warehouseId) {
      whereConditions.push(eq(inventory.warehouseId, warehouseId));
    }

    return this.db
      .select({
        inventory,
        warehouse: warehouses,
      })
      .from(inventory)
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(and(...whereConditions))
      .orderBy(asc(inventory.lastMovementDate));
  }

  async getInventoryItem(id: string, tenantId: string) {
    const result = await this.db
      .select({
        inventory,
        warehouse: warehouses,
        product: products,
      })
      .from(inventory)
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(and(eq(inventory.id, id), eq(inventory.tenantId, tenantId)))
      .limit(1);

    if (!result[0]) {
      throw new NotFoundException('Inventory item not found');
    }

    return result[0];
  }

  async createInventoryItem(data: {
    warehouseId: string;
    productId: string;
    sku: string;
    name: string;
    description?: string;
    category?: string;
    quantityOnHand: number;
    unitCost?: number;
    unitPrice?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    lotNumber?: string;
    serialNumber?: string;
    expiryDate?: string;
  }, userId: string, tenantId: string) {
    const [savedItem] = await this.db
      .insert(inventory)
      .values({
        tenantId,
        warehouseId: data.warehouseId,
        productId: data.productId,
        sku: data.sku,
        name: data.name,
        description: data.description || null,
        category: data.category || null,
        quantityOnHand: data.quantityOnHand,
        quantityAvailable: data.quantityOnHand,
        unitCost: data.unitCost || null,
        unitPrice: data.unitPrice || null,
        minStockLevel: data.minStockLevel || 0,
        maxStockLevel: data.maxStockLevel || null,
        reorderPoint: data.reorderPoint || 0,
        reorderQuantity: data.reorderQuantity || null,
        lotNumber: data.lotNumber || null,
        serialNumber: data.serialNumber || null,
        expiryDate: data.expiryDate || null,
        status: 'active',
        createdBy: userId,
      })
      .returning();

    // Create initial movement
    await this.createMovement(savedItem.id, {
      type: 'initial',
      quantity: data.quantityOnHand,
      reason: 'Initial stock',
      userId
    });

    return savedItem;
  }

  async updateInventoryItem(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    unitCost?: number;
    unitPrice?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    lotNumber?: string;
    serialNumber?: string;
    expiryDate?: string;
    status?: string;
  }, userId: string, tenantId: string) {
    await this.getInventoryItem(id, tenantId); // Verify item exists

    const [updatedItem] = await this.db
      .update(inventory)
      .set({
        ...data,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(inventory.id, id), eq(inventory.tenantId, tenantId)))
      .returning();

    return updatedItem;
  }

  async adjustInventory(id: string, data: {
    type: string;
    quantity: number;
    reason: string;
    metadata?: any;
  }, userId: string, tenantId: string) {
    const item = await this.getInventoryItem(id, tenantId);

    const oldQuantity = Number(item.inventory.quantityOnHand);
    const newQuantity = oldQuantity + data.quantity;

    if (newQuantity < 0) {
      throw new BadRequestException('Insufficient inventory for adjustment');
    }

    const [savedItem] = await this.db
      .update(inventory)
      .set({
        quantityOnHand: newQuantity,
        quantityAvailable: newQuantity - Number(item.inventory.quantityReserved),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(inventory.id, id), eq(inventory.tenantId, tenantId)))
      .returning();

    // Create movement record
    await this.createMovement(id, {
      type: data.type,
      quantity: data.quantity,
      reason: data.reason,
      userId,
      metadata: data.metadata
    });

    return savedItem;
  }

  async getInventoryMovements(id: string, tenantId: string, filters: { startDate?: string; endDate?: string }) {
    await this.getInventoryItem(id, tenantId); // Verify item exists

    let whereConditions = [eq(inventoryMovements.inventoryId, id)];

    if (filters.startDate) {
      whereConditions.push(gte(inventoryMovements.createdAt, new Date(filters.startDate)));
    }

    if (filters.endDate) {
      whereConditions.push(lte(inventoryMovements.createdAt, new Date(filters.endDate)));
    }

    return this.db
      .select()
      .from(inventoryMovements)
      .where(and(...whereConditions))
      .orderBy(desc(inventoryMovements.createdAt));
  }

  async getInventoryValuation(tenantId: string, warehouseId?: string, asOfDate?: string) {
    let whereConditions = [
      eq(inventory.tenantId, tenantId),
      gte(inventory.quantityOnHand, 1)
    ];

    if (warehouseId) {
      whereConditions.push(eq(inventory.warehouseId, warehouseId));
    }

    if (asOfDate) {
      whereConditions.push(lte(inventory.updatedAt, new Date(asOfDate)));
    }

    const items = await this.db
      .select({
        id: inventory.id,
        name: inventory.name,
        sku: inventory.sku,
        quantity: inventory.quantityOnHand,
        unitCost: inventory.unitCost,
        totalValue: sql<number>`${inventory.quantityOnHand} * ${inventory.unitCost}`,
      })
      .from(inventory)
      .where(and(...whereConditions));

    const totalValue = items.reduce((sum, item) => sum + Number(item.totalValue), 0);

    return {
      asOfDate: asOfDate || new Date().toISOString(),
      totalItems: items.length,
      totalQuantity: items.reduce((sum, item) => sum + Number(item.quantity), 0),
      totalValue,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        quantity: Number(item.quantity),
        unitCost: Number(item.unitCost),
        totalValue: Number(item.totalValue)
      }))
    };
  }

  private async createMovement(inventoryId: string, movementData: {
    type: string;
    quantity: number;
    reason: string;
    userId: string;
    metadata?: any;
  }) {
    const [movement] = await this.db
      .insert(inventoryMovements)
      .values({
        inventoryId,
        movementType: movementData.type,
        quantity: movementData.quantity,
        reason: movementData.reason,
        userId: movementData.userId,
        metadata: movementData.metadata || null,
      })
      .returning();

    return movement;
  }
}
