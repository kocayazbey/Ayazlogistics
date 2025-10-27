import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { VolumeDiscountService } from '../../ayaz-billing/pricing-strategies/volume-discount.service';

@Controller('api/billing/volume-discounts')
export class VolumeDiscountController {
  constructor(private readonly volumeDiscount: VolumeDiscountService) {}

  @Post('calculate')
  async calculateDiscount(@Body() data: any) {
    return await this.volumeDiscount.calculateVolumeDiscount(
      data.tenantId,
      data.contractId,
      data.serviceType,
      data.quantity,
      data.unitPrice,
      data.date ? new Date(data.date) : new Date(),
    );
  }

  @Post('bulk-calculate')
  async bulkCalculate(@Body() data: any) {
    return await this.volumeDiscount.calculateBulkVolumeDiscounts(
      data.tenantId,
      data.contractId,
      data.items,
      data.date ? new Date(data.date) : new Date(),
    );
  }

  @Get('projection')
  async getProjection(@Query() query: any) {
    return await this.volumeDiscount.getDiscountProjection(
      query.tenantId,
      query.contractId,
      query.serviceType,
      parseFloat(query.unitPrice),
      query.quantities.split(',').map(Number),
      query.date ? new Date(query.date) : new Date(),
    );
  }

  @Get('optimal-quantity')
  async getOptimalQuantity(@Query() query: any) {
    return await this.volumeDiscount.getOptimalPurchaseQuantity(
      query.tenantId,
      query.contractId,
      query.serviceType,
      parseFloat(query.unitPrice),
      parseInt(query.maxQuantity),
      query.date ? new Date(query.date) : new Date(),
    );
  }

  @Get('summary')
  async getSummary(@Query() query: any) {
    return await this.volumeDiscount.getVolumeDiscountSummary(
      query.tenantId,
      query.contractId,
      query.serviceType,
    );
  }

  @Post('simulate-annual')
  async simulateAnnual(@Body() data: any) {
    return await this.volumeDiscount.simulateAnnualSavings(
      data.tenantId,
      data.contractId,
      data.serviceType,
      data.monthlyQuantities,
      data.unitPrice,
    );
  }
}

