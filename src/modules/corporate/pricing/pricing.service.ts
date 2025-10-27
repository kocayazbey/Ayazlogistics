import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface PricingTier {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';
  basePrice: number;
  currency: string;
  billingCycle: 'monthly' | 'quarterly' | 'annually';
  features: string[];
  limits: PricingLimits;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingLimits {
  apiCalls: number;
  storage: number; // GB
  users: number;
  integrations: number;
  customFields: number;
  reports: number;
  supportLevel: 'basic' | 'standard' | 'premium' | 'enterprise';
}

export interface UsageBasedPricing {
  id: string;
  tenantId: string;
  metric: string;
  unit: string;
  basePrice: number;
  currency: string;
  tiers: UsageTier[];
  isActive: boolean;
  createdAt: Date;
}

export interface UsageTier {
  min: number;
  max?: number;
  price: number;
  type: 'per_unit' | 'flat_rate';
}

export interface OverageRule {
  id: string;
  tenantId: string;
  metric: string;
  threshold: number;
  overagePrice: number;
  currency: string;
  gracePeriod: number; // days
  notificationThresholds: number[];
  isActive: boolean;
  createdAt: Date;
}

export interface PricingCalculation {
  basePrice: number;
  usageCharges: UsageCharge[];
  overageCharges: OverageCharge[];
  discounts: Discount[];
  taxes: Tax[];
  total: number;
  currency: string;
  breakdown: {
    subtotal: number;
    taxAmount: number;
    discountAmount: number;
    total: number;
  };
}

export interface UsageCharge {
  metric: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OverageCharge {
  metric: string;
  overageQuantity: number;
  unitPrice: number;
  total: number;
}

export interface Discount {
  type: 'percentage' | 'fixed';
  value: number;
  description: string;
  total: number;
}

export interface Tax {
  type: string;
  rate: number;
  amount: number;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createPricingTier(tier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingTier> {
    const id = `PT-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO pricing_tiers (id, tenant_id, name, description, tier, base_price, currency,
                               billing_cycle, features, limits, is_active, created_at, updated_at)
      VALUES (${id}, ${tier.tenantId}, ${tier.name}, ${tier.description}, ${tier.tier},
              ${tier.basePrice}, ${tier.currency}, ${tier.billingCycle}, ${JSON.stringify(tier.features)},
              ${JSON.stringify(tier.limits)}, ${tier.isActive}, ${now}, ${now})
    `);

    this.logger.log(`Pricing tier created: ${id} for tenant ${tier.tenantId}`);

    return {
      id,
      ...tier,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getPricingTiers(tenantId: string): Promise<PricingTier[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM pricing_tiers WHERE tenant_id = ${tenantId} ORDER BY base_price ASC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string,
      tier: row.tier as PricingTier['tier'],
      basePrice: parseFloat(row.base_price as string),
      currency: row.currency as string,
      billingCycle: row.billing_cycle as PricingTier['billingCycle'],
      features: JSON.parse(row.features as string),
      limits: JSON.parse(row.limits as string),
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  async createUsageBasedPricing(pricing: Omit<UsageBasedPricing, 'id' | 'createdAt'>): Promise<UsageBasedPricing> {
    const id = `UBP-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO usage_based_pricing (id, tenant_id, metric, unit, base_price, currency,
                                      tiers, is_active, created_at)
      VALUES (${id}, ${pricing.tenantId}, ${pricing.metric}, ${pricing.unit}, ${pricing.basePrice},
              ${pricing.currency}, ${JSON.stringify(pricing.tiers)}, ${pricing.isActive}, ${now})
    `);

    this.logger.log(`Usage-based pricing created: ${id} for tenant ${pricing.tenantId}`);

    return {
      id,
      ...pricing,
      createdAt: now,
    };
  }

  async createOverageRule(rule: Omit<OverageRule, 'id' | 'createdAt'>): Promise<OverageRule> {
    const id = `OR-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO overage_rules (id, tenant_id, metric, threshold, overage_price, currency,
                                grace_period, notification_thresholds, is_active, created_at)
      VALUES (${id}, ${rule.tenantId}, ${rule.metric}, ${rule.threshold}, ${rule.overagePrice},
              ${rule.currency}, ${rule.gracePeriod}, ${JSON.stringify(rule.notificationThresholds)},
              ${rule.isActive}, ${now})
    `);

    this.logger.log(`Overage rule created: ${id} for tenant ${rule.tenantId}`);

    return {
      id,
      ...rule,
      createdAt: now,
    };
  }

  async calculatePricing(
    tenantId: string,
    tierId: string,
    usage: Record<string, number>,
    period: { start: Date; end: Date }
  ): Promise<PricingCalculation> {
    // Get pricing tier
    const tierResult = await this.db.execute(sql`
      SELECT * FROM pricing_tiers WHERE id = ${tierId} AND tenant_id = ${tenantId}
    `);

    if (tierResult.length === 0) {
      throw new Error('Pricing tier not found');
    }

    const tier = tierResult[0];
    const basePrice = parseFloat(tier.base_price as string);
    const currency = tier.currency as string;

    // Get usage-based pricing
    const usagePricingResult = await this.db.execute(sql`
      SELECT * FROM usage_based_pricing WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    const usageCharges: UsageCharge[] = [];
    const overageCharges: OverageCharge[] = [];

    // Calculate usage charges
    for (const pricing of usagePricingResult) {
      const metric = pricing.metric as string;
      const quantity = usage[metric] || 0;
      const tiers = JSON.parse(pricing.tiers as string);
      const unitPrice = this.calculateTieredPrice(quantity, tiers);
      
      usageCharges.push({
        metric,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
      });
    }

    // Get overage rules
    const overageRulesResult = await this.db.execute(sql`
      SELECT * FROM overage_rules WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    // Calculate overage charges
    for (const rule of overageRulesResult) {
      const metric = rule.metric as string;
      const threshold = parseFloat(rule.threshold as string);
      const overagePrice = parseFloat(rule.overage_price as string);
      const quantity = usage[metric] || 0;
      
      if (quantity > threshold) {
        const overageQuantity = quantity - threshold;
        overageCharges.push({
          metric,
          overageQuantity,
          unitPrice: overagePrice,
          total: overageQuantity * overagePrice,
        });
      }
    }

    // Calculate discounts (example: volume discounts)
    const discounts = this.calculateDiscounts(basePrice, usageCharges);

    // Calculate taxes (example: VAT)
    const taxes = this.calculateTaxes(basePrice, usageCharges, overageCharges, discounts);

    const subtotal = basePrice + 
      usageCharges.reduce((sum, charge) => sum + charge.total, 0) +
      overageCharges.reduce((sum, charge) => sum + charge.total, 0);

    const discountAmount = discounts.reduce((sum, discount) => sum + discount.total, 0);
    const taxAmount = taxes.reduce((sum, tax) => sum + tax.amount, 0);
    const total = subtotal - discountAmount + taxAmount;

    return {
      basePrice,
      usageCharges,
      overageCharges,
      discounts,
      taxes,
      total,
      currency,
      breakdown: {
        subtotal,
        taxAmount,
        discountAmount,
        total,
      },
    };
  }

  private calculateTieredPrice(quantity: number, tiers: UsageTier[]): number {
    for (const tier of tiers) {
      if (quantity >= tier.min && (tier.max === undefined || quantity <= tier.max)) {
        return tier.price;
      }
    }
    return tiers[tiers.length - 1]?.price || 0;
  }

  private calculateDiscounts(basePrice: number, usageCharges: UsageCharge[]): Discount[] {
    const discounts: Discount[] = [];
    const totalUsage = usageCharges.reduce((sum, charge) => sum + charge.total, 0);

    // Volume discount
    if (totalUsage > 10000) {
      discounts.push({
        type: 'percentage',
        value: 10,
        description: 'Volume discount (10%)',
        total: totalUsage * 0.1,
      });
    }

    // Annual discount
    if (basePrice > 1000) {
      discounts.push({
        type: 'percentage',
        value: 5,
        description: 'Annual subscription discount (5%)',
        total: basePrice * 0.05,
      });
    }

    return discounts;
  }

  private calculateTaxes(
    basePrice: number,
    usageCharges: UsageCharge[],
    overageCharges: OverageCharge[],
    discounts: Discount[]
  ): Tax[] {
    const subtotal = basePrice + 
      usageCharges.reduce((sum, charge) => sum + charge.total, 0) +
      overageCharges.reduce((sum, charge) => sum + charge.total, 0);
    
    const discountAmount = discounts.reduce((sum, discount) => sum + discount.total, 0);
    const taxableAmount = subtotal - discountAmount;

    return [
      {
        type: 'VAT',
        rate: 20, // 20% VAT
        amount: taxableAmount * 0.2,
      },
    ];
  }

  async getPricingAnalytics(tenantId: string, period: { start: Date; end: Date }): Promise<any> {
    const result = await this.db.execute(sql`
      SELECT 
        pt.tier,
        COUNT(DISTINCT pt.id) as tier_count,
        AVG(pt.base_price) as avg_base_price,
        SUM(ub.usage_quantity) as total_usage,
        SUM(ub.usage_quantity * ubp.base_price) as total_usage_revenue,
        COUNT(DISTINCT ub.tenant_id) as active_tenants
      FROM pricing_tiers pt
      LEFT JOIN usage_billing ub ON pt.tenant_id = ub.tenant_id
      LEFT JOIN usage_based_pricing ubp ON ub.metric = ubp.metric
      WHERE pt.tenant_id = ${tenantId}
      AND ub.period_start >= ${period.start}
      AND ub.period_end <= ${period.end}
      GROUP BY pt.tier
    `);

    const analytics = result.map(row => ({
      tier: row.tier as string,
      tierCount: parseInt(row.tier_count as string),
      avgBasePrice: parseFloat(row.avg_base_price as string),
      totalUsage: parseFloat(row.total_usage as string),
      totalUsageRevenue: parseFloat(row.total_usage_revenue as string),
      activeTenants: parseInt(row.active_tenants as string),
    }));

    const totalRevenue = analytics.reduce((sum, tier) => sum + tier.totalUsageRevenue, 0);
    const totalUsage = analytics.reduce((sum, tier) => sum + tier.totalUsage, 0);

    return {
      analytics,
      summary: {
        totalRevenue,
        totalUsage,
        averageRevenuePerTenant: analytics.length > 0 ? totalRevenue / analytics.length : 0,
        usageGrowth: this.calculateUsageGrowth(tenantId, period),
      },
    };
  }

  private async calculateUsageGrowth(tenantId: string, period: { start: Date; end: Date }): Promise<number> {
    const currentPeriod = await this.db.execute(sql`
      SELECT SUM(usage_quantity) as total_usage
      FROM usage_billing
      WHERE tenant_id = ${tenantId}
      AND period_start >= ${period.start}
      AND period_end <= ${period.end}
    `);

    const previousPeriodStart = new Date(period.start.getTime() - (period.end.getTime() - period.start.getTime()));
    const previousPeriod = await this.db.execute(sql`
      SELECT SUM(usage_quantity) as total_usage
      FROM usage_billing
      WHERE tenant_id = ${tenantId}
      AND period_start >= ${previousPeriodStart}
      AND period_end < ${period.start}
    `);

    const currentUsage = parseFloat(currentPeriod[0]?.total_usage as string) || 0;
    const previousUsage = parseFloat(previousPeriod[0]?.total_usage as string) || 0;

    if (previousUsage === 0) return 0;
    return ((currentUsage - previousUsage) / previousUsage) * 100;
  }
}
