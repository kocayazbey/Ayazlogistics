import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { inventory, locations } from '../../../../database/schema/shared/wms.schema';
import { stockMovements } from '../../../../database/schema/shared/erp-inventory.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class PalletTransferService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async mergePallets(data: {
    sourcePalletIds: string[];
    targetPalletId: string;
    warehouseId: string;
  }, tenantId: string, userId: string) {
    const mergeId = `MERGE-${Date.now()}`;
    const mergedItems = [];

    for (const sourcePalletId of data.sourcePalletIds) {
      const sourceInventory = await this.db
        .select()
        .from(inventory)
        .where(eq(inventory.id, sourcePalletId));

      for (const item of sourceInventory) {
        const targetInv = await this.db
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.productId, item.productId),
              eq(inventory.id, data.targetPalletId)
            )
          )
          .limit(1);

        if (targetInv.length > 0) {
          await this.db
            .update(inventory)
            .set({
              quantityOnHand: (targetInv[0].quantityOnHand || 0) + (item.quantityOnHand || 0),
              updatedAt: new Date(),
            })
            .where(eq(inventory.id, targetInv[0].id));
        }

        mergedItems.push(item);
      }

      await this.db.delete(inventory).where(eq(inventory.id, sourcePalletId));
    }

    await this.db.insert(stockMovements).values({
      tenantId,
      movementType: 'transfer',
      movementReason: 'pallet_merge',
      quantity: mergedItems.reduce((sum, i) => sum + (i.quantityOnHand || 0), 0).toString(),
      reference: mergeId,
      movementDate: new Date(),
      createdBy: userId,
    });

    await this.eventBus.emit('pallets.merged', { mergeId, sourcePalletIds: data.sourcePalletIds, targetPalletId: data.targetPalletId, tenantId });

    return { mergeId, mergedItems: mergedItems.length, targetPalletId: data.targetPalletId };
  }

  async splitPallet(data: {
    sourcePalletId: string;
    splits: Array<{
      productId: string;
      quantity: number;
      targetLocationId: string;
    }>;
    warehouseId: string;
  }, tenantId: string, userId: string) {
    const splitId = `SPLIT-${Date.now()}`;
    const newPallets = [];

    for (const split of data.splits) {
      const sourceInv = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.id, data.sourcePalletId),
            eq(inventory.productId, split.productId)
          )
        )
        .limit(1);

      if (sourceInv.length === 0) continue;

      await this.db
        .update(inventory)
        .set({
          quantityOnHand: (sourceInv[0].quantityOnHand || 0) - split.quantity,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, sourceInv[0].id));

      const [newInv] = await this.db
        .insert(inventory)
        .values({
          warehouseId: data.warehouseId,
          locationId: split.targetLocationId,
          productId: split.productId,
          quantityOnHand: split.quantity,
          quantityAvailable: split.quantity,
          quantityAllocated: 0,
        })
        .returning();

      newPallets.push(newInv);
    }

    await this.eventBus.emit('pallet.split', { splitId, sourcePalletId: data.sourcePalletId, newPallets: newPallets.length, tenantId });

    return { splitId, newPallets };
  }

  async arrangeM ixedPallet(data: {
    palletId: string;
    items: Array<{
      productId: string;
      quantity: number;
      position: number;
    }>;
  }, tenantId: string, userId: string) {
    const arrangeId = `ARRANGE-${Date.now()}`;

    await this.eventBus.emit('mixed.pallet.arranged', { arrangeId, palletId: data.palletId, itemCount: data.items.length, tenantId });

    return { arrangeId, palletId: data.palletId, itemsArranged: data.items.length };
  }

  async changePalletLocation(data: {
    palletId: string;
    fromLocationId: string;
    toLocationId: string;
    reason: string;
    warehouseId: string;
  }, tenantId: string, userId: string) {
    const [fromLoc] = await this.db.select().from(locations).where(eq(locations.id, data.fromLocationId)).limit(1);
    const [toLoc] = await this.db.select().from(locations).where(eq(locations.id, data.toLocationId)).limit(1);

    if (!fromLoc || !toLoc) {
      throw new NotFoundException('Location not found');
    }

    await this.db
      .update(inventory)
      .set({
        locationId: data.toLocationId,
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, data.palletId));

    await this.db
      .update(locations)
      .set({ isOccupied: false })
      .where(eq(locations.id, data.fromLocationId));

    await this.db
      .update(locations)
      .set({ isOccupied: true })
      .where(eq(locations.id, data.toLocationId));

    await this.db.insert(stockMovements).values({
      tenantId,
      movementType: 'transfer',
      movementReason: data.reason,
      fromLocation: data.fromLocationId,
      toLocation: data.toLocationId,
      reference: data.palletId,
      movementDate: new Date(),
      createdBy: userId,
    });

    await this.eventBus.emit('pallet.location.changed', { palletId: data.palletId, fromLocation: fromLoc.code, toLocation: toLoc.code, tenantId });

    return { palletId: data.palletId, fromLocation: fromLoc.code, toLocation: toLoc.code, movedAt: new Date() };
  }

  async codeToCodeTransfer(data: {
    fromLocationCode: string;
    toLocationCode: string;
    productId?: string;
    quantity?: number;
    transferAll: boolean;
    warehouseId: string;
  }, tenantId: string, userId: string) {
    const transferId = `TRANS-${Date.now()}`;

    const [fromLoc] = await this.db.select().from(locations).where(eq(locations.code, data.fromLocationCode)).limit(1);
    const [toLoc] = await this.db.select().from(locations).where(eq(locations.code, data.toLocationCode)).limit(1);

    if (!fromLoc || !toLoc) {
      throw new NotFoundException('Location not found');
    }

    let inventoryToTransfer = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.locationId, fromLoc.id));

    if (data.productId) {
      inventoryToTransfer = inventoryToTransfer.filter(i => i.productId === data.productId);
    }

    for (const inv of inventoryToTransfer) {
      const qtyToTransfer = data.transferAll ? (inv.quantityOnHand || 0) : (data.quantity || 0);

      await this.db
        .update(inventory)
        .set({
          quantityOnHand: (inv.quantityOnHand || 0) - qtyToTransfer,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inv.id));

      const existing = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.locationId, toLoc.id),
            eq(inventory.productId, inv.productId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await this.db
          .update(inventory)
          .set({
            quantityOnHand: (existing[0].quantityOnHand || 0) + qtyToTransfer,
            updatedAt: new Date(),
          })
          .where(eq(inventory.id, existing[0].id));
      } else {
        await this.db.insert(inventory).values({
          warehouseId: data.warehouseId,
          locationId: toLoc.id,
          productId: inv.productId,
          quantityOnHand: qtyToTransfer,
          quantityAvailable: qtyToTransfer,
          quantityAllocated: 0,
        });
      }
    }

    await this.eventBus.emit('code.to.code.transfer', { transferId, fromCode: data.fromLocationCode, toCode: data.toLocationCode, tenantId });

    return { transferId, fromLocation: fromLoc.code, toLocation: toLoc.code, itemsTransferred: inventoryToTransfer.length };
  }

  async warehouseToWarehouseTransfer(data: {
    fromWarehouseId: string;
    toWarehouseId: string;
    productId: string;
    quantity: number;
    fromLocationId: string;
    toLocationId: string;
    transferOrderNumber: string;
  }, tenantId: string, userId: string) {
    const transferId = `WH-TRANS-${Date.now()}`;

    await this.db
      .update(inventory)
      .set({
        quantityOnHand: (await this.db.select().from(inventory).where(eq(inventory.id, data.fromLocationId)).limit(1))[0].quantityOnHand - data.quantity,
      })
      .where(
        and(
          eq(inventory.warehouseId, data.fromWarehouseId),
          eq(inventory.productId, data.productId),
          eq(inventory.locationId, data.fromLocationId)
        )
      );

    await this.db.insert(inventory).values({
      warehouseId: data.toWarehouseId,
      locationId: data.toLocationId,
      productId: data.productId,
      quantityOnHand: data.quantity,
      quantityAvailable: data.quantity,
      quantityAllocated: 0,
    });

    await this.db.insert(stockMovements).values({
      tenantId,
      movementType: 'transfer',
      movementReason: 'warehouse_to_warehouse',
      quantity: data.quantity.toString(),
      fromLocation: data.fromLocationId,
      toLocation: data.toLocationId,
      reference: transferId,
      movementDate: new Date(),
      createdBy: userId,
    });

    await this.eventBus.emit('warehouse.transfer', { transferId, fromWarehouse: data.fromWarehouseId, toWarehouse: data.toWarehouseId, tenantId });

    return { transferId, quantity: data.quantity, completedAt: new Date() };
  }

  async completeLocationTransfer(data: {
    fromLocationId: string;
    toLocationId: string;
    warehouseId: string;
  }, tenantId: string, userId: string) {
    const allInventory = await this.db
      .select()
      .from(inventory)
      .where(eq(inventory.locationId, data.fromLocationId));

    for (const inv of allInventory) {
      await this.db
        .update(inventory)
        .set({
          locationId: data.toLocationId,
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inv.id));
    }

    await this.db.update(locations).set({ isOccupied: false }).where(eq(locations.id, data.fromLocationId));
    await this.db.update(locations).set({ isOccupied: true }).where(eq(locations.id, data.toLocationId));

    await this.eventBus.emit('location.transfer.complete', { fromLocationId: data.fromLocationId, toLocationId: data.toLocationId, itemsMoved: allInventory.length, tenantId });

    return { itemsMoved: allInventory.length, fromLocationId: data.fromLocationId, toLocationId: data.toLocationId };
  }

  async changeMixedPalletNumber(data: {
    oldPalletId: string;
    newPalletNumber: string;
    warehouseId: string;
  }, tenantId: string, userId: string) {
    await this.eventBus.emit('mixed.pallet.number.changed', { oldPalletId: data.oldPalletId, newPalletNumber: data.newPalletNumber, tenantId });
    return { oldPalletId: data.oldPalletId, newPalletNumber: data.newPalletNumber, changedAt: new Date() };
  }
}

