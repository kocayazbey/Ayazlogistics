import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { HandheldTerminalService } from './handheld-terminal.service';
import { ScanBarcodeDto } from './dto/scan-barcode.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CreateMovementDto } from './dto/create-movement.dto';

@ApiTags('Handheld Terminal')
@Controller({ path: 'handheld-terminal', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HandheldTerminalController {
  constructor(private readonly handheldTerminalService: HandheldTerminalService) {}

  @Get('dashboard')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get handheld terminal dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.handheldTerminalService.getDashboard(tenantId, userId);
  }

  @Get('tasks')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get assigned tasks' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async getTasks(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.handheldTerminalService.getTasks(tenantId, userId, status);
  }

  @Get('inventory/search')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Search inventory by barcode or SKU' })
  @ApiResponse({ status: 200, description: 'Inventory search results' })
  async searchInventory(
    @Query('query') query: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.handheldTerminalService.searchInventory(query, tenantId);
  }

  @Post('scan')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Scan barcode and get product info' })
  @ApiResponse({ status: 200, description: 'Barcode scanned successfully' })
  async scanBarcode(
    @Body() scanBarcodeDto: ScanBarcodeDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.handheldTerminalService.scanBarcode(scanBarcodeDto, tenantId);
  }

  @Get('locations')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get warehouse locations' })
  @ApiResponse({ status: 200, description: 'Locations retrieved successfully' })
  async getLocations(
    @CurrentUser('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.handheldTerminalService.getLocations(tenantId, warehouseId);
  }

  @Get('products/:productId/inventory')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get product inventory details' })
  @ApiResponse({ status: 200, description: 'Inventory details retrieved successfully' })
  async getProductInventory(
    @Param('productId') productId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.handheldTerminalService.getProductInventory(productId, tenantId);
  }

  @Post('inventory/update')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Update inventory quantity' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  async updateInventory(
    @Body() updateInventoryDto: UpdateInventoryDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.updateInventory(updateInventoryDto, tenantId, userId);
  }

  @Post('movements')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Create inventory movement' })
  @ApiResponse({ status: 201, description: 'Movement created successfully' })
  async createMovement(
    @Body() createMovementDto: CreateMovementDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.createMovement(createMovementDto, tenantId, userId);
  }

  @Get('movements')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get inventory movements' })
  @ApiResponse({ status: 200, description: 'Movements retrieved successfully' })
  async getMovements(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ) {
    return this.handheldTerminalService.getMovements(tenantId, { page, limit, type });
  }

  @Get('cycle-count/tasks')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get cycle count tasks' })
  @ApiResponse({ status: 200, description: 'Cycle count tasks retrieved successfully' })
  async getCycleCountTasks(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.getCycleCountTasks(tenantId, userId);
  }

  @Post('cycle-count/start')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Start cycle count' })
  @ApiResponse({ status: 200, description: 'Cycle count started successfully' })
  async startCycleCount(
    @Body('locationId') locationId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.startCycleCount(locationId, tenantId, userId);
  }

  @Post('cycle-count/complete')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Complete cycle count' })
  @ApiResponse({ status: 200, description: 'Cycle count completed successfully' })
  async completeCycleCount(
    @Body() countData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.completeCycleCount(countData, tenantId, userId);
  }

  @Get('picking/tasks')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get picking tasks' })
  @ApiResponse({ status: 200, description: 'Picking tasks retrieved successfully' })
  async getPickingTasks(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.getPickingTasks(tenantId, userId);
  }

  @Post('picking/start')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Start picking task' })
  @ApiResponse({ status: 200, description: 'Picking task started successfully' })
  async startPickingTask(
    @Body('taskId') taskId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.startPickingTask(taskId, tenantId, userId);
  }

  @Post('picking/complete')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Complete picking task' })
  @ApiResponse({ status: 200, description: 'Picking task completed successfully' })
  async completePickingTask(
    @Body() pickingData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.completePickingTask(pickingData, tenantId, userId);
  }

  @Get('putaway/tasks')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get putaway tasks' })
  @ApiResponse({ status: 200, description: 'Putaway tasks retrieved successfully' })
  async getPutawayTasks(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.getPutawayTasks(tenantId, userId);
  }

  @Post('putaway/complete')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Complete putaway task' })
  @ApiResponse({ status: 200, description: 'Putaway task completed successfully' })
  async completePutawayTask(
    @Body() putawayData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.handheldTerminalService.completePutawayTask(putawayData, tenantId, userId);
  }

  @Get('reports/summary')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get handheld terminal summary report' })
  @ApiResponse({ status: 200, description: 'Summary report retrieved successfully' })
  async getSummaryReport(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.handheldTerminalService.getSummaryReport(tenantId, userId, { dateFrom, dateTo });
  }
}
