import { Controller, Get, Post, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { CycleCountAdvancedService } from '../../ayaz-wms/cycle-count-advanced/cycle-count-advanced.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Cycle Count Advanced')
@Controller({ path: 'wms/cycle-count-advanced', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class CycleCountAdvancedController {
  constructor(private readonly countService: CycleCountAdvancedService) {}

  @Post('dynamic-pallet')
  @WmsPermissions(WMS_PERMISSIONS.CYCLE_COUNT_ADVANCED_EXECUTE)
  @ApiOperation({ summary: 'Dynamic pallet count' })
  async dynamicPalletCount(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.countService.performDynamicPalletCount(data, userId);
  }

  @Post('dynamic-pickface')
  @WmsPermissions(WMS_PERMISSIONS.CYCLE_COUNT_ADVANCED_EXECUTE)
  @ApiOperation({ summary: 'Dynamic pick face count' })
  async dynamicPickFaceCount(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.countService.performDynamicPickFaceCount(data, userId);
  }

  @Post('periodic-normal')
  @WmsPermissions(WMS_PERMISSIONS.CYCLE_COUNT_ADVANCED_EXECUTE)
  @ApiOperation({ summary: 'Periodic normal count' })
  async periodicNormalCount(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.countService.performPeriodicNormalCount(data, userId);
  }

  @Post('periodic-corridor')
  @WmsPermissions(WMS_PERMISSIONS.CYCLE_COUNT_ADVANCED_EXECUTE)
  @ApiOperation({ summary: 'Periodic corridor count' })
  async periodicCorridorCount(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.countService.performPeriodicCorridorCount(data, userId);
  }

  @Post('quick-count')
  @WmsPermissions(WMS_PERMISSIONS.CYCLE_COUNT_ADVANCED_EXECUTE)
  @ApiOperation({ summary: 'Quick count' })
  async quickCount(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.countService.performQuickCount(data, userId);
  }

  @Post('plan')
  @WmsPermissions(WMS_PERMISSIONS.CYCLE_COUNT_ADVANCED_CREATE)
  @ApiOperation({ summary: 'Create count plan' })
  async createPlan(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.countService.createCountPlan(data, userId);
  }
}

