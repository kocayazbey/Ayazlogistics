import { Injectable } from '@nestjs/common';

interface CustomReportingService {
  customerId: string;
  reportType: 'standard' | 'custom' | 'advanced' | 'realtime';
  monthlyFee?: number;
  perReportFee?: number;
  setupFee?: number;
}

@Injectable()
export class CustomReportingBillingService {
  async calculateCustomReportingFees(
    customerId: string,
    reportType: CustomReportingService['reportType'],
    reportCount: number,
    tenantId: string,
  ): Promise<{
    monthlyFee: number;
    perReportFee: number;
    setupFee: number;
    totalCost: number;
  }> {
    const pricing = this.getReportingPricing(reportType);
    
    return {
      monthlyFee: pricing.monthly,
      perReportFee: pricing.perReport * reportCount,
      setupFee: pricing.setup,
      totalCost: pricing.monthly + (pricing.perReport * reportCount) + pricing.setup,
    };
  }

  private getReportingPricing(reportType: string): { monthly: number; perReport: number; setup: number } {
    const pricing = {
      standard: { monthly: 0, perReport: 0, setup: 0 },
      custom: { monthly: 500, perReport: 50, setup: 2000 },
      advanced: { monthly: 1500, perReport: 100, setup: 5000 },
      realtime: { monthly: 3000, perReport: 150, setup: 10000 },
    };
    return pricing[reportType] || pricing.standard;
  }
}

