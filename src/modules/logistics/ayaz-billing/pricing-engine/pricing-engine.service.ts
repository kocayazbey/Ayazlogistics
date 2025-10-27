import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { billingContracts, billingRates } from '../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class PricingEngineService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async calculatePrice(contractId: string, serviceType: string, quantity: number, usageDate: Date, options?: {
    weight?: number;
    distance?: number;
    isPeakSeason?: boolean;
    isUrgent?: boolean;
  }) {
    const [rate] = await this.db
      .select()
      .from(billingRates)
      .where(
        and(
          eq(billingRates.contractId, contractId),
          eq(billingRates.rateType, serviceType),
          lt(billingRates.validFrom, usageDate),
          and(
            eq(billingRates.validFrom, usageDate),
            or(eq(billingRates.validUntil, null), lt(billingRates.validUntil, usageDate))
          )
        )
      )
      .limit(1);

    if (!rate) {
      throw new Error(`No active rate found for ${serviceType}`);
    }

    const rateAmount = parseFloat(rate.rateAmount);
    const minimumCharge = parseFloat(rate.minimumCharge || '0');
    
    let totalAmount = quantity * rateAmount;

    // Volume Discount Calculation
    const volumeDiscount = this.calculateVolumeDiscount(quantity);
    totalAmount = totalAmount * (1 - volumeDiscount);

    // Peak Season Surcharge
    if (options?.isPeakSeason) {
      const peakSeasonSurcharge = this.calculatePeakSeasonSurcharge(usageDate);
      totalAmount = totalAmount * (1 + peakSeasonSurcharge);
    }

    // Fuel Surcharge
    if (options?.distance) {
      const fuelSurcharge = await this.calculateFuelSurcharge(options.distance, usageDate);
      totalAmount += fuelSurcharge;
    }

    // Urgent Delivery Surcharge
    if (options?.isUrgent) {
      totalAmount *= 1.15; // 15% urgent surcharge
    }

    if (minimumCharge > 0 && totalAmount < minimumCharge) {
      totalAmount = minimumCharge;
    }

    return {
      serviceType,
      quantity,
      unitOfMeasure: rate.unitOfMeasure,
      rateAmount,
      minimumCharge,
      volumeDiscount,
      peakSeasonSurcharge: options?.isPeakSeason ? this.calculatePeakSeasonSurcharge(usageDate) : 0,
      fuelSurcharge: options?.distance ? await this.calculateFuelSurcharge(options.distance, usageDate) : 0,
      totalAmount,
      currency: rate.currency,
    };
  }

  private calculateVolumeDiscount(quantity: number): number {
    if (quantity >= 1000) return 0.15; // 15% discount
    if (quantity >= 500) return 0.10; // 10% discount
    if (quantity >= 200) return 0.05; // 5% discount
    return 0;
  }

  private calculatePeakSeasonSurcharge(date: Date): number {
    const month = date.getMonth() + 1;
    // Peak seasons: December (12), January (1), June-August (6-8)
    if (month === 12 || month === 1) return 0.20; // 20% surcharge
    if (month >= 6 && month <= 8) return 0.15; // 15% surcharge
    return 0;
  }

  private async calculateFuelSurcharge(distance: number, date: Date): Promise<number> {
    // Get current fuel price index (simplified)
    const baseFuelPrice = 1.50; // EUR per liter
    const currentFuelPrice = await this.getCurrentFuelPrice(date);
    const fuelPriceIncrease = Math.max(0, currentFuelPrice - baseFuelPrice);
    
    // Calculate fuel consumption (average: 0.30L per km)
    const fuelConsumption = distance * 0.30;
    const fuelSurcharge = fuelConsumption * fuelPriceIncrease;
    
    return fuelSurcharge;
  }

  private async getCurrentFuelPrice(date: Date): Promise<number> {
    // In production, this would fetch from external API or database
    // For now, return a mock price based on season
    const month = date.getMonth() + 1;
    if (month >= 6 && month <= 8) return 1.80; // Summer prices higher
    if (month === 12 || month === 1) return 1.75; // Winter prices
    return 1.60; // Regular prices
  }

  async calculateMonthlyInvoice(contractId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [contract] = await this.db
      .select()
      .from(billingContracts)
      .where(eq(billingContracts.id, contractId))
      .limit(1);

    const rates = await this.db
      .select()
      .from(billingRates)
      .where(eq(billingRates.contractId, contractId));

    const lineItems = [];
    let subtotal = 0;

    for (const rate of rates) {
      const mockUsage = 100;
      const lineTotal = mockUsage * parseFloat(rate.rateAmount);
      
      lineItems.push({
        rateType: rate.rateType,
        rateName: rate.rateName,
        quantity: mockUsage,
        unitPrice: parseFloat(rate.rateAmount),
        lineTotal,
      });

      subtotal += lineTotal;
    }

    const taxRate = 0.20;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    return {
      contractId,
      customerId: contract.customerId,
      period: { month, year, startDate, endDate },
      lineItems,
      subtotal,
      taxAmount,
      totalAmount,
      currency: contract.currency,
    };
  }
}

