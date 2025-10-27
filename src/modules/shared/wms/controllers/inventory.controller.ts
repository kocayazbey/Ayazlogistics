import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { InventoryService } from '../ayaz-wms/inventory/inventory.service';
import { CreateInventoryItemDto } from '../ayaz-wms/inventory/dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from '../ayaz-wms/inventory/dto/update-inventory-item.dto';
import { InventoryAdjustmentDto } from '../ayaz-wms/inventory/dto/inventory-adjustment.dto';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Inventory')
@Controller({ path: 'wms/inventory', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get inventory items' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Inventory items retrieved successfully' })
  async getInventoryItems(
    @Query('warehouseId') warehouseId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.getInventoryItems({
      tenantId,
      warehouseId,
      category,
      status,
      search,
      page,
      limit
    });
  }

  @Get('stats')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get inventory statistics' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getInventoryStats(
    @Query('warehouseId') warehouseId?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.getInventoryStats(tenantId, warehouseId);
  }

  @Get('abc-analysis')
  @WmsPermissions(WMS_PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get ABC analysis' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiResponse({ status: 200, description: 'ABC analysis retrieved successfully' })
  async getABCAnalysis(
    @Query('warehouseId') warehouseId?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.getABCAnalysis(tenantId, warehouseId);
  }

  @Get('low-stock')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get low stock items' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'threshold', required: false, description: 'Low stock threshold' })
  @ApiResponse({ status: 200, description: 'Low stock items retrieved successfully' })
  async getLowStockItems(
    @Query('warehouseId') warehouseId?: string,
    @Query('threshold') threshold: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.getLowStockItems(tenantId, warehouseId, threshold);
  }

  @Get('slow-moving')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get slow moving items' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'days', required: false, description: 'Days threshold for slow moving' })
  @ApiResponse({ status: 200, description: 'Slow moving items retrieved successfully' })
  async getSlowMovingItems(
    @Query('warehouseId') warehouseId?: string,
    @Query('days') days: number = 90,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.getSlowMovingItems(tenantId, warehouseId, days);
  }

  @Get(':id')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get inventory item by ID' })
  @ApiResponse({ status: 200, description: 'Inventory item retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async getInventoryItem(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.getInventoryItem(id, tenantId);
  }

  @Post()
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Create inventory item' })
  @ApiResponse({ status: 201, description: 'Inventory item created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createInventoryItem(
    @Body() createInventoryItemDto: CreateInventoryItemDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.createInventoryItem(createInventoryItemDto, userId, tenantId);
  }

  @Put(':id')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item updated successfully' })
  @ApiResponse({ status: 404, description: 'Inventory item not found' })
  async updateInventoryItem(
    @Param('id') id: string,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.updateInventoryItem(id, updateInventoryItemDto, userId, tenantId);
  }

  @Post(':id/adjust')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'Adjust inventory quantity' })
  @ApiResponse({ status: 200, description: 'Inventory adjusted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid adjustment data' })
  async adjustInventory(
    @Param('id') id: string,
    @Body() inventoryAdjustmentDto: InventoryAdjustmentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.adjustInventory(id, inventoryAdjustmentDto, userId, tenantId);
  }

  @Get(':id/movements')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get inventory movements' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for movements' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for movements' })
  @ApiResponse({ status: 200, description: 'Inventory movements retrieved successfully' })
  async getInventoryMovements(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.getInventoryMovements(id, tenantId, { startDate, endDate });
  }

  @Get('reports/valuation')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get inventory valuation report' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'Valuation date' })
  @ApiResponse({ status: 200, description: 'Valuation report retrieved successfully' })
  async getInventoryValuation(
    @Query('warehouseId') warehouseId?: string,
    @Query('asOfDate') asOfDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.inventoryService.getInventoryValuation(tenantId, warehouseId, asOfDate);
  }
}
