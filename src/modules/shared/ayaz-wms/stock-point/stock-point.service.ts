import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class StockPointService {
  private stockPoints: Map<string, any> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async defineStockPoint(data: {
    pointCode: string;
    pointName: string;
    warehouseId: string;
    locationId?: string;
    pointType: 'staging' | 'quality_check' | 'returns' | 'damage_hold' | 'temporary';
    capacity?: number;
  }, tenantId: string, userId: string) {
    const pointId = `SP-${Date.now()}`;

    this.stockPoints.set(pointId, {
      id: pointId,
      ...data,
      tenantId,
      currentStock: 0,
      createdBy: userId,
      createdAt: new Date(),
    });

    await this.eventBus.emit('stock.point.created', { pointId, pointCode: data.pointCode, tenantId });

    return this.stockPoints.get(pointId);
  }

  async stockPointEntry(data: {
    stockPointId: string;
    productId: string;
    quantity: number;
    fromLocation?: string;
    reason: string;
  }, tenantId: string, userId: string) {
    const entryId = `SP-IN-${Date.now()}`;
    const point = this.stockPoints.get(data.stockPointId);

    if (!point) {
      throw new NotFoundException('Stock point not found');
    }

    point.currentStock += data.quantity;
    this.stockPoints.set(data.stockPointId, point);

    await this.eventBus.emit('stock.point.entry', { entryId, stockPointId: data.stockPointId, quantity: data.quantity, tenantId });

    return { entryId, stockPointId: data.stockPointId, newStock: point.currentStock, entryTime: new Date() };
  }

  async stockPointExit(data: {
    stockPointId: string;
    productId: string;
    quantity: number;
    toLocation?: string;
    reason: string;
  }, tenantId: string, userId: string) {
    const exitId = `SP-OUT-${Date.now()}`;
    const point = this.stockPoints.get(data.stockPointId);

    if (!point) {
      throw new NotFoundException('Stock point not found');
    }

    point.currentStock = Math.max(0, point.currentStock - data.quantity);
    this.stockPoints.set(data.stockPointId, point);

    await this.eventBus.emit('stock.point.exit', { exitId, stockPointId: data.stockPointId, quantity: data.quantity, tenantId });

    return { exitId, stockPointId: data.stockPointId, newStock: point.currentStock, exitTime: new Date() };
  }

  async stockPointCountEntry(data: {
    stockPointId: string;
    countedQuantity: number;
    productId: string;
  }, tenantId: string, userId: string) {
    const point = this.stockPoints.get(data.stockPointId);

    if (!point) {
      throw new NotFoundException('Stock point not found');
    }

    const variance = data.countedQuantity - point.currentStock;

    point.currentStock = data.countedQuantity;
    this.stockPoints.set(data.stockPointId, point);

    await this.eventBus.emit('stock.point.counted', { stockPointId: data.stockPointId, variance, tenantId });

    return { stockPointId: data.stockPointId, previousStock: point.currentStock - variance, countedStock: data.countedQuantity, variance, countedAt: new Date() };
  }

  async getStockPointStatus(stockPointId: string) {
    const point = this.stockPoints.get(stockPointId);

    if (!point) {
      throw new NotFoundException('Stock point not found');
    }

    return point;
  }

  async getAllStockPoints(warehouseId: string) {
    return Array.from(this.stockPoints.values()).filter(p => p.warehouseId === warehouseId);
  }
}

