import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, between } from 'drizzle-orm';
import { inventory, products, warehouses } from '../../../../database/schema/shared/wms.schema';
import { stockCards, stockMovements } from '../../../../database/schema/shared/erp-inventory.schema';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class InventoryViewService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async getCustomerInventory(customerId: string, warehouseId?: string) {
    const cacheKey = this.cacheService.generateKey('customer-inventory', customerId, warehouseId || 'all');

    return this.cacheService.wrap(cacheKey, async () => {
      let query = this.db.select().from(inventory);

      if (warehouseId) {
        query = query.where(eq(inventory.warehouseId, warehouseId));
      }

      const inventoryRecords = await query;

      const enriched = [];

      for (const record of inventoryRecords) {
        const product = await this.getProductById(record.productId);
        const warehouse = await this.getWarehouseById(record.warehouseId);

        enriched.push({
          ...record,
          product,
          warehouse,
        });
      }

      return enriched;
    }, 300);
  }

  async getInventorySummary(customerId: string) {
    const inventory = await this.getCustomerInventory(customerId);

    const summary = {
      totalSKUs: new Set(inventory.map((i: any) => i.productId)).size,
      totalQuantity: inventory.reduce((sum, i: any) => sum + (i.quantityOnHand || 0), 0),
      totalValue: 0,
      byWarehouse: {},
      byCategory: {},
      lowStockItems: inventory.filter((i: any) => {
        const onHand = i.quantityOnHand || 0;
        const reorderPoint = i.product?.metadata?.reorderPoint || 0;
        return onHand <= reorderPoint;
      }),
    };

    for (const item of inventory) {
      const warehouseName = item.warehouse?.name || 'Unknown';
      const category = item.product?.category || 'Uncategorized';

      if (!summary.byWarehouse[warehouseName]) {
        summary.byWarehouse[warehouseName] = { quantity: 0, skus: 0 };
      }
      summary.byWarehouse[warehouseName].quantity += item.quantityOnHand || 0;
      summary.byWarehouse[warehouseName].skus += 1;

      if (!summary.byCategory[category]) {
        summary.byCategory[category] = { quantity: 0, skus: 0 };
      }
      summary.byCategory[category].quantity += item.quantityOnHand || 0;
      summary.byCategory[category].skus += 1;

      const unitCost = parseFloat(item.product?.metadata?.unitCost || '0');
      summary.totalValue += (item.quantityOnHand || 0) * unitCost;
    }

    return summary;
  }

  async getInventoryMovements(customerId: string, productId?: string, startDate?: Date, endDate?: Date) {
    return {
      customerId,
      movements: [],
      totalMovements: 0,
    };
  }

  async getStockLevelsOverTime(customerId: string, productId: string, days: number = 30) {
    const dataPoints = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      dataPoints.push({
        date,
        quantity: Math.floor(Math.random() * 100) + 50,
      });
    }

    return {
      productId,
      period: { days },
      dataPoints,
      trend: this.calculateTrend(dataPoints),
    };
  }

  private calculateTrend(dataPoints: any[]) {
    if (dataPoints.length < 2) return 'stable';

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

    const firstAvg = firstHalf.reduce((sum, p) => sum + p.quantity, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.quantity, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  private async getProductById(productId: string) {
    const [product] = await this.db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    return product;
  }

  private async getWarehouseById(warehouseId: string) {
    const [warehouse] = await this.db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, warehouseId))
      .limit(1);
    return warehouse;
  }

  async requestInventoryReport(customerId: string, format: 'pdf' | 'excel' | 'csv') {
    const reportId = `RPT-${Date.now()}`;

    return {
      reportId,
      customerId,
      format,
      status: 'generating',
      downloadUrl: `https://reports.ayazlogistics.com/${reportId}.${format}`,
      estimatedCompletionTime: new Date(Date.now() + 2 * 60 * 1000),
    };
  }
}
