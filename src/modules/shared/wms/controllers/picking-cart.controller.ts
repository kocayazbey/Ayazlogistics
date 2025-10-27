import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { PickingCartService } from '../../ayaz-wms/picking-cart/picking-cart.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Picking Cart')
@Controller({ path: 'wms/picking-cart', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class PickingCartController {
  constructor(private readonly cartService: PickingCartService) {}

  @Get(':cartId')
  @WmsPermissions(WMS_PERMISSIONS.PICKING_CART_MANAGE)
  @ApiOperation({ summary: 'Query picking cart' })
  async queryCart(@Param('cartId') cartId: string, @Body('warehouseId') warehouseId: string) {
    return this.cartService.queryCart(cartId, warehouseId);
  }

  @Post('transfer')
  @WmsPermissions(WMS_PERMISSIONS.PICKING_CART_MANAGE)
  @ApiOperation({ summary: 'Transfer items between carts' })
  async transferCart(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.cartService.transferCart(data, userId);
  }

  @Post('merge')
  @WmsPermissions(WMS_PERMISSIONS.PICKING_CART_MANAGE)
  @ApiOperation({ summary: 'Merge multiple carts' })
  async mergeCarts(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.cartService.mergeCarts(data, userId);
  }

  @Post('load-vehicle')
  @WmsPermissions(WMS_PERMISSIONS.PICKING_CART_ASSIGN)
  @ApiOperation({ summary: 'Load cart to vehicle' })
  async loadToVehicle(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.cartService.loadCartToVehicle(data, userId);
  }

  @Post('final-check')
  @WmsPermissions(WMS_PERMISSIONS.PICKING_CART_ASSIGN)
  @ApiOperation({ summary: 'Perform final cart check' })
  async finalCheck(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.cartService.performFinalCheck(data, userId);
  }

  @Post('auto-count')
  @WmsPermissions(WMS_PERMISSIONS.PICKING_CART_ASSIGN)
  @ApiOperation({ summary: 'Auto-count pick face' })
  async autoCount(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.cartService.autoCountPickFace(data, userId);
  }

  @Post('assign')
  @WmsPermissions(WMS_PERMISSIONS.PICKING_CART_ASSIGN)
  @ApiOperation({ summary: 'Assign cart to picker' })
  async assignCart(@Body() data: any) {
    return this.cartService.assignCart(data.cartId, data.pickerId, data.warehouseId);
  }

  @Post('release')
  @WmsPermissions(WMS_PERMISSIONS.PICKING_CART_MANAGE)
  @ApiOperation({ summary: 'Release cart' })
  async releaseCart(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.cartService.releaseCart(data.cartId, data.warehouseId, userId);
  }

  @Get('available/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.PICKING_CART_MANAGE)
  @ApiOperation({ summary: 'Get available carts' })
  async getAvailable(@Param('warehouseId') warehouseId: string) {
    return this.cartService.getAvailableCarts(warehouseId);
  }
}

