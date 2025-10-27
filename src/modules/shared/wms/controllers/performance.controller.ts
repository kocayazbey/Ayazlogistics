import { Controller, Get, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { PerformanceReportingService } from '../../ayaz-wms/performance/performance-reporting.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Performance')
@Controller({ path: 'wms/performance', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceReportingService) {}

  @Get('personnel')
  @WmsPermissions(WMS_PERMISSIONS.PERFORMANCE_VIEW)
  @ApiOperation({ summary: 'Personnel performance report' })
  async getPersonnelPerformance(@Query() params: any) {
    return this.performanceService.getPersonnelPerformance(params);
  }

  @Get('forklift')
  @WmsPermissions(WMS_PERMISSIONS.PERFORMANCE_VIEW)
  @ApiOperation({ summary: 'Forklift performance report' })
  async getForkliftPerformance(@Query() params: any) {
    return this.performanceService.getForkliftPerformance(params);
  }

  @Get('picker')
  @WmsPermissions(WMS_PERMISSIONS.PERFORMANCE_VIEW)
  @ApiOperation({ summary: 'Picker performance analysis' })
  async getPickerPerformance(@Query() params: any) {
    return this.performanceService.getPickerPerformance(params);
  }

  @Get('order-preparation')
  @WmsPermissions(WMS_PERMISSIONS.PERFORMANCE_VIEW)
  @ApiOperation({ summary: 'Order preparation performance' })
  async getOrderPrepPerformance(@Query() params: any) {
    return this.performanceService.getOrderPreparationPerformance(params);
  }

  @Get('supplier')
  @WmsPermissions(WMS_PERMISSIONS.PERFORMANCE_VIEW)
  @ApiOperation({ summary: 'Supplier performance analysis' })
  async getSupplierPerformance(@Query() params: any) {
    return this.performanceService.getSupplierPerformance(params);
  }

  @Get('vehicle')
  @WmsPermissions(WMS_PERMISSIONS.PERFORMANCE_VIEW)
  @ApiOperation({ summary: 'Vehicle shipping performance' })
  async getVehiclePerformance(@Query() params: any) {
    return this.performanceService.getVehicleShippingPerformance(params);
  }
}

