import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, or, like, sql } from 'drizzle-orm';
import { inventory, products, locations, warehouses } from '../../../../database/schema/shared/wms.schema';
import { CacheService } from '../../common/services/cache.service';

interface InventoryFilter {
  warehouseId?: string;
  productId?: string;
  locationId?: string;
  zone?: string;
  minQuantity?: number;
  maxQuantity?: number;
  hasLotNumber?: boolean;
  expiringWithinDays?: number;
}

@Injectable()
export class InventoryQueryService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async getInventory(tenantId: string, filters: InventoryFilter) {
    const cacheKey = `inventory:${tenantId}:${JSON.stringify(filters)}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let query = this.db
      .select({
        inventory,
        product: products,
        location: locations,
        warehouse: warehouses,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(eq(warehouses.tenantId, tenantId));

    if (filters.warehouseId) {
      query = query.where(eq(inventory.warehouseId, filters.warehouseId));
    }

    if (filters.productId) {
      query = query.where(eq(inventory.productId, filters.productId));
    }

    if (filters.locationId) {
      query = query.where(eq(inventory.locationId, filters.locationId));
    }

    if (filters.zone) {
      query = query.where(eq(locations.zone, filters.zone));
    }

    const results = await query;

    // Post-process filters
    let filtered = results;

    if (filters.minQuantity !== undefined) {
      filtered = filtered.filter((r: any) => 
        (r.inventory.quantityOnHand || 0) >= filters.minQuantity!
      );
    }

    if (filters.maxQuantity !== undefined) {
      filtered = filtered.filter((r: any) => 
        (r.inventory.quantityOnHand || 0) <= filters.maxQuantity!
      );
    }

    if (filters.hasLotNumber !== undefined) {
      filtered = filtered.filter((r: any) => 
        filters.hasLotNumber ? !!r.inventory.lotNumber : !r.inventory.lotNumber
      );
    }

    if (filters.expiringWithinDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + filters.expiringWithinDays);
      
      filtered = filtered.filter((r: any) => 
        r.inventory.expiryDate && new Date(r.inventory.expiryDate) <= futureDate
      );
    }

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(filtered), 300);

    return filtered;
  }

  async getInventoryByProduct(productId: string, warehouseId?: string) {
    let query = this.db
      .select()
      .from(inventory)
      .where(eq(inventory.productId, productId));

    if (warehouseId) {
      query = query.where(eq(inventory.warehouseId, warehouseId));
    }

    return await query;
  }

  async getInventoryByLocation(locationId: string) {
    return await this.db
      .select({
        inventory,
        product: products,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.locationId, locationId));
  }

  async getTotalInventoryValue(warehouseId: string, tenantId: string) {
    const inventoryRecords = await this.db
      .select({
        inventory,
        product: products,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(
        and(
          eq(inventory.warehouseId, warehouseId),
          eq(warehouses.tenantId, tenantId)
        )
      );

    let totalValue = 0;
    let totalQuantity = 0;

    for (const record of inventoryRecords) {
      const quantity = record.inventory.quantityOnHand || 0;
      const unitCost = parseFloat(record.product?.metadata?.unitCost || '0');
      
      totalValue += quantity * unitCost;
      totalQuantity += quantity;
    }

    return {
      warehouseId,
      totalQuantity,
      totalValue,
      currency: 'TRY',
      calculatedAt: new Date(),
    };
  }

  async getInventorySummaryByWarehouse(tenantId: string) {
    const allWarehouses = await this.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.tenantId, tenantId));

    const summaries = [];

    for (const warehouse of allWarehouses) {
      const inventoryRecords = await this.db
        .select()
        .from(inventory)
        .where(eq(inventory.warehouseId, warehouse.id));

      const totalQuantity = inventoryRecords.reduce(
        (sum, record) => sum + (record.quantityOnHand || 0),
        0
      );

      const uniqueProducts = new Set(inventoryRecords.map(r => r.productId)).size;

      summaries.push({
        warehouseId: warehouse.id,
        warehouseName: warehouse.name,
        totalQuantity,
        uniqueProducts,
        totalLocations: inventoryRecords.length,
      });
    }

    return summaries;
  }

  async getExpiringInventory(warehouseId: string, daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(
        and(
          eq(inventory.warehouseId, warehouseId),
          lte(inventory.expiryDate, futureDate)
        )
      )
      .orderBy(inventory.expiryDate);
  }

  async getZeroStockItems(warehouseId: string) {
    return await this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(
        and(
          eq(inventory.warehouseId, warehouseId),
          eq(inventory.quantityOnHand, 0)
        )
      );
  }

  async getNegativeStockItems(warehouseId: string) {
    const results = await this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.warehouseId, warehouseId));

    return results.filter((r: any) => (r.inventory.quantityOnHand || 0) < 0);
  }

  async getInventoryTurnoverRate(warehouseId: string, periodDays: number = 30) {
    // Calculate inventory turnover based on movements
    // Turnover = Total movements / Average inventory
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // TODO: Implement with stock movements data
    // This requires querying stockMovements table
    
    return {
      warehouseId,
      period: periodDays,
      turnoverRate: 0,
      averageInventory: 0,
      totalMovements: 0,
    };
  }

  async searchInventory(tenantId: string, searchTerm: string) {
    // Search by product name, SKU, barcode, or location
    const results = await this.db
      .select({
        inventory,
        product: products,
        location: locations,
        warehouse: warehouses,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(
        and(
          eq(warehouses.tenantId, tenantId),
          or(
            like(products.name, `%${searchTerm}%`),
            like(products.sku, `%${searchTerm}%`),
            like(products.barcode, `%${searchTerm}%`),
            like(locations.code, `%${searchTerm}%`)
          )
        )
      );

    return results;
  }

  async getInventoryAccuracyMetrics(warehouseId: string) {
    // Calculate accuracy based on cycle counts vs system inventory
    // This requires cycle count history data
    
    return {
      warehouseId,
      accuracyRate: 0,
      totalCounts: 0,
      accurateCounts: 0,
      discrepancies: 0,
      lastCalculated: new Date(),
    };
  }

  async getLocationUtilization(warehouseId: string) {
    const allLocations = await this.db
      .select()
      .from(locations)
      .where(eq(locations.warehouseId, warehouseId));

    const occupiedLocations = await this.db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.isOccupied, true)
        )
      );

    const totalLocations = allLocations.length;
    const occupied = occupiedLocations.length;
    const available = totalLocations - occupied;
    const utilizationRate = totalLocations > 0 ? (occupied / totalLocations) * 100 : 0;

    return {
      warehouseId,
      totalLocations,
      occupied,
      available,
      utilizationRate: utilizationRate.toFixed(2),
      byZone: await this.getUtilizationByZone(warehouseId),
    };
  }

  private async getUtilizationByZone(warehouseId: string) {
    const allLocations = await this.db
      .select()
      .from(locations)
      .where(eq(locations.warehouseId, warehouseId));

    const byZone: Record<string, any> = {};

    for (const location of allLocations) {
      const zone = location.zone || 'UNASSIGNED';
      
      if (!byZone[zone]) {
        byZone[zone] = {
          zone,
          total: 0,
          occupied: 0,
          available: 0,
          utilizationRate: 0,
        };
      }

      byZone[zone].total++;
      if (location.isOccupied) {
        byZone[zone].occupied++;
      } else {
        byZone[zone].available++;
      }
    }

    // Calculate utilization rates
    for (const zone in byZone) {
      const data = byZone[zone];
      data.utilizationRate = data.total > 0 ? (data.occupied / data.total) * 100 : 0;
    }

    return Object.values(byZone);
  }

  async getInventoryABC Analysis(warehouseId: string) {
    // ABC analysis based on value and movement frequency
    // A = High value/high movement (20% of items, 80% of value)
    // B = Medium value/medium movement
    // C = Low value/low movement
    
    const inventoryRecords = await this.db
      .select({
        inventory,
        product: products,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(eq(inventory.warehouseId, warehouseId));

    // Calculate value for each item
    const itemsWithValue = inventoryRecords.map((record: any) => ({
      ...record,
      value: (record.inventory.quantityOnHand || 0) * 
             parseFloat(record.product?.metadata?.unitCost || '0'),
    }));

    // Sort by value descending
    itemsWithValue.sort((a, b) => b.value - a.value);

    const totalValue = itemsWithValue.reduce((sum, item) => sum + item.value, 0);

    // Classify items
    let cumulativeValue = 0;
    const classified = itemsWithValue.map((item) => {
      cumulativeValue += item.value;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;

      let classification: 'A' | 'B' | 'C';
      if (cumulativePercentage <= 80) {
        classification = 'A';
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
      } else {
        classification = 'C';
      }

      return {
        ...item,
        classification,
        valuePercentage: (item.value / totalValue) * 100,
      };
    });

    const summary = {
      A: classified.filter(i => i.classification === 'A').length,
      B: classified.filter(i => i.classification === 'B').length,
      C: classified.filter(i => i.classification === 'C').length,
    };

    return {
      warehouseId,
      totalItems: classified.length,
      totalValue,
      summary,
      items: classified,
    };
  }
}

