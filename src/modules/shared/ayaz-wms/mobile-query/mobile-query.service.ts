import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, like } from 'drizzle-orm';
import { inventory, products, locations } from '../../../../database/schema/shared/wms.schema';
import { batchLots } from '../../../../database/schema/shared/erp-inventory.schema';

@Injectable()
export class MobileQueryService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async queryPallet(palletId: string, warehouseId: string) {
    const palletInventory = await this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.id, palletId));

    return {
      palletId,
      items: palletInventory,
      totalItems: palletInventory.length,
      totalQuantity: palletInventory.reduce((sum, item) => sum + (item.inventory.quantityOnHand || 0), 0),
      location: palletInventory[0]?.location,
    };
  }

  async queryLocation(locationCode: string, warehouseId: string) {
    const [location] = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.code, locationCode),
          eq(locations.warehouseId, warehouseId)
        )
      )
      .limit(1);

    if (!location) {
      return { found: false, locationCode };
    }

    const inventoryAtLocation = await this.db
      .select({
        inventory,
        product: products,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.locationId, location.id));

    return {
      location,
      inventory: inventoryAtLocation,
      totalItems: inventoryAtLocation.length,
      totalQuantity: inventoryAtLocation.reduce((sum, item) => sum + (item.inventory.quantityOnHand || 0), 0),
      isOccupied: location.isOccupied,
      capacity: location.capacity,
      utilization: location.capacity ? (inventoryAtLocation.reduce((sum, item) => sum + (item.inventory.quantityOnHand || 0), 0) / parseFloat(location.capacity)) * 100 : 0,
    };
  }

  async queryStock(productId: string, warehouseId?: string) {
    let query = this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.productId, productId));

    if (warehouseId) {
      query = query.where(eq(inventory.warehouseId, warehouseId));
    }

    const results = await query;

    return {
      productId,
      locations: results,
      totalQuantity: results.reduce((sum, r) => sum + (r.inventory.quantityOnHand || 0), 0),
      availableQuantity: results.reduce((sum, r) => sum + (r.inventory.quantityAvailable || 0), 0),
      allocatedQuantity: results.reduce((sum, r) => sum + (r.inventory.quantityAllocated || 0), 0),
      locationCount: results.length,
    };
  }

  async queryLot(lotNumber: string, warehouseId?: string) {
    let query = this.db
      .select({
        batch: batchLots,
        inventory,
        product: products,
        location: locations,
      })
      .from(batchLots)
      .leftJoin(inventory, eq(batchLots.id, inventory.lotNumber))
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(batchLots.lotNumber, lotNumber));

    const results = await query;

    return {
      lotNumber,
      batches: results,
      totalQuantity: results.reduce((sum, r) => sum + (r.inventory?.quantityOnHand || 0), 0),
      expiryDate: results[0]?.batch?.expiryDate,
      status: results[0]?.batch?.status,
    };
  }

  async querySerialNumber(serialNumber: string, warehouseId?: string) {
    let query = this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.serialNumber, serialNumber));

    if (warehouseId) {
      query = query.where(eq(inventory.warehouseId, warehouseId));
    }

    const [result] = await query;

    if (!result) {
      return { found: false, serialNumber };
    }

    return {
      serialNumber,
      product: result.product,
      location: result.location,
      inventory: result.inventory,
      found: true,
    };
  }

  async querySkuPackingStatus(sku: string, warehouseId: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.sku, sku))
      .limit(1);

    if (!product) {
      return { found: false, sku };
    }

    return {
      sku,
      product,
      packingStatus: {
        inPacking: 0,
        packed: 0,
        shipped: 0,
      },
      totalOrders: 0,
    };
  }

  async queryReceivingOrder(receivingNumber: string) {
    return {
      receivingNumber,
      status: 'pending',
      items: [],
    };
  }

  async queryBox(boxId: string) {
    return {
      boxId,
      contents: [],
      weight: 0,
      status: 'in_warehouse',
    };
  }
}

