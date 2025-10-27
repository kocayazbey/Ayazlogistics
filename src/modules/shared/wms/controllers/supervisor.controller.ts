import { Controller, Get, Post, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { SupervisorOperationsService } from '../../ayaz-wms/supervisor-mobile/supervisor-operations.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Supervisor Operations')
@Controller({ path: 'wms/supervisor', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class SupervisorController {
  constructor(private readonly supervisorService: SupervisorOperationsService) {}

  @Post('change-pickface')
  @ApiOperation({ summary: 'Toplama Gözü Değiştirme' })
  async changePickFace(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.changePickFaceAssignment(data, supervisorId);
  }

  @Post('modify-pallet-lot-date')
  @ApiOperation({ summary: 'Palet Lot & Tarih Değiştir' })
  async modifyPalletLotDate(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.modifyPalletLotAndDate(data, supervisorId);
  }

  @Post('modify-pickface-lot-date')
  @ApiOperation({ summary: 'Toplama Gözü Lot & Tarih Değiştir' })
  async modifyPickFaceLotDate(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.modifyPickFaceLotAndDate(data, supervisorId);
  }

  @Post('define-sku-barcode')
  @ApiOperation({ summary: 'SKU Barkod Tanımlama (Mobile)' })
  async defineSKUBarcode(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.defineSKUBarcode(data, supervisorId);
  }

  @Post('define-pallet-standards')
  @ApiOperation({ summary: 'SKU Palet Standartları' })
  async definePalletStandards(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.defineSKUPalletStandards(data, supervisorId);
  }

  @Post('block-pallet')
  @ApiOperation({ summary: 'Palet Blokaj Koy' })
  async blockPallet(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.blockPallet(data, supervisorId);
  }

  @Post('unblock-pallet')
  @ApiOperation({ summary: 'Palet Blokaj Kaldır' })
  async unblockPallet(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.unblockPallet(data, supervisorId);
  }

  @Post('modify-serial-number')
  @ApiOperation({ summary: 'Palet Seri No Değiştirme' })
  async modifySerialNumber(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.modifyPalletSerialNumber(data, supervisorId);
  }

  @Post('modify-pallet-type')
  @ApiOperation({ summary: 'Palet Tipi Değiştir' })
  async modifyPalletType(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.modifyPalletType(data, supervisorId);
  }

  @Post('its-quality-control')
  @ApiOperation({ summary: 'ITS Kalite Kontrol' })
  async itsQualityControl(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.performITSQualityControl(data, supervisorId);
  }

  @Get('activity-log')
  @ApiOperation({ summary: 'Get supervisor activity log' })
  async getActivityLog(@Query() params: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.getSupervisorActivityLog({ ...params, supervisorId });
  }

  @Post('request-approval')
  @ApiOperation({ summary: 'Request supervisor approval' })
  async requestApproval(@Body() data: any, @CurrentUser('id') requesterId: string) {
    return this.supervisorService.requestSupervisorApproval(data, requesterId);
  }

  @Post('respond-approval')
  @ApiOperation({ summary: 'Respond to approval request' })
  async respondApproval(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.respondToApprovalRequest(data, supervisorId);
  }

  @Post('emergency-override')
  @ApiOperation({ summary: 'Emergency override' })
  async emergencyOverride(@Body() data: any, @CurrentUser('id') supervisorId: string) {
    return this.supervisorService.emergencyOverride(data, supervisorId);
  }
}

