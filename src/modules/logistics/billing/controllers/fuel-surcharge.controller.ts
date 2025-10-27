import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { FuelSurchargeService } from '../../ayaz-billing/fuel-surcharge/fuel-surcharge.service';

@Controller('api/billing/fuel-surcharge')
export class FuelSurchargeController {
  constructor(private readonly fuelSurcharge: FuelSurchargeService) {}

  @Get('current')
  async getCurrentSurcharge(@Query('baseFreightCost') cost: string) {
    const baseCost = parseFloat(cost);
    return await this.fuelSurcharge.calculateFuelSurcharge(baseCost);
  }

  @Post('calculate')
  async calculateSurcharge(@Body() data: any) {
    return await this.fuelSurcharge.calculateFuelSurcharge(
      data.baseFreightCost,
      data.date ? new Date(data.date) : new Date(),
    );
  }

  @Post('calculate-bulk')
  async calculateBulk(@Body() data: { shipments: any[] }) {
    return await this.fuelSurcharge.calculateBulkFuelSurcharges(data.shipments);
  }

  @Get('matrix')
  async getSurchargeMatrix() {
    return await this.fuelSurcharge.getSurchargeMatrix();
  }

  @Post('matrix/update')
  async updateMatrix(@Body() data: { matrix: any[] }) {
    return await this.fuelSurcharge.updateSurchargeMatrix(data.matrix);
  }

  @Get('history')
  async getFuelPriceHistory(@Query('days') days: string) {
    return await this.fuelSurcharge.getFuelPriceHistory(parseInt(days) || 30);
  }

  @Post('price/update')
  async updateFuelPrice(@Body() data: any) {
    return await this.fuelSurcharge.updateFuelPrice(
      new Date(data.date),
      data.pricePerLiter,
      data.source,
    );
  }

  @Post('price/auto-fetch')
  async autoFetchPrice() {
    return await this.fuelSurcharge.autoFetchAndUpdateFuelPrices();
  }

  @Get('report')
  async getReport(@Query() query: any) {
    return await this.fuelSurcharge.getFuelSurchargeReport(
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Post('impact-analysis')
  async getImpactAnalysis(@Body() data: any) {
    return await this.fuelSurcharge.getFuelCostImpactAnalysis(
      data.baseFreightCost,
      data.fuelPriceScenarios,
    );
  }

  @Get('projection')
  async getProjection(@Query() query: any) {
    return await this.fuelSurcharge.getSurchargeProjection(
      parseFloat(query.baseFreightCost),
      parseInt(query.forecastDays) || 30,
    );
  }
}

