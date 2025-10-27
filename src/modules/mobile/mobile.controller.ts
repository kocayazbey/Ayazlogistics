import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { MobileService } from './mobile.service';
import { WmsPermissionGuard } from '../../modules/shared/wms/guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../../modules/shared/wms/decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';

@ApiTags('Mobile Operations')
@Controller({ path: 'mobile', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('dashboard')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get mobile dashboard data' })
  async getDashboard(@CurrentUser('tenantId') tenantId: string, @Query('role') role: string) {
    return this.mobileService.getDashboardData(tenantId, role);
  }

  @Get('inventory')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Get inventory for mobile' })
  async getInventory(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.mobileService.getInventory(tenantId, filters);
  }

  @Post('location')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Update location' })
  async updateLocation(
    @Body() data: { latitude: number; longitude: number },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.mobileService.updateLocation(tenantId, userId, data);
  }

  @Get('location')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get current location' })
  async getLocation(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.mobileService.getLocation(tenantId, userId);
  }

  @Post('scan/barcode')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Scan barcode' })
  async scanBarcode(
    @Body() data: { barcode: string; metadata?: any },
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.mobileService.scanBarcode(tenantId, data.barcode, data.metadata);
  }

  @Post('scan/qr')
  @WmsPermissions(WMS_PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'Scan QR code' })
  async scanQRCode(
    @Body() data: { qrCode: string; metadata?: any },
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.mobileService.scanQRCode(tenantId, data.qrCode, data.metadata);
  }

  @Post('upload/photo')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Upload photo' })
  async uploadPhoto(
    @Body() data: { photo: string; metadata?: any },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.mobileService.uploadPhoto(tenantId, userId, data.photo, data.metadata);
  }

  @Get('orders')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get orders for mobile' })
  async getOrders(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.mobileService.getOrders(tenantId, filters);
  }

  @Get('customers')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get customers for mobile' })
  async getCustomers(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.mobileService.getCustomers(tenantId, filters);
  }

  @Get('employees')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get employees for mobile' })
  async getEmployees(
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.mobileService.getEmployees(tenantId, filters);
  }

  @Get('reports/:type')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get reports for mobile' })
  async getReports(
    @Param('type') type: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query() filters: any
  ) {
    return this.mobileService.getReports(tenantId, type, filters);
  }

  @Get('analytics/:type')
  @WmsPermissions(WMS_PERMISSIONS.ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get analytics for mobile' })
  async getAnalytics(
    @Param('type') type: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('period') period: string
  ) {
    return this.mobileService.getAnalytics(tenantId, type, period);
  }

  @Get('updates')
  @WmsPermissions(WMS_PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get updates for mobile' })
  async getUpdates(@CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.mobileService.getUpdates(tenantId, userId);
  }
}
