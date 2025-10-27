import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryAdjustmentDto } from './dto/inventory-adjustment.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async getInventoryItems(
    @Query('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.inventoryService.getInventoryItems({
      tenantId,
      warehouseId,
      category,
      status,
      search,
      page,
      limit,
    });
  }

  @Get('stats')
  async getInventoryStats(
    @Query('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getInventoryStats(tenantId, warehouseId);
  }

  @Get('abc-analysis')
  async getABCAnalysis(
    @Query('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.inventoryService.getABCAnalysis(tenantId, warehouseId);
  }

  @Get('low-stock')
  async getLowStockItems(
    @Query('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('threshold') threshold: number = 10,
  ) {
    return this.inventoryService.getLowStockItems(tenantId, warehouseId, threshold);
  }

  @Get('slow-moving')
  async getSlowMovingItems(
    @Query('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('days') days: number = 90,
  ) {
    return this.inventoryService.getSlowMovingItems(tenantId, warehouseId, days);
  }

  @Get('valuation')
  async getInventoryValuation(
    @Query('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.inventoryService.getInventoryValuation(tenantId, warehouseId, asOfDate);
  }

  @Get(':id')
  async getInventoryItem(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.inventoryService.getInventoryItem(id, tenantId);
  }

  @Get(':id/movements')
  async getInventoryMovements(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.inventoryService.getInventoryMovements(id, tenantId, { startDate, endDate });
  }

  @Post()
  async createInventoryItem(
    @Body() createInventoryItemDto: CreateInventoryItemDto,
    @Query('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.inventoryService.createInventoryItem(createInventoryItemDto, userId, tenantId);
  }

  @Put(':id')
  async updateInventoryItem(
    @Param('id') id: string,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
    @Query('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.inventoryService.updateInventoryItem(id, updateInventoryItemDto, userId, tenantId);
  }

  @Post(':id/adjust')
  async adjustInventory(
    @Param('id') id: string,
    @Body() inventoryAdjustmentDto: InventoryAdjustmentDto,
    @Query('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.inventoryService.adjustInventory(id, inventoryAdjustmentDto, userId, tenantId);
  }
}
