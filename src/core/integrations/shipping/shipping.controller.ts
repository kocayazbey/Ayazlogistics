import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ArasKargoService } from './aras-kargo.service';
import { MNGKargoService } from './mng-kargo.service';
import { YurticiKargoService } from './yurtici-kargo.service';

@ApiTags('Shipping Integration')
@Controller({ path: 'shipping', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShippingController {
  constructor(
    private readonly arasKargo: ArasKargoService,
    private readonly mngKargo: MNGKargoService,
    private readonly yurticiKargo: YurticiKargoService,
  ) {}

  @Post('aras/shipment')
  @ApiOperation({ summary: 'Create Aras Kargo shipment' })
  async createArasShipment(@Body() data: any) {
    return this.arasKargo.createShipment(data);
  }

  @Get('aras/track/:trackingNumber')
  @ApiOperation({ summary: 'Track Aras Kargo shipment' })
  async trackArasShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.arasKargo.trackShipment(trackingNumber);
  }

  @Post('mng/shipment')
  @ApiOperation({ summary: 'Create MNG Kargo shipment' })
  async createMNGShipment(@Body() data: any) {
    return this.mngKargo.createShipment(data);
  }

  @Get('mng/track/:referenceNo')
  @ApiOperation({ summary: 'Track MNG Kargo shipment' })
  async trackMNGShipment(@Param('referenceNo') referenceNo: string) {
    return this.mngKargo.trackShipment(referenceNo);
  }

  @Get('mng/branches')
  @ApiOperation({ summary: 'Get MNG Kargo branch list' })
  async getMNGBranches() {
    return this.mngKargo.getBranchList();
  }

  @Post('yurtici/shipment')
  @ApiOperation({ summary: 'Create Yurtiçi Kargo shipment' })
  async createYurticiShipment(@Body() data: any) {
    return this.yurticiKargo.createShipment(data);
  }

  @Get('yurtici/track/:trackingNumber')
  @ApiOperation({ summary: 'Track Yurtiçi Kargo shipment' })
  async trackYurticiShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.yurticiKargo.trackShipment(trackingNumber);
  }

  @Get('yurtici/cities')
  @ApiOperation({ summary: 'Get Yurtiçi Kargo city list' })
  async getYurticiCities() {
    return this.yurticiKargo.getCityList();
  }

  @Get('yurtici/districts/:cityCode')
  @ApiOperation({ summary: 'Get Yurtiçi Kargo district list' })
  async getYurticiDistricts(@Param('cityCode') cityCode: string) {
    return this.yurticiKargo.getDistrictList(cityCode);
  }
}

