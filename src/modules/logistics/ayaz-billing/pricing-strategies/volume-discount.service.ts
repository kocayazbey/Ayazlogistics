import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface VolumeTier {
  minQuantity: number;
  maxQuantity?: number;
  discountType: 'percentage' | 'fixed_amount' | 'fixed_price';
  discountValue: number;
}

interface DiscountRule {
  id: string;
  tenantId: string;
  contractId?: string;
  serviceType: string;
  ruleName: string;
  tiers: VolumeTier[];
  isActive: boolean;
  validFrom: Date;
  validUntil?: Date;
}

interface VolumeDiscountCalculation {
  originalPrice: number;
  quantity: number;
  appliedTier?: VolumeTier;
  discountAmount: number;
  finalPrice: number;
  discountPercentage: number;
}

@Injectable()
export class VolumeDiscountService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createDiscountRule(data: {
    tenantId: string;
    contractId?: string;
    serviceType: string;
    ruleName: string;
    tiers: VolumeTier[];
    validFrom: Date;
    validUntil?: Date;
  }): Promise<any> {
    const rule = {
      id: crypto.randomUUID(),
      ...data,
      isActive: true,
      createdAt: new Date(),
    };

    await this.eventBus.publish('billing.volume_discount.created', {
      ruleId: rule.id,
      serviceType: data.serviceType,
      tierCount: data.tiers.length,
    });

    return rule;
  }

  async calculateVolumeDiscount(
    tenantId: string,
    contractId: string | undefined,
    serviceType: string,
    quantity: number,
    unitPrice: number,
    date: Date = new Date(),
  ): Promise<VolumeDiscountCalculation> {
    const rule = await this.findActiveDiscountRule(
      tenantId,
      contractId,
      serviceType,
      date,
    );

    const originalPrice = quantity * unitPrice;

    if (!rule || !rule.tiers || rule.tiers.length === 0) {
      return {
        originalPrice,
        quantity,
        discountAmount: 0,
        finalPrice: originalPrice,
        discountPercentage: 0,
      };
    }

    const applicableTier = this.findApplicableTier(rule.tiers, quantity);

    if (!applicableTier) {
      return {
        originalPrice,
        quantity,
        discountAmount: 0,
        finalPrice: originalPrice,
        discountPercentage: 0,
      };
    }

    let discountAmount = 0;
    let finalPrice = originalPrice;

    switch (applicableTier.discountType) {
      case 'percentage':
        discountAmount = (originalPrice * applicableTier.discountValue) / 100;
        finalPrice = originalPrice - discountAmount;
        break;

      case 'fixed_amount':
        discountAmount = applicableTier.discountValue * quantity;
        finalPrice = originalPrice - discountAmount;
        break;

      case 'fixed_price':
        finalPrice = applicableTier.discountValue * quantity;
        discountAmount = originalPrice - finalPrice;
        break;
    }

    const discountPercentage = (discountAmount / originalPrice) * 100;

    await this.eventBus.publish('billing.volume_discount.applied', {
      serviceType,
      quantity,
      originalPrice,
      discountAmount,
      finalPrice,
      tierApplied: applicableTier,
    });

    return {
      originalPrice,
      quantity,
      appliedTier: applicableTier,
      discountAmount,
      finalPrice,
      discountPercentage,
    };
  }

  async calculateBulkVolumeDiscounts(
    tenantId: string,
    contractId: string | undefined,
    items: Array<{
      itemId: string;
      serviceType: string;
      quantity: number;
      unitPrice: number;
    }>,
    date: Date = new Date(),
  ): Promise<
    Array<{ itemId: string; calculation: VolumeDiscountCalculation }>
  > {
    const results = [];

    for (const item of items) {
      const calculation = await this.calculateVolumeDiscount(
        tenantId,
        contractId,
        item.serviceType,
        item.quantity,
        item.unitPrice,
        date,
      );

      results.push({
        itemId: item.itemId,
        calculation,
      });
    }

    return results;
  }

  async getDiscountProjection(
    tenantId: string,
    contractId: string | undefined,
    serviceType: string,
    unitPrice: number,
    quantities: number[],
    date: Date = new Date(),
  ): Promise<Array<{ quantity: number; calculation: VolumeDiscountCalculation }>> {
    const projections = [];

    for (const quantity of quantities) {
      const calculation = await this.calculateVolumeDiscount(
        tenantId,
        contractId,
        serviceType,
        quantity,
        unitPrice,
        date,
      );

      projections.push({
        quantity,
        calculation,
      });
    }

    return projections;
  }

  async getOptimalPurchaseQuantity(
    tenantId: string,
    contractId: string | undefined,
    serviceType: string,
    unitPrice: number,
    maxQuantity: number,
    date: Date = new Date(),
  ): Promise<{
    optimalQuantity: number;
    savings: number;
    calculation: VolumeDiscountCalculation;
  }> {
    const rule = await this.findActiveDiscountRule(
      tenantId,
      contractId,
      serviceType,
      date,
    );

    if (!rule || !rule.tiers || rule.tiers.length === 0) {
      return {
        optimalQuantity: 1,
        savings: 0,
        calculation: await this.calculateVolumeDiscount(
          tenantId,
          contractId,
          serviceType,
          1,
          unitPrice,
          date,
        ),
      };
    }

    let bestQuantity = 1;
    let bestSavingsPerUnit = 0;
    let bestCalculation: VolumeDiscountCalculation | null = null;

    const sortedTiers = [...rule.tiers].sort((a, b) => a.minQuantity - b.minQuantity);

    for (const tier of sortedTiers) {
      if (tier.minQuantity > maxQuantity) break;

      const testQuantity = Math.min(tier.minQuantity, maxQuantity);
      const calculation = await this.calculateVolumeDiscount(
        tenantId,
        contractId,
        serviceType,
        testQuantity,
        unitPrice,
        date,
      );

      const savingsPerUnit = calculation.discountAmount / testQuantity;

      if (savingsPerUnit > bestSavingsPerUnit) {
        bestSavingsPerUnit = savingsPerUnit;
        bestQuantity = testQuantity;
        bestCalculation = calculation;
      }
    }

    return {
      optimalQuantity: bestQuantity,
      savings: bestSavingsPerUnit * bestQuantity,
      calculation: bestCalculation!,
    };
  }

  private findApplicableTier(
    tiers: VolumeTier[],
    quantity: number,
  ): VolumeTier | null {
    const sortedTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);

    for (const tier of sortedTiers) {
      if (quantity >= tier.minQuantity) {
        if (!tier.maxQuantity || quantity <= tier.maxQuantity) {
          return tier;
        }
      }
    }

    return null;
  }

  private async findActiveDiscountRule(
    tenantId: string,
    contractId: string | undefined,
    serviceType: string,
    date: Date,
  ): Promise<DiscountRule | null> {
    const mockRules: DiscountRule[] = [
      {
        id: '1',
        tenantId,
        contractId,
        serviceType: 'forklift_operator',
        ruleName: 'Forklift Hacim İndirimi',
        tiers: [
          { minQuantity: 1, maxQuantity: 99, discountType: 'percentage', discountValue: 0 },
          { minQuantity: 100, maxQuantity: 499, discountType: 'percentage', discountValue: 5 },
          { minQuantity: 500, maxQuantity: 999, discountType: 'percentage', discountValue: 10 },
          { minQuantity: 1000, discountType: 'percentage', discountValue: 15 },
        ],
        isActive: true,
        validFrom: new Date('2024-01-01'),
      },
      {
        id: '2',
        tenantId,
        contractId,
        serviceType: 'rack_storage',
        ruleName: 'Depolama Hacim İndirimi',
        tiers: [
          { minQuantity: 1, maxQuantity: 49, discountType: 'percentage', discountValue: 0 },
          { minQuantity: 50, maxQuantity: 199, discountType: 'percentage', discountValue: 8 },
          { minQuantity: 200, maxQuantity: 499, discountType: 'percentage', discountValue: 12 },
          { minQuantity: 500, discountType: 'percentage', discountValue: 18 },
        ],
        isActive: true,
        validFrom: new Date('2024-01-01'),
      },
      {
        id: '3',
        tenantId,
        contractId,
        serviceType: 'handling',
        ruleName: 'Elleçleme Hacim İndirimi',
        tiers: [
          { minQuantity: 1, maxQuantity: 199, discountType: 'percentage', discountValue: 0 },
          { minQuantity: 200, maxQuantity: 499, discountType: 'percentage', discountValue: 7 },
          { minQuantity: 500, maxQuantity: 999, discountType: 'percentage', discountValue: 12 },
          { minQuantity: 1000, discountType: 'percentage', discountValue: 20 },
        ],
        isActive: true,
        validFrom: new Date('2024-01-01'),
      },
    ];

    const matchingRule = mockRules.find(
      (rule) =>
        rule.tenantId === tenantId &&
        rule.serviceType === serviceType &&
        rule.isActive &&
        rule.validFrom <= date &&
        (!rule.validUntil || rule.validUntil >= date),
    );

    return matchingRule || null;
  }

  async getVolumeDiscountSummary(
    tenantId: string,
    contractId: string | undefined,
    serviceType: string,
  ): Promise<any> {
    const rule = await this.findActiveDiscountRule(
      tenantId,
      contractId,
      serviceType,
      new Date(),
    );

    if (!rule) {
      return {
        serviceType,
        hasActiveRule: false,
        message: 'No active volume discount rule found',
      };
    }

    return {
      serviceType,
      hasActiveRule: true,
      ruleName: rule.ruleName,
      tiers: rule.tiers.map((tier) => ({
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        discountType: tier.discountType,
        discountValue: tier.discountValue,
        description: this.getTierDescription(tier),
      })),
      validFrom: rule.validFrom,
      validUntil: rule.validUntil,
    };
  }

  private getTierDescription(tier: VolumeTier): string {
    const rangeDesc = tier.maxQuantity
      ? `${tier.minQuantity} - ${tier.maxQuantity} adet`
      : `${tier.minQuantity}+ adet`;

    switch (tier.discountType) {
      case 'percentage':
        return `${rangeDesc}: %${tier.discountValue} indirim`;
      case 'fixed_amount':
        return `${rangeDesc}: ${tier.discountValue} TL birim indirim`;
      case 'fixed_price':
        return `${rangeDesc}: ${tier.discountValue} TL sabit fiyat`;
      default:
        return rangeDesc;
    }
  }

  async simulateAnnualSavings(
    tenantId: string,
    contractId: string | undefined,
    serviceType: string,
    monthlyQuantities: number[],
    unitPrice: number,
  ): Promise<{
    totalOriginalCost: number;
    totalFinalCost: number;
    totalSavings: number;
    savingsPercentage: number;
    monthlyBreakdown: Array<{
      month: number;
      quantity: number;
      originalCost: number;
      finalCost: number;
      savings: number;
    }>;
  }> {
    let totalOriginalCost = 0;
    let totalFinalCost = 0;
    const monthlyBreakdown = [];

    for (let month = 0; month < monthlyQuantities.length; month++) {
      const quantity = monthlyQuantities[month];
      const calculation = await this.calculateVolumeDiscount(
        tenantId,
        contractId,
        serviceType,
        quantity,
        unitPrice,
      );

      totalOriginalCost += calculation.originalPrice;
      totalFinalCost += calculation.finalPrice;

      monthlyBreakdown.push({
        month: month + 1,
        quantity,
        originalCost: calculation.originalPrice,
        finalCost: calculation.finalPrice,
        savings: calculation.discountAmount,
      });
    }

    const totalSavings = totalOriginalCost - totalFinalCost;
    const savingsPercentage = (totalSavings / totalOriginalCost) * 100;

    return {
      totalOriginalCost,
      totalFinalCost,
      totalSavings,
      savingsPercentage,
      monthlyBreakdown,
    };
  }
}

