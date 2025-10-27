import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_ORM } from '../../database/database.constants';
import { StandardizedDatabaseService } from '../../database/standardized-database.service';
import { BarcodeValidatorService, BarcodeValidationResult } from './barcode-validator.service';
import { products, inventory, warehouses } from '../../database/schema/shared/wms.schema';
import { eq, and, or } from 'drizzle-orm';

export interface ScanResult {
  success: boolean;
  product?: any;
  inventory?: any;
  warehouse?: any;
  quantity?: number;
  location?: string;
  barcode: string;
  barcodeType?: string;
  validation: BarcodeValidationResult;
  error?: string;
  errorCode?: string;
  suggestions?: string[];
}

export interface BulkScanResult {
  total: number;
  successful: number;
  failed: number;
  results: ScanResult[];
  errors: Array<{ barcode: string; error: string; errorCode: string }>;
}

export interface InventoryUpdateRequest {
  barcode: string;
  warehouseId: string;
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
  reason?: string;
  userId: string;
}

@Injectable()
export class ScannerService {
  private readonly logger = new Logger(ScannerService.name);
  private readonly maxBatchSize: number;
  private readonly scanTimeout: number;

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly dbService: StandardizedDatabaseService,
    private readonly configService: ConfigService,
    private readonly barcodeValidator: BarcodeValidatorService,
  ) {
    this.maxBatchSize = this.configService.get<number>('SCANNER_MAX_BATCH_SIZE', 100);
    this.scanTimeout = this.configService.get<number>('SCANNER_TIMEOUT_MS', 30000);
  }

  private get db() {
    return this.dbService.getDb();
  }

  /**
   * Scan single barcode and get product/inventory information
   */
  async scanBarcode(
    barcode: string,
    warehouseId?: string,
    options?: {
      includeInventory?: boolean;
      includeSuggestions?: boolean;
      useCase?: 'product' | 'shipment' | 'inventory' | 'customer';
    },
  ): Promise<ScanResult> {
    try {
      this.logger.log(`Scanning barcode: ${barcode} for warehouse: ${warehouseId || 'any'}`);

      // Validate barcode format
      const validation = this.barcodeValidator.validateBarcode(barcode);

      if (!validation.isValid) {
        const suggestions = options?.includeSuggestions
          ? this.barcodeValidator.generateSuggestions(barcode)
          : undefined;

        return {
          success: false,
          barcode,
          validation,
          error: validation.error,
          errorCode: validation.errorCode,
          suggestions,
        };
      }

      // Find product by SKU or barcode
      const [product] = await this.db
        .select()
        .from(products)
        .where(
          or(
            eq(products.sku, barcode),
            eq(products.barcode, barcode)
          )
        )
        .limit(1);

      if (!product) {
        return {
          success: false,
          barcode,
          validation,
          error: 'Product not found',
          errorCode: 'PRODUCT_NOT_FOUND',
          suggestions: options?.includeSuggestions
            ? this.barcodeValidator.generateSuggestions(barcode)
            : undefined,
        };
      }

      let inventoryData = null;
      let warehouseData = null;

      // Get inventory information if warehouse specified
      if (warehouseId) {
        const [inventoryRecord] = await this.db
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.productId, product.id),
              eq(inventory.warehouseId, warehouseId),
              eq(inventory.isDeleted, false)
            )
          )
          .limit(1);

        if (inventoryRecord) {
          inventoryData = inventoryRecord;

          // Get warehouse information
          const [warehouse] = await this.db
            .select()
            .from(warehouses)
            .where(eq(warehouses.id, warehouseId))
            .limit(1);

          warehouseData = warehouse;
        }
      } else {
        // Get all inventory locations for this product
        const inventoryRecords = await this.db
          .select({
            inventory: inventory,
            warehouse: warehouses,
          })
          .from(inventory)
          .innerJoin(warehouses, eq(inventory.warehouseId, warehouses.id))
          .where(
            and(
              eq(inventory.productId, product.id),
              eq(inventory.isDeleted, false),
              eq(warehouses.isDeleted, false)
            )
          );

        if (inventoryRecords.length > 0) {
          inventoryData = inventoryRecords[0].inventory;
          warehouseData = inventoryRecords[0].warehouse;
        }
      }

      return {
        success: true,
        product,
        inventory: inventoryData,
        warehouse: warehouseData,
        barcode,
        barcodeType: validation.barcodeType,
        validation,
        quantity: inventoryData?.quantityAvailable || 0,
        location: inventoryData?.locationId || null,
      };
    } catch (error) {
      this.logger.error(`Barcode scan failed: ${barcode}`, error);
      return {
        success: false,
        barcode,
        validation: { isValid: false, error: 'Scan failed' },
        error: 'Internal scan error',
        errorCode: 'SCAN_ERROR',
      };
    }
  }

  /**
   * Bulk scan multiple barcodes
   */
  async bulkScanBarcodes(
    barcodes: string[],
    warehouseId?: string,
    options?: {
      includeInventory?: boolean;
      includeSuggestions?: boolean;
      useCase?: 'product' | 'shipment' | 'inventory' | 'customer';
    },
  ): Promise<BulkScanResult> {
    try {
      if (barcodes.length > this.maxBatchSize) {
        throw new Error(`Batch size exceeds maximum allowed: ${this.maxBatchSize}`);
      }

      if (barcodes.length === 0) {
        return {
          total: 0,
          successful: 0,
          failed: 0,
          results: [],
          errors: [],
        };
      }

      this.logger.log(`Bulk scanning ${barcodes.length} barcodes`);

      // Process barcodes concurrently with timeout
      const scanPromises = barcodes.map(barcode =>
        Promise.race([
          this.scanBarcode(barcode, warehouseId, options),
          new Promise<ScanResult>((resolve) =>
            setTimeout(() => resolve({
              success: false,
              barcode,
              validation: { isValid: false, error: 'Scan timeout' },
              error: 'Scan timeout',
              errorCode: 'TIMEOUT',
            }), this.scanTimeout)
          ),
        ])
      );

      const results = await Promise.all(scanPromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      const errors = failed.map(r => ({
        barcode: r.barcode,
        error: r.error || 'Unknown error',
        errorCode: r.errorCode || 'UNKNOWN_ERROR',
      }));

      return {
        total: barcodes.length,
        successful: successful.length,
        failed: failed.length,
        results,
        errors,
      };
    } catch (error) {
      this.logger.error('Bulk scan failed:', error);
      throw error;
    }
  }

  /**
   * Update inventory based on barcode scan
   */
  async updateInventoryFromScan(
    request: InventoryUpdateRequest,
    tenantId: string,
  ): Promise<{ success: boolean; updatedInventory?: any; error?: string }> {
    try {
      this.logger.log(`Updating inventory from scan: ${request.barcode} - Operation: ${request.operation}`);

      // Validate barcode
      const validation = this.barcodeValidator.validateBarcode(request.barcode);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid barcode: ${validation.error}`,
        };
      }

      // Find product by barcode/SKU
      const [product] = await this.db
        .select()
        .from(products)
        .where(
          or(
            eq(products.sku, request.barcode),
            eq(products.barcode, request.barcode)
          )
        )
        .limit(1);

      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      // Find inventory record
      const [inventoryRecord] = await this.db
        .select()
        .from(inventory)
        .where(
          and(
            eq(inventory.productId, product.id),
            eq(inventory.warehouseId, request.warehouseId),
            eq(inventory.isDeleted, false)
          )
        )
        .limit(1);

      if (!inventoryRecord) {
        return {
          success: false,
          error: 'Inventory record not found for this warehouse',
        };
      }

      // Calculate new quantity
      let newQuantity: number;
      switch (request.operation) {
        case 'add':
          newQuantity = inventoryRecord.quantityOnHand + request.quantity;
          break;
        case 'subtract':
          newQuantity = Math.max(0, inventoryRecord.quantityOnHand - request.quantity);
          break;
        case 'set':
          newQuantity = request.quantity;
          break;
        default:
          return {
            success: false,
            error: 'Invalid operation type',
          };
      }

      // Update inventory
      const [updatedInventory] = await this.db
        .update(inventory)
        .set({
          quantityOnHand: newQuantity,
          quantityAvailable: Math.max(0, newQuantity - inventoryRecord.quantityReserved),
          lastMovementDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventory.id, inventoryRecord.id))
        .returning();

      // Create inventory movement record
      await this.createInventoryMovement({
        inventoryId: inventoryRecord.id,
        movementType: request.operation === 'add' ? 'in' : 'out',
        quantity: request.quantity,
        reason: request.reason || 'Scanner update',
        performedBy: request.userId,
        tenantId,
      });

      this.logger.log(`Inventory updated: ${product.sku} - New quantity: ${newQuantity}`);

      return {
        success: true,
        updatedInventory,
      };
    } catch (error) {
      this.logger.error('Inventory update from scan failed:', error);
      return {
        success: false,
        error: 'Failed to update inventory',
      };
    }
  }

  /**
   * Validate barcode for specific use case
   */
  validateBarcodeForUseCase(
    barcode: string,
    useCase: 'product' | 'shipment' | 'inventory' | 'customer',
  ): BarcodeValidationResult {
    return this.barcodeValidator.validateForUseCase(barcode, useCase);
  }

  /**
   * Get barcode validation report
   */
  getBarcodeValidationReport(barcodes: string[]): any {
    return this.barcodeValidator.generateValidationReport(barcodes);
  }

  /**
   * Get supported barcode formats
   */
  getSupportedFormats(): any {
    return this.barcodeValidator.getSupportedFormats();
  }

  /**
   * Detect barcode type
   */
  detectBarcodeType(barcode: string): string | null {
    return this.barcodeValidator.detectBarcodeType(barcode);
  }

  /**
   * Create inventory movement record
   */
  private async createInventoryMovement(movement: {
    inventoryId: string;
    movementType: 'in' | 'out' | 'transfer' | 'adjustment';
    quantity: number;
    reason: string;
    performedBy: string;
    tenantId: string;
  }): Promise<void> {
    // TODO: Implement inventory movements table and create movement record
    this.logger.log(`Inventory movement created: ${movement.inventoryId} - ${movement.movementType} ${movement.quantity}`);
  }

  /**
   * Check if scanner is healthy
   */
  async checkScannerHealth(): Promise<{ healthy: boolean; message: string; details: any }> {
    try {
      // Test database connectivity
      await this.db.execute('SELECT 1');

      // Test barcode validator
      const testValidation = this.barcodeValidator.validateBarcode('1234567890123');

      return {
        healthy: true,
        message: 'Scanner service is operational',
        details: {
          database: 'connected',
          barcodeValidator: testValidation.isValid ? 'working' : 'error',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Scanner health check failed:', error);
      return {
        healthy: false,
        message: 'Scanner service has issues',
        details: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Get scanner statistics
   */
  async getScannerStats(tenantId: string, timeRange: 'day' | 'week' | 'month' = 'day'): Promise<{
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    uniqueProducts: number;
    uniqueBarcodes: number;
    errorRate: number;
    topErrors: Array<{ error: string; count: number }>;
  }> {
    try {
      // TODO: Implement scanner statistics from audit logs or dedicated table
      // For now, return mock data
      return {
        totalScans: 0,
        successfulScans: 0,
        failedScans: 0,
        uniqueProducts: 0,
        uniqueBarcodes: 0,
        errorRate: 0,
        topErrors: [],
      };
    } catch (error) {
      this.logger.error('Failed to get scanner statistics:', error);
      throw error;
    }
  }

  /**
   * Validate inventory operation
   */
  private validateInventoryOperation(
    currentQuantity: number,
    requestedQuantity: number,
    operation: string,
  ): { valid: boolean; error?: string } {
    switch (operation) {
      case 'subtract':
        if (requestedQuantity > currentQuantity) {
          return {
            valid: false,
            error: 'Cannot subtract more than available quantity',
          };
        }
        break;
      case 'set':
        if (requestedQuantity < 0) {
          return {
            valid: false,
            error: 'Quantity cannot be negative',
          };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Get product by barcode or SKU
   */
  private async findProductByBarcode(barcode: string): Promise<any | null> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(
        or(
          eq(products.sku, barcode),
          eq(products.barcode, barcode)
        )
      )
      .limit(1);

    return product || null;
  }

  /**
   * Get inventory by product and warehouse
   */
  private async findInventoryByProductAndWarehouse(
    productId: string,
    warehouseId: string,
  ): Promise<any | null> {
    const [inventoryRecord] = await this.db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, productId),
          eq(inventory.warehouseId, warehouseId),
          eq(inventory.isDeleted, false)
        )
      )
      .limit(1);

    return inventoryRecord || null;
  }
}
