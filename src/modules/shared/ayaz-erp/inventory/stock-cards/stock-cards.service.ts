import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, like, or, gte, lte } from 'drizzle-orm';
import { stockCards, stockMovements } from '../../../../../database/schema/shared/erp-inventory.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';
import { CacheService } from '../../../../../common/services/cache.service';

@Injectable()
export class StockCardsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  async createStockCard(data: any, tenantId: string) {
    const existing = await this.db
      .select()
      .from(stockCards)
      .where(
        and(
          eq(stockCards.tenantId, tenantId),
          or(
            eq(stockCards.sku, data.sku),
            eq(stockCards.barcode, data.barcode),
          ),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      throw new BadRequestException('Stock card with this SKU or barcode already exists');
    }

    const [stockCard] = await this.db
      .insert(stockCards)
      .values({
        tenantId,
        sku: data.sku,
        barcode: data.barcode,
        productName: data.productName,
        description: data.description,
        category: data.category,
        brand: data.brand,
        unitCost: data.unitCost,
        unitPrice: data.unitPrice,
        quantityOnHand: 0,
        quantityAvailable: 0,
        quantityReserved: 0,
        reorderPoint: data.reorderPoint,
        reorderQuantity: data.reorderQuantity,
        isActive: true,
      })
      .returning();

    await this.eventBus.emit('stock.card.created', { stockCardId: stockCard.id, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('stock-cards', tenantId));

    return stockCard;
  }

  async getStockCards(tenantId: string, filters?: {
    category?: string;
    brand?: string;
    search?: string;
    isActive?: boolean;
    lowStock?: boolean;
  }) {
    const cacheKey = this.cacheService.generateKey('stock-cards', tenantId, JSON.stringify(filters || {}));

    return this.cacheService.wrap(cacheKey, async () => {
      let query = this.db.select().from(stockCards).where(eq(stockCards.tenantId, tenantId));

      if (filters?.category) {
        query = query.where(and(eq(stockCards.tenantId, tenantId), eq(stockCards.category, filters.category)));
      }

      if (filters?.brand) {
        query = query.where(and(eq(stockCards.tenantId, tenantId), eq(stockCards.brand, filters.brand)));
      }

      if (filters?.isActive !== undefined) {
        query = query.where(and(eq(stockCards.tenantId, tenantId), eq(stockCards.isActive, filters.isActive)));
      }

      if (filters?.search) {
        query = query.where(
          and(
            eq(stockCards.tenantId, tenantId),
            or(
              like(stockCards.sku, `%${filters.search}%`),
              like(stockCards.productName, `%${filters.search}%`),
              like(stockCards.barcode, `%${filters.search}%`),
            ),
          ),
        );
      }

      const results = await query;

      if (filters?.lowStock) {
        return results.filter((card: any) => {
          const onHand = card.quantityOnHand || 0;
          const reorderPoint = card.reorderPoint || 0;
          return onHand <= reorderPoint;
        });
      }

      return results;
    }, 300);
  }

  async recordStockMovement(data: {
    stockCardId: string;
    movementType: 'in' | 'out' | 'transfer' | 'adjustment';
    quantity: number;
    unitCost?: number;
    movementReason?: string;
    fromLocation?: string;
    toLocation?: string;
    reference?: string;
  }, tenantId: string, userId: string) {
    const [stockCard] = await this.db
      .select()
      .from(stockCards)
      .where(and(eq(stockCards.id, data.stockCardId), eq(stockCards.tenantId, tenantId)))
      .limit(1);

    if (!stockCard) {
      throw new NotFoundException('Stock card not found');
    }

    const currentOnHand = stockCard.quantityOnHand || 0;
    let newQuantity = currentOnHand;

    if (data.movementType === 'in') {
      newQuantity = currentOnHand + data.quantity;
    } else if (data.movementType === 'out') {
      if (currentOnHand < data.quantity) {
        throw new BadRequestException('Insufficient quantity');
      }
      newQuantity = currentOnHand - data.quantity;
    } else if (data.movementType === 'adjustment') {
      newQuantity = data.quantity;
    }

    const unitCost = data.unitCost || parseFloat(stockCard.unitCost || '0');
    const totalCost = unitCost * data.quantity;

    const [movement] = await this.db
      .insert(stockMovements)
      .values({
        tenantId,
        stockCardId: data.stockCardId,
        movementType: data.movementType,
        movementReason: data.movementReason,
        quantity: data.quantity,
        unitCost: unitCost.toString(),
        totalCost: totalCost.toString(),
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
        reference: data.reference,
        movementDate: new Date(),
        createdBy: userId,
      })
      .returning();

    await this.db
      .update(stockCards)
      .set({
        quantityOnHand: newQuantity,
        quantityAvailable: newQuantity - (stockCard.quantityReserved || 0),
        updatedAt: new Date(),
      })
      .where(eq(stockCards.id, data.stockCardId));

    await this.eventBus.emit('stock.movement.recorded', {
      movementId: movement.id,
      stockCardId: data.stockCardId,
      movementType: data.movementType,
      quantity: data.quantity,
      tenantId,
    });

    await this.cacheService.del(this.cacheService.generateKey('stock-cards', tenantId));

    if (newQuantity <= (stockCard.reorderPoint || 0)) {
      await this.eventBus.emit('stock.low.stock.alert', {
        stockCardId: data.stockCardId,
        sku: stockCard.sku,
        currentQuantity: newQuantity,
        reorderPoint: stockCard.reorderPoint,
        tenantId,
      });
    }

    return movement;
  }

  async getStockMovements(stockCardId: string, tenantId: string, filters?: {
    movementType?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    let query = this.db
      .select()
      .from(stockMovements)
      .where(and(eq(stockMovements.tenantId, tenantId), eq(stockMovements.stockCardId, stockCardId)));

    if (filters?.movementType) {
      query = query.where(
        and(
          eq(stockMovements.tenantId, tenantId),
          eq(stockMovements.stockCardId, stockCardId),
          eq(stockMovements.movementType, filters.movementType),
        ),
      );
    }

    if (filters?.startDate && filters?.endDate) {
      query = query.where(
        and(
          eq(stockMovements.tenantId, tenantId),
          eq(stockMovements.stockCardId, stockCardId),
          gte(stockMovements.movementDate, filters.startDate),
          lte(stockMovements.movementDate, filters.endDate),
        ),
      );
    }

    return await query;
  }

  async reserveStock(stockCardId: string, quantity: number, tenantId: string) {
    const [stockCard] = await this.db
      .select()
      .from(stockCards)
      .where(and(eq(stockCards.id, stockCardId), eq(stockCards.tenantId, tenantId)))
      .limit(1);

    if (!stockCard) {
      throw new NotFoundException('Stock card not found');
    }

    const available = stockCard.quantityAvailable || 0;
    if (available < quantity) {
      throw new BadRequestException('Insufficient available quantity');
    }

    const newReserved = (stockCard.quantityReserved || 0) + quantity;
    const newAvailable = (stockCard.quantityOnHand || 0) - newReserved;

    const [updated] = await this.db
      .update(stockCards)
      .set({
        quantityReserved: newReserved,
        quantityAvailable: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(stockCards.id, stockCardId))
      .returning();

    await this.eventBus.emit('stock.reserved', { stockCardId, quantity, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('stock-cards', tenantId));

    return updated;
  }

  async releaseReservation(stockCardId: string, quantity: number, tenantId: string) {
    const [stockCard] = await this.db
      .select()
      .from(stockCards)
      .where(and(eq(stockCards.id, stockCardId), eq(stockCards.tenantId, tenantId)))
      .limit(1);

    if (!stockCard) {
      throw new NotFoundException('Stock card not found');
    }

    const currentReserved = stockCard.quantityReserved || 0;
    const newReserved = Math.max(0, currentReserved - quantity);
    const newAvailable = (stockCard.quantityOnHand || 0) - newReserved;

    const [updated] = await this.db
      .update(stockCards)
      .set({
        quantityReserved: newReserved,
        quantityAvailable: newAvailable,
        updatedAt: new Date(),
      })
      .where(eq(stockCards.id, stockCardId))
      .returning();

    await this.eventBus.emit('stock.reservation.released', { stockCardId, quantity, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('stock-cards', tenantId));

    return updated;
  }

  async getLowStockItems(tenantId: string) {
    const allStock = await this.db
      .select()
      .from(stockCards)
      .where(and(eq(stockCards.tenantId, tenantId), eq(stockCards.isActive, true)));

    return allStock.filter((card: any) => {
      const onHand = card.quantityOnHand || 0;
      const reorderPoint = card.reorderPoint || 0;
      return onHand <= reorderPoint;
    });
  }

  async getStockValuation(tenantId: string) {
    const allStock = await this.db
      .select()
      .from(stockCards)
      .where(and(eq(stockCards.tenantId, tenantId), eq(stockCards.isActive, true)));

    let totalValue = 0;
    let totalQuantity = 0;

    for (const card of allStock) {
      const quantity = card.quantityOnHand || 0;
      const unitCost = parseFloat(card.unitCost || '0');
      totalValue += quantity * unitCost;
      totalQuantity += quantity;
    }

    return {
      totalValue,
      totalQuantity,
      itemCount: allStock.length,
      averageValuePerItem: allStock.length > 0 ? totalValue / allStock.length : 0,
    };
  }
}
