import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, lte } from 'drizzle-orm';
import { batchLots } from '../../../../../database/schema/shared/erp-inventory.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

@Injectable()
export class BatchLotService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createBatchLot(data: {
    stockCardId: string;
    lotNumber: string;
    batchNumber?: string;
    quantity: number;
    manufactureDate?: Date;
    expiryDate?: Date;
    receivedDate?: Date;
  }, tenantId: string) {
    const [batchLot] = await this.db
      .insert(batchLots)
      .values({
        tenantId,
        stockCardId: data.stockCardId,
        lotNumber: data.lotNumber,
        batchNumber: data.batchNumber,
        quantity: data.quantity,
        manufactureDate: data.manufactureDate,
        expiryDate: data.expiryDate,
        receivedDate: data.receivedDate,
        status: 'available',
      })
      .returning();

    await this.eventBus.emit('batch.lot.created', { batchLotId: batchLot.id, tenantId });

    return batchLot;
  }

  async getBatchLots(stockCardId: string, tenantId: string, filters?: {
    status?: string;
    expiringBefore?: Date;
  }) {
    let query = this.db
      .select()
      .from(batchLots)
      .where(and(eq(batchLots.tenantId, tenantId), eq(batchLots.stockCardId, stockCardId)));

    if (filters?.status) {
      query = query.where(
        and(
          eq(batchLots.tenantId, tenantId),
          eq(batchLots.stockCardId, stockCardId),
          eq(batchLots.status, filters.status),
        ),
      );
    }

    if (filters?.expiringBefore) {
      query = query.where(
        and(
          eq(batchLots.tenantId, tenantId),
          eq(batchLots.stockCardId, stockCardId),
          lte(batchLots.expiryDate, filters.expiringBefore),
        ),
      );
    }

    return await query;
  }

  async updateBatchLotStatus(batchLotId: string, status: string, tenantId: string) {
    const [updated] = await this.db
      .update(batchLots)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(batchLots.id, batchLotId), eq(batchLots.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Batch lot not found');
    }

    await this.eventBus.emit('batch.lot.status.updated', { batchLotId, status, tenantId });

    return updated;
  }

  async getExpiringBatchLots(tenantId: string, daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiring = await this.db
      .select()
      .from(batchLots)
      .where(
        and(
          eq(batchLots.tenantId, tenantId),
          lte(batchLots.expiryDate, futureDate),
          eq(batchLots.status, 'available'),
        ),
      );

    return expiring;
  }

  async checkAndUpdateExpiredLots(tenantId: string) {
    const now = new Date();

    const expiredLots = await this.db
      .select()
      .from(batchLots)
      .where(
        and(
          eq(batchLots.tenantId, tenantId),
          lte(batchLots.expiryDate, now),
          eq(batchLots.status, 'available'),
        ),
      );

    for (const lot of expiredLots) {
      await this.db
        .update(batchLots)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(batchLots.id, lot.id));

      await this.eventBus.emit('batch.lot.expired', { batchLotId: lot.id, lotNumber: lot.lotNumber, tenantId });
    }

    return expiredLots;
  }

  async consumeBatchLot(batchLotId: string, quantity: number, tenantId: string) {
    const [batchLot] = await this.db
      .select()
      .from(batchLots)
      .where(and(eq(batchLots.id, batchLotId), eq(batchLots.tenantId, tenantId)))
      .limit(1);

    if (!batchLot) {
      throw new NotFoundException('Batch lot not found');
    }

    if (batchLot.quantity < quantity) {
      throw new BadRequestException('Insufficient quantity in batch lot');
    }

    const newQuantity = batchLot.quantity - quantity;
    const newStatus = newQuantity === 0 ? 'consumed' : batchLot.status;

    const [updated] = await this.db
      .update(batchLots)
      .set({
        quantity: newQuantity,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(batchLots.id, batchLotId))
      .returning();

    await this.eventBus.emit('batch.lot.consumed', { batchLotId, quantity, remainingQuantity: newQuantity, tenantId });

    return updated;
  }
}
