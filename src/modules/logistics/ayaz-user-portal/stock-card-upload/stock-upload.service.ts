import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { stockCards } from '../../../../database/schema/shared/erp-inventory.schema';
import { products } from '../../../../database/schema/shared/wms.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import * as XLSX from 'xlsx';

interface StockCardRow {
  sku: string;
  barcode?: string;
  productName: string;
  description?: string;
  category?: string;
  brand?: string;
  unitCost?: number;
  unitPrice?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  errors?: string[];
}

@Injectable()
export class StockUploadService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async parseExcelFile(fileBuffer: Buffer): Promise<StockCardRow[]> {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

    const parsedRows: StockCardRow[] = rawData.map((row, index) => ({
      sku: row.SKU || row.sku || '',
      barcode: row.Barcode || row.barcode || '',
      productName: row.ProductName || row['Product Name'] || row.productName || '',
      description: row.Description || row.description || '',
      category: row.Category || row.category || '',
      brand: row.Brand || row.brand || '',
      unitCost: parseFloat(row.UnitCost || row['Unit Cost'] || row.unitCost || '0'),
      unitPrice: parseFloat(row.UnitPrice || row['Unit Price'] || row.unitPrice || '0'),
      reorderPoint: parseInt(row.ReorderPoint || row['Reorder Point'] || row.reorderPoint || '0'),
      reorderQuantity: parseInt(row.ReorderQuantity || row['Reorder Quantity'] || row.reorderQuantity || '0'),
      errors: [],
    }));

    return parsedRows;
  }

  async validateStockCards(rows: StockCardRow[], tenantId: string): Promise<{
    valid: StockCardRow[];
    invalid: StockCardRow[];
    summary: any;
  }> {
    const valid: StockCardRow[] = [];
    const invalid: StockCardRow[] = [];

    const existingSKUs = new Set();
    const allStockCards = await this.db
      .select()
      .from(stockCards)
      .where(eq(stockCards.tenantId, tenantId));

    for (const card of allStockCards) {
      existingSKUs.add(card.sku);
      if (card.barcode) existingSKUs.add(card.barcode);
    }

    for (const row of rows) {
      const errors = [];

      if (!row.sku || row.sku.trim() === '') {
        errors.push('SKU is required');
      } else if (existingSKUs.has(row.sku)) {
        errors.push('SKU already exists');
      }

      if (!row.productName || row.productName.trim() === '') {
        errors.push('Product name is required');
      }

      if (row.barcode && existingSKUs.has(row.barcode)) {
        errors.push('Barcode already exists');
      }

      if (row.unitCost && row.unitCost < 0) {
        errors.push('Unit cost cannot be negative');
      }

      if (row.unitPrice && row.unitPrice < 0) {
        errors.push('Unit price cannot be negative');
      }

      row.errors = errors;

      if (errors.length === 0) {
        valid.push(row);
        existingSKUs.add(row.sku);
        if (row.barcode) existingSKUs.add(row.barcode);
      } else {
        invalid.push(row);
      }
    }

    return {
      valid,
      invalid,
      summary: {
        total: rows.length,
        valid: valid.length,
        invalid: invalid.length,
        validationRate: (valid.length / rows.length) * 100,
      },
    };
  }

  async importStockCards(validRows: StockCardRow[], tenantId: string, userId: string) {
    const imported = [];
    const failed = [];

    for (const row of validRows) {
      try {
        const [stockCard] = await this.db
          .insert(stockCards)
          .values({
            tenantId,
            sku: row.sku,
            barcode: row.barcode,
            productName: row.productName,
            description: row.description,
            category: row.category,
            brand: row.brand,
            unitCost: row.unitCost?.toString(),
            unitPrice: row.unitPrice?.toString(),
            reorderPoint: row.reorderPoint,
            reorderQuantity: row.reorderQuantity,
            quantityOnHand: 0,
            quantityAvailable: 0,
            quantityReserved: 0,
            isActive: true,
          })
          .returning();

        const [product] = await this.db
          .insert(products)
          .values({
            tenantId,
            sku: row.sku,
            barcode: row.barcode,
            name: row.productName,
            description: row.description,
            category: row.category,
            isHazmat: false,
            isPerishable: false,
            requiresSerialNumber: false,
            requiresLotNumber: false,
          })
          .returning();

        imported.push({ stockCard, product });
      } catch (error) {
        failed.push({
          row,
          error: error.message,
        });
      }
    }

    await this.eventBus.emit('stock.cards.imported', {
      tenantId,
      importedCount: imported.length,
      failedCount: failed.length,
      userId,
    });

    return {
      imported: imported.length,
      failed: failed.length,
      details: {
        imported,
        failed,
      },
    };
  }

  async downloadTemplate() {
    const template = [
      {
        SKU: 'SAMPLE-001',
        Barcode: '1234567890123',
        ProductName: 'Sample Product',
        Description: 'Sample Description',
        Category: 'Electronics',
        Brand: 'Sample Brand',
        UnitCost: 10.00,
        UnitPrice: 15.00,
        ReorderPoint: 10,
        ReorderQuantity: 50,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Cards');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      filename: 'stock-cards-template.xlsx',
      buffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async exportStockCards(tenantId: string, filters?: { category?: string; isActive?: boolean }) {
    let query = this.db.select().from(stockCards).where(eq(stockCards.tenantId, tenantId));

    if (filters?.category) {
      query = query.where(and(eq(stockCards.tenantId, tenantId), eq(stockCards.category, filters.category)));
    }

    if (filters?.isActive !== undefined) {
      query = query.where(and(eq(stockCards.tenantId, tenantId), eq(stockCards.isActive, filters.isActive)));
    }

    const cards = await query;

    const exportData = cards.map((card: any) => ({
      SKU: card.sku,
      Barcode: card.barcode,
      ProductName: card.productName,
      Description: card.description,
      Category: card.category,
      Brand: card.brand,
      UnitCost: card.unitCost,
      UnitPrice: card.unitPrice,
      QuantityOnHand: card.quantityOnHand,
      QuantityAvailable: card.quantityAvailable,
      ReorderPoint: card.reorderPoint,
      ReorderQuantity: card.reorderQuantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Cards');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return {
      filename: `stock-cards-${Date.now()}.xlsx`,
      buffer,
      recordCount: cards.length,
    };
  }
}
