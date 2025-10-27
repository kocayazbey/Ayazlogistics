import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AccessorialChargeService } from '../../ayaz-billing/accessorial-charges/accessorial-charge.service';

@Controller('api/billing/accessorial-charges')
export class AccessorialChargesController {
  constructor(private readonly accessorialCharge: AccessorialChargeService) {}

  @Get()
  async getAvailableCharges() {
    return await this.accessorialCharge.getAvailableCharges();
  }

  @Get('categories')
  async getChargesByCategory() {
    return await this.accessorialCharge.getChargesByCategory();
  }

  @Get(':chargeType')
  async getChargeDefinition(@Query('chargeType') chargeType: string) {
    return await this.accessorialCharge.getChargeDefinition(chargeType);
  }

  @Post('calculate')
  async calculateCharge(@Body() data: any) {
    return await this.accessorialCharge.calculateAccessorialCharge(data);
  }

  @Post('calculate-multiple')
  async calculateMultiple(@Body() data: { requests: any[] }) {
    return await this.accessorialCharge.calculateMultipleCharges(data.requests);
  }

  @Post('create-custom')
  async createCustomCharge(@Body() data: any) {
    return await this.accessorialCharge.createCustomCharge(
      data.tenantId,
      data.contractId,
      data,
    );
  }

  @Get('report')
  async generateReport(@Query() query: any) {
    return await this.accessorialCharge.generateAccessorialReport(
      query.contractId,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Post('validate')
  async validateCharge(@Body() data: any) {
    return await this.accessorialCharge.validateAccessorialCharge(
      data.chargeType,
      data.contractId,
    );
  }

  @Get('history/:contractId')
  async getHistory(
    @Query('contractId') contractId: string,
    @Query('chargeType') chargeType?: string,
  ) {
    return await this.accessorialCharge.getChargeHistory(contractId, chargeType);
  }
}

