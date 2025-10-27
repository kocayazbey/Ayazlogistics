import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WmsService } from './wms.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { CreatePickDto } from './dto/create-pick.dto';
import { UpdatePickDto } from './dto/update-pick.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@ApiTags('WMS')
@Controller('wms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WmsController {
  constructor(private readonly wmsService: WmsService) {}

  @Get('inventory')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get inventory list' })
  @ApiResponse({ status: 200, description: 'Inventory list retrieved successfully' })
  async getInventory(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string
  ) {
    return this.wmsService.getInventory({ page, limit, search, category, status });
  }

  @Post('inventory')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Create new inventory item' })
  @ApiResponse({ status: 201, description: 'Inventory item created successfully' })
  async createInventory(
    @Body() createInventoryDto: CreateInventoryDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.wmsService.createInventory(createInventoryDto, tenantId);
  }

  @Put('inventory/:id')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Update inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item updated successfully' })
  async updateInventory(
    @Param('id') id: string,
    @Body() updateInventoryDto: UpdateInventoryDto
  ) {
    return this.wmsService.updateInventory(id, updateInventoryDto);
  }

  @Delete('inventory/:id')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Delete inventory item' })
  @ApiResponse({ status: 200, description: 'Inventory item deleted successfully' })
  async deleteInventory(@Param('id') id: string) {
    return this.wmsService.deleteInventory(id);
  }

  @Get('receipts')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get receipts list' })
  @ApiResponse({ status: 200, description: 'Receipts list retrieved successfully' })
  async getReceipts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('supplier') supplier?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.wmsService.getReceipts({ page, limit, status, supplier, dateFrom, dateTo });
  }

  @Post('receipts')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Create new receipt' })
  @ApiResponse({ status: 201, description: 'Receipt created successfully' })
  async createReceipt(
    @Body() createReceiptDto: CreateReceiptDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.wmsService.createReceipt(createReceiptDto, tenantId);
  }

  @Put('receipts/:id')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Update receipt' })
  @ApiResponse({ status: 200, description: 'Receipt updated successfully' })
  async updateReceipt(
    @Param('id') id: string,
    @Body() updateReceiptDto: UpdateReceiptDto
  ) {
    return this.wmsService.updateReceipt(id, updateReceiptDto);
  }

  @Post('receipts/:id/approve')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Approve receipt' })
  @ApiResponse({ status: 200, description: 'Receipt approved successfully' })
  async approveReceipt(@Param('id') id: string) {
    return this.wmsService.approveReceipt(id);
  }

  @Get('picks')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get picks list' })
  @ApiResponse({ status: 200, description: 'Picks list retrieved successfully' })
  async getPicks(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('priority') priority?: string
  ) {
    return this.wmsService.getPicks({ page, limit, status, assignedTo, priority });
  }

  @Post('picks')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Create new pick' })
  @ApiResponse({ status: 201, description: 'Pick created successfully' })
  async createPick(
    @Body() createPickDto: CreatePickDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.wmsService.createPick(createPickDto, tenantId);
  }

  @Put('picks/:id')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Update pick' })
  @ApiResponse({ status: 200, description: 'Pick updated successfully' })
  async updatePick(
    @Param('id') id: string,
    @Body() updatePickDto: UpdatePickDto
  ) {
    return this.wmsService.updatePick(id, updatePickDto);
  }

  @Post('picks/:id/assign')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Assign pick to operator' })
  @ApiResponse({ status: 200, description: 'Pick assigned successfully' })
  async assignPick(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string
  ) {
    return this.wmsService.assignPick(id, assignedTo);
  }

  @Post('picks/:id/start')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Start pick operation' })
  @ApiResponse({ status: 200, description: 'Pick operation started successfully' })
  async startPick(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.wmsService.startPick(id, tenantId);
  }

  @Post('picks/:id/complete')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Complete pick operation' })
  @ApiResponse({ status: 200, description: 'Pick operation completed successfully' })
  async completePick(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.wmsService.completePick(id, tenantId);
  }

  @Get('shipments')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get shipments list' })
  @ApiResponse({ status: 200, description: 'Shipments list retrieved successfully' })
  async getShipments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('customer') customer?: string,
    @Query('driver') driver?: string
  ) {
    return this.wmsService.getShipments({ page, limit, status, customer, driver });
  }

  @Post('shipments')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Create new shipment' })
  @ApiResponse({ status: 201, description: 'Shipment created successfully' })
  async createShipment(
    @Body() createShipmentDto: CreateShipmentDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.wmsService.createShipment(createShipmentDto, tenantId);
  }

  @Put('shipments/:id')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Update shipment' })
  @ApiResponse({ status: 200, description: 'Shipment updated successfully' })
  async updateShipment(
    @Param('id') id: string,
    @Body() updateShipmentDto: UpdateShipmentDto
  ) {
    return this.wmsService.updateShipment(id, updateShipmentDto);
  }

  @Post('shipments/:id/dispatch')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Dispatch shipment' })
  @ApiResponse({ status: 200, description: 'Shipment dispatched successfully' })
  async dispatchShipment(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.wmsService.dispatchShipment(id, tenantId);
  }

  @Get('operations')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get warehouse operations' })
  @ApiResponse({ status: 200, description: 'Operations retrieved successfully' })
  async getOperations(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.wmsService.getOperations({ type, status, dateFrom, dateTo });
  }

  @Get('operations/stats')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get warehouse operations statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getOperationsStats() {
    return this.wmsService.getOperationsStats();
  }

  @Get('zones')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get warehouse zones' })
  @ApiResponse({ status: 200, description: 'Zones retrieved successfully' })
  async getZones() {
    return this.wmsService.getZones();
  }

  @Get('zones/:id/capacity')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get zone capacity' })
  @ApiResponse({ status: 200, description: 'Zone capacity retrieved successfully' })
  async getZoneCapacity(@Param('id') id: string) {
    return this.wmsService.getZoneCapacity(id);
  }
}