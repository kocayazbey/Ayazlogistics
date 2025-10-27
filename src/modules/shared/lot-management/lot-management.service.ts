import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { eq, and, desc, count, asc, gte, lte } from 'drizzle-orm';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { AllocateLotDto } from './dto/allocate-lot.dto';
import { batchLots, stockMovements } from '../../../database/schema/shared/erp-inventory.schema';

@Injectable()
export class LotManagementService {
  constructor(private readonly dbService: DatabaseService) {}

  private get db() {
    return this.dbService.getDb();
  }

  async getAll(tenantId: string, filters?: {
    page?: number;
    limit?: number;
    productId?: string;
    status?: string;
    expiryDate?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(batchLots.tenantId, tenantId)];

    if (filters?.productId) {
      conditions.push(eq(batchLots.stockCardId, filters.productId));
    }

    if (filters?.status) {
      conditions.push(eq(batchLots.status, filters.status));
    }

    if (filters?.expiryDate) {
      conditions.push(eq(batchLots.expiryDate, filters.expiryDate));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    try {
      const [data, [{ count: total }]] = await Promise.all([
        this.db
          .select()
          .from(batchLots)
          .where(whereClause)
          .limit(limit)
          .offset(offset)
          .orderBy(desc(batchLots.createdAt)),
        this.db
          .select({ count: count() })
          .from(batchLots)
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
      console.error('Database error in getAll:', error);
      throw new BadRequestException(`Failed to retrieve lots: ${error.message}`);
    }
  }

  async getById(id: string, tenantId: string) {
    try {
      const result = await this.db
        .select()
        .from(batchLots)
        .where(and(eq(batchLots.id, id), eq(batchLots.tenantId, tenantId)))
        .limit(1);

      if (!result || result.length === 0) {
        throw new NotFoundException('Lot not found');
      }

      return result[0];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('Lot not found');
    }
  }

  async create(createLotDto: CreateLotDto, tenantId: string) {
    try {
      const result = await this.db
        .insert(batchLots)
        .values({
          ...createLotDto,
          tenantId,
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('Database error in create:', error);
      throw new BadRequestException(`Failed to create lot: ${error.message}`);
    }
  }

  async update(id: string, updateLotDto: UpdateLotDto, tenantId: string) {
    try {
      const result = await this.db
        .update(batchLots)
        .set({ ...updateLotDto, updatedAt: new Date() })
        .where(and(eq(batchLots.id, id), eq(batchLots.tenantId, tenantId)))
        .returning();

      if (!result || result.length === 0) {
        throw new NotFoundException('Lot not found');
      }

      return result[0];
    } catch (error) {
      console.error('Database error in update:', error);
      throw error;
    }
  }

  async delete(id: string, tenantId: string) {
    try {
      await this.db
        .delete(batchLots)
        .where(and(eq(batchLots.id, id), eq(batchLots.tenantId, tenantId)));

      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Database error in delete:', error);
      throw error;
    }
  }

  async getFifoAllocation(productId: string, quantity: number, tenantId: string) {
    try {
      const lots = await this.db
        .select()
        .from(batchLots)
        .where(
          and(
            eq(batchLots.stockCardId, productId),
            eq(batchLots.tenantId, tenantId),
            eq(batchLots.status, 'available')
          )
        )
        .orderBy(asc(batchLots.createdAt));

      const allocation = [];
      let remainingQuantity = quantity;

      for (const lot of lots) {
        if (remainingQuantity <= 0) break;

        const availableQuantity = Number(lot.quantity) || 0;
        if (availableQuantity > 0) {
          const allocatedQuantity = Math.min(availableQuantity, remainingQuantity);
          allocation.push({
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            allocatedQuantity,
            expiryDate: lot.expiryDate,
          });
          remainingQuantity -= allocatedQuantity;
        }
      }

      return {
        allocation,
        totalAllocated: quantity - remainingQuantity,
        remainingQuantity,
      };
    } catch (error) {
      console.error('Database error in getFifoAllocation:', error);
      throw new BadRequestException(`Failed to calculate FIFO allocation: ${error.message}`);
    }
  }

  async getFefoAllocation(productId: string, quantity: number, tenantId: string) {
    try {
      const lots = await this.db
        .select()
        .from(batchLots)
        .where(
          and(
            eq(batchLots.stockCardId, productId),
            eq(batchLots.tenantId, tenantId),
            eq(batchLots.status, 'available')
          )
        )
        .orderBy(asc(batchLots.expiryDate));

      const allocation = [];
      let remainingQuantity = quantity;

      for (const lot of lots) {
        if (remainingQuantity <= 0) break;

        const availableQuantity = Number(lot.quantity) || 0;
        if (availableQuantity > 0) {
          const allocatedQuantity = Math.min(availableQuantity, remainingQuantity);
          allocation.push({
            lotId: lot.id,
            lotNumber: lot.lotNumber,
            allocatedQuantity,
            expiryDate: lot.expiryDate,
          });
          remainingQuantity -= allocatedQuantity;
        }
      }

      return {
        allocation,
        totalAllocated: quantity - remainingQuantity,
        remainingQuantity,
      };
    } catch (error) {
      console.error('Database error in getFefoAllocation:', error);
      throw new BadRequestException(`Failed to calculate FEFO allocation: ${error.message}`);
    }
  }

  async getExpiringLots(days: number, tenantId: string) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    try {
      const lots = await this.db
        .select()
        .from(batchLots)
        .where(
          and(
            eq(batchLots.tenantId, tenantId),
            eq(batchLots.status, 'available'),
            lte(batchLots.expiryDate, expiryDate)
          )
        )
        .orderBy(asc(batchLots.expiryDate));

      return lots;
    } catch (error) {
      console.error('Database error in getExpiringLots:', error);
      throw new BadRequestException(`Failed to retrieve expiring lots: ${error.message}`);
    }
  }

  async allocateLot(allocateLotDto: AllocateLotDto, tenantId: string) {
    try {
      const lot = await this.getById(allocateLotDto.lotId, tenantId);
      
      const availableQuantity = Number(lot.quantity) || 0;
      if (availableQuantity < allocateLotDto.quantity) {
        throw new BadRequestException('Insufficient available quantity');
      }

      // Update lot status to reserved and reduce quantity
      const newQuantity = availableQuantity - allocateLotDto.quantity;
      const result = await this.db
        .update(batchLots)
        .set({
          quantity: newQuantity,
          status: newQuantity > 0 ? 'reserved' : 'reserved',
          updatedAt: new Date(),
        })
        .where(and(eq(batchLots.id, allocateLotDto.lotId), eq(batchLots.tenantId, tenantId)))
        .returning();

      // Create movement record
      await this.db.insert(stockMovements).values({
        tenantId,
        stockCardId: lot.stockCardId,
        batchLotId: lot.id,
        movementType: 'out',
        movementReason: 'allocation',
        quantity: allocateLotDto.quantity,
        movementDate: new Date(),
      });

      return result[0];
    } catch (error) {
      console.error('Database error in allocateLot:', error);
      throw error;
    }
  }

  async deallocateLot(lotId: string, quantity: number, tenantId: string) {
    try {
      const lot = await this.getById(lotId, tenantId);
      
      // Update lot to make quantity available again
      const currentQuantity = Number(lot.quantity) || 0;
      const result = await this.db
        .update(batchLots)
        .set({
          quantity: currentQuantity + quantity,
          status: 'available',
          updatedAt: new Date(),
        })
        .where(and(eq(batchLots.id, lotId), eq(batchLots.tenantId, tenantId)))
        .returning();

      // Create movement record
      await this.db.insert(stockMovements).values({
        tenantId,
        stockCardId: lot.stockCardId,
        batchLotId: lot.id,
        movementType: 'in',
        movementReason: 'deallocation',
        quantity: quantity,
        movementDate: new Date(),
      });

      return result[0];
    } catch (error) {
      console.error('Database error in deallocateLot:', error);
      throw error;
    }
  }

  async transferLot(
    lotId: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number,
    tenantId: string,
  ) {
    try {
      const lot = await this.getById(lotId, tenantId);
      
      const availableQuantity = Number(lot.quantity) || 0;
      if (availableQuantity < quantity) {
        throw new BadRequestException('Insufficient available quantity');
      }

      // Update lot quantity
      const result = await this.db
        .update(batchLots)
        .set({
          quantity: availableQuantity - quantity,
          updatedAt: new Date(),
        })
        .where(and(eq(batchLots.id, lotId), eq(batchLots.tenantId, tenantId)))
        .returning();

      // Create movement record for transfer
      await this.db.insert(stockMovements).values({
        tenantId,
        stockCardId: lot.stockCardId,
        batchLotId: lot.id,
        movementType: 'transfer',
        movementReason: 'location_transfer',
        quantity: quantity,
        fromLocation: fromLocationId,
        toLocation: toLocationId,
        movementDate: new Date(),
      });

      return {
        lot: result[0],
        transferCompleted: true,
      };
    } catch (error) {
      console.error('Database error in transferLot:', error);
      throw error;
    }
  }

  async getLotTraceability(lotId: string, tenantId: string) {
    try {
      const lot = await this.getById(lotId, tenantId);
      
      const movements = await this.db
        .select()
        .from(stockMovements)
        .where(and(eq(stockMovements.batchLotId, lotId), eq(stockMovements.tenantId, tenantId)))
        .orderBy(desc(stockMovements.createdAt));

      return {
        lot,
        movements,
      };
    } catch (error) {
      console.error('Database error in getLotTraceability:', error);
      throw error;
    }
  }
}
