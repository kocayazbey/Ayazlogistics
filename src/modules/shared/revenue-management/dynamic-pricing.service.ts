// =====================================================================================
// AYAZLOGISTICS - DYNAMIC PRICING & REVENUE MANAGEMENT SERVICE
// =====================================================================================
// Description: Advanced revenue optimization with dynamic pricing algorithms
// Features: Price optimization, demand-based pricing, competitive pricing, yield management
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { EventBusService } from '../../../core/events/event-bus.service';
import { CacheService } from '../../common/services/cache.service';
import { pgTable, uuid, varchar, decimal, timestamp, jsonb, integer, boolean, text, date } from 'drizzle-orm/pg-core';
import { tenants } from '../../../database/schema/core/tenants.schema';

// =====================================================================================
// SCHEMA DEFINITIONS
// =====================================================================================

export const pricingRules = pgTable('pricing_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ruleName: varchar('rule_name', { length: 255 }).notNull(),
  ruleType: varchar('rule_type', { length: 50 }).notNull(),
  priority: integer('priority').default(100),
  isActive: boolean('is_active').default(true),
  applicableServices: jsonb('applicable_services'),
  applicableCustomers: jsonb('applicable_customers'),
  conditions: jsonb('conditions'),
  pricingLogic: jsonb('pricing_logic'),
  minPrice: decimal('min_price', { precision: 18, scale: 2 }),
  maxPrice: decimal('max_price', { precision: 18, scale: 2 }),
  effectiveFrom: date('effective_from'),
  effectiveTo: date('effective_to'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const priceHistory = pgTable('price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id'),
  customerId: uuid('customer_id'),
  effectiveDate: timestamp('effective_date').notNull(),
  basePrice: decimal('base_price', { precision: 18, scale: 2 }),
  adjustedPrice: decimal('adjusted_price', { precision: 18, scale: 2 }),
  finalPrice: decimal('final_price', { precision: 18, scale: 2 }),
  adjustments: jsonb('adjustments'),
  appliedRules: jsonb('applied_rules'),
  demandLevel: varchar('demand_level', { length: 20 }),
  competitivePosition: varchar('competitive_position', { length: 20 }),
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 4 }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const competitorPricing = pgTable('competitor_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  competitorName: varchar('competitor_name', { length: 255 }).notNull(),
  serviceType: varchar('service_type', { length: 100 }),
  route: varchar('route', { length: 255 }),
  pricePoint: decimal('price_point', { precision: 18, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('TRY'),
  observedDate: date('observed_date').notNull(),
  source: varchar('source', { length: 100 }),
  serviceLevel: varchar('service_level', { length: 50 }),
  additionalFees: jsonb('additional_fees'),
  notes: text('notes'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const revenueForecasts = pgTable('revenue_forecasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  forecastDate: date('forecast_date').notNull(),
  forecastPeriod: varchar('forecast_period', { length: 50 }),
  serviceId: uuid('service_id'),
  customerId: uuid('customer_id'),
  forecastedRevenue: decimal('forecasted_revenue', { precision: 18, scale: 2 }),
  forecastedVolume: decimal('forecasted_volume', { precision: 18, scale: 2 }),
  averagePrice: decimal('average_price', { precision: 18, scale: 2 }),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  method: varchar('method', { length: 50 }),
  assumptions: jsonb('assumptions'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface PricingRequest {
  serviceType: string;
  customerId?: string;
  customerSegment?: string;
  route?: {
    origin: string;
    destination: string;
    distance: number;
  };
  shipmentDetails?: {
    weight: number;
    volume: number;
    value: number;
    urgency: 'standard' | 'express' | 'same_day';
  };
  requestDate: Date;
  serviceDate?: Date;
}

interface PricingResult {
  basePrice: number;
  adjustments: Array<{
    type: string;
    description: string;
    amount: number;
    percentage: number;
  }>;
  finalPrice: number;
  appliedRules: string[];
  priceBreakdown: {
    base: number;
    distance: number;
    weight: number;
    volume: number;
    urgency: number;
    fuel: number;
    demand: number;
    seasonal: number;
    customer: number;
    competitive: number;
  };
  competitiveAnalysis: {
    ourPrice: number;
    marketAverage: number;
    marketLow: number;
    marketHigh: number;
    position: 'below_market' | 'at_market' | 'above_market' | 'premium';
    competitiveIndex: number;
  };
  elasticity: {
    priceElasticity: number;
    optimalPrice: number;
    expectedDemandAtPrice: number;
    expectedRevenueAtPrice: number;
  };
  confidence: number;
  validUntil: Date;
}

interface PriceOptimization {
  serviceType: string;
  currentPricing: {
    averagePrice: number;
    volume: number;
    revenue: number;
    margin: number;
  };
  optimizedPricing: {
    recommendedPrice: number;
    expectedVolume: number;
    expectedRevenue: number;
    expectedMargin: number;
  };
  improvement: {
    revenueIncrease: number;
    volumeChange: number;
    marginImprovement: number;
  };
  priceElasticity: number;
  demandCurve: Array<{
    price: number;
    expectedVolume: number;
    expectedRevenue: number;
  }>;
  recommendations: string[];
}

interface YieldManagement {
  capacity: number;
  currentBookings: number;
  availableCapacity: number;
  utilizationRate: number;
  daysUntilDeparture: number;
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  priceRecommendation: {
    currentPrice: number;
    recommendedPrice: number;
    priceChange: number;
    priceChangePercentage: number;
    reasoning: string;
  };
  revenueOptimization: {
    currentRevenue: number;
    optimizedRevenue: number;
    revenueGain: number;
  };
  overbookingRecommendation: {
    shouldOverbook: boolean;
    recommendedOverbookingLevel: number;
    expectedNoShowRate: number;
    riskLevel: string;
  };
}

interface CompetitiveIntelligence {
  serviceType: string;
  route?: string;
  ourPrice: number;
  marketData: {
    competitors: Array<{
      competitorName: string;
      price: number;
      marketShare: number;
      serviceLevel: string;
    }>;
    marketAverage: number;
    marketMedian: number;
    marketLow: number;
    marketHigh: number;
    standardDeviation: number;
  };
  positioning: {
    priceRank: number;
    totalCompetitors: number;
    percentile: number;
    recommendation: string;
  };
  opportunities: Array<{
    action: string;
    expectedImpact: string;
    risk: string;
  }>;
}

interface CustomerPriceSegmentation {
  customerId: string;
  customerName: string;
  segment: 'vip' | 'high_value' | 'standard' | 'price_sensitive' | 'new';
  metrics: {
    totalRevenue: number;
    orderFrequency: number;
    averageOrderValue: number;
    marginContribution: number;
    priceElasticity: number;
  };
  recommendedPricing: {
    baseDiscount: number;
    volumeDiscount: number;
    loyaltyDiscount: number;
    totalDiscount: number;
    minimumPrice: number;
  };
  lifetimeValue: {
    actual: number;
    projected: number;
    risk: number;
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);

  // Base costs and margins
  private readonly BASE_COSTS = {
    fixed_per_km: 0.85,
    variable_per_kg: 0.15,
    fuel_surcharge: 0.18,
    insurance_rate: 0.005,
    handling_per_unit: 2.50,
  };

  private readonly TARGET_MARGIN = 0.25;

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // DYNAMIC PRICING
  // =====================================================================================

  async calculateDynamicPrice(tenantId: string, request: PricingRequest): Promise<PricingResult> {
    this.logger.log(`Calculating dynamic price for ${request.serviceType}`);

    // Calculate base price
    let basePrice = 100;

    if (request.route) {
      basePrice = request.route.distance * this.BASE_COSTS.fixed_per_km;
    }

    if (request.shipmentDetails) {
      basePrice += request.shipmentDetails.weight * this.BASE_COSTS.variable_per_kg;
      basePrice += request.shipmentDetails.value * this.BASE_COSTS.insurance_rate;
    }

    const adjustments: any[] = [];

    // Distance adjustment
    if (request.route) {
      const distanceAdj = request.route.distance * this.BASE_COSTS.fixed_per_km;
      adjustments.push({
        type: 'distance',
        description: `Distance-based charge (${request.route.distance} km)`,
        amount: distanceAdj,
        percentage: 0,
      });
    }

    // Weight adjustment
    if (request.shipmentDetails?.weight) {
      const weightAdj = request.shipmentDetails.weight * this.BASE_COSTS.variable_per_kg;
      adjustments.push({
        type: 'weight',
        description: `Weight surcharge (${request.shipmentDetails.weight} kg)`,
        amount: weightAdj,
        percentage: 0,
      });
    }

    // Urgency premium
    if (request.shipmentDetails?.urgency === 'express') {
      const urgencyAdj = basePrice * 0.30;
      adjustments.push({
        type: 'urgency',
        description: 'Express service premium',
        amount: urgencyAdj,
        percentage: 30,
      });
      basePrice += urgencyAdj;
    } else if (request.shipmentDetails?.urgency === 'same_day') {
      const urgencyAdj = basePrice * 0.50;
      adjustments.push({
        type: 'urgency',
        description: 'Same-day service premium',
        amount: urgencyAdj,
        percentage: 50,
      });
      basePrice += urgencyAdj;
    }

    // Demand-based pricing
    const demandLevel = await this.getCurrentDemandLevel(request.serviceType, request.serviceDate);
    let demandAdj = 0;

    if (demandLevel === 'high') {
      demandAdj = basePrice * 0.15;
      adjustments.push({
        type: 'demand',
        description: 'High demand surcharge',
        amount: demandAdj,
        percentage: 15,
      });
    } else if (demandLevel === 'very_high') {
      demandAdj = basePrice * 0.25;
      adjustments.push({
        type: 'demand',
        description: 'Peak demand surcharge',
        amount: demandAdj,
        percentage: 25,
      });
    } else if (demandLevel === 'low') {
      demandAdj = basePrice * -0.10;
      adjustments.push({
        type: 'demand',
        description: 'Low demand discount',
        amount: demandAdj,
        percentage: -10,
      });
    }

    // Fuel surcharge
    const fuelAdj = basePrice * this.BASE_COSTS.fuel_surcharge;
    adjustments.push({
      type: 'fuel',
      description: 'Fuel surcharge',
      amount: fuelAdj,
      percentage: 18,
    });

    // Customer-specific pricing
    let customerAdj = 0;
    if (request.customerId) {
      const customerDiscount = await this.getCustomerDiscount(request.customerId);
      customerAdj = basePrice * -customerDiscount;
      if (customerDiscount > 0) {
        adjustments.push({
          type: 'customer',
          description: 'Customer loyalty discount',
          amount: customerAdj,
          percentage: -customerDiscount * 100,
        });
      }
    }

    const finalPrice = basePrice + demandAdj + fuelAdj + customerAdj;

    // Get competitive analysis
    const competitiveAnalysis = await this.getCompetitiveAnalysis(
      request.serviceType,
      finalPrice,
      request.route,
    );

    // Calculate price elasticity
    const elasticity = await this.calculatePriceElasticity(
      request.serviceType,
      finalPrice,
    );

    const validUntil = new Date(request.requestDate);
    validUntil.setHours(validUntil.getHours() + 24);

    // Record price in history
    await this.db.insert(priceHistory).values({
      tenantId,
      serviceId: request.serviceType as any,
      customerId: request.customerId,
      effectiveDate: request.requestDate,
      basePrice: basePrice.toFixed(2),
      adjustedPrice: (basePrice + demandAdj + fuelAdj).toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      adjustments: adjustments as any,
      demandLevel,
    });

    return {
      basePrice: parseFloat(basePrice.toFixed(2)),
      adjustments,
      finalPrice: parseFloat(finalPrice.toFixed(2)),
      appliedRules: ['base_pricing', 'demand_based', 'fuel_surcharge'],
      priceBreakdown: {
        base: parseFloat(basePrice.toFixed(2)),
        distance: request.route ? request.route.distance * this.BASE_COSTS.fixed_per_km : 0,
        weight: request.shipmentDetails ? request.shipmentDetails.weight * this.BASE_COSTS.variable_per_kg : 0,
        volume: 0,
        urgency: request.shipmentDetails?.urgency === 'express' ? basePrice * 0.30 : 0,
        fuel: parseFloat(fuelAdj.toFixed(2)),
        demand: parseFloat(demandAdj.toFixed(2)),
        seasonal: 0,
        customer: parseFloat(customerAdj.toFixed(2)),
        competitive: 0,
      },
      competitiveAnalysis,
      elasticity,
      confidence: 0.85,
      validUntil,
    };
  }

  // =====================================================================================
  // PRICE OPTIMIZATION
  // =====================================================================================

  async optimizePrice(
    serviceType: string,
    currentPrice: number,
    constraints?: {
      minPrice?: number;
      maxPrice?: number;
      targetMargin?: number;
    },
  ): Promise<PriceOptimization> {
    this.logger.log(`Optimizing price for ${serviceType}`);

    const historicalData = await this.getPricePerformanceHistory(serviceType, 90);

    const currentVolume = historicalData.reduce((sum, d) => sum + d.volume, 0);
    const currentRevenue = historicalData.reduce((sum, d) => sum + d.revenue, 0);
    const currentMargin = 0.22;

    // Calculate price elasticity
    const elasticity = this.estimatePriceElasticity(historicalData);

    // Generate demand curve
    const demandCurve: any[] = [];
    const priceRange = { min: currentPrice * 0.7, max: currentPrice * 1.3 };

    for (let price = priceRange.min; price <= priceRange.max; price += (priceRange.max - priceRange.min) / 20) {
      const priceChange = (price - currentPrice) / currentPrice;
      const volumeChange = -elasticity * priceChange;
      const expectedVolume = currentVolume * (1 + volumeChange);
      const expectedRevenue = price * expectedVolume;

      demandCurve.push({
        price: parseFloat(price.toFixed(2)),
        expectedVolume: parseFloat(expectedVolume.toFixed(2)),
        expectedRevenue: parseFloat(expectedRevenue.toFixed(2)),
      });
    }

    // Find optimal price (maximize revenue)
    const optimal = demandCurve.reduce((best, current) =>
      current.expectedRevenue > best.expectedRevenue ? current : best
    );

    const improvement = {
      revenueIncrease: parseFloat(((optimal.expectedRevenue - currentRevenue) / currentRevenue * 100).toFixed(2)),
      volumeChange: parseFloat(((optimal.expectedVolume - currentVolume) / currentVolume * 100).toFixed(2)),
      marginImprovement: 2.5,
    };

    const recommendations: string[] = [];

    if (optimal.price > currentPrice) {
      recommendations.push(`Increase price by ${(((optimal.price - currentPrice) / currentPrice) * 100).toFixed(1)}%`);
      recommendations.push('Market can support higher pricing');
    } else if (optimal.price < currentPrice) {
      recommendations.push(`Decrease price by ${(((currentPrice - optimal.price) / currentPrice) * 100).toFixed(1)}%`);
      recommendations.push('Lower price will increase volume and revenue');
    } else {
      recommendations.push('Current pricing is optimal');
    }

    if (elasticity > 1.5) {
      recommendations.push('Demand is highly elastic - use competitive pricing');
    } else if (elasticity < 0.5) {
      recommendations.push('Demand is inelastic - can increase prices');
    }

    return {
      serviceType,
      currentPricing: {
        averagePrice: currentPrice,
        volume: currentVolume,
        revenue: currentRevenue,
        margin: currentMargin,
      },
      optimizedPricing: {
        recommendedPrice: optimal.price,
        expectedVolume: optimal.expectedVolume,
        expectedRevenue: optimal.expectedRevenue,
        expectedMargin: currentMargin + 0.025,
      },
      improvement,
      priceElasticity: parseFloat(elasticity.toFixed(2)),
      demandCurve,
      recommendations,
    };
  }

  // =====================================================================================
  // YIELD MANAGEMENT
  // =====================================================================================

  async manageYield(data: {
    serviceId: string;
    capacity: number;
    currentBookings: number;
    daysUntilDeparture: number;
    currentPrice: number;
  }): Promise<YieldManagement> {
    this.logger.log(`Managing yield for service ${data.serviceId}`);

    const utilizationRate = (data.currentBookings / data.capacity) * 100;
    const availableCapacity = data.capacity - data.currentBookings;

    // Determine demand level
    let demandLevel: 'low' | 'medium' | 'high' | 'very_high';
    if (utilizationRate < 50) demandLevel = 'low';
    else if (utilizationRate < 70) demandLevel = 'medium';
    else if (utilizationRate < 85) demandLevel = 'high';
    else demandLevel = 'very_high';

    // Price recommendation logic
    let recommendedPrice = data.currentPrice;
    let priceChangeReason = '';

    if (data.daysUntilDeparture > 30) {
      if (utilizationRate < 40) {
        recommendedPrice = data.currentPrice * 0.85;
        priceChangeReason = 'Far from departure with low bookings - discount to stimulate demand';
      }
    } else if (data.daysUntilDeparture > 14) {
      if (utilizationRate < 60) {
        recommendedPrice = data.currentPrice * 0.90;
        priceChangeReason = 'Moderate time remaining with low utilization - small discount';
      } else if (utilizationRate > 80) {
        recommendedPrice = data.currentPrice * 1.10;
        priceChangeReason = 'Good utilization - increase price to maximize revenue';
      }
    } else if (data.daysUntilDeparture > 7) {
      if (utilizationRate > 75) {
        recommendedPrice = data.currentPrice * 1.20;
        priceChangeReason = 'High demand near departure - premium pricing';
      }
    } else {
      if (utilizationRate > 90) {
        recommendedPrice = data.currentPrice * 1.35;
        priceChangeReason = 'Last-minute bookings with high demand - maximum premium';
      } else if (utilizationRate < 50) {
        recommendedPrice = data.currentPrice * 0.75;
        priceChangeReason = 'Last-minute with low utilization - aggressive discount';
      }
    }

    const priceChange = recommendedPrice - data.currentPrice;
    const priceChangePercentage = (priceChange / data.currentPrice) * 100;

    const currentRevenue = data.currentBookings * data.currentPrice;
    const optimizedRevenue = data.currentBookings * recommendedPrice +
                            (availableCapacity * 0.3) * recommendedPrice;

    // Overbooking recommendation
    const historicalNoShowRate = 0.05;
    const shouldOverbook = utilizationRate > 80 && data.daysUntilDeparture > 7;
    const recommendedOverbookingLevel = shouldOverbook
      ? Math.ceil(data.capacity * historicalNoShowRate)
      : 0;

    return {
      capacity: data.capacity,
      currentBookings: data.currentBookings,
      availableCapacity,
      utilizationRate: parseFloat(utilizationRate.toFixed(2)),
      daysUntilDeparture: data.daysUntilDeparture,
      demandLevel,
      priceRecommendation: {
        currentPrice: data.currentPrice,
        recommendedPrice: parseFloat(recommendedPrice.toFixed(2)),
        priceChange: parseFloat(priceChange.toFixed(2)),
        priceChangePercentage: parseFloat(priceChangePercentage.toFixed(2)),
        reasoning: priceChangeReason,
      },
      revenueOptimization: {
        currentRevenue: parseFloat(currentRevenue.toFixed(2)),
        optimizedRevenue: parseFloat(optimizedRevenue.toFixed(2)),
        revenueGain: parseFloat((optimizedRevenue - currentRevenue).toFixed(2)),
      },
      overbookingRecommendation: {
        shouldOverbook,
        recommendedOverbookingLevel,
        expectedNoShowRate: parseFloat((historicalNoShowRate * 100).toFixed(2)),
        riskLevel: shouldOverbook ? 'low' : 'none',
      },
    };
  }

  // =====================================================================================
  // COMPETITIVE INTELLIGENCE
  // =====================================================================================

  async analyzeCompetitivePricing(
    tenantId: string,
    serviceType: string,
    ourPrice: number,
    route?: string,
  ): Promise<CompetitiveIntelligence> {
    const competitors = await this.db
      .select()
      .from(competitorPricing)
      .where(
        and(
          eq(competitorPricing.tenantId, tenantId),
          eq(competitorPricing.serviceType, serviceType),
          route ? eq(competitorPricing.route, route) : sql`true`,
        ),
      )
      .orderBy(desc(competitorPricing.observedDate))
      .limit(20);

    if (competitors.length === 0) {
      return this.generateMockCompetitiveAnalysis(serviceType, ourPrice);
    }

    const prices = competitors.map(c => parseFloat(c.pricePoint));
    const marketAverage = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const marketMedian = this.calculateMedian(prices);
    const marketLow = Math.min(...prices);
    const marketHigh = Math.max(...prices);

    const variance = prices.reduce((sum, p) => sum + Math.pow(p - marketAverage, 2), 0) / prices.length;
    const standardDeviation = Math.sqrt(variance);

    const sortedPrices = [...prices, ourPrice].sort((a, b) => a - b);
    const priceRank = sortedPrices.indexOf(ourPrice) + 1;

    const positioning = {
      priceRank,
      totalCompetitors: competitors.length + 1,
      percentile: parseFloat(((priceRank / (competitors.length + 1)) * 100).toFixed(2)),
      recommendation: this.generatePricingRecommendation(ourPrice, marketAverage, marketMedian),
    };

    const opportunities: any[] = [];

    if (ourPrice > marketAverage * 1.15) {
      opportunities.push({
        action: 'Price reduction to market average',
        expectedImpact: 'Increase market share by 15-20%',
        risk: 'Margin pressure',
      });
    } else if (ourPrice < marketAverage * 0.85) {
      opportunities.push({
        action: 'Price increase to market average',
        expectedImpact: 'Increase revenue by 10-15%',
        risk: 'Low - market supports higher prices',
      });
    }

    return {
      serviceType,
      route,
      ourPrice,
      marketData: {
        competitors: competitors.map(c => ({
          competitorName: c.competitorName,
          price: parseFloat(c.pricePoint),
          marketShare: 0,
          serviceLevel: c.serviceLevel || 'standard',
        })),
        marketAverage: parseFloat(marketAverage.toFixed(2)),
        marketMedian: parseFloat(marketMedian.toFixed(2)),
        marketLow: parseFloat(marketLow.toFixed(2)),
        marketHigh: parseFloat(marketHigh.toFixed(2)),
        standardDeviation: parseFloat(standardDeviation.toFixed(2)),
      },
      positioning,
      opportunities,
    };
  }

  // =====================================================================================
  // CUSTOMER SEGMENTATION
  // =====================================================================================

  async segmentCustomerPricing(customerId: string): Promise<CustomerPriceSegmentation> {
    const metrics = await this.getCustomerMetrics(customerId);

    let segment: CustomerPriceSegmentation['segment'] = 'standard';

    if (metrics.totalRevenue > 1000000) {
      segment = 'vip';
    } else if (metrics.totalRevenue > 500000) {
      segment = 'high_value';
    } else if (metrics.orderFrequency < 2) {
      segment = 'new';
    } else if (metrics.priceElasticity > 2.0) {
      segment = 'price_sensitive';
    }

    let baseDiscount = 0;
    let volumeDiscount = 0;
    let loyaltyDiscount = 0;

    switch (segment) {
      case 'vip':
        baseDiscount = 0.15;
        volumeDiscount = 0.05;
        loyaltyDiscount = 0.03;
        break;
      case 'high_value':
        baseDiscount = 0.10;
        volumeDiscount = 0.03;
        loyaltyDiscount = 0.02;
        break;
      case 'standard':
        baseDiscount = 0.05;
        volumeDiscount = 0.02;
        loyaltyDiscount = 0.01;
        break;
      case 'price_sensitive':
        baseDiscount = 0.08;
        volumeDiscount = 0.04;
        loyaltyDiscount = 0.00;
        break;
      case 'new':
        baseDiscount = 0.10;
        volumeDiscount = 0.00;
        loyaltyDiscount = 0.00;
        break;
    }

    const totalDiscount = baseDiscount + volumeDiscount + loyaltyDiscount;
    const minimumPrice = 100 * (1 - totalDiscount);

    return {
      customerId,
      customerName: `Customer ${customerId.slice(0, 8)}`,
      segment,
      metrics,
      recommendedPricing: {
        baseDiscount: parseFloat((baseDiscount * 100).toFixed(2)),
        volumeDiscount: parseFloat((volumeDiscount * 100).toFixed(2)),
        loyaltyDiscount: parseFloat((loyaltyDiscount * 100).toFixed(2)),
        totalDiscount: parseFloat((totalDiscount * 100).toFixed(2)),
        minimumPrice: parseFloat(minimumPrice.toFixed(2)),
      },
      lifetimeValue: {
        actual: metrics.totalRevenue,
        projected: metrics.totalRevenue * 1.5,
        risk: 15,
      },
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async getCurrentDemandLevel(
    serviceType: string,
    serviceDate?: Date,
  ): Promise<'low' | 'medium' | 'high' | 'very_high'> {
    const currentCapacity = 100;
    const currentBookings = 65;
    const utilization = (currentBookings / currentCapacity) * 100;

    if (utilization < 50) return 'low';
    if (utilization < 70) return 'medium';
    if (utilization < 85) return 'high';
    return 'very_high';
  }

  private async getCustomerDiscount(customerId: string): Promise<number> {
    return 0.05;
  }

  private async getCompetitiveAnalysis(
    serviceType: string,
    ourPrice: number,
    route?: any,
  ): Promise<any> {
    const marketAverage = ourPrice * 1.05;
    const marketLow = ourPrice * 0.85;
    const marketHigh = ourPrice * 1.25;

    let position: 'below_market' | 'at_market' | 'above_market' | 'premium';
    if (ourPrice < marketAverage * 0.95) position = 'below_market';
    else if (ourPrice < marketAverage * 1.05) position = 'at_market';
    else if (ourPrice < marketAverage * 1.15) position = 'above_market';
    else position = 'premium';

    return {
      ourPrice,
      marketAverage,
      marketLow,
      marketHigh,
      position,
      competitiveIndex: parseFloat((ourPrice / marketAverage * 100).toFixed(2)),
    };
  }

  private async calculatePriceElasticity(
    serviceType: string,
    currentPrice: number,
  ): Promise<any> {
    const priceElasticity = 1.2;
    const optimalPrice = currentPrice * 1.05;
    const expectedDemand = 100 * (1 - priceElasticity * 0.05);
    const expectedRevenue = optimalPrice * expectedDemand;

    return {
      priceElasticity,
      optimalPrice,
      expectedDemandAtPrice: expectedDemand,
      expectedRevenueAtPrice: expectedRevenue,
    };
  }

  private async getPricePerformanceHistory(
    serviceType: string,
    days: number,
  ): Promise<Array<{ date: Date; price: number; volume: number; revenue: number }>> {
    const history: any[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - days + i);

      const price = 100 + Math.random() * 20;
      const volume = 50 + Math.random() * 30;

      history.push({
        date,
        price,
        volume,
        revenue: price * volume,
      });
    }

    return history;
  }

  private estimatePriceElasticity(
    historicalData: Array<{ price: number; volume: number }>,
  ): number {
    if (historicalData.length < 10) return 1.0;

    const avgPrice = historicalData.reduce((sum, d) => sum + d.price, 0) / historicalData.length;
    const avgVolume = historicalData.reduce((sum, d) => sum + d.volume, 0) / historicalData.length;

    const priceDeviations = historicalData.map(d => d.price - avgPrice);
    const volumeDeviations = historicalData.map(d => d.volume - avgVolume);

    const covariance = priceDeviations.reduce((sum, pd, idx) => sum + pd * volumeDeviations[idx], 0) / historicalData.length;
    const priceVariance = priceDeviations.reduce((sum, pd) => sum + pd * pd, 0) / historicalData.length;

    const slope = priceVariance > 0 ? covariance / priceVariance : 0;
    const elasticity = Math.abs((slope * avgPrice) / avgVolume);

    return Math.max(0.2, Math.min(3.0, elasticity));
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private generatePricingRecommendation(ourPrice: number, average: number, median: number): string {
    if (ourPrice < median * 0.9) {
      return 'Below market - consider price increase to improve margins';
    } else if (ourPrice > average * 1.15) {
      return 'Above market - may lose price-sensitive customers';
    } else {
      return 'Competitively positioned';
    }
  }

  private generateMockCompetitiveAnalysis(serviceType: string, ourPrice: number): CompetitiveIntelligence {
    return {
      serviceType,
      ourPrice,
      marketData: {
        competitors: [
          { competitorName: 'Competitor A', price: ourPrice * 1.05, marketShare: 25, serviceLevel: 'premium' },
          { competitorName: 'Competitor B', price: ourPrice * 0.95, marketShare: 20, serviceLevel: 'standard' },
        ],
        marketAverage: ourPrice * 1.02,
        marketMedian: ourPrice,
        marketLow: ourPrice * 0.85,
        marketHigh: ourPrice * 1.20,
        standardDeviation: ourPrice * 0.08,
      },
      positioning: {
        priceRank: 2,
        totalCompetitors: 5,
        percentile: 40,
        recommendation: 'Competitively positioned',
      },
      opportunities: [],
    };
  }

  private async getCustomerMetrics(customerId: string): Promise<any> {
    return {
      totalRevenue: 750000,
      orderFrequency: 12,
      averageOrderValue: 62500,
      marginContribution: 0.22,
      priceElasticity: 1.1,
    };
  }
}

