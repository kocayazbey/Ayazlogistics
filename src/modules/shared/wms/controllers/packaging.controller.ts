import { Controller, Get, Post, Delete, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { PackagingService } from '../../ayaz-wms/packaging/packaging.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Packaging')
@Controller({ path: 'wms/packaging', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  @Post('carton')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_CREATE)
  @ApiOperation({ summary: 'Create carton' })
  async createCarton(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.packagingService.createCarton(data, userId);
  }

  @Post('carton/add-item')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_CREATE)
  @ApiOperation({ summary: 'Add item to carton' })
  async addItem(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.packagingService.addItemToCarton(data, userId);
  }

  @Post('carton/its')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_CREATE)
  @ApiOperation({ summary: 'ITS carton packaging' })
  async createITSCarton(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.packagingService.createITSCarton(data, userId);
  }

  @Post('carton/final-check')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_MANAGE)
  @ApiOperation({ summary: 'Final carton check' })
  async finalCheck(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.packagingService.performFinalCartonCheck(data, userId);
  }

  @Post('carton/transfer')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_MANAGE)
  @ApiOperation({ summary: 'Transfer items between cartons' })
  async transferItems(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.packagingService.transferCartonItems(data, userId);
  }

  @Post('carton/load')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_MANAGE)
  @ApiOperation({ summary: 'Load cartons to vehicle' })
  async loadToVehicle(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.packagingService.loadCartonToVehicle(data, userId);
  }

  @Delete('carton/:cartonNumber')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_MANAGE)
  @ApiOperation({ summary: 'Delete carton' })
  async deleteCarton(@Param('cartonNumber') cartonNumber: string, @Body() data: any, @CurrentUser('id') userId: string) {
    return this.packagingService.deleteCarton(cartonNumber, data.reason, data.warehouseId, userId);
  }

  @Post('carton/handover')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_MANAGE)
  @ApiOperation({ summary: 'Handover to carrier' })
  async handover(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.packagingService.handoverToCarrier(data, userId);
  }

  @Get('carton/:cartonNumber')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_CREATE)
  @ApiOperation({ summary: 'Query carton' })
  async queryCarton(@Param('cartonNumber') cartonNumber: string) {
    return this.packagingService.queryCarton(cartonNumber);
  }

  @Get('status/:orderNumber/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.PACKAGING_CREATE)
  @ApiOperation({ summary: 'Monitor packaging status' })
  async monitorStatus(@Param('orderNumber') orderNumber: string, @Param('warehouseId') warehouseId: string) {
    return this.packagingService.monitorPackagingStatus(orderNumber, warehouseId);
  }
}

