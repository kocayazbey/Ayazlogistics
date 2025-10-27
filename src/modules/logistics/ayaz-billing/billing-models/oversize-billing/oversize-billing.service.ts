import { Injectable } from '@nestjs/common';

@Injectable()
export class OversizeBillingService {
  async calculateOversizeHandlingFee(
    weight: number,
    dimensions: { length: number; width: number; height: number },
    tenantId: string,
  ): Promise<{
    weightFee: number;
    dimensionFee: number;
    totalFee: number;
    category: 'standard' | 'oversize' | 'overweight' | 'both';
  }> {
    const weightLimit = 30; // kg
    const dimensionLimit = 200; // cm
    
    const volumetric = dimensions.length + dimensions.width + dimensions.height;
    const isOverweight = weight > weightLimit;
    const isOversize = volumetric > dimensionLimit;

    let weightFee = 0;
    let dimensionFee = 0;

    if (isOverweight) {
      const excessWeight = weight - weightLimit;
      weightFee = excessWeight * 5; // 5 TL per kg
    }

    if (isOversize) {
      const excessDim = volumetric - dimensionLimit;
      dimensionFee = excessDim * 2; // 2 TL per cm
    }

    let category: 'standard' | 'oversize' | 'overweight' | 'both' = 'standard';
    if (isOverweight && isOversize) category = 'both';
    else if (isOverweight) category = 'overweight';
    else if (isOversize) category = 'oversize';

    return {
      weightFee,
      dimensionFee,
      totalFee: weightFee + dimensionFee,
      category,
    };
  }
}

