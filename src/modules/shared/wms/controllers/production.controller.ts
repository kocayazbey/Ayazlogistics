import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { ProductionIntegrationService } from '../../ayaz-wms/production/production-integration.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Production Integration')
@Controller({ path: 'wms/production', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class ProductionController {
  constructor(private readonly productionService: ProductionIntegrationService) {}

  @Post('work-orders')
  @WmsPermissions(WMS_PERMISSIONS.PRODUCTION_CREATE)
  @ApiOperation({ summary: 'Create work order' })
  async createWorkOrder(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.productionService.createWorkOrder(data, userId);
  }

  @Post('pallets')
  @WmsPermissions(WMS_PERMISSIONS.PRODUCTION_CREATE)
  @ApiOperation({ summary: 'Create production pallet' })
  async createPallet(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.productionService.createProductionPallet(data, userId);
  }

  @Post('handover')
  @WmsPermissions(WMS_PERMISSIONS.PRODUCTION_HANDOVER)
  @ApiOperation({ summary: 'Handover to warehouse (Üretim Tesellüm)' })
  async handover(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.productionService.handoverToWarehouse(data, userId);
  }

  @Post('handover/:id/approve')
  @WmsPermissions(WMS_PERMISSIONS.PRODUCTION_APPROVE)
  @ApiOperation({ summary: 'Approve production handover' })
  async approveHandover(@Param('id') handoverId: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.productionService.approveHandover(handoverId, data.warehouseId, userId);
  }

  @Post('handover/:id/reject')
  @WmsPermissions(WMS_PERMISSIONS.PRODUCTION_REJECT)
  @ApiOperation({ summary: 'Reject production handover' })
  async rejectHandover(@Param('id') handoverId: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.productionService.rejectHandover(handoverId, data.reason, userId);
  }

  @Get('work-orders/:id')
  @WmsPermissions(WMS_PERMISSIONS.PRODUCTION_VIEW)
  @ApiOperation({ summary: 'Get work order status' })
  async getWorkOrder(@Param('id') workOrderId: string) {
    return this.productionService.getWorkOrderStatus(workOrderId);
  }

  @Post('work-orders/:id/complete')
  @WmsPermissions(WMS_PERMISSIONS.PRODUCTION_CREATE)
  @ApiOperation({ summary: 'Complete work order' })
  async completeWorkOrder(@Param('id') workOrderId: string, @CurrentUser('id') userId: string) {
    return this.productionService.completeWorkOrder(workOrderId, userId);
  }
}
