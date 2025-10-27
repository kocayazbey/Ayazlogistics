import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { WarehouseOperationsService } from './warehouse-operations.service';
import { CreateOperationDto } from './dto/create-operation.dto';
import { UpdateOperationDto } from './dto/update-operation.dto';
import { StartOperationDto } from './dto/start-operation.dto';
import { CompleteOperationDto } from './dto/complete-operation.dto';

@ApiTags('Warehouse Operations')
@Controller({ path: 'warehouse-operations', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WarehouseOperationsController {
  constructor(private readonly warehouseOperationsService: WarehouseOperationsService) {}

  @Get()
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get all warehouse operations' })
  @ApiResponse({ status: 200, description: 'Operations retrieved successfully' })
  async getOperations(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.warehouseOperationsService.getAll(tenantId, { page, limit, type, status, warehouseId });
  }

  @Get('pending')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get pending operations' })
  @ApiResponse({ status: 200, description: 'Pending operations retrieved successfully' })
  async getPendingOperations(@CurrentUser('tenantId') tenantId: string) {
    return this.warehouseOperationsService.getPendingOperations(tenantId);
  }

  @Get('assigned')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get operations assigned to user' })
  @ApiResponse({ status: 200, description: 'Assigned operations retrieved successfully' })
  async getAssignedOperations(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.warehouseOperationsService.getAssignedOperations(tenantId, userId);
  }

  @Get('statistics')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Get warehouse operations statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.warehouseOperationsService.getStatistics(tenantId, { warehouseId, dateFrom, dateTo });
  }

  @Get(':id')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get operation by ID' })
  @ApiResponse({ status: 200, description: 'Operation retrieved successfully' })
  async getOperationById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.warehouseOperationsService.getById(id, tenantId);
  }

  @Post()
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Create new operation' })
  @ApiResponse({ status: 201, description: 'Operation created successfully' })
  async createOperation(
    @Body() createOperationDto: CreateOperationDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.warehouseOperationsService.create(createOperationDto, tenantId, userId);
  }

  @Put(':id')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Update operation' })
  @ApiResponse({ status: 200, description: 'Operation updated successfully' })
  async updateOperation(
    @Param('id') id: string,
    @Body() updateOperationDto: UpdateOperationDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.warehouseOperationsService.update(id, updateOperationDto, tenantId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete operation' })
  @ApiResponse({ status: 200, description: 'Operation deleted successfully' })
  async deleteOperation(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.warehouseOperationsService.delete(id, tenantId);
  }

  @Post(':id/start')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Start operation' })
  @ApiResponse({ status: 200, description: 'Operation started successfully' })
  async startOperation(
    @Param('id') id: string,
    @Body() startOperationDto: StartOperationDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.warehouseOperationsService.startOperation(id, startOperationDto, tenantId, userId);
  }

  @Post(':id/complete')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Complete operation' })
  @ApiResponse({ status: 200, description: 'Operation completed successfully' })
  async completeOperation(
    @Param('id') id: string,
    @Body() completeOperationDto: CompleteOperationDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.warehouseOperationsService.completeOperation(id, completeOperationDto, tenantId, userId);
  }

  @Post(':id/cancel')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Cancel operation' })
  @ApiResponse({ status: 200, description: 'Operation cancelled successfully' })
  async cancelOperation(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.warehouseOperationsService.cancelOperation(id, reason, tenantId, userId);
  }

  @Post(':id/assign')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Assign operation to user' })
  @ApiResponse({ status: 200, description: 'Operation assigned successfully' })
  async assignOperation(
    @Param('id') id: string,
    @Body('assignedTo') assignedTo: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.warehouseOperationsService.assignOperation(id, assignedTo, tenantId);
  }

  @Get(':id/items')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get operation items' })
  @ApiResponse({ status: 200, description: 'Operation items retrieved successfully' })
  async getOperationItems(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.warehouseOperationsService.getOperationItems(id, tenantId);
  }

  @Post(':id/items')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Add item to operation' })
  @ApiResponse({ status: 200, description: 'Item added successfully' })
  async addOperationItem(
    @Param('id') id: string,
    @Body() item: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.warehouseOperationsService.addOperationItem(id, item, tenantId);
  }

  @Put(':id/items/:itemId')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Update operation item' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  async updateOperationItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() item: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.warehouseOperationsService.updateOperationItem(id, itemId, item, tenantId);
  }

  @Delete(':id/items/:itemId')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Remove item from operation' })
  @ApiResponse({ status: 200, description: 'Item removed successfully' })
  async removeOperationItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.warehouseOperationsService.removeOperationItem(id, itemId, tenantId);
  }
}
