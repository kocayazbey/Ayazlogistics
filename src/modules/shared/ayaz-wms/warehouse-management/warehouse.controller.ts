import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../../wms/guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../../wms/decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS - Warehouse Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@Controller('api/v1/wms/warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  @WmsPermissions(WMS_PERMISSIONS.WAREHOUSE_VIEW)
  @ApiOperation({ summary: 'Get all warehouses' })
  @ApiResponse({ status: 200, description: 'Warehouses retrieved successfully' })
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.warehouseService.findAll(user.tenantId, { status, search });
  }

  @Get(':id')
  @WmsPermissions(WMS_PERMISSIONS.WAREHOUSE_VIEW)
  @ApiOperation({ summary: 'Get warehouse by ID' })
  @ApiResponse({ status: 200, description: 'Warehouse retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.warehouseService.findOne(id, user.tenantId);
  }

  @Post()
  @WmsPermissions(WMS_PERMISSIONS.WAREHOUSE_CREATE)
  @ApiOperation({ summary: 'Create new warehouse' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully' })
  async create(@CurrentUser() user: any, @Body() warehouseData: any) {
    return this.warehouseService.create(warehouseData, user.tenantId);
  }

  @Put(':id')
  @WmsPermissions(WMS_PERMISSIONS.WAREHOUSE_EDIT)
  @ApiOperation({ summary: 'Update warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse updated successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() warehouseData: any,
  ) {
    return this.warehouseService.update(id, warehouseData, user.tenantId);
  }

  @Delete(':id')
  @WmsPermissions(WMS_PERMISSIONS.WAREHOUSE_DELETE)
  @ApiOperation({ summary: 'Delete warehouse' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted successfully' })
  @ApiResponse({ status: 404, description: 'Warehouse not found' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.warehouseService.remove(id, user.tenantId);
  }

  @Get(':id/metrics')
  @WmsPermissions(WMS_PERMISSIONS.WAREHOUSE_VIEW)
  @ApiOperation({ summary: 'Get warehouse metrics' })
  @ApiResponse({ status: 200, description: 'Warehouse metrics retrieved successfully' })
  async getMetrics(@CurrentUser() user: any, @Param('id') id: string) {
    return this.warehouseService.getMetrics(id, user.tenantId);
  }
}
