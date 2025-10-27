import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { CarrierService } from '../../ayaz-wms/carrier/carrier.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Carrier')
@Controller({ path: 'wms/carrier', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class CarrierController {
  constructor(private readonly carrierService: CarrierService) {}

  @Get()
  @WmsPermissions(WMS_PERMISSIONS.CARRIER_VIEW)
  @ApiOperation({ summary: 'Get all carriers' })
  async getCarriers(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.carrierService.getCarriers(tenantId, filters);
  }

  @Post()
  @WmsPermissions(WMS_PERMISSIONS.CARRIER_CREATE)
  @ApiOperation({ summary: 'Create carrier' })
  async createCarrier(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.carrierService.createCarrier(data, tenantId);
  }

  @Put(':id')
  @WmsPermissions(WMS_PERMISSIONS.CARRIER_EDIT)
  @ApiOperation({ summary: 'Update carrier' })
  async updateCarrier(@Param('id') carrierId: string, @Body() data: any) {
    return this.carrierService.updateCarrier(carrierId, data);
  }

  @Get(':id/performance')
  @WmsPermissions(WMS_PERMISSIONS.CARRIER_PERFORMANCE_VIEW)
  @ApiOperation({ summary: 'Get carrier performance' })
  async getPerformance(@Param('id') carrierId: string, @Query() params: any) {
    return this.carrierService.getCarrierPerformance(carrierId, params);
  }

  @Get('drivers')
  @WmsPermissions(WMS_PERMISSIONS.CARRIER_VIEW)
  @ApiOperation({ summary: 'Get all drivers' })
  async getDrivers(@CurrentUser('tenantId') tenantId: string) {
    return this.carrierService.getDrivers(tenantId);
  }

  @Post('drivers')
  @WmsPermissions(WMS_PERMISSIONS.CARRIER_CREATE)
  @ApiOperation({ summary: 'Create driver' })
  async createDriver(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.carrierService.createDriver(data, tenantId);
  }
}

