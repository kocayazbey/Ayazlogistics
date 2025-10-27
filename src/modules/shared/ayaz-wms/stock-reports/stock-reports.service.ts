import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, between, and, gte, lte, or, sql } from 'drizzle-orm';
import { inventory, locations, products, warehouses } from '../../../../database/schema/shared/wms.schema';
import { stockMovements, stockCards } from '../../../../database/schema/shared/erp-inventory.schema';

interface StockReportFilters {
  warehouseId?: string;
  productId?: string;
  categoryId?: string;
  zone?: string;
  minQuantity?: number;
  maxQuantity?: number;
  includeBlocked?: boolean;
  includeQuarantined?: boolean;
}

@Injectable()
export class StockReportsService {
  private readonly logger = new Logger(StockReportsService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async stockStatusReport(warehouseId: string, asOfDate?: Date, filters?: StockReportFilters) {
    const reportDate = asOfDate || new Date();
    
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
      .where(eq(inventory.warehouseId, warehouseId));

    const results = await query;

    let processed = results.map((r: any) => {
      const unitCost = parseFloat(r.product?.metadata?.unitCost || '0');
      const qty = r.inventory.quantityOnHand || 0;
      const value = qty * unitCost;

      return {
        productId: r.product?.id,
        sku: r.product?.sku,
        productName: r.product?.name,
        locationCode: r.location?.code,
        zone: r.location?.zone,
        quantityOnHand: qty,
        quantityAvailable: r.inventory.quantityAvailable || 0,
        quantityAllocated: r.inventory.quantityAllocated || 0,
        unitCost,
        totalValue: value,
        lotNumber: r.inventory.lotNumber,
        expiryDate: r.inventory.expiryDate,
        isBlocked: r.inventory.metadata?.blocked || false,
        isQuarantined: r.inventory.metadata?.quarantined || false,
        lastMovementDate: r.inventory.updatedAt,
      };
    });

    if (filters?.minQuantity) {
      processed = processed.filter((item: any) => item.quantityOnHand >= filters.minQuantity!);
    }

    if (filters?.zone) {
      processed = processed.filter((item: any) => item.zone === filters.zone);
    }

    if (!filters?.includeBlocked) {
      processed = processed.filter((item: any) => !item.isBlocked);
    }

    if (!filters?.includeQuarantined) {
      processed = processed.filter((item: any) => !item.isQuarantined);
    }

    const summary = {
      totalItems: processed.length,
      totalValue: processed.reduce((sum: number, item: any) => sum + item.totalValue, 0),
      totalQuantity: processed.reduce((sum: number, item: any) => sum + item.quantityOnHand, 0),
      blockedItems: processed.filter((item: any) => item.isBlocked).length,
      quarantinedItems: processed.filter((item: any) => item.isQuarantined).length,
      byZone: this.groupByZone(processed),
      byCategory: this.groupByCategory(processed),
    };

    return {
      warehouseId,
      asOfDate: reportDate,
      filters,
      summary,
      items: processed,
      generatedAt: new Date(),
    };
  }

  async palletBasedStockList(warehouseId: string, options?: {
    zone?: string;
    includeEmpty?: boolean;
    sortBy?: 'location' | 'product' | 'quantity' | 'value';
  }) {
    const inventoryData = await this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.warehouseId, warehouseId));

