import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { PeakSeasonPricingService } from '../../ayaz-billing/pricing-strategies/peak-season-pricing.service';
import { VolumeDiscountService } from '../../ayaz-billing/pricing-strategies/volume-discount.service';
import { FuelSurchargeService } from '../../ayaz-billing/fuel-surcharge/fuel-surcharge.service';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface PricingInput {
  tenantId: string;
  contractId?: string;
  serviceType: string;
  quantity: number;
  unitPrice: number;
  date?: Date;
  distance?: number;
  weight?: number;
  volume?: number;
  isFreightService?: boolean;
}

interface ComprehensivePricing {
  baseAmount: number;
  volumeDiscount: {
    applied: boolean;
    discountAmount: number;
    discountPercentage: number;
  };
  seasonalAdjustment: {
    applied: boolean;
    adjustmentAmount: number;
    seasonType?: string;
  };
  fuelSurcharge: {
    applied: boolean;
    surchargeAmount: number;
    surchargePercentage: number;
    fuelPrice?: number;
  };
  subtotal: number;
  tax: {
    taxRate: number;
    taxAmount: number;
  };
  finalTotal: number;
  currency: string;
  breakdown: PriceBreakdownItem[];
}

interface PriceBreakdownItem {
  description: string;
  amount: number;
  type: 'charge' | 'discount' | 'surcharge' | 'tax';
}

