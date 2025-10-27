import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { LotManagementService } from './lot-management.service';
import { CreateLotDto } from './dto/create-lot.dto';
import { UpdateLotDto } from './dto/update-lot.dto';
import { AllocateLotDto } from './dto/allocate-lot.dto';

@ApiTags('Lot Management')
@Controller({ path: 'lot-management', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LotManagementController {
  constructor(private readonly lotManagementService: LotManagementService) {}

  @Get()
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get all lots' })
  @ApiResponse({ status: 200, description: 'Lots retrieved successfully' })
  async getLots(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('expiryDate') expiryDate?: string,
  ) {
    return this.lotManagementService.getAll(tenantId, { page, limit, productId, status, expiryDate });
  }

  @Get('fifo')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get FIFO allocation for product' })
  @ApiResponse({ status: 200, description: 'FIFO allocation retrieved successfully' })
  async getFifoAllocation(
    @Query('productId') productId: string,
    @Query('quantity') quantity: number,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.lotManagementService.getFifoAllocation(productId, quantity, tenantId);
  }

  @Get('fefo')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get FEFO allocation for product' })
  @ApiResponse({ status: 200, description: 'FEFO allocation retrieved successfully' })
  async getFefoAllocation(
    @Query('productId') productId: string,
    @Query('quantity') quantity: number,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.lotManagementService.getFefoAllocation(productId, quantity, tenantId);
  }

  @Get('expiring')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get expiring lots' })
  @ApiResponse({ status: 200, description: 'Expiring lots retrieved successfully' })
  async getExpiringLots(
    @Query('days') days: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.lotManagementService.getExpiringLots(days, tenantId);
  }

  @Get(':id')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get lot by ID' })
  @ApiResponse({ status: 200, description: 'Lot retrieved successfully' })
  async getLotById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.lotManagementService.getById(id, tenantId);
  }

  @Post()
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Create new lot' })
  @ApiResponse({ status: 201, description: 'Lot created successfully' })
  async createLot(@Body() createLotDto: CreateLotDto, @CurrentUser('tenantId') tenantId: string) {
    return this.lotManagementService.create(createLotDto, tenantId);
  }

  @Put(':id')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Update lot' })
  @ApiResponse({ status: 200, description: 'Lot updated successfully' })
  async updateLot(
    @Param('id') id: string,
    @Body() updateLotDto: UpdateLotDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.lotManagementService.update(id, updateLotDto, tenantId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete lot' })
  @ApiResponse({ status: 200, description: 'Lot deleted successfully' })
  async deleteLot(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.lotManagementService.delete(id, tenantId);
  }

  @Post('allocate')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Allocate lot for order' })
  @ApiResponse({ status: 200, description: 'Lot allocated successfully' })
  async allocateLot(@Body() allocateLotDto: AllocateLotDto, @CurrentUser('tenantId') tenantId: string) {
    return this.lotManagementService.allocateLot(allocateLotDto, tenantId);
  }

  @Post('deallocate')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Deallocate lot' })
  @ApiResponse({ status: 200, description: 'Lot deallocated successfully' })
  async deallocateLot(
    @Body('lotId') lotId: string,
    @Body('quantity') quantity: number,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.lotManagementService.deallocateLot(lotId, quantity, tenantId);
  }

  @Post('transfer')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Transfer lot between locations' })
  @ApiResponse({ status: 200, description: 'Lot transferred successfully' })
  async transferLot(
    @Body('lotId') lotId: string,
    @Body('fromLocationId') fromLocationId: string,
    @Body('toLocationId') toLocationId: string,
    @Body('quantity') quantity: number,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.lotManagementService.transferLot(lotId, fromLocationId, toLocationId, quantity, tenantId);
  }

  @Get('trace/:lotId')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get lot traceability' })
  @ApiResponse({ status: 200, description: 'Lot traceability retrieved successfully' })
  async getLotTraceability(@Param('lotId') lotId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.lotManagementService.getLotTraceability(lotId, tenantId);
  }
}
