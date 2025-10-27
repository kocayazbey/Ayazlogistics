import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, like, or, gte, lte } from 'drizzle-orm';
import { stockCards, stockCategories, stockMovements } from '../../../../database/schema/shared/erp-inventory.schema';
import { products } from '../../../../database/schema/shared/wms.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface StockCardCreateData {
  stockCode: string;
  stockName: string;
  categoryId?: string;
  barcode?: string;
  unit: string;
  taxRate?: number;
  purchasePrice?: number;
  salePrice?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  description?: string;
  specifications?: any;
}

@Injectable()
export class StockCardService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createStockCard(data: StockCardCreateData, tenantId: string, userId: string) {
    // Check if stock code already exists
    const existing = await this.db
      .select()
      .from(stockCards)
      .where(
        and(
          eq(stockCards.tenantId, tenantId),
          eq(stockCards.stockCode, data.stockCode)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`Stock card with code ${data.stockCode} already exists`);
    }

    const [stockCard] = await this.db
      .insert(stockCards)
      .values({
        tenantId,
        stockCode: data.stockCode,
        stockName: data.stockName,
        categoryId: data.categoryId,
        barcode: data.barcode,
        unit: data.unit,
        taxRate: data.taxRate?.toString() || '18',
        purchasePrice: data.purchasePrice?.toString() || '0',
        salePrice: data.salePrice?.toString() || '0',
        currentStock: '0',
        minStockLevel: data.minStockLevel?.toString(),
        maxStockLevel: data.maxStockLevel?.toString(),
        description: data.description,
        specifications: data.specifications,
        isActive: true,
        createdBy: userId,
      })
      .returning();

    // Also create in WMS products table for warehouse operations
    await this.db.insert(products).values({
      tenantId,
      sku: data.stockCode,
      barcode: data.barcode,
      name: data.stockName,
      description: data.description,
      category: data.categoryId,
      metadata: {
        stockCardId: stockCard.id,
        unit: data.unit,
      },
    });

    await this.eventBus.emit('stock.card.created', {
      stockCardId: stockCard.id,
      stockCode: data.stockCode,
      tenantId,
    });

