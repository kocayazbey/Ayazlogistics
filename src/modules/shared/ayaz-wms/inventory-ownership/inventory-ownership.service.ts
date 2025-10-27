import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface OwnershipTransfer {
  id: string;
  itemIds: string[];
  fromOwnerId: string;
  toOwnerId: string;
  transferType: 'sale' | 'return' | 'consignment' | 'allocation';
  transferDate: Date;
  documentReference?: string;
  status: 'pending' | 'completed' | 'cancelled';
}

@Injectable()
export class InventoryOwnershipService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async initiateOwnershipTransfer(
    itemIds: string[],
    fromOwnerId: string,
    toOwnerId: string,
    transferType: OwnershipTransfer['transferType'],
    tenantId: string,
  ): Promise<OwnershipTransfer> {
    const transferId = `OT-${Date.now()}`;

    const transfer: OwnershipTransfer = {
      id: transferId,
      itemIds,
      fromOwnerId,
      toOwnerId,
      transferType,
      transferDate: new Date(),
      status: 'pending',
    };

    await this.eventBus.emit('ownership.transfer.initiated', {
      transferId,
      fromOwnerId,
      toOwnerId,
      itemCount: itemIds.length,
      tenantId,
    });

    return transfer;
  }

  async completeOwnershipTransfer(
    transferId: string,
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('ownership.transfer.completed', {
      transferId,
      completedAt: new Date(),
      tenantId,
    });
  }
}

