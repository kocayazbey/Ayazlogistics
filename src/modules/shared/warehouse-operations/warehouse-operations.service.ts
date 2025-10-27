import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, desc, or, count, asc, gte, lte } from 'drizzle-orm';
import { CreateOperationDto } from './dto/create-operation.dto';
import { UpdateOperationDto } from './dto/update-operation.dto';
import { StartOperationDto } from './dto/start-operation.dto';
import { CompleteOperationDto } from './dto/complete-operation.dto';
import { receivingOrders, pickingOrders, packingOrders, shipments, inventory, inventoryMovements } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class WarehouseOperationsService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getAll(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    warehouseId?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    try {
      let table;
      switch (filters?.type) {
        case 'receiving':
          table = receivingOrders;
          break;
        case 'picking':
          table = pickingOrders;
          break;
        case 'packing':
          table = packingOrders;
          break;
        case 'shipping':
          table = shipments;
          break;
        default:
          // Tüm operasyonları birleştir
          const [receiving, picking, packing, shipping] = await Promise.all([
            this.db.select().from(receivingOrders).where(eq(receivingOrders.tenantId, tenantId)).limit(limit).offset(offset),
            this.db.select().from(pickingOrders).where(eq(pickingOrders.tenantId, tenantId)).limit(limit).offset(offset),
            this.db.select().from(packingOrders).where(eq(packingOrders.tenantId, tenantId)).limit(limit).offset(offset),
            this.db.select().from(shipments).where(eq(shipments.tenantId, tenantId)).limit(limit).offset(offset),
          ]);

          const allOperations = [
            ...receiving.map(op => ({ ...op, operationType: 'receiving' })),
            ...picking.map(op => ({ ...op, operationType: 'picking' })),
            ...packing.map(op => ({ ...op, operationType: 'packing' })),
            ...shipping.map(op => ({ ...op, operationType: 'shipping' })),
          ];

          return {
            data: allOperations.slice(0, limit),
            meta: {
              page,
              limit,
              total: allOperations.length,
              totalPages: Math.ceil(allOperations.length / limit),
            },
          };
      }

      const conditions = [eq(table.tenantId, tenantId)];

      if (filters?.status) {
        conditions.push(eq(table.status, filters.status));
      }

      if (filters?.warehouseId) {
        conditions.push(eq(table.warehouseId, filters.warehouseId));
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(table)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(table.createdAt)),
        this.db
          .select({ count: count() })
          .from(table)
          .where(whereClause)
      ]);

      return {
        data: data.map(op => ({ ...op, operationType: filters?.type })),
        meta: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
        },
      };
    } catch (error) {
      console.error('Database error in getAll:', error);
      throw new BadRequestException(`Operasyonlar alınamadı: ${error.message}`);
    }
  }

  async getById(id: string, tenantId: string) {
    try {
      // Tüm tablolarda ara
      const [receiving, picking, packing, shipping] = await Promise.all([
        this.db.select().from(receivingOrders).where(and(eq(receivingOrders.id, id), eq(receivingOrders.tenantId, tenantId))).limit(1),
        this.db.select().from(pickingOrders).where(and(eq(pickingOrders.id, id), eq(pickingOrders.tenantId, tenantId))).limit(1),
        this.db.select().from(packingOrders).where(and(eq(packingOrders.id, id), eq(packingOrders.tenantId, tenantId))).limit(1),
        this.db.select().from(shipments).where(and(eq(shipments.id, id), eq(shipments.tenantId, tenantId))).limit(1),
      ]);

      if (receiving.length > 0) return { ...receiving[0], operationType: 'receiving' };
      if (picking.length > 0) return { ...picking[0], operationType: 'picking' };
      if (packing.length > 0) return { ...packing[0], operationType: 'packing' };
      if (shipping.length > 0) return { ...shipping[0], operationType: 'shipping' };

      throw new NotFoundException('Operasyon bulunamadı');
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Operasyon bulunamadı');
    }
  }

  async create(createOperationDto: CreateOperationDto, tenantId: string, userId: string) {
    try {
      const operationType = createOperationDto.operationType || 'receiving';
      let result;

      switch (operationType) {
        case 'receiving':
          result = await this.db.insert(receivingOrders).values({
            receivingNumber: `REC-${Date.now()}`,
            warehouseId: createOperationDto.warehouseId,
            supplier: createOperationDto.supplier,
            expectedDate: createOperationDto.expectedDate,
            status: 'pending',
            notes: createOperationDto.notes,
            tenantId,
          }).returning();
          break;
        case 'picking':
          result = await this.db.insert(pickingOrders).values({
            pickingNumber: `PICK-${Date.now()}`,
            warehouseId: createOperationDto.warehouseId,
            orderId: createOperationDto.orderId,
            pickerId: userId,
            status: 'pending',
            priority: createOperationDto.priority || 'normal',
            tenantId,
          }).returning();
          break;
        case 'packing':
          result = await this.db.insert(packingOrders).values({
            packingNumber: `PACK-${Date.now()}`,
            warehouseId: createOperationDto.warehouseId,
            orderId: createOperationDto.orderId,
            packerId: userId,
            status: 'pending',
            tenantId,
          }).returning();
          break;
        case 'shipping':
          result = await this.db.insert(shipments).values({
            shipmentNumber: `SHIP-${Date.now()}`,
            warehouseId: createOperationDto.warehouseId,
            orderId: createOperationDto.orderId,
            status: 'pending',
            priority: createOperationDto.priority || 'normal',
            tenantId,
          }).returning();
          break;
        default:
          throw new BadRequestException('Geçersiz operasyon tipi');
      }

      return { ...result[0], operationType };
    } catch (error) {
      console.error('Database error in create:', error);
      throw new BadRequestException(`Operasyon oluşturulamadı: ${error.message}`);
    }
  }

  async update(id: string, updateOperationDto: UpdateOperationDto, tenantId: string) {
    try {
      const operation = await this.getById(id, tenantId);
      const operationType = operation.operationType;

      let table;
      switch (operationType) {
        case 'receiving':
          table = receivingOrders;
          break;
        case 'picking':
          table = pickingOrders;
          break;
        case 'packing':
          table = packingOrders;
          break;
        case 'shipping':
          table = shipments;
          break;
        default:
          throw new BadRequestException('Geçersiz operasyon tipi');
      }

      const result = await this.db
        .update(table)
        .set({ ...updateOperationDto, updatedAt: new Date() })
        .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Operasyon bulunamadı');
      }

      return { ...result[0], operationType };
    } catch (error) {
      console.error('Database error in update:', error);
      throw error;
    }
  }

  async delete(id: string, tenantId: string) {
    try {
      const operation = await this.getById(id, tenantId);
      const operationType = operation.operationType;

      let table;
      switch (operationType) {
        case 'receiving':
          table = receivingOrders;
          break;
        case 'picking':
          table = pickingOrders;
          break;
        case 'packing':
          table = packingOrders;
          break;
        case 'shipping':
          table = shipments;
          break;
        default:
          throw new BadRequestException('Geçersiz operasyon tipi');
      }

      await this.db
        .delete(table)
        .where(and(eq(table.id, id), eq(table.tenantId, tenantId)));

      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Database error in delete:', error);
      throw error;
    }
  }

  async getPendingOperations(tenantId: string) {
    try {
      const [receiving, picking, packing, shipping] = await Promise.all([
        this.db.select().from(receivingOrders).where(and(eq(receivingOrders.tenantId, tenantId), eq(receivingOrders.status, 'pending'))),
        this.db.select().from(pickingOrders).where(and(eq(pickingOrders.tenantId, tenantId), eq(pickingOrders.status, 'pending'))),
        this.db.select().from(packingOrders).where(and(eq(packingOrders.tenantId, tenantId), eq(packingOrders.status, 'pending'))),
        this.db.select().from(shipments).where(and(eq(shipments.tenantId, tenantId), eq(shipments.status, 'pending'))),
      ]);

      return [
        ...receiving.map(op => ({ ...op, operationType: 'receiving' })),
        ...picking.map(op => ({ ...op, operationType: 'picking' })),
        ...packing.map(op => ({ ...op, operationType: 'packing' })),
        ...shipping.map(op => ({ ...op, operationType: 'shipping' })),
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      console.error('Database error in getPendingOperations:', error);
      throw new BadRequestException(`Bekleyen operasyonlar alınamadı: ${error.message}`);
    }
  }

  async getAssignedOperations(tenantId: string, userId: string) {
    try {
      const [picking, packing] = await Promise.all([
        this.db.select().from(pickingOrders).where(
          and(
            eq(pickingOrders.tenantId, tenantId),
            eq(pickingOrders.pickerId, userId),
            or(eq(pickingOrders.status, 'pending'), eq(pickingOrders.status, 'in_progress'))
          )
        ),
        this.db.select().from(packingOrders).where(
          and(
            eq(packingOrders.tenantId, tenantId),
            eq(packingOrders.packerId, userId),
            or(eq(packingOrders.status, 'pending'), eq(packingOrders.status, 'in_progress'))
          )
        ),
      ]);

      return [
        ...picking.map(op => ({ ...op, operationType: 'picking' })),
        ...packing.map(op => ({ ...op, operationType: 'packing' })),
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      console.error('Database error in getAssignedOperations:', error);
      throw new BadRequestException(`Atanan operasyonlar alınamadı: ${error.message}`);
    }
  }

  async getStatistics(tenantId: string, filters?: {
    warehouseId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    try {
      const conditions = filters?.warehouseId ? [eq(receivingOrders.warehouseId, filters.warehouseId)] : [];
      
      if (filters?.dateFrom) {
        conditions.push(gte(receivingOrders.createdAt, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(receivingOrders.createdAt, new Date(filters.dateTo)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [receiving, picking, packing, shipping] = await Promise.all([
        this.db.select({ count: count() }).from(receivingOrders).where(and(eq(receivingOrders.tenantId, tenantId), whereClause || undefined)),
        this.db.select({ count: count() }).from(pickingOrders).where(and(eq(pickingOrders.tenantId, tenantId), whereClause || undefined)),
        this.db.select({ count: count() }).from(packingOrders).where(and(eq(packingOrders.tenantId, tenantId), whereClause || undefined)),
        this.db.select({ count: count() }).from(shipments).where(and(eq(shipments.tenantId, tenantId), whereClause || undefined)),
      ]);

      const total = Number(receiving[0].count) + Number(picking[0].count) + Number(packing[0].count) + Number(shipping[0].count);

      return {
        total,
        receiving: Number(receiving[0].count),
        picking: Number(picking[0].count),
        packing: Number(packing[0].count),
        shipping: Number(shipping[0].count),
      };
    } catch (error) {
      console.error('Database error in getStatistics:', error);
      throw new BadRequestException(`İstatistikler alınamadı: ${error.message}`);
    }
  }

  async startOperation(id: string, startOperationDto: StartOperationDto, tenantId: string, userId: string) {
    try {
      const operation = await this.getById(id, tenantId);
      
      if (operation.status !== 'pending') {
        throw new BadRequestException('Operasyon bekleyen durumda değil');
      }

      let table;
      switch (operation.operationType) {
        case 'receiving':
          table = receivingOrders;
          break;
        case 'picking':
          table = pickingOrders;
          break;
        case 'packing':
          table = packingOrders;
          break;
        case 'shipping':
          table = shipments;
          break;
        default:
          throw new BadRequestException('Geçersiz operasyon tipi');
      }

      const result = await this.db
        .update(table)
        .set({
          status: 'in_progress',
          updatedAt: new Date(),
        })
        .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
        .returning();

      return { ...result[0], operationType: operation.operationType };
    } catch (error) {
      console.error('Database error in startOperation:', error);
      throw error;
    }
  }

  async completeOperation(id: string, completeOperationDto: CompleteOperationDto, tenantId: string, userId: string) {
    try {
      const operation = await this.getById(id, tenantId);
      
      if (operation.status !== 'in_progress') {
        throw new BadRequestException('Operasyon devam ediyor durumunda değil');
      }

      let table;
      switch (operation.operationType) {
        case 'receiving':
          table = receivingOrders;
          break;
        case 'picking':
          table = pickingOrders;
          break;
        case 'packing':
          table = packingOrders;
          break;
        case 'shipping':
          table = shipments;
          break;
        default:
          throw new BadRequestException('Geçersiz operasyon tipi');
      }

      const result = await this.db
        .update(table)
        .set({
          status: 'completed',
          updatedAt: new Date(),
        })
        .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
        .returning();

      return { ...result[0], operationType: operation.operationType };
    } catch (error) {
      console.error('Database error in completeOperation:', error);
      throw error;
    }
  }

  async cancelOperation(id: string, reason: string, tenantId: string, userId: string) {
    try {
      const operation = await this.getById(id, tenantId);
      
      if (operation.status === 'completed') {
        throw new BadRequestException('Tamamlanmış operasyon iptal edilemez');
      }

      let table;
      switch (operation.operationType) {
        case 'receiving':
          table = receivingOrders;
          break;
        case 'picking':
          table = pickingOrders;
          break;
        case 'packing':
          table = packingOrders;
          break;
        case 'shipping':
          table = shipments;
          break;
        default:
          throw new BadRequestException('Geçersiz operasyon tipi');
      }

      const result = await this.db
        .update(table)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
        .returning();

      return { ...result[0], operationType: operation.operationType };
    } catch (error) {
      console.error('Database error in cancelOperation:', error);
      throw error;
    }
  }

  async assignOperation(id: string, assignedTo: string, tenantId: string) {
    try {
      const operation = await this.getById(id, tenantId);

      let table;
      let updateData: any = { updatedAt: new Date() };

      switch (operation.operationType) {
        case 'picking':
          table = pickingOrders;
          updateData.pickerId = assignedTo;
          break;
        case 'packing':
          table = packingOrders;
          updateData.packerId = assignedTo;
          break;
        default:
          throw new BadRequestException('Bu operasyon tipi atama desteklemiyor');
      }

      const result = await this.db
        .update(table)
        .set(updateData)
        .where(and(eq(table.id, id), eq(table.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Operasyon bulunamadı');
      }

      return { ...result[0], operationType: operation.operationType };
    } catch (error) {
      console.error('Database error in assignOperation:', error);
      throw error;
    }
  }

  async getOperationItems(id: string, tenantId: string) {
    try {
      const operation = await this.getById(id, tenantId);
      
      // Operasyonla ilişkili inventory kayıtlarını getir
      const items = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.tenantId, tenantId),
            eq(inventory.warehouseId, operation.warehouseId)
          )
        );

      return {
        operationId: id,
        operationType: operation.operationType,
        items: items.map(item => ({
          id: item.id,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          quantityAvailable: item.quantityAvailable,
          locationId: item.locationId,
        })),
      };
    } catch (error) {
      console.error('Database error in getOperationItems:', error);
      throw error;
    }
  }

  async addOperationItem(id: string, item: any, tenantId: string) {
    try {
      const operation = await this.getById(id, tenantId);
      
      // Yeni inventory kaydı oluştur veya mevcut olanı güncelle
      const existingItem = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.id, item.inventoryId || item.id),
            eq(inventory.tenantId, tenantId)
          )
        )
        .limit(1);

      if (existingItem.length > 0) {
        // Mevcut kaydı güncelle
        const result = await this.db
          .update(inventory)
          .set({
            quantityAvailable: (existingItem[0].quantityAvailable || 0) + (item.quantity || 0),
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, existingItem[0].id))
          .returning();

        // Movement kaydı oluştur
        await this.db.insert(inventoryMovements).values({
          inventoryId: existingItem[0].id,
          movementType: 'in',
          quantity: item.quantity || 0,
          reason: `Operation ${id} item added`,
          tenantId,
        });

        return result[0];
      } else {
        throw new NotFoundException('Inventory item not found');
      }
    } catch (error) {
      console.error('Database error in addOperationItem:', error);
      throw error;
    }
  }

  async updateOperationItem(id: string, itemId: string, item: any, tenantId: string) {
    try {
      await this.getById(id, tenantId);
      
      const existingItem = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.id, itemId),
            eq(inventory.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existingItem || existingItem.length === 0) {
        throw new NotFoundException('Inventory item not found');
      }

      const oldQuantity = existingItem[0].quantityAvailable || 0;
      const newQuantity = item.quantity !== undefined ? item.quantity : oldQuantity;

      const result = await this.db
        .update(inventory)
        .set({
          quantityAvailable: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, itemId))
        .returning();

      // Movement kaydı oluştur
      if (newQuantity !== oldQuantity) {
        await this.db.insert(inventoryMovements).values({
          inventoryId: itemId,
          movementType: newQuantity > oldQuantity ? 'in' : 'out',
          quantity: Math.abs(newQuantity - oldQuantity),
          reason: `Operation ${id} item updated`,
          tenantId,
        });
      }

      return result[0];
    } catch (error) {
      console.error('Database error in updateOperationItem:', error);
      throw error;
    }
  }

  async removeOperationItem(id: string, itemId: string, tenantId: string) {
    try {
      await this.getById(id, tenantId);
      
      const existingItem = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.id, itemId),
            eq(inventory.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existingItem || existingItem.length === 0) {
        throw new NotFoundException('Inventory item not found');
      }

      // Movement kaydı oluştur
      await this.db.insert(inventoryMovements).values({
        inventoryId: itemId,
        movementType: 'out',
        quantity: existingItem[0].quantityAvailable || 0,
        reason: `Operation ${id} item removed`,
        tenantId,
      });

      // Inventory kaydını sil veya sıfırla
      const result = await this.db
        .update(inventory)
        .set({
          quantityAvailable: 0,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, itemId))
        .returning();

      return { success: true, removedItem: result[0] };
    } catch (error) {
      console.error('Database error in removeOperationItem:', error);
      throw error;
    }
  }
}
