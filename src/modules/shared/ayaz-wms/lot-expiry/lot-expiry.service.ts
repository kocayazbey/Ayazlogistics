import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, lte } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface LotInfo {
  id: string;
  lotNumber: string;
  batchNumber?: string;
  productId: string;
  customerId: string;
  warehouseId: string;
  quantity: number;
  manufacturingDate: Date;
  expiryDate: Date;
  receivedDate: Date;
  status: 'active' | 'expiring_soon' | 'expired' | 'quarantined' | 'disposed';
  locations: Array<{
    locationId: string;
    quantity: number;
  }>;
}

@Injectable()
export class LotExpiryService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async registerLot(
    data: {
      lotNumber: string;
      batchNumber?: string;
      productId: string;
      customerId: string;
      warehouseId: string;
      quantity: number;
      manufacturingDate: Date;
      expiryDate: Date;
      receivedDate: Date;
    },
    tenantId: string,
    userId: string,
  ): Promise<LotInfo> {
    const lotId = `LOT-${Date.now()}`;

    const lot: LotInfo = {
      id: lotId,
      ...data,
      status: 'active',
      locations: [],
    };

    await this.eventBus.emit('lot.registered', {
      lotId,
      lotNumber: data.lotNumber,
      productId: data.productId,
      expiryDate: data.expiryDate,
      tenantId,
    });

    // Check if expiring soon
    await this.checkExpiryStatus(lot, tenantId);

    return lot;
  }

  async checkExpiryStatus(lot: LotInfo, tenantId: string): Promise<void> {
    const now = new Date();
    const daysUntilExpiry = Math.floor(
      (lot.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      // Expired
      await this.updateLotStatus(lot.id, 'expired', tenantId, 'system');
      await this.eventBus.emit('lot.expired', {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        productId: lot.productId,
        customerId: lot.customerId,
        tenantId,
      });
    } else if (daysUntilExpiry <= 30) {
      // Expiring soon
      await this.updateLotStatus(lot.id, 'expiring_soon', tenantId, 'system');
      await this.eventBus.emit('lot.expiring_soon', {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        productId: lot.productId,
        daysUntilExpiry,
        tenantId,
      });
    }
  }

  async updateLotStatus(
    lotId: string,
    status: LotInfo['status'],
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.eventBus.emit('lot.status.updated', {
      lotId,
      status,
      updatedBy: userId,
      tenantId,
    });
  }

  async pickByFEFO(
    productId: string,
    customerId: string,
    warehouseId: string,
    quantityNeeded: number,
    tenantId: string,
  ): Promise<Array<{ lotNumber: string; quantity: number; expiryDate: Date }>> {
    const lots = await this.getProductLots(productId, customerId, warehouseId, tenantId);

    // Sort by expiry date (FEFO - First Expire First Out)
    const sortedLots = lots
      .filter(lot => lot.status === 'active' && lot.quantity > 0)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());

    const picks: Array<{ lotNumber: string; quantity: number; expiryDate: Date }> = [];
    let remaining = quantityNeeded;

    for (const lot of sortedLots) {
      if (remaining <= 0) break;

      const pickQty = Math.min(lot.quantity, remaining);
      picks.push({
        lotNumber: lot.lotNumber,
        quantity: pickQty,
        expiryDate: lot.expiryDate,
      });

      remaining -= pickQty;
    }

    return picks;
  }

  async getProductLots(
    productId: string,
    customerId: string,
    warehouseId: string,
    tenantId: string,
  ): Promise<LotInfo[]> {
    // Mock: Would query lots table
    return [];
  }

  async getExpiringSoonLots(
    warehouseId: string,
    daysThreshold: number,
    tenantId: string,
  ): Promise<LotInfo[]> {
    // Mock: Would query lots expiring within threshold
    return [];
  }

  async getExpiredLots(
    warehouseId: string,
    tenantId: string,
  ): Promise<LotInfo[]> {
    // Mock: Would query expired lots
    return [];
  }

  async quarantineLot(
    lotId: string,
    reason: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.updateLotStatus(lotId, 'quarantined', tenantId, userId);

    await this.eventBus.emit('lot.quarantined', {
      lotId,
      reason,
      quarantinedBy: userId,
      timestamp: new Date(),
      tenantId,
    });
  }

  async disposeLot(
    lotId: string,
    disposalMethod: string,
    disposalDate: Date,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.updateLotStatus(lotId, 'disposed', tenantId, userId);

    await this.eventBus.emit('lot.disposed', {
      lotId,
      disposalMethod,
      disposalDate,
      disposedBy: userId,
      tenantId,
    });
  }

  async getLotExpiryReport(
    warehouseId: string,
    customerId?: string,
    tenantId?: string,
  ): Promise<any> {
    return {
      warehouseId,
      customerId,
      summary: {
        totalLots: 0,
        activeLots: 0,
        expiringSoon: 0,
        expired: 0,
        quarantined: 0,
      },
      byExpiryPeriod: {
        '0_7_days': 0,
        '8_14_days': 0,
        '15_30_days': 0,
        '31_60_days': 0,
        '60_plus_days': 0,
      },
      lotDetails: [],
    };
  }

  async runExpiryCheck(warehouseId: string, tenantId: string): Promise<void> {
    const lots = await this.getAllActiveLots(warehouseId, tenantId);

    for (const lot of lots) {
      await this.checkExpiryStatus(lot, tenantId);
    }
  }

  private async getAllActiveLots(warehouseId: string, tenantId: string): Promise<LotInfo[]> {
    // Mock: Would query all active lots
    return [];
  }
}

