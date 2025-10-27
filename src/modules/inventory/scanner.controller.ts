import { Controller, Post, Get, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ScannerService } from './scanner.service';
import { BarcodeValidatorService } from './barcode-validator.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';

@ApiTags('Inventory Scanner')
@Controller('inventory/scanner')
export class ScannerController {
  constructor(
    private readonly scannerService: ScannerService,
    private readonly barcodeValidator: BarcodeValidatorService,
  ) {}

  @Post('scan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Scan single barcode' })
  @ApiResponse({ status: 200, description: 'Barcode scanned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid barcode or request' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async scanBarcode(
    @Body() body: {
      barcode: string;
      warehouseId?: string;
      includeInventory?: boolean;
      includeSuggestions?: boolean;
    },
  ) {
    return this.scannerService.scanBarcode(
      body.barcode,
      body.warehouseId,
      {
        includeInventory: body.includeInventory,
        includeSuggestions: body.includeSuggestions,
      },
    );
  }

  @Post('bulk-scan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Scan multiple barcodes' })
  @ApiResponse({ status: 200, description: 'Barcodes scanned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async bulkScanBarcodes(
    @Body() body: {
      barcodes: string[];
      warehouseId?: string;
      includeInventory?: boolean;
      includeSuggestions?: boolean;
    },
  ) {
    return this.scannerService.bulkScanBarcodes(
      body.barcodes,
      body.warehouseId,
      {
        includeInventory: body.includeInventory,
        includeSuggestions: body.includeSuggestions,
      },
    );
  }

  @Post('update-inventory')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update inventory from barcode scan' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid update request' })
  async updateInventoryFromScan(
    @Body() body: {
      barcode: string;
      warehouseId: string;
      quantity: number;
      operation: 'add' | 'subtract' | 'set';
      reason?: string;
    },
    @Query('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.scannerService.updateInventoryFromScan(
      {
        barcode: body.barcode,
        warehouseId: body.warehouseId,
        quantity: body.quantity,
        operation: body.operation,
        reason: body.reason,
        userId,
      },
      tenantId,
    );
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate barcode format' })
  @ApiResponse({ status: 200, description: 'Barcode validation result' })
  async validateBarcode(
    @Body() body: {
      barcode: string;
      useCase?: 'product' | 'shipment' | 'inventory' | 'customer';
    },
  ) {
    return this.barcodeValidator.validateBarcode(body.barcode);
  }

  @Post('validate-batch')
  @ApiOperation({ summary: 'Validate multiple barcodes' })
  @ApiResponse({ status: 200, description: 'Batch validation results' })
  async validateBarcodes(
    @Body() body: {
      barcodes: string[];
      useCase?: 'product' | 'shipment' | 'inventory' | 'customer';
    },
  ) {
    return this.barcodeValidator.validateBarcodes(body.barcodes);
  }

  @Get('formats')
  @ApiOperation({ summary: 'Get supported barcode formats' })
  @ApiResponse({ status: 200, description: 'Supported formats retrieved' })
  async getSupportedFormats() {
    return this.barcodeValidator.getSupportedFormats();
  }

  @Get('suggestions/:barcode')
  @ApiOperation({ summary: 'Get barcode format suggestions' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved' })
  async getBarcodeSuggestions(@Param('barcode') barcode: string) {
    return {
      suggestions: this.barcodeValidator.generateSuggestions(barcode),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check scanner service health' })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  async checkHealth() {
    return this.scannerService.checkScannerHealth();
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get scanner statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats(
    @Query('tenantId') tenantId: string,
    @Query('timeRange') timeRange: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.scannerService.getScannerStats(tenantId, timeRange);
  }

  @Post('validate-use-case')
  @ApiOperation({ summary: 'Validate barcode for specific use case' })
  @ApiResponse({ status: 200, description: 'Use case validation result' })
  async validateForUseCase(
    @Body() body: {
      barcode: string;
      useCase: 'product' | 'shipment' | 'inventory' | 'customer';
    },
  ) {
    return this.barcodeValidator.validateForUseCase(body.barcode, body.useCase);
  }

  @Post('report')
  @ApiOperation({ summary: 'Generate barcode validation report' })
  @ApiResponse({ status: 200, description: 'Report generated' })
  async generateReport(
    @Body() body: { barcodes: string[] },
  ) {
    return this.barcodeValidator.generateValidationReport(body.barcodes);
  }
}
