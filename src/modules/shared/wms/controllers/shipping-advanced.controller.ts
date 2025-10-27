import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { ShippingAdvancedService } from '../../ayaz-wms/shipping-advanced/shipping-advanced.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Shipping Advanced')
@Controller({ path: 'wms/shipping-advanced', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class ShippingAdvancedController {
  constructor(private readonly shippingService: ShippingAdvancedService) {}

  @Post('pre-order')
  @WmsPermissions(WMS_PERMISSIONS.SHIPPING_ADVANCED_CREATE)
  @ApiOperation({ summary: 'Create pre-order' })
  async createPreOrder(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.shippingService.createPreOrder(data, userId);
  }

  @Post('shipment/plan')
  @WmsPermissions(WMS_PERMISSIONS.SHIPPING_ADVANCED_MANAGE)
  @ApiOperation({ summary: 'Plan shipment' })
  async planShipment(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.shippingService.planShipment(data, userId);
  }

  @Post('shipment/start')
  @WmsPermissions(WMS_PERMISSIONS.SHIPPING_ADVANCED_EXECUTE)
  @ApiOperation({ summary: 'Start shipment' })
  async startShipment(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.shippingService.startShipment(data, userId);
  }

  @Post('shipment/approve')
  @WmsPermissions(WMS_PERMISSIONS.SHIPPING_ADVANCED_MANAGE)
  @ApiOperation({ summary: 'Approve shipment' })
  async approveShipment(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.shippingService.approveShipment(data, userId);
  }

  @Post('shipment/cancel')
  @WmsPermissions(WMS_PERMISSIONS.SHIPPING_ADVANCED_MANAGE)
  @ApiOperation({ summary: 'Cancel shipment' })
  async cancelShipment(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.shippingService.cancelShipment(data, userId);
  }

  @Post('invoice/cut')
  @WmsPermissions(WMS_PERMISSIONS.SHIPPING_ADVANCED_MANAGE)
  @ApiOperation({ summary: 'Cut invoice for shipment' })
  async cutInvoice(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.shippingService.cutInvoice(data, userId);
  }

  @Post('conveyor-picking')
  @WmsPermissions(WMS_PERMISSIONS.SHIPPING_ADVANCED_EXECUTE)
  @ApiOperation({ summary: 'Conveyor picking operation' })
  async conveyorPicking(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.shippingService.conveyorPicking(data, userId);
  }

  @Post('direct-exit')
  @WmsPermissions(WMS_PERMISSIONS.SHIPPING_ADVANCED_EXECUTE)
  @ApiOperation({ summary: 'Stock direct exit without operation' })
  async directExit(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.shippingService.stockDirectExit(data, userId);
  }
}

