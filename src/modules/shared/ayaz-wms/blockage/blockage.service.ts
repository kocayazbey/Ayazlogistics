import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { inventory, products, locations } from '../../../../database/schema/shared/wms.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class BlockageService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async blockPallet(data: {
    palletId: string;
    blockReason: string;
    blockType: 'quality' | 'damage' | 'expiry' | 'customer_hold' | 'investigation' | 'other';
    blockedBy: string;
    notes?: string;
    autoReleaseDate?: Date;
  }, tenantId: string) {
    const blockId = `BLOCK-${Date.now()}`;

    await this.db
      .update(inventory)
      .set({
        metadata: {
          blocked: true,
          blockDetails: {
            blockId,
            reason: data.blockReason,
            type: data.blockType,
            blockedBy: data.blockedBy,
            blockedAt: new Date(),
            notes: data.notes,
            autoReleaseDate: data.autoReleaseDate,
          },
        },
        quantityAvailable: 0,
      })
      .where(eq(inventory.id, data.palletId));

    await this.eventBus.emit('pallet.blocked', { blockId, palletId: data.palletId, reason: data.blockReason, tenantId });

    return { blockId, palletId: data.palletId, blockedAt: new Date(), blockType: data.blockType };
  }

  async unblockPallet(data: {
    palletId: string;
    unblockedBy: string;
    unblockReason: string;
  }, tenantId: string) {
    const [inv] = await this.db.select().from(inventory).where(eq(inventory.id, data.palletId)).limit(1);

    await this.db
      .update(inventory)
      .set({
        metadata: {
          ...inv.metadata,
          blocked: false,
          unblockDetails: {
            unblockedBy: data.unblockedBy,
            unblockReason: data.unblockReason,
            unblockedAt: new Date(),
          },
        },
        quantityAvailable: inv.quantityOnHand,
      })
      .where(eq(inventory.id, data.palletId));

    await this.eventBus.emit('pallet.unblocked', { palletId: data.palletId, tenantId });

    return { palletId: data.palletId, unblocked: true, unblockedAt: new Date() };
  }

  async quarantinePallet(data: {
    palletId: string;
    quarantineReason: string;
    quarantineLocationId: string;
    releaseRequired: boolean;
    inspector?: string;
  }, tenantId: string, userId: string) {
    const quarantineId = `QUAR-${Date.now()}`;

    await this.db
      .update(inventory)
      .set({
        locationId: data.quarantineLocationId,
        metadata: {
          quarantined: true,
          quarantineDetails: {
            quarantineId,
            reason: data.quarantineReason,
            releaseRequired: data.releaseRequired,
            inspector: data.inspector,
            quarantinedBy: userId,
            quarantinedAt: new Date(),
          },
        },
        quantityAvailable: 0,
      })
      .where(eq(inventory.id, data.palletId));

    await this.eventBus.emit('pallet.quarantined', { quarantineId, palletId: data.palletId, tenantId });

    return { quarantineId, palletId: data.palletId, quarantineLocation: data.quarantineLocationId, quarantinedAt: new Date() };
  }

  async releaseFromQuarantine(data: {
    palletId: string;
    releaseApproval: {
      approvedBy: string;
      inspectionPassed: boolean;
      newLocationId?: string;
    };
  }, tenantId: string) {
    const [inv] = await this.db.select().from(inventory).where(eq(inventory.id, data.palletId)).limit(1);

    const newLocationId = data.releaseApproval.newLocationId || inv.locationId;

    await this.db
      .update(inventory)
      .set({
        locationId: newLocationId,
        metadata: {
          ...inv.metadata,
          quarantined: false,
          releaseDetails: {
            approvedBy: data.releaseApproval.approvedBy,
            inspectionPassed: data.releaseApproval.inspectionPassed,
            releasedAt: new Date(),
          },
        },
        quantityAvailable: data.releaseApproval.inspectionPassed ? inv.quantityOnHand : 0,
      })
      .where(eq(inventory.id, data.palletId));

    await this.eventBus.emit('pallet.released.from.quarantine', { palletId: data.palletId, approved: data.releaseApproval.inspectionPassed, tenantId });

    return { palletId: data.palletId, released: true, releasedAt: new Date(), inspectionPassed: data.releaseApproval.inspectionPassed };
  }

  async changePalletSerialNumber(data: {
    palletId: string;
    oldSerialNumber: string;
    newSerialNumber: string;
    reason: string;
    authorizedBy: string;
  }, tenantId: string, userId: string) {
    await this.db
      .update(inventory)
      .set({
        serialNumber: data.newSerialNumber,
        metadata: {
          serialChangeHistory: {
            oldSerial: data.oldSerialNumber,
            newSerial: data.newSerialNumber,
            reason: data.reason,
            authorizedBy: data.authorizedBy,
            changedBy: userId,
            changedAt: new Date(),
          },
        },
      })
      .where(eq(inventory.id, data.palletId));

    await this.eventBus.emit('pallet.serial.changed', { palletId: data.palletId, tenantId });

    return { palletId: data.palletId, oldSerial: data.oldSerialNumber, newSerial: data.newSerialNumber, changedAt: new Date() };
  }

  async changePalletType(data: {
    palletId: string;
    oldType: string;
    newType: string;
    reason: string;
  }, tenantId: string, userId: string) {
    await this.db
      .update(inventory)
      .set({
        metadata: {
          palletType: data.newType,
          typeChangeHistory: {
            oldType: data.oldType,
            newType: data.newType,
            reason: data.reason,
            changedBy: userId,
            changedAt: new Date(),
          },
        },
      })
      .where(eq(inventory.id, data.palletId));

    await this.eventBus.emit('pallet.type.changed', { palletId: data.palletId, tenantId });

    return { palletId: data.palletId, oldType: data.oldType, newType: data.newType };
  }

  async changePalletLotAndDate(data: {
    palletId: string;
    newLotNumber: string;
    newExpiryDate: Date;
    reason: string;
    supervisorId: string;
  }, tenantId: string, userId: string) {
    const [inv] = await this.db.select().from(inventory).where(eq(inventory.id, data.palletId)).limit(1);

    await this.db
      .update(inventory)
      .set({
        lotNumber: data.newLotNumber,
        expiryDate: data.newExpiryDate,
        metadata: {
          ...inv.metadata,
          lotDateChange: {
            oldLot: inv.lotNumber,
            oldExpiry: inv.expiryDate,
            newLot: data.newLotNumber,
            newExpiry: data.newExpiryDate,
            reason: data.reason,
            supervisorId: data.supervisorId,
            changedAt: new Date(),
          },
        },
      })
      .where(eq(inventory.id, data.palletId));

    await this.eventBus.emit('pallet.lot.date.changed', { palletId: data.palletId, tenantId });

    return { palletId: data.palletId, newLot: data.newLotNumber, newExpiry: data.newExpiryDate };
  }

  async defineSkuBarcode(data: {
    productId: string;
    barcode: string;
    barcodeType: 'primary' | 'alternate' | 'supplier';
  }, tenantId: string, userId: string) {
    const [product] = await this.db.select().from(products).where(eq(products.id, data.productId)).limit(1);

    const barcodes = product.metadata?.barcodes || [];
    barcodes.push({
      barcode: data.barcode,
      type: data.barcodeType,
      addedBy: userId,
      addedAt: new Date(),
    });

    await this.db
      .update(products)
      .set({
        barcode: data.barcodeType === 'primary' ? data.barcode : product.barcode,
        metadata: { ...product.metadata, barcodes },
      })
      .where(eq(products.id, data.productId));

    await this.eventBus.emit('sku.barcode.defined', { productId: data.productId, barcode: data.barcode, tenantId });

    return { productId: data.productId, barcode: data.barcode, barcodeType: data.barcodeType };
  }
}

