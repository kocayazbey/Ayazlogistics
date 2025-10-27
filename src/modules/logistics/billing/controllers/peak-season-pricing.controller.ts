import { Controller, Post, Get, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { PeakSeasonPricingService } from '../../ayaz-billing/pricing-strategies/peak-season-pricing.service';

@Controller('api/billing/seasonal-pricing')
export class PeakSeasonPricingController {
  constructor(private readonly seasonalPricing: PeakSeasonPricingService) {}

  @Post('rules')
  async createSeasonalRule(@Body() data: any) {
    return await this.seasonalPricing.createSeasonalRule(data.tenantId, data);
  }

  @Get('rules')
  async getActiveRules(
    @Query('tenantId') tenantId: string,
    @Query('date') date: string,
  ) {
    return await this.seasonalPricing.getActiveSeasonalRules(
      tenantId,
      new Date(date),
    );
  }

  @Put('rules/:id')
  async updateSeasonalRule(@Param('id') id: string, @Body() updates: any) {
    return await this.seasonalPricing.updateSeasonalRule(id, updates);
  }

  @Delete('rules/:id')
  async deleteSeasonalRule(@Param('id') id: string) {
    return await this.seasonalPricing.deleteSeasonalRule(id);
  }

  @Post('calculate')
  async calculateSeasonalPrice(@Body() data: any) {
    return await this.seasonalPricing.calculateSeasonalPrice(
      data.tenantId,
      data.serviceType,
      data.basePrice,
      new Date(data.date),
    );
  }

  @Get('predefined-seasons')
  async getPredefinedSeasons() {
    return await this.seasonalPricing.getPredefinedSeasons();
  }

  @Post('bulk-calculate')
  async bulkCalculate(@Body() data: any) {
    return await this.seasonalPricing.applyBulkSeasonalPricing(
      data.tenantId,
      data.serviceType,
      data.items,
    );
  }
}