@Injectable()
export class ComprehensivePricingService {
  private readonly TAX_RATE = 0.18;

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly peakSeasonService: PeakSeasonPricingService,
    private readonly volumeDiscountService: VolumeDiscountService,
    private readonly fuelSurchargeService: FuelSurchargeService,
    private readonly eventBus: EventBusService,
  ) {}

  async calculateComprehensivePrice(input: PricingInput): Promise<ComprehensivePricing> {
    const date = input.date || new Date();
    const baseAmount = input.quantity * input.unitPrice;
    const breakdown: PriceBreakdownItem[] = [];

    breakdown.push({
      description: `${input.serviceType} (${input.quantity} x ${input.unitPrice} TRY)`,
      amount: baseAmount,
      type: 'charge',
    });

    let runningTotal = baseAmount;

    const volumeDiscountCalc = await this.volumeDiscountService.calculateVolumeDiscount(
      input.tenantId,
      input.contractId,
      input.serviceType,
      input.quantity,
      input.unitPrice,
      date,
    );

    const volumeDiscount = {
      applied: volumeDiscountCalc.discountAmount > 0,
      discountAmount: volumeDiscountCalc.discountAmount,
      discountPercentage: volumeDiscountCalc.discountPercentage,
    };

    if (volumeDiscount.applied) {
      runningTotal -= volumeDiscount.discountAmount;
      breakdown.push({
        description: `Hacim İndirimi (${volumeDiscount.discountPercentage.toFixed(2)}%)`,
        amount: -volumeDiscount.discountAmount,
        type: 'discount',
      });
    }

    const seasonalCalc = await this.peakSeasonService.calculateSeasonalPrice(
      input.tenantId,
      input.serviceType,
      runningTotal,
      date,
    );

    const seasonalAdjustment = {
      applied: seasonalCalc.seasonalAdjustment !== 0,
      adjustmentAmount: seasonalCalc.seasonalAdjustment,
      seasonType: seasonalCalc.seasonType,
    };

    if (seasonalAdjustment.applied) {
      runningTotal += seasonalAdjustment.adjustmentAmount;
      breakdown.push({
        description: `Sezonsal Fiyat Ayarı (${seasonalCalc.seasonType})`,
        amount: seasonalAdjustment.adjustmentAmount,
        type: 'surcharge',
      });
    }

    let fuelSurcharge = {
      applied: false,
      surchargeAmount: 0,
      surchargePercentage: 0,
      fuelPrice: undefined as number | undefined,
    };

    if (input.isFreightService) {
      const fuelCalc = await this.fuelSurchargeService.calculateFuelSurcharge(
        runningTotal,
        date,
      );

      fuelSurcharge = {
        applied: fuelCalc.surchargeAmount > 0,
        surchargeAmount: fuelCalc.surchargeAmount,
        surchargePercentage: fuelCalc.surchargePercentage,
        fuelPrice: fuelCalc.currentFuelPrice,
      };

      if (fuelSurcharge.applied) {
        runningTotal += fuelSurcharge.surchargeAmount;
        breakdown.push({
          description: `Yakıt Ek Ücreti (${fuelSurcharge.surchargePercentage}%)`,
          amount: fuelSurcharge.surchargeAmount,
          type: 'surcharge',
        });
      }
    }

    const subtotal = runningTotal;
    const taxAmount = subtotal * this.TAX_RATE;
    const finalTotal = subtotal + taxAmount;

    breakdown.push({
      description: 'Ara Toplam',
      amount: subtotal,
      type: 'charge',
    });

    breakdown.push({
      description: `KDV (%${this.TAX_RATE * 100})`,
      amount: taxAmount,
      type: 'tax',
    });

    const result: ComprehensivePricing = {
      baseAmount,
      volumeDiscount,
      seasonalAdjustment,
      fuelSurcharge,
      subtotal,
      tax: {
        taxRate: this.TAX_RATE,
        taxAmount,
      },
      finalTotal,
      currency: 'TRY',
      breakdown,
    };

    await this.eventBus.publish('billing.comprehensive_price.calculated', {
      tenantId: input.tenantId,
      serviceType: input.serviceType,
      baseAmount,
      finalTotal,
      discountsApplied: volumeDiscount.applied,
      surchargesApplied: seasonalAdjustment.applied || fuelSurcharge.applied,
    });

    return result;
  }

  async calculateBulkComprehensivePricing(
    items: PricingInput[],
  ): Promise<{
    items: Array<{ index: number; pricing: ComprehensivePricing }>;
    grandTotal: number;
    totalDiscount: number;
    totalSurcharge: number;
    totalTax: number;
  }> {
    const results = [];
    let grandTotal = 0;
    let totalDiscount = 0;
    let totalSurcharge = 0;
    let totalTax = 0;

    for (let i = 0; i < items.length; i++) {
      const pricing = await this.calculateComprehensivePrice(items[i]);
      results.push({ index: i, pricing });

      grandTotal += pricing.finalTotal;
      totalDiscount += pricing.volumeDiscount.discountAmount;
      totalSurcharge +=
        pricing.seasonalAdjustment.adjustmentAmount +
        pricing.fuelSurcharge.surchargeAmount;
      totalTax += pricing.tax.taxAmount;
    }

    return {
      items: results,
      grandTotal,
      totalDiscount,
      totalSurcharge,
      totalTax,
    };
  }

  async getPricingSimulation(
    input: PricingInput,
    quantityRange: number[],
  ): Promise<
    Array<{
      quantity: number;
      pricing: ComprehensivePricing;
      savingsVsStandard: number;
    }>
  > {
    const simulations = [];

    for (const quantity of quantityRange) {
      const pricing = await this.calculateComprehensivePrice({
        ...input,
        quantity,
      });

      const standardPrice = quantity * input.unitPrice * (1 + this.TAX_RATE);
      const savings = standardPrice - pricing.finalTotal;

      simulations.push({
        quantity,
        pricing,
        savingsVsStandard: savings,
      });
    }

    return simulations;
  }

  async getOptimalOrderQuantity(
    input: PricingInput,
    maxQuantity: number,
  ): Promise<{
    optimalQuantity: number;
    pricing: ComprehensivePricing;
    savingsPerUnit: number;
    totalSavings: number;
    recommendation: string;
  }> {
    let bestQuantity = 1;
    let bestPricing: ComprehensivePricing | null = null;
    let bestSavingsPerUnit = 0;

    const testQuantities = [
      1,
      ...Array.from({ length: 10 }, (_, i) => Math.floor((maxQuantity / 10) * (i + 1))),
      maxQuantity,
    ];

    for (const quantity of testQuantities) {
      if (quantity > maxQuantity) continue;

      const pricing = await this.calculateComprehensivePrice({
        ...input,
        quantity,
      });

      const standardPrice = quantity * input.unitPrice * (1 + this.TAX_RATE);
      const savingsPerUnit = (standardPrice - pricing.finalTotal) / quantity;

      if (savingsPerUnit > bestSavingsPerUnit) {
        bestSavingsPerUnit = savingsPerUnit;
        bestQuantity = quantity;
        bestPricing = pricing;
      }
    }

    const totalSavings = bestSavingsPerUnit * bestQuantity;
    const savingsPercentage = (totalSavings / (bestQuantity * input.unitPrice * (1 + this.TAX_RATE))) * 100;

    let recommendation = '';
    if (savingsPercentage > 20) {
      recommendation = `Yüksek tasarruf potansiyeli! ${bestQuantity} adet sipariş ederek %${savingsPercentage.toFixed(2)} tasarruf edebilirsiniz.`;
    } else if (savingsPercentage > 10) {
      recommendation = `Orta seviye tasarruf. ${bestQuantity} adet sipariş önerilir.`;
    } else {
      recommendation = `Düşük tasarruf potansiyeli. İhtiyacınız kadar sipariş verebilirsiniz.`;
    }

    return {
      optimalQuantity: bestQuantity,
      pricing: bestPricing!,
      savingsPerUnit: bestSavingsPerUnit,
      totalSavings,
      recommendation,
    };
  }
}

