// =====================================================================================
// AYAZLOGISTICS - BILLING PRICING ENGINE SERVICE
// =====================================================================================
// Description: Advanced pricing engine with tiered pricing, dynamic rules, and discounts
// Features: Contract-based pricing, usage tracking, invoice generation, tax calculation
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, between, sql, desc } from 'drizzle-orm';
import * as schema from '@/database/schema';
import { billingContracts, billingUsageTracking, billingInvoices } from '@/database/schema/logistics/billing.schema';

// =====================================================================================
// INTERFACES & TYPES
// =====================================================================================

interface PricingTier {
  serviceName: string;
  unitPrice: number;
  unit: string;
  minQuantity: number;
  maxQuantity?: number;
  setupFee?: number;
  discountPercentage?: number;
  notes?: string;
}

interface PricingRule {
  id: string;
  name: string;
  type: 'volume_discount' | 'time_based' | 'service_bundle' | 'loyalty' | 'seasonal' | 'promotional';
  conditions: Record<string, any>;
  action: 'discount_percentage' | 'discount_fixed' | 'price_override' | 'waive_fee';
  value: number;
  priority: number;
  active: boolean;
  validFrom?: Date;
  validUntil?: Date;
}

interface UsageRecord {
  serviceType: string;
  quantity: number;
  unit: string;
  usageDate: Date;
  location?: string;
  reference?: string;
  metadata?: Record<string, any>;
}

interface PricingCalculation {
  serviceType: string;
  quantity: number;
  unit: string;
  basePrice: number;
  unitPrice: number;
  subtotal: number;
  discounts: PricingDiscount[];
  totalDiscount: number;
  netAmount: number;
  appliedRules: string[];
  tierInfo?: {
    tierName: string;
    minQuantity: number;
    maxQuantity?: number;
  };
}

interface PricingDiscount {
  name: string;
  type: string;
  amount: number;
  percentage?: number;
  reason: string;
}

interface InvoiceLineItem {
  description: string;
  serviceType: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  period?: {
    start: Date;
    end: Date;
  };
  metadata?: Record<string, any>;
}

interface InvoiceCalculation {
  invoiceNumber: string;
  contractId: string;
  customerId: string;
  periodStart: Date;
  periodEnd: Date;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  dueDate: Date;
  appliedDiscounts: PricingDiscount[];
  summaryByService: Record<string, { quantity: number; amount: number }>;
}

interface BillingCycle {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'on_demand';
  dayOfMonth?: number;
  dayOfWeek?: number;
  advanceNoticeDays: number;
  gracePeriodDays: number;
}

