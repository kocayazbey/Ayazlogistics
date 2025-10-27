import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, asc } from 'drizzle-orm';
import { EventBusService } from '../../../../../core/events/event-bus.service';

interface InventoryLot {
  id: string;
  productId: string;
  lotNumber: string;
  quantity: number;
  receivedDate: Date;
  expiryDate?: Date;
  location: string;
  cost: number;
}

interface AllocationResult {
  productId: string;
  requestedQuantity: number;
  allocatedQuantity: number;
  allocations: LotAllocation[];
  shortfall: number;
}

interface LotAllocation {
  lotNumber: string;
  quantity: number;
  location: string;
  receivedDate: Date;
  expiryDate?: Date;
  cost: number;
}

@Injectable()
export class FifoFefoService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async allocateFIFO(
    productId: string,
    requestedQuantity: number,
    tenantId: string,
  ): Promise<AllocationResult> {
    const availableLots = await this.getAvailableLots(productId, tenantId);

    const sortedLots = availableLots.sort(
      (a, b) => a.receivedDate.getTime() - b.receivedDate.getTime(),
    );

    return this.allocateFromLots(productId, requestedQuantity, sortedLots, 'FIFO');
  }

  async allocateFEFO(
    productId: string,
    requestedQuantity: number,
    tenantId: string,
  ): Promise<AllocationResult> {
    const availableLots = await this.getAvailableLots(productId, tenantId);

    const lotsWithExpiry = availableLots.filter((lot) => lot.expiryDate);

    const sortedLots = lotsWithExpiry.sort(
      (a, b) => a.expiryDate!.getTime() - b.expiryDate!.getTime(),
    );

    return this.allocateFromLots(productId, requestedQuantity, sortedLots, 'FEFO');
  }

  async allocateLIFO(
    productId: string,
    requestedQuantity: number,
    tenantId: string,
  ): Promise<AllocationResult> {
    const availableLots = await this.getAvailableLots(productId, tenantId);

    const sortedLots = availableLots.sort(
      (a, b) => b.receivedDate.getTime() - a.receivedDate.getTime(),
    );

    return this.allocateFromLots(productId, requestedQuantity, sortedLots, 'LIFO');
  }

  private allocateFromLots(
    productId: string,
    requestedQuantity: number,
    sortedLots: InventoryLot[],
    method: string,
  ): AllocationResult {
    const allocations: LotAllocation[] = [];
    let remainingQuantity = requestedQuantity;

    for (const lot of sortedLots) {
      if (remainingQuantity <= 0) break;

      const allocatedFromLot = Math.min(lot.quantity, remainingQuantity);

      allocations.push({
        lotNumber: lot.lotNumber,
        quantity: allocatedFromLot,
        location: lot.location,
        receivedDate: lot.receivedDate,
        expiryDate: lot.expiryDate,
        cost: lot.cost,
      });

      remainingQuantity -= allocatedFromLot;
    }

    const allocatedQuantity = requestedQuantity - remainingQuantity;

    return {
      productId,
      requestedQuantity,
      allocatedQuantity,
      allocations,
      shortfall: remainingQuantity,
    };
  }

  private async getAvailableLots(productId: string, tenantId: string): Promise<InventoryLot[]> {
    return [
      {
        id: '1',
        productId,
        lotNumber: 'LOT-001',
        quantity: 100,
        receivedDate: new Date('2025-01-01'),
        expiryDate: new Date('2025-12-31'),
        location: 'A-01-01',
        cost: 50,
      },
      {
        id: '2',
        productId,
        lotNumber: 'LOT-002',
        quantity: 150,
        receivedDate: new Date('2025-02-01'),
        expiryDate: new Date('2025-11-30'),
        location: 'A-01-02',
        cost: 52,
      },
      {
        id: '3',
        productId,
        lotNumber: 'LOT-003',
        quantity: 200,
        receivedDate: new Date('2025-03-01'),
        expiryDate: new Date('2025-10-31'),
        location: 'A-02-01',
        cost: 51,
      },
    ];
  }

  async getExpiringProducts(
    tenantId: string,
    daysAhead: number = 30,
  ): Promise<any[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const mockExpiring = [
      {
        productId: '1',
        productSku: 'PROD-001',
        lotNumber: 'LOT-003',
        quantity: 200,
        expiryDate: new Date(futureDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        daysToExpiry: 25,
        location: 'A-02-01',
        value: 10200,
      },
    ];

    return mockExpiring;
  }

  async calculateAverageCost(productId: string, method: 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE'): Promise<number> {
    const lots = await this.getAvailableLots(productId, '');

    if (method === 'WEIGHTED_AVERAGE') {
      const totalValue = lots.reduce((sum, lot) => sum + lot.quantity * lot.cost, 0);
      const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
      return totalQuantity > 0 ? totalValue / totalQuantity : 0;
    }

    const allocation = method === 'FIFO'
      ? this.allocateFromLots(productId, 1, lots.sort((a, b) => a.receivedDate.getTime() - b.receivedDate.getTime()), 'FIFO')
      : this.allocateFromLots(productId, 1, lots.sort((a, b) => b.receivedDate.getTime() - a.receivedDate.getTime()), 'LIFO');

    return allocation.allocations[0]?.cost || 0;
  }
}

