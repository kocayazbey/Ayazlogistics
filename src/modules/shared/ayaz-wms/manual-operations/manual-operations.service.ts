import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { inventory } from '../../../../database/schema/shared/wms.schema';
import { stockMovements, batchLots } from '../../../../database/schema/shared/erp-inventory.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class ManualOperationsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createManualPte(data: {
    warehouseId: string;
    productId: string;
    quantity: number;
    locationId: string;
    lotNumber?: string;
    expiryDate?: Date;
    reason: string;
  }, tenantId: string, userId: string) {
    const pteId = `PTE-MAN-${Date.now()}`;

    const [inv] = await this.db
      .insert(inventory)
      .values({
        warehouseId: data.warehouseId,
        productId: data.productId,
        locationId: data.locationId,
        quantityOnHand: data.quantity,
        quantityAvailable: data.quantity,
        quantityAllocated: 0,
        lotNumber: data.lotNumber,
        expiryDate: data.expiryDate,
        metadata: { pteType: 'manual', createdManually: true },
      })
      .returning();

    await this.db.insert(stockMovements).values({
      tenantId,
      movementType: 'in',
      movementReason: `manual_pte: ${data.reason}`,
      quantity: data.quantity.toString(),
      toLocation: data.locationId,
      reference: pteId,
      movementDate: new Date(),
      createdBy: userId,
    });

    await this.eventBus.emit('manual.pte.created', { pteId, productId: data.productId, quantity: data.quantity, tenantId });

    return { pteId, inventory: inv, createdAt: new Date() };
  }

  async changeLot(data: {
    inventoryId: string;
    oldLotNumber: string;
    newLotNumber: string;
    newExpiryDate?: Date;
    reason: string;
  }, tenantId: string, userId: string) {
    await this.db
      .update(inventory)
      .set({
        lotNumber: data.newLotNumber,
        expiryDate: data.newExpiryDate,
        metadata: {
          lotChangeHistory: {
            oldLot: data.oldLotNumber,
            newLot: data.newLotNumber,
            reason: data.reason,
            changedBy: userId,
            changedAt: new Date(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, data.inventoryId));

    await this.eventBus.emit('lot.changed', { inventoryId: data.inventoryId, oldLot: data.oldLotNumber, newLot: data.newLotNumber, tenantId });

    return { inventoryId: data.inventoryId, oldLot: data.oldLotNumber, newLot: data.newLotNumber, changedAt: new Date() };
  }

  async correctStockEntry(data: {
    originalMovementId: string;
    correctedQuantity: number;
    correctionReason: string;
  }, tenantId: string, userId: string) {
    const correctionId = `CORR-${Date.now()}`;

    await this.db.insert(stockMovements).values({
      tenantId,
      movementType: 'adjustment',
      movementReason: `correction: ${data.correctionReason}`,
      quantity: data.correctedQuantity.toString(),
      reference: data.originalMovementId,
      movementDate: new Date(),
      createdBy: userId,
      metadata: { correctionId, originalMovementId: data.originalMovementId },
    });

    await this.eventBus.emit('stock.entry.corrected', { correctionId, originalMovementId: data.originalMovementId, tenantId });

    return { correctionId, correctedQuantity: data.correctedQuantity, correctedAt: new Date() };
  }

  async manualMovementIntegration(data: {
    movementType: 'in' | 'out' | 'transfer';
    productId: string;
    quantity: number;
    fromLocation?: string;
    toLocation?: string;
    reference: string;
    notes: string;
  }, tenantId: string, userId: string) {
    const movementId = `MAN-MOV-${Date.now()}`;

    await this.db.insert(stockMovements).values({
      tenantId,
      movementType: data.movementType,
      movementReason: 'manual_integration',
      quantity: data.quantity.toString(),
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      reference: data.reference,
      notes: data.notes,
      movementDate: new Date(),
      createdBy: userId,
    });

    await this.eventBus.emit('manual.movement.integrated', { movementId, movementType: data.movementType, tenantId });

    return { movementId, integrated: true, integratedAt: new Date() };
  }

  async changePalletAttribute(data: {
    palletId: string;
    attributes: {
      weight?: number;
      dimensions?: { length: number; width: number; height: number };
      palletType?: string;
      specialHandling?: boolean;
      hazmat?: boolean;
    };
    reason: string;
  }, tenantId: string, userId: string) {
    await this.db
      .update(inventory)
      .set({
        metadata: { palletAttributes: data.attributes, attributeChangeReason: data.reason, changedBy: userId, changedAt: new Date() },
        updatedAt: new Date(),
      })
      .where(eq(inventory.id, data.palletId));

    await this.eventBus.emit('pallet.attribute.changed', { palletId: data.palletId, tenantId });

    return { palletId: data.palletId, newAttributes: data.attributes, changedAt: new Date() };
  }

  async extendPalletShelfLife(data: {
    palletId: string;
    currentExpiryDate: Date;
    newExpiryDate: Date;
    extensionReason: string;
    approvedBy: string;
  }, tenantId: string, userId: string) {
    await this.db
      .update(inventory)
      .set({
        expiryDate: data.newExpiryDate,
        metadata: {
          shelfLifeExtension: {
            originalExpiry: data.currentExpiryDate,
            newExpiry: data.newExpiryDate,
            reason: data.extensionReason,
            approvedBy: data.approvedBy,
            extendedAt: new Date(),
          },
        },
      })
      .where(eq(inventory.id, data.palletId));

    await this.eventBus.emit('pallet.shelf.life.extended', { palletId: data.palletId, newExpiry: data.newExpiryDate, tenantId });

    return { palletId: data.palletId, originalExpiry: data.currentExpiryDate, newExpiry: data.newExpiryDate, extendedAt: new Date() };
  }
}

