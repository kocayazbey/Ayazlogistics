import { Injectable } from '@nestjs/common';

@Injectable()
export class RepackagingBillingService {
  async calculateRepackagingFees(
    serviceType: 'repack' | 'relabel' | 'rebundle' | 'resize' | 'consolidate',
    itemCount: number,
    complexity: 'simple' | 'moderate' | 'complex',
    tenantId: string,
  ): Promise<{
    laborCost: number;
    materialsCost: number;
    perItemFee: number;
    totalCost: number;
  }> {
    const baseRate = this.getBaseRate(serviceType, complexity);
    const laborCost = baseRate * itemCount;
    const materialsCost = this.getMaterialsCost(serviceType) * itemCount;
    const perItemFee = baseRate;

    return {
      laborCost,
      materialsCost,
      perItemFee,
      totalCost: laborCost + materialsCost,
    };
  }

  private getBaseRate(serviceType: string, complexity: string): number {
    const rates = {
      simple: { repack: 5, relabel: 2, rebundle: 3, resize: 4, consolidate: 6 },
      moderate: { repack: 10, relabel: 4, rebundle: 6, resize: 8, consolidate: 12 },
      complex: { repack: 20, relabel: 8, rebundle: 12, resize: 15, consolidate: 25 },
    };
    return rates[complexity]?.[serviceType] || 5;
  }

  private getMaterialsCost(serviceType: string): number {
    const costs = {
      repack: 3,
      relabel: 1,
      rebundle: 2,
      resize: 4,
      consolidate: 5,
    };
    return costs[serviceType] || 2;
  }
}

