import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsOperationsService } from '../ayaz-wms/operations/wms-operations.service';
import { CreateOperationDto } from '../ayaz-wms/operations/dto/create-operation.dto';
import { UpdateOperationDto } from '../ayaz-wms/operations/dto/update-operation.dto';
import { OperationStatusDto } from '../ayaz-wms/operations/dto/operation-status.dto';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Operations')
@Controller({ path: 'wms/operations', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class WmsOperationsController {
  constructor(private readonly operationsService: WmsOperationsService) {}

  @Get()
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get all operations' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by operation status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by operation type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Operations retrieved successfully' })
  async getOperations(
    @Query('warehouseId') warehouseId?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.getOperations({
      tenantId,
      warehouseId,
      status,
      type,
      page,
      limit
    });
  }

  @Get('stats')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get operations statistics' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getOperationsStats(
    @Query('warehouseId') warehouseId?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.getOperationsStats(tenantId, warehouseId);
  }

  @Get(':id')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get operation by ID' })
  @ApiResponse({ status: 200, description: 'Operation retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Operation not found' })
  async getOperation(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.getOperation(id, tenantId);
  }

  @Post()
  @Roles('admin', 'manager', 'supervisor')
  @ApiOperation({ summary: 'Create new operation' })
  @ApiResponse({ status: 201, description: 'Operation created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createOperation(
    @Body() createOperationDto: CreateOperationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.createOperation(createOperationDto, userId, tenantId);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'supervisor')
  @ApiOperation({ summary: 'Update operation' })
  @ApiResponse({ status: 200, description: 'Operation updated successfully' })
  @ApiResponse({ status: 404, description: 'Operation not found' })
  async updateOperation(
    @Param('id') id: string,
    @Body() updateOperationDto: UpdateOperationDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.updateOperation(id, updateOperationDto, userId, tenantId);
  }

  @Post(':id/start')
  @Roles('admin', 'manager', 'supervisor', 'operator')
  @ApiOperation({ summary: 'Start operation' })
  @ApiResponse({ status: 200, description: 'Operation started successfully' })
  @ApiResponse({ status: 400, description: 'Operation cannot be started' })
  async startOperation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.startOperation(id, userId, tenantId);
  }

  @Post(':id/complete')
  @Roles('admin', 'manager', 'supervisor', 'operator')
  @ApiOperation({ summary: 'Complete operation' })
  @ApiResponse({ status: 200, description: 'Operation completed successfully' })
  @ApiResponse({ status: 400, description: 'Operation cannot be completed' })
  async completeOperation(
    @Param('id') id: string,
    @Body() operationStatusDto: OperationStatusDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.completeOperation(id, operationStatusDto, userId, tenantId);
  }

  @Post(':id/pause')
  @Roles('admin', 'manager', 'supervisor', 'operator')
  @ApiOperation({ summary: 'Pause operation' })
  @ApiResponse({ status: 200, description: 'Operation paused successfully' })
  async pauseOperation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.pauseOperation(id, userId, tenantId);
  }

  @Post(':id/resume')
  @Roles('admin', 'manager', 'supervisor', 'operator')
  @ApiOperation({ summary: 'Resume operation' })
  @ApiResponse({ status: 200, description: 'Operation resumed successfully' })
  async resumeOperation(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.resumeOperation(id, userId, tenantId);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get operation activities' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  async getOperationActivities(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.getOperationActivities(id, tenantId);
  }

  @Get('performance/metrics')
  @ApiOperation({ summary: 'Get operations performance metrics' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for metrics' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(
    @Query('warehouseId') warehouseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationsService.getPerformanceMetrics(tenantId, {
      warehouseId,
      startDate,
      endDate
    });
  }
}
