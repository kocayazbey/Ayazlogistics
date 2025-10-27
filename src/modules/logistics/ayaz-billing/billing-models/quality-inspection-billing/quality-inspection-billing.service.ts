import { Injectable } from '@nestjs/common';

@Injectable()
export class QualityInspectionBillingService {
  async calculateInspectionFees(
    inspectionType: 'visual' | 'functional' | 'dimensional' | 'compliance' | 'full',
    billingBasis: 'per_unit' | 'per_lot' | 'per_hour',
    quantity: number,
    tenantId: string,
  ): Promise<{
    inspectionFee: number;
    reportingFee: number;
    failureHandlingFee: number;
    totalCost: number;
  }> {
    const baseRate = this.getInspectionRate(inspectionType, billingBasis);
    const inspectionFee = baseRate * quantity;
    const reportingFee = 50;
    const failureHandlingFee = 0;

    return {
      inspectionFee,
      reportingFee,
      failureHandlingFee,
      totalCost: inspectionFee + reportingFee + failureHandlingFee,
    };
  }

  private getInspectionRate(inspectionType: string, billingBasis: string): number {
    const rates = {
      per_unit: { visual: 2, functional: 5, dimensional: 3, compliance: 4, full: 10 },
      per_lot: { visual: 50, functional: 150, dimensional: 100, compliance: 120, full: 300 },
      per_hour: { visual: 100, functional: 150, dimensional: 120, compliance: 130, full: 200 },
    };
    return rates[billingBasis]?.[inspectionType] || 5;
  }
}

