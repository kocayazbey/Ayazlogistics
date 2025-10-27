import { Controller, Get, Query, UseGuards, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RealTimeMonitoringService } from '../../ayaz-wms/monitoring/real-time-monitoring.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Monitoring')
@Controller({ path: 'wms/monitoring', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class MonitoringController {
  constructor(private readonly monitoring: RealTimeMonitoringService) {}

  @Get('dashboard/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Get comprehensive warehouse dashboard' })
  async getDashboard(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.getWarehouseDashboard(warehouseId);
  }

  @Get('ptes/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor active PTEs' })
  async getActivePTEs(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorActivePTEs(warehouseId);
  }

  @Get('carts/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor picking carts' })
  async getPickingCarts(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorPickingCarts(warehouseId);
  }

  @Get('docks/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor shipping docks' })
  async getShippingDocks(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorShippingDocks(warehouseId);
  }

  @Get('pickfaces/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor pick face locations' })
  async getPickFaces(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorPickFaces(warehouseId);
  }

  @Get('replenishment/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor replenishment needs' })
  async getReplenishment(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorReplenishmentNeeds(warehouseId);
  }

  @Get('statistics/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Get location statistics' })
  async getStatistics(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.getWarehouseLocationStatistics(warehouseId);
  }

  @Get('staging/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor staging areas' })
  async getStagingAreas(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorStagingAreas(warehouseId);
  }

  @Get('receiving-area/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor receiving area pallets' })
  async getReceivingArea(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorReceivingAreaPallets(warehouseId);
  }

  @Get('shipping-area/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor shipping dock pallets' })
  async getShippingArea(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorShippingDockPallets(warehouseId);
  }

  @Get('alerts/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor alerts' })
  async getAlerts(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorAlerts(warehouseId);
  }

  @Get('planned-receiving/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.MONITORING_VIEW)
  @ApiOperation({ summary: 'Monitor planned receiving' })
  async getPlannedReceiving(@Param('warehouseId') warehouseId: string) {
    return this.monitoring.monitorPlannedReceiving(warehouseId);
  }
}