    let pallets = inventoryData.map((inv: any) => {
      const unitCost = parseFloat(inv.product?.metadata?.unitCost || '0');
      const qty = inv.inventory.quantityOnHand || 0;

      return {
        palletId: inv.inventory.id,
        locationCode: inv.location?.code,
        zone: inv.location?.zone,
        aisle: inv.location?.aisle,
        rack: inv.location?.rack,
        shelf: inv.location?.shelf,
        productId: inv.product?.id,
        sku: inv.product?.sku,
        productName: inv.product?.name,
        quantity: qty,
        unitCost,
        totalValue: qty * unitCost,
        lotNumber: inv.inventory.lotNumber,
        serialNumber: inv.inventory.serialNumber,
        expiryDate: inv.inventory.expiryDate,
        receivedDate: inv.inventory.createdAt,
        daysInStock: Math.floor((new Date().getTime() - new Date(inv.inventory.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        palletType: inv.inventory.metadata?.palletType || 'standard',
        weight: parseFloat(inv.product?.weight || '0') * qty,
        volume: this.calculateVolume(inv.product) * qty,
      };
    });

    if (options?.zone) {
      pallets = pallets.filter((p: any) => p.zone === options.zone);
    }

    if (!options?.includeEmpty) {
      pallets = pallets.filter((p: any) => p.quantity > 0);
    }

    if (options?.sortBy === 'location') {
      pallets.sort((a: any, b: any) => (a.locationCode || '').localeCompare(b.locationCode || ''));
    } else if (options?.sortBy === 'product') {
      pallets.sort((a: any, b: any) => (a.sku || '').localeCompare(b.sku || ''));
    } else if (options?.sortBy === 'quantity') {
      pallets.sort((a: any, b: any) => b.quantity - a.quantity);
    } else if (options?.sortBy === 'value') {
      pallets.sort((a: any, b: any) => b.totalValue - a.totalValue);
    }

    return {
      warehouseId,
      totalPallets: pallets.length,
      totalQuantity: pallets.reduce((sum: number, p: any) => sum + p.quantity, 0),
      totalValue: pallets.reduce((sum: number, p: any) => sum + p.totalValue, 0),
      totalWeight: pallets.reduce((sum: number, p: any) => sum + p.weight, 0),
      totalVolume: pallets.reduce((sum: number, p: any) => sum + p.volume, 0),
      pallets,
      generatedAt: new Date(),
    };
  }

  async skuStockReport(productId: string, options?: {
    includeHistory?: boolean;
    includeForecast?: boolean;
    periodDays?: number;
  }) {
    const inventoryLocations = await this.db
      .select({
        inventory,
        location: locations,
        warehouse: warehouses,
      })
      .from(inventory)
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .leftJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
      .where(eq(inventory.productId, productId));

    const [product] = await this.db.select().from(products).where(eq(products.id, productId)).limit(1);

    const totalOnHand = inventoryLocations.reduce((sum, loc) => sum + (loc.inventory.quantityOnHand || 0), 0);
    const totalAvailable = inventoryLocations.reduce((sum, loc) => sum + (loc.inventory.quantityAvailable || 0), 0);
    const totalAllocated = inventoryLocations.reduce((sum, loc) => sum + (loc.inventory.quantityAllocated || 0), 0);

    let movementHistory: any[] = [];
    if (options?.includeHistory) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (options.periodDays || 30));
      
      movementHistory = await this.db
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.stockCardId, productId),
            gte(stockMovements.movementDate, startDate)
          )
        );
    }

    const velocity = this.calculateVelocity(movementHistory, options?.periodDays || 30);
    const turnoverRate = totalOnHand > 0 ? velocity / totalOnHand : 0;
    const daysOfSupply = velocity > 0 ? totalOnHand / velocity : 999;

    return {
      productId,
      sku: product?.sku,
      productName: product?.name,
      summary: {
        totalOnHand,
        totalAvailable,
        totalAllocated,
        locationCount: inventoryLocations.length,
        warehouseCount: new Set(inventoryLocations.map(l => l.warehouse?.id)).size,
      },
      locations: inventoryLocations.map((loc: any) => ({
        warehouseId: loc.warehouse?.id,
        warehouseName: loc.warehouse?.name,
        locationCode: loc.location?.code,
        zone: loc.location?.zone,
        quantity: loc.inventory.quantityOnHand,
        available: loc.inventory.quantityAvailable,
        allocated: loc.inventory.quantityAllocated,
        lotNumber: loc.inventory.lotNumber,
        expiryDate: loc.inventory.expiryDate,
      })),
      analytics: {
        velocity: velocity.toFixed(2),
        turnoverRate: turnoverRate.toFixed(2),
        daysOfSupply: daysOfSupply.toFixed(1),
        fastMoving: velocity > 10,
        classification: this.classifyByVelocity(velocity),
      },
      movementHistory: options?.includeHistory ? movementHistory : undefined,
      generatedAt: new Date(),
    };
  }

  async stockMovementsReport(warehouseId: string, startDate: Date, endDate: Date, filters?: {
    movementType?: string;
    productId?: string;
    locationId?: string;
    minQuantity?: number;
  }) {
    let query = this.db
      .select()
      .from(stockMovements)
      .where(between(stockMovements.movementDate, startDate, endDate));

    const movements = await query;

    const byType: Record<string, any> = {};
    const byDate: Record<string, any> = {};
    const byProduct: Record<string, any> = {};

    movements.forEach((mov: any) => {
      const type = mov.movementType;
      if (!byType[type]) byType[type] = { type, count: 0, totalQty: 0 };
      byType[type].count++;
      byType[type].totalQty += parseFloat(mov.quantity || '0');

      const dateKey = mov.movementDate.toISOString().split('T')[0];
      if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey, count: 0, totalQty: 0 };
      byDate[dateKey].count++;
      byDate[dateKey].totalQty += parseFloat(mov.quantity || '0');

      const prodKey = mov.stockCardId;
      if (!byProduct[prodKey]) byProduct[prodKey] = { productId: prodKey, count: 0, totalQty: 0 };
      byProduct[prodKey].count++;
      byProduct[prodKey].totalQty += parseFloat(mov.quantity || '0');
    });

    return {
      warehouseId,
      period: { startDate, endDate },
      totalMovements: movements.length,
      byType: Object.values(byType),
      byDate: Object.values(byDate).sort((a: any, b: any) => a.date.localeCompare(b.date)),
      byProduct: Object.values(byProduct).sort((a: any, b: any) => b.totalQty - a.totalQty).slice(0, 50),
      movements: movements.slice(0, 1000),
      generatedAt: new Date(),
    };
  }

  async replenishmentZoneStockReport(warehouseId: string) {
    const replenishmentLocs = await this.db
      .select({
        location: locations,
        inventory,
        product: products,
      })
      .from(locations)
      .leftJoin(inventory, eq(locations.id, inventory.locationId))
      .leftJoin(products, eq(inventory.productId, products.id))
      .where(
        and(
          eq(locations.warehouseId, warehouseId),
          eq(locations.locationType, 'pick')
        )
      );

    const items = replenishmentLocs.map((item: any) => {
      const minLevel = item.location.metadata?.minLevel || 10;
      const maxLevel = item.location.metadata?.maxLevel || 100;
      const currentQty = item.inventory?.quantityOnHand || 0;
      const needsReplenishment = currentQty < minLevel;

      return {
        locationCode: item.location.code,
        zone: item.location.zone,
        productId: item.product?.id,
        sku: item.product?.sku,
        productName: item.product?.name,
        currentQuantity: currentQty,
        minLevel,
        maxLevel,
        needsReplenishment,
        replenishmentQuantity: needsReplenishment ? maxLevel - currentQty : 0,
        priority: currentQty === 0 ? 'critical' : currentQty < 5 ? 'high' : 'normal',
      };
    });

    const needsReplenishment = items.filter((item: any) => item.needsReplenishment);

    return {
      warehouseId,
      totalLocations: items.length,
      needsReplenishment: needsReplenishment.length,
      criticalCount: needsReplenishment.filter((item: any) => item.priority === 'critical').length,
      highPriorityCount: needsReplenishment.filter((item: any) => item.priority === 'high').length,
      items: needsReplenishment,
      generatedAt: new Date(),
    };
  }

  async blockedStockReport(warehouseId: string, options?: {
    blockReason?: string;
    minDaysBlocked?: number;
  }) {
    const allInventory = await this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.warehouseId, warehouseId));

    const blockedItems = allInventory.filter((item: any) => item.inventory.metadata?.blocked === true);

    let processed = blockedItems.map((item: any) => {
      const blockDetails = item.inventory.metadata?.blockDetails || {};
      const blockedDate = new Date(blockDetails.blockedAt || item.inventory.createdAt);
      const daysBlocked = Math.floor((new Date().getTime() - blockedDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        inventoryId: item.inventory.id,
        productId: item.product?.id,
        sku: item.product?.sku,
        productName: item.product?.name,
        locationCode: item.location?.code,
        quantity: item.inventory.quantityOnHand,
        blockReason: blockDetails.reason,
        blockType: blockDetails.type,
        blockedBy: blockDetails.blockedBy,
        blockedAt: blockedDate,
        daysBlocked,
        autoReleaseDate: blockDetails.autoReleaseDate,
        notes: blockDetails.notes,
      };
    });

    if (options?.blockReason) {
      processed = processed.filter((item: any) => item.blockReason === options.blockReason);
    }

    if (options?.minDaysBlocked) {
      processed = processed.filter((item: any) => item.daysBlocked >= options.minDaysBlocked!);
    }

    return {
      warehouseId,
      totalBlocked: processed.length,
      totalQuantity: processed.reduce((sum: number, item: any) => sum + item.quantity, 0),
      byReason: this.groupByField(processed, 'blockReason'),
      byDuration: {
        lessThan7Days: processed.filter((item: any) => item.daysBlocked < 7).length,
        days7to30: processed.filter((item: any) => item.daysBlocked >= 7 && item.daysBlocked < 30).length,
        days30to90: processed.filter((item: any) => item.daysBlocked >= 30 && item.daysBlocked < 90).length,
        moreThan90Days: processed.filter((item: any) => item.daysBlocked >= 90).length,
      },
      items: processed,
      generatedAt: new Date(),
    };
  }

  async consolidationReport(warehouseId: string, options?: {
    minOccurrences?: number;
    sameProductOnly?: boolean;
  }) {
    const allInventory = await this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.warehouseId, warehouseId));

    const byProduct: Record<string, any[]> = {};

    allInventory.forEach((item: any) => {
      const productId = item.product?.id;
      if (!byProduct[productId]) byProduct[productId] = [];
      byProduct[productId].push(item);
    });

    const opportunities = [];

    for (const [productId, items] of Object.entries(byProduct)) {
      if (items.length > 1) {
        const totalQty = items.reduce((sum, item) => sum + (item.inventory.quantityOnHand || 0), 0);
        const locations = items.map((item: any) => ({
          locationCode: item.location?.code,
          quantity: item.inventory.quantityOnHand,
          lotNumber: item.inventory.lotNumber,
        }));

        opportunities.push({
          productId,
          sku: items[0].product?.sku,
          productName: items[0].product?.name,
          locationCount: items.length,
          totalQuantity: totalQty,
          locations,
          consolidationPotential: items.length - 1,
          estimatedSpaceSavings: (items.length - 1) * 100,
        });
      }
    }

    opportunities.sort((a, b) => b.consolidationPotential - a.consolidationPotential);

    return {
      warehouseId,
      totalOpportunities: opportunities.length,
      potentialLocationsSaved: opportunities.reduce((sum, opp) => sum + opp.consolidationPotential, 0),
      opportunities: opportunities.slice(0, 100),
      generatedAt: new Date(),
    };
  }

  async shrinkageAnalysisReport(warehouseId: string, startDate: Date, endDate: Date) {
    const movements = await this.db
      .select()
      .from(stockMovements)
      .where(
        and(
          between(stockMovements.movementDate, startDate, endDate),
          or(
            eq(stockMovements.movementReason, 'shrinkage'),
            eq(stockMovements.movementReason, 'damage'),
            eq(stockMovements.movementReason, 'expiry'),
            eq(stockMovements.movementReason, 'theft'),
            eq(stockMovements.movementReason, 'cycle_count_variance')
          )
        )
      );

    const byReason: Record<string, any> = {};
    let totalShrinkage = 0;

    movements.forEach((mov: any) => {
      const reason = mov.movementReason;
      const qty = parseFloat(mov.quantity || '0');
      
      if (!byReason[reason]) byReason[reason] = { reason, count: 0, totalQty: 0, estimatedValue: 0 };
      byReason[reason].count++;
      byReason[reason].totalQty += qty;
      totalShrinkage += qty;
    });

    return {
      warehouseId,
      period: { startDate, endDate },
      totalShrinkage,
      byReason: Object.values(byReason),
      shrinkageRate: 0,
      estimatedTotalValue: 0,
      topCauses: Object.values(byReason).sort((a: any, b: any) => b.totalQty - a.totalQty).slice(0, 5),
      generatedAt: new Date(),
    };
  }

  async dailyStockGraphReport(warehouseId: string, startDate: Date, endDate: Date, productId?: string) {
    const days: any[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      days.push({
        date: new Date(currentDate),
        totalStock: 0,
        inbound: 0,
        outbound: 0,
        adjustment: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      warehouseId,
      productId,
      period: { startDate, endDate },
      dataPoints: days,
      statistics: {
        avgDailyStock: 0,
        minStock: 0,
        maxStock: 0,
        trend: 'stable',
      },
      generatedAt: new Date(),
    };
  }

  async stockCardAnalysisReport(warehouseId: string, period: { startDate: Date; endDate: Date }) {
    const allProducts = await this.db
      .select({
        product: products,
        stockCard: stockCards,
      })
      .from(products)
      .leftJoin(stockCards, eq(products.metadata.stockCardId, stockCards.id));

    const analysis = allProducts.map((item: any) => {
      const currentStock = parseFloat(item.stockCard?.currentStock || '0');
      const minLevel = parseFloat(item.stockCard?.minStockLevel || '0');
      const maxLevel = parseFloat(item.stockCard?.maxStockLevel || '0');
      const purchasePrice = parseFloat(item.stockCard?.purchasePrice || '0');
      const salePrice = parseFloat(item.stockCard?.salePrice || '0');

      return {
        productId: item.product?.id,
        sku: item.product?.sku,
        productName: item.product?.name,
        currentStock,
        minLevel,
        maxLevel,
        stockStatus: currentStock < minLevel ? 'low' : currentStock > maxLevel ? 'excess' : 'normal',
        purchasePrice,
        salePrice,
        margin: salePrice - purchasePrice,
        marginPercentage: purchasePrice > 0 ? ((salePrice - purchasePrice) / purchasePrice) * 100 : 0,
        stockValue: currentStock * purchasePrice,
        potentialRevenue: currentStock * salePrice,
      };
    });

    return {
      warehouseId,
      period,
      totalProducts: analysis.length,
      lowStockCount: analysis.filter((a: any) => a.stockStatus === 'low').length,
      excessStockCount: analysis.filter((a: any) => a.stockStatus === 'excess').length,
      totalStockValue: analysis.reduce((sum: number, a: any) => sum + a.stockValue, 0),
      potentialRevenue: analysis.reduce((sum: number, a: any) => sum + a.potentialRevenue, 0),
      avgMarginPercentage: analysis.reduce((sum: number, a: any) => sum + a.marginPercentage, 0) / analysis.length,
      items: analysis,
      generatedAt: new Date(),
    };
  }

  async capacityUtilizationReport(warehouseId: string) {
    const allLocations = await this.db
      .select({
        location: locations,
        inventory,
      })
      .from(locations)
      .leftJoin(inventory, eq(locations.id, inventory.locationId))
      .where(eq(locations.warehouseId, warehouseId));

    const byZone: Record<string, any> = {};
    const byType: Record<string, any> = {};

    allLocations.forEach((item: any) => {
      const zone = item.location.zone || 'Unassigned';
      const type = item.location.locationType || 'general';
      const capacity = parseFloat(item.location.capacity || '100');
      const occupied = item.inventory ? (item.inventory.quantityOnHand || 0) : 0;

      if (!byZone[zone]) byZone[zone] = { zone, totalCapacity: 0, totalOccupied: 0, locations: 0, utilization: 0 };
      byZone[zone].totalCapacity += capacity;
      byZone[zone].totalOccupied += occupied;
      byZone[zone].locations++;

      if (!byType[type]) byType[type] = { type, totalCapacity: 0, totalOccupied: 0, locations: 0, utilization: 0 };
      byType[type].totalCapacity += capacity;
      byType[type].totalOccupied += occupied;
      byType[type].locations++;
    });

    Object.values(byZone).forEach((zone: any) => {
      zone.utilization = zone.totalCapacity > 0 ? (zone.totalOccupied / zone.totalCapacity) * 100 : 0;
    });

    Object.values(byType).forEach((type: any) => {
      type.utilization = type.totalCapacity > 0 ? (type.totalOccupied / type.totalCapacity) * 100 : 0;
    });

    const overallCapacity = Object.values(byZone).reduce((sum: number, z: any) => sum + z.totalCapacity, 0);
    const overallOccupied = Object.values(byZone).reduce((sum: number, z: any) => sum + z.totalOccupied, 0);

    return {
      warehouseId,
      overall: {
        totalCapacity: overallCapacity,
        totalOccupied: overallOccupied,
        totalAvailable: overallCapacity - overallOccupied,
        utilizationRate: overallCapacity > 0 ? (overallOccupied / overallCapacity) * 100 : 0,
      },
      byZone: Object.values(byZone),
      byType: Object.values(byType),
      utilizationTrend: this.calculateUtilizationTrend(),
      recommendations: this.generateCapacityRecommendations(byZone),
      generatedAt: new Date(),
    };
  }

  async agingStockReport(warehouseId: string, asOfDate?: Date) {
    const reportDate = asOfDate || new Date();
    
    const allInventory = await this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.warehouseId, warehouseId));

    const aged = allInventory.map((item: any) => {
      const receivedDate = new Date(item.inventory.createdAt);
      const daysInStock = Math.floor((reportDate.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
      const unitCost = parseFloat(item.product?.metadata?.unitCost || '0');
      const qty = item.inventory.quantityOnHand || 0;

      return {
        productId: item.product?.id,
        sku: item.product?.sku,
        productName: item.product?.name,
        locationCode: item.location?.code,
        quantity: qty,
        receivedDate,
        daysInStock,
        ageCategory: this.categorizeAge(daysInStock),
        unitCost,
        totalValue: qty * unitCost,
        turnoverDays: item.product?.metadata?.avgTurnoverDays || 30,
        aging: daysInStock > (item.product?.metadata?.avgTurnoverDays || 30) ? 'slow' : 'normal',
      };
    });

    const byAgeCategory = {
      days0to30: aged.filter(a => a.ageCategory === '0-30 days'),
      days31to60: aged.filter(a => a.ageCategory === '31-60 days'),
      days61to90: aged.filter(a => a.ageCategory === '61-90 days'),
      days91to180: aged.filter(a => a.ageCategory === '91-180 days'),
      moreThan180: aged.filter(a => a.ageCategory === '180+ days'),
    };

    return {
      warehouseId,
      asOfDate: reportDate,
      totalItems: aged.length,
      totalValue: aged.reduce((sum, a) => sum + a.totalValue, 0),
      avgDaysInStock: aged.reduce((sum, a) => sum + a.daysInStock, 0) / aged.length,
      slowMoving: aged.filter(a => a.aging === 'slow').length,
      byAgeCategory: {
        'days0to30': { count: byAgeCategory.days0to30.length, value: this.sumValue(byAgeCategory.days0to30) },
        'days31to60': { count: byAgeCategory.days31to60.length, value: this.sumValue(byAgeCategory.days31to60) },
        'days61to90': { count: byAgeCategory.days61to90.length, value: this.sumValue(byAgeCategory.days61to90) },
        'days91to180': { count: byAgeCategory.days91to180.length, value: this.sumValue(byAgeCategory.days91to180) },
        'moreThan180': { count: byAgeCategory.moreThan180.length, value: this.sumValue(byAgeCategory.moreThan180) },
      },
      items: aged.sort((a, b) => b.daysInStock - a.daysInStock),
      generatedAt: new Date(),
    };
  }

  async deadStockReport(warehouseId: string, minDaysNoMovement: number = 180) {
    return {
      warehouseId,
      minDaysNoMovement,
      deadStock: [],
      totalValue: 0,
      disposalRecommendations: [],
      generatedAt: new Date(),
    };
  }

  async lotExpiryReport(warehouseId: string, daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiringInventory = await this.db
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
      );

    const categorized = {
      expired: expiringInventory.filter((item: any) => new Date(item.inventory.expiryDate) <= new Date()),
      expiring7Days: expiringInventory.filter((item: any) => {
        const expiry = new Date(item.inventory.expiryDate);
        const now = new Date();
        const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 0 && diff <= 7;
      }),
      expiring30Days: expiringInventory.filter((item: any) => {
        const expiry = new Date(item.inventory.expiryDate);
        const now = new Date();
        const diff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diff > 7 && diff <= 30;
      }),
    };

    return {
      warehouseId,
      daysAhead,
      totalExpiring: expiringInventory.length,
      expired: categorized.expired.length,
      expiring7Days: categorized.expiring7Days.length,
      expiring30Days: categorized.expiring30Days.length,
      items: expiringInventory.map((item: any) => ({
        productId: item.product?.id,
        sku: item.product?.sku,
        productName: item.product?.name,
        locationCode: item.location?.code,
        quantity: item.inventory.quantityOnHand,
        lotNumber: item.inventory.lotNumber,
        expiryDate: item.inventory.expiryDate,
        daysUntilExpiry: Math.floor((new Date(item.inventory.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      })),
      generatedAt: new Date(),
    };
  }

  async inventoryValuationReport(warehouseId: string, valuationMethod: 'FIFO' | 'LIFO' | 'Average' = 'FIFO') {
    const allInventory = await this.db
      .select({
        inventory,
        product: products,
        stockCard: stockCards,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(stockCards, eq(products.metadata.stockCardId, stockCards.id))
      .where(eq(inventory.warehouseId, warehouseId));

    let totalValuation = 0;
    const valuationDetails = allInventory.map((item: any) => {
      const qty = item.inventory.quantityOnHand || 0;
      const unitCost = parseFloat(item.stockCard?.purchasePrice || item.product?.metadata?.unitCost || '0');
      const value = qty * unitCost;
      totalValuation += value;

      return {
        productId: item.product?.id,
        sku: item.product?.sku,
        productName: item.product?.name,
        quantity: qty,
        unitCost,
        totalValue: value,
        valuationMethod,
      };
    });

    return {
      warehouseId,
      valuationMethod,
      totalValue: totalValuation,
      currency: 'TRY',
      itemCount: valuationDetails.length,
      items: valuationDetails.sort((a, b) => b.totalValue - a.totalValue),
      generatedAt: new Date(),
    };
  }

  async zoneBasedStockReport(warehouseId: string) {
    const allInventory = await this.db
      .select({
        inventory,
        product: products,
        location: locations,
      })
      .from(inventory)
      .leftJoin(products, eq(inventory.productId, products.id))
      .leftJoin(locations, eq(inventory.locationId, locations.id))
      .where(eq(inventory.warehouseId, warehouseId));

    const byZone: Record<string, any> = {};

    allInventory.forEach((item: any) => {
      const zone = item.location?.zone || 'Unassigned';
      if (!byZone[zone]) {
        byZone[zone] = {
          zone,
          totalItems: 0,
          totalQuantity: 0,
          uniqueProducts: new Set(),
          locations: new Set(),
          totalValue: 0,
        };
      }

      byZone[zone].totalItems++;
      byZone[zone].totalQuantity += item.inventory.quantityOnHand || 0;
      byZone[zone].uniqueProducts.add(item.product?.id);
      byZone[zone].locations.add(item.location?.id);
      byZone[zone].totalValue += (item.inventory.quantityOnHand || 0) * parseFloat(item.product?.metadata?.unitCost || '0');
    });

    const processed = Object.values(byZone).map((zone: any) => ({
      zone: zone.zone,
      totalItems: zone.totalItems,
      totalQuantity: zone.totalQuantity,
      uniqueProducts: zone.uniqueProducts.size,
      locations: zone.locations.size,
      totalValue: zone.totalValue,
      avgValuePerLocation: zone.locations.size > 0 ? zone.totalValue / zone.locations.size : 0,
    }));

    return {
      warehouseId,
      zones: processed.sort((a, b) => b.totalValue - a.totalValue),
      generatedAt: new Date(),
    };
  }

  async slowMovingFastMovingReport(warehouseId: string, periodDays: number = 90) {
    return {
      warehouseId,
      periodDays,
      fastMoving: [],
      slowMoving: [],
      nonMoving: [],
      generatedAt: new Date(),
    };
  }

  async stockAccuracyReport(warehouseId: string, startDate: Date, endDate: Date) {
    return {
      warehouseId,
      period: { startDate, endDate },
      totalCounts: 0,
      accurateCounts: 0,
      accuracyRate: 100,
      variances: [],
      generatedAt: new Date(),
    };
  }

  async hazmatStockReport(warehouseId: string) {
    const hazmatItems = await this.db
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
          eq(products.isHazmat, true)
        )
      );

    return {
      warehouseId,
      totalHazmatItems: hazmatItems.length,
      items: hazmatItems.map((item: any) => ({
        productId: item.product?.id,
        sku: item.product?.sku,
        productName: item.product?.name,
        locationCode: item.location?.code,
        quantity: item.inventory.quantityOnHand,
        hazmatClass: item.product?.metadata?.hazmatClass,
        storageRequirements: item.product?.metadata?.storageRequirements,
      })),
      generatedAt: new Date(),
    };
  }

  async perishableStockReport(warehouseId: string, daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const perishableItems = await this.db
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
          eq(products.isPerishable, true)
        )
      );

    return {
      warehouseId,
      daysAhead,
      totalPerishableItems: perishableItems.length,
      items: perishableItems.map((item: any) => ({
        productId: item.product?.id,
        sku: item.product?.sku,
        productName: item.product?.name,
        locationCode: item.location?.code,
        quantity: item.inventory.quantityOnHand,
        expiryDate: item.inventory.expiryDate,
        daysUntilExpiry: item.inventory.expiryDate ? Math.floor((new Date(item.inventory.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
      })),
      generatedAt: new Date(),
    };
  }

  private calculateVolume(product: any): number {
    if (!product) return 0;
    const l = parseFloat(product.length || '0');
    const w = parseFloat(product.width || '0');
    const h = parseFloat(product.height || '0');
    return (l * w * h) / 1000000;
  }

  private groupByZone(items: any[]): any {
    const byZone: Record<string, any> = {};
    items.forEach(item => {
      const zone = item.zone || 'Unassigned';
      if (!byZone[zone]) byZone[zone] = { zone, count: 0, totalQty: 0, totalValue: 0 };
      byZone[zone].count++;
      byZone[zone].totalQty += item.quantityOnHand;
      byZone[zone].totalValue += item.totalValue;
    });
    return Object.values(byZone);
  }

  private groupByCategory(items: any[]): any {
    return [];
  }

  private groupByField(items: any[], field: string): any {
    const grouped: Record<string, any> = {};
    items.forEach(item => {
      const key = item[field] || 'Unknown';
      if (!grouped[key]) grouped[key] = { [field]: key, count: 0 };
      grouped[key].count++;
    });
    return Object.values(grouped);
  }

  private calculateVelocity(movements: any[], days: number): number {
    const outboundMovements = movements.filter(m => m.movementType === 'out');
    const totalQty = outboundMovements.reduce((sum, m) => sum + parseFloat(m.quantity || '0'), 0);
    return days > 0 ? totalQty / days : 0;
  }

  private classifyByVelocity(velocity: number): 'A' | 'B' | 'C' {
    if (velocity > 10) return 'A';
    if (velocity > 3) return 'B';
    return 'C';
  }

  private categorizeAge(days: number): string {
    if (days <= 30) return '0-30 days';
    if (days <= 60) return '31-60 days';
    if (days <= 90) return '61-90 days';
    if (days <= 180) return '91-180 days';
    return '180+ days';
  }

  private sumValue(items: any[]): number {
    return items.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  }

  private calculateUtilizationTrend(): string {
    return 'increasing';
  }

  private generateCapacityRecommendations(byZone: any): string[] {
    const recommendations = [];
    for (const zone of Object.values(byZone)) {
      const z = zone as any;
      if (z.utilization > 90) {
        recommendations.push(`Zone ${z.zone}: Critical - Consider expansion or reorganization (${z.utilization.toFixed(1)}% utilized)`);
      } else if (z.utilization < 30) {
        recommendations.push(`Zone ${z.zone}: Underutilized - Consider reassignment (${z.utilization.toFixed(1)}% utilized)`);
      }
    }
    return recommendations;
  }
}
