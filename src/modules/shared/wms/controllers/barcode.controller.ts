import { Controller, Get, Post, Put, Body, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { BarcodeManagementService } from '../../ayaz-wms/barcode/barcode-management.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Barcode')
@Controller({ path: 'wms/barcode', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class BarcodeController {
  constructor(private readonly barcodeService: BarcodeManagementService) {}

  @Get('structures')
  @ApiOperation({ summary: 'Get barcode structures' })
  async getStructures(@CurrentUser('tenantId') tenantId: string) {
    return this.barcodeService.getBarcodeStructures(tenantId);
  }

  @Post('structures')
  @ApiOperation({ summary: 'Create barcode structure' })
  async createStructure(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.barcodeService.createBarcodeStructure(data, tenantId);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate barcode' })
  async validate(@Body() data: any) {
    return this.barcodeService.validateBarcode(data.barcode, data.structureId);
  }

  @Post('parse')
  @ApiOperation({ summary: 'Parse barcode data' })
  async parse(@Body() data: any) {
    return this.barcodeService.parseBarcode(data.barcode);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get label templates' })
  async getTemplates(@CurrentUser('tenantId') tenantId: string) {
    return this.barcodeService.getLabelTemplates(tenantId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create label template' })
  async createTemplate(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.barcodeService.createLabelTemplate(data, tenantId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate barcode' })
  async generate(@Body() data: any) {
    return this.barcodeService.generateBarcode(data);
  }
}

