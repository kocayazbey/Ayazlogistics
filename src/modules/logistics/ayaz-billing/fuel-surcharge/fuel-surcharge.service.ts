import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface FuelPriceData {
  date: Date;
  pricePerLiter: number;
  source: string;
}

interface FuelSurchargeMatrix {
  minPrice: number;
  maxPrice: number;
  surchargePercentage: number;
}

interface FuelSurchargeCalculation {
  baseFreightCost: number;
  currentFuelPrice: number;
  surchargePercentage: number;
  surchargeAmount: number;
  totalCost: number;
  effectiveDate: Date;
}

@Injectable()
export class FuelSurchargeService {
  private readonly fuelSurchargeMatrix: FuelSurchargeMatrix[] = [
    { minPrice: 0, maxPrice: 25, surchargePercentage: 0 },
    { minPrice: 25.01, maxPrice: 27, surchargePercentage: 2 },
    { minPrice: 27.01, maxPrice: 29, surchargePercentage: 4 },
    { minPrice: 29.01, maxPrice: 31, surchargePercentage: 6 },
    { minPrice: 31.01, maxPrice: 33, surchargePercentage: 8 },
    { minPrice: 33.01, maxPrice: 35, surchargePercentage: 10 },
    { minPrice: 35.01, maxPrice: 37, surchargePercentage: 12 },
    { minPrice: 37.01, maxPrice: 39, surchargePercentage: 14 },
    { minPrice: 39.01, maxPrice: 41, surchargePercentage: 16 },
    { minPrice: 41.01, maxPrice: 43, surchargePercentage: 18 },
    { minPrice: 43.01, maxPrice: 999, surchargePercentage: 20 },
  ];

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async calculateFuelSurcharge(
    baseFreightCost: number,
    date: Date = new Date(),
  ): Promise<FuelSurchargeCalculation> {
    const fuelPrice = await this.getCurrentFuelPrice(date);

    const surchargePercentage = this.getSurchargePercentage(fuelPrice.pricePerLiter);

    const surchargeAmount = (baseFreightCost * surchargePercentage) / 100;
    const totalCost = baseFreightCost + surchargeAmount;

    await this.eventBus.publish('billing.fuel_surcharge.calculated', {
      baseFreightCost,
      fuelPrice: fuelPrice.pricePerLiter,
      surchargePercentage,
      surchargeAmount,
      totalCost,
    });

    return {
      baseFreightCost,
      currentFuelPrice: fuelPrice.pricePerLiter,
      surchargePercentage,
      surchargeAmount,
      totalCost,
      effectiveDate: fuelPrice.date,
    };
  }

  async calculateBulkFuelSurcharges(
    shipments: Array<{ shipmentId: string; baseFreightCost: number; date?: Date }>,
  ): Promise<
    Array<{
      shipmentId: string;
      calculation: FuelSurchargeCalculation;
    }>
  > {
    const results = [];

    for (const shipment of shipments) {
      const calculation = await this.calculateFuelSurcharge(
        shipment.baseFreightCost,
        shipment.date,
      );

      results.push({
        shipmentId: shipment.shipmentId,
        calculation,
      });
    }

    return results;
  }

  private getSurchargePercentage(fuelPrice: number): number {
    const tier = this.fuelSurchargeMatrix.find(
      (t) => fuelPrice >= t.minPrice && fuelPrice <= t.maxPrice,
    );

    return tier ? tier.surchargePercentage : 0;
  }

  private async getCurrentFuelPrice(date: Date): Promise<FuelPriceData> {
    const mockPrice = 35.5;

    return {
      date,
      pricePerLiter: mockPrice,
      source: 'EPDK',
    };
  }

  async updateFuelPrice(
    date: Date,
    pricePerLiter: number,
    source: string = 'manual',
  ): Promise<FuelPriceData> {
    const fuelPrice: FuelPriceData = {
      date,
      pricePerLiter,
      source,
    };

    await this.eventBus.publish('billing.fuel_price.updated', {
      date,
      pricePerLiter,
      source,
    });

    return fuelPrice;
  }

