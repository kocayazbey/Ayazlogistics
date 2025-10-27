import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { IntelligentInventoryService } from './intelligent-inventory.service';
import { WmsPermissionGuard } from '../../wms/guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../../wms/decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../common/interceptors/audit-logging.interceptor';
import {
  ABCXYZAnalysisDto,
  ReorderRecommendationsDto,
  DemandForecastDto,
  InventoryOptimizationDto,
  InventoryAnalysisResponseDto,
  ReorderRecommendationsResponseDto,
  DemandForecastResponseDto,
  InventoryOptimizationResponseDto,
} from './intelligent-inventory.dto';

@ApiTags('Intelligent Inventory Management')
@Controller({ path: 'wms/intelligent-inventory', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class IntelligentInventoryController {
  constructor(private readonly intelligentInventoryService: IntelligentInventoryService) {}

  @Get('abc-xyz-analysis')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_ANALYTICS_RUN)
  @ApiOperation({ summary: 'Perform ABC/XYZ analysis for inventory classification' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Warehouse ID filter' })
  @ApiQuery({ name: 'analysisPeriod', required: false, description: 'Analysis period in days', example: 90 })
  @ApiResponse({ status: 200, description: 'ABC/XYZ analysis completed successfully', type: InventoryAnalysisResponseDto })
  async performABCXYZAnalysis(
    @Query('warehouseId') warehouseId: string,
    @Query('analysisPeriod') analysisPeriod: number = 90,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.performABCXYZAnalysis(warehouseId, tenantId, analysisPeriod);
  }

  @Get('reorder-recommendations')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Generate automatic reorder recommendations' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Warehouse ID filter' })
  @ApiResponse({ status: 200, description: 'Reorder recommendations generated successfully', type: ReorderRecommendationsResponseDto })
  async generateReorderRecommendations(
    @Query('warehouseId') warehouseId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.generateReorderRecommendations(warehouseId, tenantId);
  }

  @Post('demand-forecast')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_FORECAST_VIEW)
  @ApiOperation({ summary: 'Generate demand forecast for specific product' })
  @ApiResponse({ status: 200, description: 'Demand forecast generated successfully', type: DemandForecastResponseDto })
  async generateDemandForecast(
    @Body() demandForecastDto: DemandForecastDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.generateDemandForecast(
      demandForecastDto.productId,
      demandForecastDto.warehouseId,
      tenantId,
      demandForecastDto.forecastDays,
    );
  }

  @Post('optimize-inventory')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Optimize inventory levels based on analysis' })
  @ApiResponse({ status: 200, description: 'Inventory optimization completed successfully', type: InventoryOptimizationResponseDto })
  async optimizeInventoryLevels(
    @Body() optimizationDto: InventoryOptimizationDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.optimizeInventoryLevels(
      optimizationDto.warehouseId,
      tenantId,
    );
  }

  @Get('safety-stock/:productId')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Calculate safety stock for specific product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Warehouse ID' })
  @ApiResponse({ status: 200, description: 'Safety stock calculated successfully' })
  async calculateSafetyStock(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.calculateSafetyStock(productId, warehouseId, tenantId);
  }

  @Get('reorder-point/:productId')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Calculate reorder point for specific product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Warehouse ID' })
  @ApiResponse({ status: 200, description: 'Reorder point calculated successfully' })
  async calculateReorderPoint(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.calculateReorderPoint(productId, warehouseId, tenantId);
  }

  @Get('economic-order-quantity/:productId')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Calculate Economic Order Quantity (EOQ) for specific product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Warehouse ID' })
  @ApiResponse({ status: 200, description: 'EOQ calculated successfully' })
  async calculateEOQ(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.calculateEOQ(productId, warehouseId, tenantId);
  }

  @Get('stockout-risk/:productId')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Calculate stockout risk for specific product' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Warehouse ID' })
  @ApiResponse({ status: 200, description: 'Stockout risk calculated successfully' })
  async calculateStockoutRisk(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.calculateStockoutRisk(productId, warehouseId, tenantId);
  }

  @Get('inventory-analytics')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Get comprehensive inventory analytics' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Warehouse ID filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Inventory analytics retrieved successfully' })
  async getInventoryAnalytics(
    @Query('warehouseId') warehouseId: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.getInventoryAnalytics(warehouseId, tenantId, timeRange);
  }

  @Post('bulk-analysis')
  @Roles('admin', 'manager', 'analyst')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform bulk inventory analysis for multiple products' })
  @ApiResponse({ status: 200, description: 'Bulk analysis completed successfully' })
  async performBulkAnalysis(
    @Body() bulkAnalysisDto: { productIds: string[]; warehouseId: string; analysisType: string },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.performBulkAnalysis(
      bulkAnalysisDto.productIds,
      bulkAnalysisDto.warehouseId,
      tenantId,
      bulkAnalysisDto.analysisType,
    );
  }

  @Get('inventory-alerts')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Get inventory alerts and warnings' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Warehouse ID filter' })
  @ApiQuery({ name: 'alertType', required: false, description: 'Alert type filter' })
  @ApiResponse({ status: 200, description: 'Inventory alerts retrieved successfully' })
  async getInventoryAlerts(
    @Query('warehouseId') warehouseId: string,
    @Query('alertType') alertType: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.intelligentInventoryService.getInventoryAlerts(warehouseId, tenantId, alertType);
  }
}
