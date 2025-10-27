import { Injectable } from '@nestjs/common';

@Injectable()
export class RushOrderBillingService {
  async calculateRushOrderSurcharge(
    basePrice: number,
    serviceLevel: 'same_day' | 'next_day' | '2_hour' | '4_hour',
    tenantId: string,
  ): Promise<{
    basePrice: number;
    surchargePercent: number;
    surchargeAmount: number;
    totalPrice: number;
  }> {
    const surchargePercent = this.getSurchargePercent(serviceLevel);
    const surchargeAmount = basePrice * (surchargePercent / 100);

    return {
      basePrice,
      surchargePercent,
      surchargeAmount,
      totalPrice: basePrice + surchargeAmount,
    };
  }

  private getSurchargePercent(serviceLevel: string): number {
    const surcharges = {
      same_day: 50,
      next_day: 25,
      '2_hour': 100,
      '4_hour': 75,
    };
    return surcharges[serviceLevel] || 0;
  }
}