interface TaxConfiguration {
  taxRate: number; // percentage
  taxName: string;
  taxRegistration?: string;
  applyToServices: string[];
  exemptServices: string[];
  reverseCharge?: boolean;
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);
  private readonly DEFAULT_CURRENCY = 'TRY';
  private readonly DEFAULT_TAX_RATE = 18; // VAT rate in Turkey
  private readonly DEFAULT_PAYMENT_TERMS = 30; // days

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // =====================================================================================
  // MAIN PRICING CALCULATION
  // =====================================================================================

  async calculatePrice(
    contractId: string,
    usageRecords: UsageRecord[],
    options?: {
      applyDiscounts?: boolean;
      applyMinimum?: boolean;
      includeSetupFees?: boolean;
      prorated?: boolean;
      effectiveDate?: Date;
    },
  ): Promise<PricingCalculation[]> {
    this.logger.log(`Calculating prices for contract ${contractId} with ${usageRecords.length} usage records`);

    const opts = {
      applyDiscounts: options?.applyDiscounts ?? true,
      applyMinimum: options?.applyMinimum ?? true,
      includeSetupFees: options?.includeSetupFees ?? false,
      prorated: options?.prorated ?? false,
      effectiveDate: options?.effectiveDate || new Date(),
    };

    // Fetch contract details
    const [contract] = await this.db
      .select()
      .from(billingContracts)
      .where(eq(billingContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    if (contract.status !== 'active') {
      throw new BadRequestException(`Contract ${contractId} is not active (status: ${contract.status})`);
    }

    // Get pricing tiers from contract
    const pricingTiers = (contract.pricingTiers as any[]) || [];

    // Load applicable pricing rules
    const pricingRules = await this.loadPricingRules(contract.tenantId, opts.effectiveDate);

    // Calculate price for each usage record
    const calculations: PricingCalculation[] = [];

    for (const usage of usageRecords) {
      const calculation = await this.calculateUsagePrice(
        usage,
        pricingTiers,
        pricingRules,
        contract,
        opts,
      );
      calculations.push(calculation);
    }

    this.logger.log(`Completed price calculation: ${calculations.length} items, total: ${calculations.reduce((sum, c) => sum + c.netAmount, 0).toFixed(2)} ${contract.currency}`);

    return calculations;
  }

  private async calculateUsagePrice(
    usage: UsageRecord,
    pricingTiers: PricingTier[],
    pricingRules: PricingRule[],
    contract: any,
    options: Required<Exclude<Parameters<typeof this.calculatePrice>[2], undefined>>,
  ): Promise<PricingCalculation> {
    // Find matching pricing tier
    const tier = this.findMatchingTier(usage.serviceType, usage.quantity, pricingTiers);

    if (!tier) {
      throw new BadRequestException(
        `No pricing tier found for service: ${usage.serviceType} with quantity: ${usage.quantity}`,
      );
    }

    // Calculate base price
    let unitPrice = tier.unitPrice;
    const basePrice = unitPrice * usage.quantity;

    // Apply tier discount if available
    const discounts: PricingDiscount[] = [];
    if (tier.discountPercentage && tier.discountPercentage > 0) {
      discounts.push({
        name: 'Tier Discount',
        type: 'tier',
        amount: basePrice * (tier.discountPercentage / 100),
        percentage: tier.discountPercentage,
        reason: `Volume discount for ${tier.serviceName}`,
      });
    }

    // Apply pricing rules if enabled
    if (options.applyDiscounts) {
      const ruleDiscounts = await this.applyPricingRules(
        usage,
        basePrice,
        pricingRules,
        contract,
      );
      discounts.push(...ruleDiscounts);
    }

    // Calculate total discount
    const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0);
    const netAmount = Math.max(0, basePrice - totalDiscount);

    // Build calculation result
    const calculation: PricingCalculation = {
      serviceType: usage.serviceType,
      quantity: usage.quantity,
      unit: usage.unit,
      basePrice,
      unitPrice,
      subtotal: basePrice,
      discounts,
      totalDiscount,
      netAmount,
      appliedRules: discounts.map(d => d.name),
      tierInfo: {
        tierName: tier.serviceName,
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
      },
    };

    return calculation;
  }

  private findMatchingTier(
    serviceType: string,
    quantity: number,
    tiers: PricingTier[],
  ): PricingTier | null {
    // Find tiers matching service type
    const matchingTiers = tiers.filter(tier =>
      tier.serviceName.toLowerCase().includes(serviceType.toLowerCase()) ||
      serviceType.toLowerCase().includes(tier.serviceName.toLowerCase()),
    );

    if (matchingTiers.length === 0) {
      return null;
    }

    // Find tier matching quantity range
    for (const tier of matchingTiers) {
      if (quantity >= tier.minQuantity) {
        if (!tier.maxQuantity || quantity <= tier.maxQuantity) {
          return tier;
        }
      }
    }

    // Return highest tier if quantity exceeds all ranges
    return matchingTiers[matchingTiers.length - 1];
  }

  // =====================================================================================
  // PRICING RULES ENGINE
  // =====================================================================================

  private async loadPricingRules(tenantId: string, effectiveDate: Date): Promise<PricingRule[]> {
    // In a real implementation, this would fetch from database
    // For now, return example rules
    const rules: PricingRule[] = [
      {
        id: 'volume-discount-1',
        name: 'High Volume Discount',
        type: 'volume_discount',
        conditions: {
          minMonthlySpend: 100000,
        },
        action: 'discount_percentage',
        value: 5,
        priority: 10,
        active: true,
      },
      {
        id: 'loyalty-discount-1',
        name: 'Loyalty Discount (1 year+)',
        type: 'loyalty',
        conditions: {
          minContractMonths: 12,
        },
        action: 'discount_percentage',
        value: 3,
        priority: 20,
        active: true,
      },
      {
        id: 'seasonal-summer',
        name: 'Summer Promotion',
        type: 'seasonal',
        conditions: {
          months: [6, 7, 8],
        },
        action: 'discount_percentage',
        value: 10,
        priority: 30,
        active: true,
        validFrom: new Date('2025-06-01'),
        validUntil: new Date('2025-08-31'),
      },
    ];

    // Filter active rules valid for effective date
    return rules.filter(rule => {
      if (!rule.active) return false;
      if (rule.validFrom && effectiveDate < rule.validFrom) return false;
      if (rule.validUntil && effectiveDate > rule.validUntil) return false;
      return true;
    }).sort((a, b) => a.priority - b.priority);
  }

  private async applyPricingRules(
    usage: UsageRecord,
    basePrice: number,
    rules: PricingRule[],
    contract: any,
  ): Promise<PricingDiscount[]> {
    const discounts: PricingDiscount[] = [];

    for (const rule of rules) {
      const applicable = await this.checkRuleConditions(rule, usage, contract);
      if (!applicable) continue;

      let discountAmount = 0;
      let discountPercentage: number | undefined;

      switch (rule.action) {
        case 'discount_percentage':
          discountPercentage = rule.value;
          discountAmount = basePrice * (rule.value / 100);
          break;
        case 'discount_fixed':
          discountAmount = rule.value;
          break;
        case 'price_override':
          discountAmount = Math.max(0, basePrice - rule.value);
          break;
        case 'waive_fee':
          discountAmount = basePrice;
          break;
      }

      if (discountAmount > 0) {
        discounts.push({
          name: rule.name,
          type: rule.type,
          amount: discountAmount,
          percentage: discountPercentage,
          reason: `Applied rule: ${rule.name}`,
        });
      }
    }

    return discounts;
  }

  private async checkRuleConditions(
    rule: PricingRule,
    usage: UsageRecord,
    contract: any,
  ): Promise<boolean> {
    switch (rule.type) {
      case 'volume_discount':
        if (rule.conditions.minMonthlySpend) {
          // Check if customer's monthly spend meets threshold
          const monthlySpend = await this.getMonthlySpend(contract.customerId);
          return monthlySpend >= rule.conditions.minMonthlySpend;
        }
        break;

      case 'loyalty':
        if (rule.conditions.minContractMonths) {
          const contractAge = this.getContractAgeMonths(contract.startDate);
          return contractAge >= rule.conditions.minContractMonths;
        }
        break;

      case 'seasonal':
        if (rule.conditions.months) {
          const currentMonth = usage.usageDate.getMonth() + 1;
          return rule.conditions.months.includes(currentMonth);
        }
        break;

      case 'time_based':
        if (rule.conditions.hours) {
          const currentHour = usage.usageDate.getHours();
          return rule.conditions.hours.includes(currentHour);
        }
        break;

      case 'service_bundle':
        // Check if customer is using bundled services
        return true; // Simplified

      case 'promotional':
        return true; // Promotional rules are always applicable when active
    }

    return false;
  }

  private async getMonthlySpend(customerId: string): Promise<number> {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${billingUsageTracking.totalAmount}), 0)`,
      })
      .from(billingUsageTracking)
      .where(
        and(
          eq(billingUsageTracking.contractId, customerId),
          gte(billingUsageTracking.usageDate, firstDayOfMonth),
        ),
      );

    return result[0]?.total || 0;
  }

  private getContractAgeMonths(startDate: Date): number {
    const now = new Date();
    const start = new Date(startDate);
    const months = (now.getFullYear() - start.getFullYear()) * 12 +
                   (now.getMonth() - start.getMonth());
    return months;
  }

  // =====================================================================================
  // INVOICE GENERATION
  // =====================================================================================

  async generateInvoice(
    contractId: string,
    periodStart: Date,
    periodEnd: Date,
    options?: {
      includeUnbilled?: boolean;
      applyMinimum?: boolean;
      sendImmediately?: boolean;
      dueInDays?: number;
    },
  ): Promise<InvoiceCalculation> {
    this.logger.log(`Generating invoice for contract ${contractId} from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);

    const opts = {
      includeUnbilled: options?.includeUnbilled ?? true,
      applyMinimum: options?.applyMinimum ?? true,
      sendImmediately: options?.sendImmediately ?? false,
      dueInDays: options?.dueInDays || this.DEFAULT_PAYMENT_TERMS,
    };

    // Fetch contract
    const [contract] = await this.db
      .select()
      .from(billingContracts)
      .where(eq(billingContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    // Fetch usage records for period
    const usageRecords = await this.db
      .select()
      .from(billingUsageTracking)
      .where(
        and(
          eq(billingUsageTracking.contractId, contractId),
          gte(billingUsageTracking.usageDate, periodStart),
          lte(billingUsageTracking.usageDate, periodEnd),
        ),
      )
      .orderBy(billingUsageTracking.usageDate);

    if (usageRecords.length === 0 && !opts.applyMinimum) {
      throw new BadRequestException('No usage records found for the specified period');
    }

    // Convert to usage record format
    const usageForCalculation: UsageRecord[] = usageRecords.map(record => ({
      serviceType: record.serviceType,
      quantity: Number(record.quantity),
      unit: record.unit,
      usageDate: new Date(record.usageDate),
      location: record.location || undefined,
      reference: record.reference || undefined,
      metadata: record.metadata as Record<string, any>,
    }));

    // Calculate prices
    const calculations = await this.calculatePrice(contractId, usageForCalculation, {
      applyDiscounts: true,
      applyMinimum: opts.applyMinimum,
    });

    // Group by service type
    const lineItemsByService = new Map<string, PricingCalculation[]>();
    calculations.forEach(calc => {
      const existing = lineItemsByService.get(calc.serviceType) || [];
      existing.push(calc);
      lineItemsByService.set(calc.serviceType, existing);
    });

    // Build invoice line items
    const lineItems: InvoiceLineItem[] = [];
    const summaryByService: Record<string, { quantity: number; amount: number }> = {};

    lineItemsByService.forEach((calcs, serviceType) => {
      const totalQuantity = calcs.reduce((sum, c) => sum + c.quantity, 0);
      const totalSubtotal = calcs.reduce((sum, c) => sum + c.subtotal, 0);
      const totalDiscount = calcs.reduce((sum, c) => sum + c.totalDiscount, 0);
      const totalNet = calcs.reduce((sum, c) => sum + c.netAmount, 0);
      const avgUnitPrice = totalSubtotal / totalQuantity;

      // Calculate tax
      const taxRate = this.DEFAULT_TAX_RATE;
      const taxAmount = totalNet * (taxRate / 100);

      lineItems.push({
        description: serviceType,
        serviceType,
        quantity: totalQuantity,
        unit: calcs[0].unit,
        unitPrice: avgUnitPrice,
        subtotal: totalSubtotal,
        discountAmount: totalDiscount,
        taxAmount,
        totalAmount: totalNet + taxAmount,
        period: {
          start: periodStart,
          end: periodEnd,
        },
      });

      summaryByService[serviceType] = {
        quantity: totalQuantity,
        amount: totalNet + taxAmount,
      };
    });

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscount = lineItems.reduce((sum, item) => sum + item.discountAmount, 0);
    const taxableAmount = subtotal - totalDiscount;

    // Apply monthly minimum if configured
    let finalTaxableAmount = taxableAmount;
    if (opts.applyMinimum && contract.monthlyMinimum) {
      const monthlyMinimum = Number(contract.monthlyMinimum);
      if (taxableAmount < monthlyMinimum) {
        const minimumCharge = monthlyMinimum - taxableAmount;
        lineItems.push({
          description: 'Monthly Minimum Charge',
          serviceType: 'minimum_charge',
          quantity: 1,
          unit: 'charge',
          unitPrice: minimumCharge,
          subtotal: minimumCharge,
          discountAmount: 0,
          taxAmount: minimumCharge * (this.DEFAULT_TAX_RATE / 100),
          totalAmount: minimumCharge * (1 + this.DEFAULT_TAX_RATE / 100),
        });
        finalTaxableAmount = monthlyMinimum;
      }
    }

    const taxAmount = finalTaxableAmount * (this.DEFAULT_TAX_RATE / 100);
    const totalAmount = finalTaxableAmount + taxAmount;

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(contract.tenantId);

    // Calculate due date
    const invoiceDate = new Date();
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + opts.dueInDays);

    const invoice: InvoiceCalculation = {
      invoiceNumber,
      contractId,
      customerId: contract.customerId,
      periodStart,
      periodEnd,
      lineItems,
      subtotal,
      totalDiscount,
      taxableAmount: finalTaxableAmount,
      taxRate: this.DEFAULT_TAX_RATE,
      taxAmount,
      totalAmount,
      currency: contract.currency || this.DEFAULT_CURRENCY,
      dueDate,
      appliedDiscounts: calculations.flatMap(c => c.discounts),
      summaryByService,
    };

    this.logger.log(
      `Invoice ${invoiceNumber} generated: ${lineItems.length} line items, ` +
      `Total: ${totalAmount.toFixed(2)} ${invoice.currency}`,
    );

    return invoice;
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const [result] = await this.db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(billingInvoices)
      .where(
        and(
          eq(billingInvoices.tenantId, tenantId),
          sql`EXTRACT(YEAR FROM ${billingInvoices.invoiceDate}) = ${year}`,
          sql`EXTRACT(MONTH FROM ${billingInvoices.invoiceDate}) = ${parseInt(month)}`,
        ),
      );

    const sequence = (result?.count || 0) + 1;
    return `INV-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }

  // =====================================================================================
  // USAGE TRACKING
  // =====================================================================================

  async trackUsage(
    contractId: string,
    usageRecords: UsageRecord[],
    options?: {
      autoCalculatePrice?: boolean;
      validateContract?: boolean;
    },
  ): Promise<void> {
    const opts = {
      autoCalculatePrice: options?.autoCalculatePrice ?? true,
      validateContract: options?.validateContract ?? true,
    };

    this.logger.log(`Tracking ${usageRecords.length} usage records for contract ${contractId}`);

    // Validate contract if required
    if (opts.validateContract) {
      const [contract] = await this.db
        .select()
        .from(billingContracts)
        .where(eq(billingContracts.id, contractId))
        .limit(1);

      if (!contract) {
        throw new NotFoundException(`Contract ${contractId} not found`);
      }

      if (contract.status !== 'active') {
        throw new BadRequestException(`Cannot track usage for inactive contract (status: ${contract.status})`);
      }
    }

    // Calculate prices if enabled
    let calculations: PricingCalculation[] = [];
    if (opts.autoCalculatePrice) {
      calculations = await this.calculatePrice(contractId, usageRecords);
    }

    // Insert usage records
    const insertData = usageRecords.map((usage, idx) => ({
      contractId,
      serviceType: usage.serviceType,
      quantity: usage.quantity.toString(),
      unit: usage.unit,
      usageDate: usage.usageDate,
      unitPrice: calculations[idx]?.unitPrice?.toString() || '0',
      totalAmount: calculations[idx]?.netAmount?.toString() || '0',
      location: usage.location,
      reference: usage.reference,
      metadata: usage.metadata || {},
    }));

    await this.db.insert(billingUsageTracking).values(insertData);

    this.logger.log(`Successfully tracked ${usageRecords.length} usage records`);
  }

  // =====================================================================================
  // PRICING ANALYTICS
  // =====================================================================================

  async analyzePricing(contractId: string, periodStart: Date, periodEnd: Date): Promise<{
    totalRevenue: number;
    totalCost: number;
    margin: number;
    marginPercentage: number;
    usageByService: Record<string, { quantity: number; revenue: number }>;
    topServices: Array<{ service: string; revenue: number; percentage: number }>;
    discountImpact: { totalDiscounts: number; percentage: number };
    trends: {
      dailyAverage: number;
      weeklyAverage: number;
      monthlyProjection: number;
    };
  }> {
    const usageRecords = await this.db
      .select()
      .from(billingUsageTracking)
      .where(
        and(
          eq(billingUsageTracking.contractId, contractId),
          gte(billingUsageTracking.usageDate, periodStart),
          lte(billingUsageTracking.usageDate, periodEnd),
        ),
      );

    const totalRevenue = usageRecords.reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

    // Group by service
    const usageByService: Record<string, { quantity: number; revenue: number }> = {};
    usageRecords.forEach(record => {
      const existing = usageByService[record.serviceType] || { quantity: 0, revenue: 0 };
      existing.quantity += Number(record.quantity);
      existing.revenue += Number(record.totalAmount || 0);
      usageByService[record.serviceType] = existing;
    });

    // Top services
    const topServices = Object.entries(usageByService)
      .map(([service, data]) => ({
        service,
        revenue: data.revenue,
        percentage: (data.revenue / totalRevenue) * 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Trends
    const days = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = totalRevenue / days;
    const weeklyAverage = dailyAverage * 7;
    const monthlyProjection = dailyAverage * 30;

    return {
      totalRevenue,
      totalCost: 0, // TODO: Calculate actual costs
      margin: totalRevenue,
      marginPercentage: 100,
      usageByService,
      topServices,
      discountImpact: {
        totalDiscounts: 0,
        percentage: 0,
      },
      trends: {
        dailyAverage,
        weeklyAverage,
        monthlyProjection,
      },
    };
  }

  // =====================================================================================
  // UTILITY METHODS
  // =====================================================================================

  async validateContract(contractId: string): Promise<boolean> {
    const [contract] = await this.db
      .select()
      .from(billingContracts)
      .where(eq(billingContracts.id, contractId))
      .limit(1);

    if (!contract) return false;
    if (contract.status !== 'active') return false;

    const now = new Date();
    const startDate = new Date(contract.startDate);
    const endDate = new Date(contract.endDate);

    if (now < startDate || now > endDate) return false;

    return true;
  }

  async getContractPricingTiers(contractId: string): Promise<PricingTier[]> {
    const [contract] = await this.db
      .select()
      .from(billingContracts)
      .where(eq(billingContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    return (contract.pricingTiers as any[]) || [];
  }

  calculateProration(
    amount: number,
    periodStart: Date,
    periodEnd: Date,
    actualStart: Date,
    actualEnd: Date,
  ): number {
    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const actualDays = Math.ceil((actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24));
    return (amount / totalDays) * actualDays;
  }
}

// =====================================================================================
// END OF SERVICE
// =====================================================================================

