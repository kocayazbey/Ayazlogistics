import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { YardManagementService } from '../../ayaz-wms/yard-management/yard.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Yard Management')
@Controller({ path: 'wms/yard', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class YardController {
  constructor(private readonly yardService: YardManagementService) {}

  @Post('checkin')
  @WmsPermissions(WMS_PERMISSIONS.YARD_MANAGE)
  @ApiOperation({ summary: 'Vehicle check-in' })
  async checkIn(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.yardService.checkInVehicle(data, userId);
  }

  @Post('checkout')
  @WmsPermissions(WMS_PERMISSIONS.YARD_MANAGE)
  @ApiOperation({ summary: 'Vehicle check-out' })
  async checkOut(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.yardService.checkOutVehicle(data, userId);
  }

  @Post('reservation/approve')
  @WmsPermissions(WMS_PERMISSIONS.YARD_MANAGE)
  @ApiOperation({ summary: 'Approve dock reservation' })
  async approveReservation(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.yardService.approveReservation(data, userId);
  }

  @Post('load')
  @WmsPermissions(WMS_PERMISSIONS.YARD_MANAGE)
  @ApiOperation({ summary: 'Load to vehicle' })
  async loadVehicle(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.yardService.loadToVehicle(data, userId);
  }

  @Get('monitor/:warehouseId')
  @WmsPermissions(WMS_PERMISSIONS.YARD_VIEW)
  @ApiOperation({ summary: 'Monitor yard status' })
  async monitorYard(@Param('warehouseId') warehouseId: string) {
    return this.yardService.monitorYard(warehouseId);
  }

  @Post('dock/define')
  @WmsPermissions(WMS_PERMISSIONS.YARD_MANAGE)
  @ApiOperation({ summary: 'Define dock/gate' })
  async defineDock(@Body() data: any) {
    return this.yardService.defineDock(data);
  }
}