    return stockCard;
  }

  async getStockCard(stockCardId: string, tenantId: string) {
    const [stockCard] = await this.db
      .select()
      .from(stockCards)
      .where(
        and(
          eq(stockCards.id, stockCardId),
          eq(stockCards.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!stockCard) {
      throw new NotFoundException('Stock card not found');
    }

    return stockCard;
  }

  async searchStockCards(tenantId: string, filters: {
    search?: string;
    categoryId?: string;
    minStock?: boolean;
    maxStock?: boolean;
    status?: 'active' | 'inactive';
  }) {
    let query = this.db
      .select()
      .from(stockCards)
      .where(eq(stockCards.tenantId, tenantId));

    // Search in stock code, name, or barcode
    if (filters.search) {
      query = query.where(
        or(
          like(stockCards.stockCode, `%${filters.search}%`),
          like(stockCards.stockName, `%${filters.search}%`),
          like(stockCards.barcode, `%${filters.search}%`)
        )
      );
    }

    if (filters.categoryId) {
      query = query.where(eq(stockCards.categoryId, filters.categoryId));
    }

    if (filters.status === 'active') {
      query = query.where(eq(stockCards.isActive, true));
    } else if (filters.status === 'inactive') {
      query = query.where(eq(stockCards.isActive, false));
    }

    const results = await query;

    // Filter by stock levels if requested
    if (filters.minStock) {
      return results.filter((s: any) => {
        const current = parseFloat(s.currentStock || '0');
        const min = parseFloat(s.minStockLevel || '0');
        return min > 0 && current <= min;
      });
    }

    if (filters.maxStock) {
      return results.filter((s: any) => {
        const current = parseFloat(s.currentStock || '0');
        const max = parseFloat(s.maxStockLevel || '0');
        return max > 0 && current >= max;
      });
    }

    return results;
  }

  async updateStockCard(stockCardId: string, updates: Partial<StockCardCreateData>, tenantId: string, userId: string) {
    const existing = await this.getStockCard(stockCardId, tenantId);

    const [updated] = await this.db
      .update(stockCards)
      .set({
        ...updates,
        taxRate: updates.taxRate?.toString(),
        purchasePrice: updates.purchasePrice?.toString(),
        salePrice: updates.salePrice?.toString(),
        minStockLevel: updates.minStockLevel?.toString(),
        maxStockLevel: updates.maxStockLevel?.toString(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(stockCards.id, stockCardId),
          eq(stockCards.tenantId, tenantId)
        )
      )
      .returning();

    await this.eventBus.emit('stock.card.updated', {
      stockCardId,
      tenantId,
      updates,
    });

    return updated;
  }

  async adjustStock(data: {
    stockCardId: string;
    quantity: number;
    movementType: 'in' | 'out' | 'adjustment';
    reason: string;
    reference?: string;
    notes?: string;
  }, tenantId: string, userId: string) {
    const stockCard = await this.getStockCard(data.stockCardId, tenantId);

    const currentStock = parseFloat(stockCard.currentStock || '0');
    let newStock: number;

    if (data.movementType === 'in') {
      newStock = currentStock + data.quantity;
    } else if (data.movementType === 'out') {
      newStock = currentStock - data.quantity;
      if (newStock < 0) {
        throw new Error('Insufficient stock');
      }
    } else {
      // adjustment - set to exact quantity
      newStock = data.quantity;
    }

    // Update stock card
    await this.db
      .update(stockCards)
      .set({
        currentStock: newStock.toString(),
        lastMovementDate: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(stockCards.id, data.stockCardId));

    // Record movement
    await this.db.insert(stockMovements).values({
      tenantId,
      stockCardId: data.stockCardId,
      movementType: data.movementType,
      movementReason: data.reason,
      quantity: data.quantity.toString(),
      balanceBefore: currentStock.toString(),
      balanceAfter: newStock.toString(),
      reference: data.reference,
      notes: data.notes,
      movementDate: new Date(),
      createdBy: userId,
    });

    await this.eventBus.emit('stock.adjusted', {
      stockCardId: data.stockCardId,
      previousStock: currentStock,
      newStock,
      movementType: data.movementType,
      tenantId,
    });

    return {
      stockCardId: data.stockCardId,
      previousStock: currentStock,
      newStock,
      movement: data.quantity,
    };
  }

  async getStockMovements(stockCardId: string, tenantId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    movementType?: string;
  }) {
    let query = this.db
      .select()
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.tenantId, tenantId),
          eq(stockMovements.stockCardId, stockCardId)
        )
      )
      .orderBy(stockMovements.movementDate);

    if (filters?.startDate) {
      query = query.where(gte(stockMovements.movementDate, filters.startDate));
    }

    if (filters?.endDate) {
      query = query.where(lte(stockMovements.movementDate, filters.endDate));
    }

    if (filters?.movementType) {
      query = query.where(eq(stockMovements.movementType, filters.movementType));
    }

    return await query;
  }

  async getLowStockItems(tenantId: string) {
    const allStockCards = await this.db
      .select()
      .from(stockCards)
      .where(
        and(
          eq(stockCards.tenantId, tenantId),
          eq(stockCards.isActive, true)
        )
      );

    return allStockCards.filter((card: any) => {
      const current = parseFloat(card.currentStock || '0');
      const min = parseFloat(card.minStockLevel || '0');
      return min > 0 && current <= min;
    });
  }

  async getStockValuation(tenantId: string) {
    const allStockCards = await this.db
      .select()
      .from(stockCards)
      .where(
        and(
          eq(stockCards.tenantId, tenantId),
          eq(stockCards.isActive, true)
        )
      );

    let totalPurchaseValue = 0;
    let totalSaleValue = 0;
    let totalItems = 0;

    for (const card of allStockCards) {
      const quantity = parseFloat(card.currentStock || '0');
      const purchasePrice = parseFloat(card.purchasePrice || '0');
      const salePrice = parseFloat(card.salePrice || '0');

      totalPurchaseValue += quantity * purchasePrice;
      totalSaleValue += quantity * salePrice;
      totalItems += quantity;
    }

    return {
      totalItems,
      totalPurchaseValue,
      totalSaleValue,
      potentialProfit: totalSaleValue - totalPurchaseValue,
      currency: 'TRY',
      valuationDate: new Date(),
    };
  }

  async createCategory(name: string, parentId: string | null, tenantId: string, userId: string) {
    const [category] = await this.db
      .insert(stockCategories)
      .values({
        tenantId,
        categoryName: name,
        parentCategoryId: parentId,
        isActive: true,
        createdBy: userId,
      })
      .returning();

    return category;
  }

  async getCategories(tenantId: string) {
    return await this.db
      .select()
      .from(stockCategories)
      .where(
        and(
          eq(stockCategories.tenantId, tenantId),
          eq(stockCategories.isActive, true)
        )
      );
  }
}

