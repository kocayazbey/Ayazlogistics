import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, like, desc, or, count, asc, gte, lte } from 'drizzle-orm';
import { ScanBarcodeDto } from './dto/scan-barcode.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { products } from '../../../database/schema/shared/products.schema';
import { inventory, inventoryMovements, cycleCounts, pickingOrders, packingOrders, receivingOrders, warehouses, warehouseLocations } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class HandheldTerminalService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getDashboard(tenantId: string, userId: string) {
    try {
      const [pendingTasks, todayMovements, lowStockItems] = await Promise.all([
        this.getTasks(tenantId, userId, 'pending'),
        this.getMovements(tenantId, { page: 1, limit: 10 }),
        this.getLowStockItems(tenantId),
      ]);

      return {
        pendingTasks: pendingTasks.length,
        todayMovements: todayMovements.data.length,
        lowStockItems: lowStockItems.length,
        recentActivity: todayMovements.data.slice(0, 5),
      };
    } catch (error) {
      console.error('Database error in getDashboard:', error);
      throw new BadRequestException(`Dashboard verileri alınamadı: ${error.message}`);
    }
  }

  async getTasks(tenantId: string, userId: string, status?: string) {
    try {
      const [picking, packing] = await Promise.all([
        this.db.select().from(pickingOrders).where(
          and(
            eq(pickingOrders.tenantId, tenantId),
            eq(pickingOrders.pickerId, userId),
            status ? eq(pickingOrders.status, status) : undefined
          )
        ),
        this.db.select().from(packingOrders).where(
          and(
            eq(packingOrders.tenantId, tenantId),
            eq(packingOrders.packerId, userId),
            status ? eq(packingOrders.status, status) : undefined
          )
        ),
      ]);

      return [
        ...picking.map(op => ({ ...op, operationType: 'picking' })),
        ...packing.map(op => ({ ...op, operationType: 'packing' })),
      ];
    } catch (error) {
      console.error('Database error in getTasks:', error);
      throw new BadRequestException(`Görevler alınamadı: ${error.message}`);
    }
  }

  async searchInventory(query: string, tenantId: string) {
    try {
      const results = await this.db
        .select()
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(
          and(
            eq(inventory.tenantId, tenantId),
            or(
              like(products.sku, `%${query}%`),
              like(products.name, `%${query}%`)
            )
          )
        )
        .limit(20);

      return results.map(result => ({
        product: result.products,
        inventory: result.inventory,
      }));
    } catch (error) {
      console.error('Database error in searchInventory:', error);
      throw new BadRequestException(`Envanter araması başarısız: ${error.message}`);
    }
  }

  async scanBarcode(scanBarcodeDto: ScanBarcodeDto, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(
          and(
            eq(inventory.tenantId, tenantId),
            or(
              eq(products.sku, scanBarcodeDto.barcode),
              like(products.sku, `%${scanBarcodeDto.barcode}%`)
            )
          )
        )
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Ürün bulunamadı');
      }

      const location = result[0].inventory.locationId 
        ? await this.getLocationById(result[0].inventory.locationId, tenantId)
        : null;

      return {
        product: result[0].products,
        inventory: result[0].inventory,
        location,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Database error in scanBarcode:', error);
      throw new NotFoundException('Ürün bulunamadı');
    }
  }

  async getLocations(tenantId: string, warehouseId?: string) {
    try {
      const conditions = [eq(warehouseLocations.tenantId, tenantId)];

      if (warehouseId) {
        conditions.push(eq(warehouseLocations.warehouseId, warehouseId));
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      const locations = await this.db
        .select()
        .from(warehouseLocations)
        .where(whereClause)
        .orderBy(asc(warehouseLocations.locationCode));

      return locations;
    } catch (error) {
      console.error('Database error in getLocations:', error);
      throw new BadRequestException(`Lokasyonlar alınamadı: ${error.message}`);
    }
  }

  async getProductInventory(productId: string, tenantId: string) {
    try {
      const inventoryItems = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, productId),
            eq(inventory.tenantId, tenantId)
          )
        );

      const locations = await Promise.all(
        inventoryItems.map(async (item) => {
          const location = item.locationId 
            ? await this.getLocationById(item.locationId, tenantId)
            : null;
          return {
            ...item,
            location,
          };
        })
      );

      return locations;
    } catch (error) {
      console.error('Database error in getProductInventory:', error);
      throw new BadRequestException(`Ürün envanteri alınamadı: ${error.message}`);
    }
  }

  async updateInventory(updateInventoryDto: UpdateInventoryDto, tenantId: string, userId: string) {
    try {
      const inventoryItem = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.id, updateInventoryDto.inventoryId),
            eq(inventory.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!inventoryItem || inventoryItem.length === 0) {
        throw new NotFoundException('Envanter öğesi bulunamadı');
      }

      const currentItem = inventoryItem[0];
      const newQuantity = updateInventoryDto.quantity;

      const result = await this.db
        .update(inventory)
        .set({
          quantityAvailable: newQuantity,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(inventory.id, updateInventoryDto.inventoryId),
            eq(inventory.tenantId, tenantId)
          )
        )
        .returning();

      await this.createMovement({
        productId: currentItem.productId,
        warehouseId: currentItem.warehouseId,
        locationId: currentItem.locationId,
        movementType: 'adjustment',
        quantity: newQuantity - (currentItem.quantityAvailable || 0),
        reason: updateInventoryDto.notes || 'Envanter düzeltmesi',
      }, tenantId, userId);

      return result[0];
    } catch (error) {
      console.error('Database error in updateInventory:', error);
      throw error;
    }
  }

  async createMovement(createMovementDto: CreateMovementDto, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .insert(inventoryMovements)
        .values({
          inventoryId: createMovementDto.productId,
          movementType: createMovementDto.movementType,
          quantity: createMovementDto.quantity,
          reason: createMovementDto.notes,
          userId: userId,
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in createMovement:', error);
      throw error;
    }
  }

  async getMovements(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    type?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(inventoryMovements.tenantId, tenantId)];

    if (filters?.type) {
      conditions.push(eq(inventoryMovements.movementType, filters.type));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(inventoryMovements)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(inventoryMovements.createdAt)),
        this.db
          .select({ count: count() })
          .from(inventoryMovements)
          .where(whereClause)
      ]);

      return {
        data,
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getMovements:', error);
      throw new BadRequestException(`Hareketler alınamadı: ${error.message}`);
    }
  }

  async getCycleCountTasks(tenantId: string, userId: string) {
    try {
      const tasks = await this.db
        .select()
        .from(cycleCounts)
        .where(
          and(
            eq(cycleCounts.tenantId, tenantId),
            eq(cycleCounts.status, 'pending')
          )
        )
        .orderBy(asc(cycleCounts.createdAt));

      return tasks;
    } catch (error) {
      console.error('Database error in getCycleCountTasks:', error);
      throw new BadRequestException(`Sayım görevleri alınamadı: ${error.message}`);
    }
  }

  async startCycleCount(locationId: string, tenantId: string, userId: string) {
    try {
      const task = await this.db
        .insert(cycleCounts)
        .values({
          countNumber: `CC-${Date.now()}`,
          warehouseId: await this.getWarehouseIdByLocation(locationId, tenantId),
          locationId,
          status: 'in_progress',
          tenantId,
        })
        .returning();

      return task[0];
    } catch (error) {
      console.error('Database error in startCycleCount:', error);
      throw error;
    }
  }

  async completeCycleCount(countData: any, tenantId: string, userId: string) {
    try {
      for (const item of countData.items || []) {
        await this.updateInventory({
          inventoryId: item.inventoryId,
          quantity: item.countedQuantity,
          notes: `Sayım - ${item.notes || ''}`,
        }, tenantId, userId);
      }

      const result = await this.db
        .update(cycleCounts)
        .set({
          status: 'completed',
          countedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(cycleCounts.id, countData.taskId),
            eq(cycleCounts.tenantId, tenantId)
          )
        )
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in completeCycleCount:', error);
      throw error;
    }
  }

  async getPickingTasks(tenantId: string, userId: string) {
    try {
      const tasks = await this.db
        .select()
        .from(pickingOrders)
        .where(
          and(
            eq(pickingOrders.tenantId, tenantId),
            eq(pickingOrders.pickerId, userId),
            eq(pickingOrders.status, 'pending')
          )
        )
        .orderBy(asc(pickingOrders.priority));

      return tasks;
    } catch (error) {
      console.error('Database error in getPickingTasks:', error);
      throw new BadRequestException(`Toplama görevleri alınamadı: ${error.message}`);
    }
  }

  async startPickingTask(taskId: string, tenantId: string, userId: string) {
    try {
      const result = await this.db
        .update(pickingOrders)
        .set({
          status: 'in_progress',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(pickingOrders.id, taskId),
            eq(pickingOrders.tenantId, tenantId)
          )
        )
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in startPickingTask:', error);
      throw error;
    }
  }

  async completePickingTask(pickingData: any, tenantId: string, userId: string) {
    try {
      for (const item of pickingData.items || []) {
        await this.createMovement({
          productId: item.productId,
          warehouseId: item.warehouseId,
          locationId: item.locationId,
          movementType: 'out',
          quantity: -item.quantity,
          notes: `Sipariş ${pickingData.orderId} için toplandı`,
        }, tenantId, userId);
      }

      const result = await this.db
        .update(pickingOrders)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(pickingOrders.id, pickingData.taskId),
            eq(pickingOrders.tenantId, tenantId)
          )
        )
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in completePickingTask:', error);
      throw error;
    }
  }

  async getPutawayTasks(tenantId: string, userId: string) {
    try {
      const tasks = await this.db
        .select()
        .from(receivingOrders)
        .where(
          and(
            eq(receivingOrders.tenantId, tenantId),
            eq(receivingOrders.status, 'pending')
          )
        )
        .orderBy(asc(receivingOrders.createdAt));

      return tasks;
    } catch (error) {
      console.error('Database error in getPutawayTasks:', error);
      throw new BadRequestException(`Yerleştirme görevleri alınamadı: ${error.message}`);
    }
  }

  async completePutawayTask(putawayData: any, tenantId: string, userId: string) {
    try {
      for (const item of putawayData.items || []) {
        await this.createMovement({
          productId: item.productId,
          warehouseId: item.warehouseId,
          locationId: item.toLocationId,
          movementType: 'in',
          quantity: item.quantity,
          notes: `Lokasyon ${item.toLocationId} için yerleştirme`,
        }, tenantId, userId);
      }

      const result = await this.db
        .update(receivingOrders)
        .set({
          status: 'completed',
          receivedDate: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(receivingOrders.id, putawayData.taskId),
            eq(receivingOrders.tenantId, tenantId)
          )
        )
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in completePutawayTask:', error);
      throw error;
    }
  }

  async getSummaryReport(tenantId: string, userId: string, filters?: {
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const [picking, packing, movements] = await Promise.all([
        this.db.select({ count: count() }).from(pickingOrders).where(
          and(
            eq(pickingOrders.tenantId, tenantId),
            eq(pickingOrders.pickerId, userId),
            filters?.dateFrom ? gte(pickingOrders.createdAt, new Date(filters.dateFrom)) : undefined,
            filters?.dateTo ? lte(pickingOrders.createdAt, new Date(filters.dateTo)) : undefined
          )
        ),
        this.db.select({ count: count() }).from(packingOrders).where(
          and(
            eq(packingOrders.tenantId, tenantId),
            eq(packingOrders.packerId, userId),
            filters?.dateFrom ? gte(packingOrders.createdAt, new Date(filters.dateFrom)) : undefined,
            filters?.dateTo ? lte(packingOrders.createdAt, new Date(filters.dateTo)) : undefined
          )
        ),
        this.getMovements(tenantId, { page: 1, limit: 100 }),
      ]);

      const totalTasks = Number(picking[0].count) + Number(packing[0].count);

      return {
        totalTasks,
        completedTasks: totalTasks,
        completionRate: 100,
        totalMovements: movements.meta.total,
        recentMovements: movements.data.slice(0, 10),
      };
    } catch (error) {
      console.error('Database error in getSummaryReport:', error);
      throw new BadRequestException(`Özet rapor alınamadı: ${error.message}`);
    }
  }

  private async getLocationById(locationId: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(warehouseLocations)
        .where(
          and(
            eq(warehouseLocations.id, locationId),
            eq(warehouseLocations.tenantId, tenantId)
          )
        )
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error('Database error in getLocationById:', error);
      return null;
    }
  }

  private async getWarehouseIdByLocation(locationId: string, tenantId: string) {
    try {
      const result = await this.db
        .select({ warehouseId: warehouseLocations.warehouseId })
        .from(warehouseLocations)
        .where(
          and(
            eq(warehouseLocations.id, locationId),
            eq(warehouseLocations.tenantId, tenantId)
          )
        )
        .limit(1);

      return result[0]?.warehouseId || null;
    } catch (error) {
      console.error('Database error in getWarehouseIdByLocation:', error);
      return null;
    }
  }

  private async getLowStockItems(tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(
          and(
            eq(inventory.tenantId, tenantId),
            eq(inventory.status, 'available'),
            lte(inventory.quantityAvailable, inventory.reorderPoint)
          )
        )
        .limit(10);

      return result.map(item => ({
        product: item.products,
        inventory: item.inventory,
      }));
    } catch (error) {
      console.error('Database error in getLowStockItems:', error);
      return [];
    }
  }
}