  async getFuelPriceHistory(days: number = 30): Promise<FuelPriceData[]> {
    const history: FuelPriceData[] = [];
    const currentDate = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);

      const basePrice = 35.0;
      const variance = (Math.random() - 0.5) * 2;
      const price = parseFloat((basePrice + variance).toFixed(2));

      history.push({
        date,
        pricePerLiter: price,
        source: 'EPDK',
      });
    }

    return history.reverse();
  }

  async getSurchargeMatrix(): Promise<FuelSurchargeMatrix[]> {
    return this.fuelSurchargeMatrix;
  }

  async updateSurchargeMatrix(matrix: FuelSurchargeMatrix[]): Promise<FuelSurchargeMatrix[]> {
    await this.eventBus.publish('billing.fuel_surcharge_matrix.updated', {
      tierCount: matrix.length,
    });

    return matrix;
  }

  async getFuelSurchargeReport(
    startDate: Date,
    endDate: Date,
  ): Promise<{
    period: { startDate: Date; endDate: Date };
    averageFuelPrice: number;
    averageSurchargePercentage: number;
    totalSurchargeAmount: number;
    shipmentCount: number;
  }> {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const history = await this.getFuelPriceHistory(days);

    const avgFuelPrice =
      history.reduce((sum, item) => sum + item.pricePerLiter, 0) / history.length;

    const avgSurcharge = this.getSurchargePercentage(avgFuelPrice);

    return {
      period: { startDate, endDate },
      averageFuelPrice: parseFloat(avgFuelPrice.toFixed(2)),
      averageSurchargePercentage: avgSurcharge,
      totalSurchargeAmount: 125000,
      shipmentCount: 450,
    };
  }

  async getFuelCostImpactAnalysis(
    baseFreightCost: number,
    fuelPriceScenarios: number[],
  ): Promise<
    Array<{
      fuelPrice: number;
      surchargePercentage: number;
      surchargeAmount: number;
      totalCost: number;
      impact: string;
    }>
  > {
    const analysis = [];

    for (const fuelPrice of fuelPriceScenarios) {
      const surchargePercentage = this.getSurchargePercentage(fuelPrice);
      const surchargeAmount = (baseFreightCost * surchargePercentage) / 100;
      const totalCost = baseFreightCost + surchargeAmount;

      let impact = 'normal';
      if (surchargePercentage === 0) impact = 'no_impact';
      else if (surchargePercentage <= 6) impact = 'low';
      else if (surchargePercentage <= 12) impact = 'moderate';
      else impact = 'high';

      analysis.push({
        fuelPrice,
        surchargePercentage,
        surchargeAmount,
        totalCost,
        impact,
      });
    }

    return analysis;
  }

  async autoFetchAndUpdateFuelPrices(): Promise<FuelPriceData> {
    const mockPrice = 35.5 + (Math.random() - 0.5) * 2;

    const fuelPrice = await this.updateFuelPrice(
      new Date(),
      parseFloat(mockPrice.toFixed(2)),
      'EPDK_AUTO',
    );

    await this.eventBus.publish('billing.fuel_price.auto_updated', {
      pricePerLiter: fuelPrice.pricePerLiter,
    });

    return fuelPrice;
  }

  async getSurchargeProjection(
    baseFreightCost: number,
    forecastDays: number = 30,
  ): Promise<
    Array<{
      date: Date;
      projectedFuelPrice: number;
      projectedSurcharge: number;
      projectedTotalCost: number;
    }>
  > {
    const projection = [];
    const currentDate = new Date();

    for (let i = 0; i < forecastDays; i++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + i);

      const projectedFuelPrice = 35.5 + Math.sin(i / 7) * 2;
      const surchargePercentage = this.getSurchargePercentage(projectedFuelPrice);
      const surchargeAmount = (baseFreightCost * surchargePercentage) / 100;

      projection.push({
        date,
        projectedFuelPrice: parseFloat(projectedFuelPrice.toFixed(2)),
        projectedSurcharge: surchargeAmount,
        projectedTotalCost: baseFreightCost + surchargeAmount,
      });
    }

    return projection;
  }
}

