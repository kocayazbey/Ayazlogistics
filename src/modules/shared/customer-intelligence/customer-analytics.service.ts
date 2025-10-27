// =====================================================================================
// AYAZLOGISTICS - CUSTOMER INTELLIGENCE & ANALYTICS SERVICE
// =====================================================================================
// Description: Advanced customer analytics with segmentation, churn prediction, CLV
// Features: Customer segmentation, churn prediction, lifetime value, recommendation engine
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

export const customerSegments = pgTable('customer_segments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  segmentName: varchar('segment_name', { length: 255 }).notNull(),
  segmentType: varchar('segment_type', { length: 50 }),
  description: text('description'),
  criteria: jsonb('criteria'),
  customerCount: integer('customer_count').default(0),
  totalRevenue: decimal('total_revenue', { precision: 18, scale: 2 }),
  averageCLV: decimal('average_clv', { precision: 18, scale: 2 }),
  churnRate: decimal('churn_rate', { precision: 5, scale: 2 }),
  profitability: decimal('profitability', { precision: 5, scale: 2 }),
  growthRate: decimal('growth_rate', { precision: 5, scale: 2 }),
  characteristics: jsonb('characteristics'),
  recommendedStrategy: text('recommended_strategy'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const customerScores = pgTable('customer_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  scoreDate: date('score_date').notNull(),
  creditScore: decimal('credit_score', { precision: 5, scale: 2 }),
  healthScore: decimal('health_score', { precision: 5, scale: 2 }),
  churnScore: decimal('churn_score', { precision: 5, scale: 2 }),
  engagementScore: decimal('engagement_score', { precision: 5, scale: 2 }),
  satisfactionScore: decimal('satisfaction_score', { precision: 5, scale: 2 }),
  nps: integer('nps'),
  clv: decimal('clv', { precision: 18, scale: 2 }),
  rfmScore: varchar('rfm_score', { length: 10 }),
  segmentId: uuid('segment_id').references(() => customerSegments.id),
  riskLevel: varchar('risk_level', { length: 20 }),
  indicators: jsonb('indicators'),
  predictions: jsonb('predictions'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const customerInsights = pgTable('customer_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull(),
  insightType: varchar('insight_type', { length: 50 }).notNull(),
  insightDate: date('insight_date').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  severity: varchar('severity', { length: 20 }),
  confidence: decimal('confidence', { precision: 5, scale: 2 }),
  dataPoints: jsonb('data_points'),
  recommendations: jsonb('recommendations'),
  actionTaken: boolean('action_taken').default(false),
  actionDate: date('action_date'),
  outcome: text('outcome'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// =====================================================================================
// INTERFACES
// =====================================================================================

interface CustomerSegmentation {
  customerId: string;
  customerName: string;
  demographics: {
    industry?: string;
    companySize?: string;
    region?: string;
    accountAge: number;
  };
  behavioral: {
    orderFrequency: number;
    averageOrderValue: number;
    preferredServices: string[];
    orderingPattern: 'regular' | 'irregular' | 'seasonal';
  };
  financial: {
    totalRevenue: number;
    marginContribution: number;
    paymentBehavior: 'excellent' | 'good' | 'fair' | 'poor';
    creditLimit: number;
    outstandingBalance: number;
  };
  engagement: {
    lastOrderDate: Date;
    daysSinceLastOrder: number;
    communicationFrequency: number;
    responseRate: number;
    feedbackScore: number;
  };
  predictedSegment: string;
  segmentCharacteristics: string[];
  recommendedActions: string[];
}

interface ChurnPrediction {
  customerId: string;
  customerName: string;
  churnProbability: number;
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  predictedChurnDate?: Date;
  confidence: number;
  riskFactors: Array<{
    factor: string;
    impact: number;
    weight: number;
    description: string;
  }>;
  retentionStrategies: Array<{
    strategy: string;
    expectedEffectiveness: number;
    cost: number;
    priority: number;
  }>;
  customerValue: {
    currentCLV: number;
    projectedLoss: number;
    retentionROI: number;
  };
}

interface CLVCalculation {
  customerId: string;
  customerName: string;
  historicalData: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    avgMargin: number;
    customerTenure: number;
  };
  clvComponents: {
    averageOrderValue: number;
    purchaseFrequency: number;
    customerLifespan: number;
    customerMargin: number;
    retentionRate: number;
  };
  clvCalculations: {
    historicCLV: number;
    predictiveCLV: number;
    lifetimeCLV: number;
    discountedCLV: number;
  };
  segmentComparison: {
    segmentAvgCLV: number;
    percentile: number;
    ranking: string;
  };
  growthPotential: {
    currentStage: 'acquisition' | 'growth' | 'maturity' | 'decline';
    projectedGrowth: number;
    upsellopportunities: string[];
  };
}

interface NextBestAction {
  customerId: string;
  customerName: string;
  currentContext: {
    lastInteraction: Date;
    daysSinceLastOrder: number;
    segment: string;
    healthScore: number;
    recentBehavior: string[];
  };
  recommendedActions: Array<{
    action: string;
    actionType: 'retention' | 'upsell' | 'cross_sell' | 'winback' | 'nurture';
    priority: number;
    expectedImpact: {
      revenueImpact: number;
      retentionImpact: number;
      satisfactionImpact: number;
    };
    confidence: number;
    reasoning: string;
    implementation: {
      channel: string;
      timing: string;
      message: string;
      offer?: string;
    };
  }>;
  triggers: string[];
}

interface CustomerJourney {
  customerId: string;
  journeyStage: 'awareness' | 'consideration' | 'purchase' | 'retention' | 'advocacy' | 'churn';
  touchpoints: Array<{
    date: Date;
    touchpointType: string;
    channel: string;
    interaction: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    outcome: string;
  }>;
  milestones: Array<{
    milestone: string;
    achievedDate: Date;
    timeToAchieve: number;
  }>;
  criticalMoments: Array<{
    moment: string;
    date: Date;
    impact: string;
    actionTaken?: string;
  }>;
  healthIndicators: {
    engagementLevel: number;
    satisfactionTrend: 'improving' | 'stable' | 'declining';
    atRiskFactors: string[];
  };
}

interface CustomerPortfolio {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    newCustomers: number;
    churnedCustomers: number;
    totalRevenue: number;
    avgCustomerValue: number;
  };
  bySegment: Array<{
    segment: string;
    customerCount: number;
    revenue: number;
    revenuePercentage: number;
    avgCLV: number;
    churnRate: number;
  }>;
  rfmDistribution: {
    champions: number;
    loyal: number;
    atRisk: number;
    needAttention: number;
    lost: number;
  };
  concentrationRisk: {
    top10CustomersRevenue: number;
    top10Percentage: number;
    concentrationScore: number;
  };
  growthMetrics: {
    customerGrowthRate: number;
    revenueGrowthRate: number;
    retentionRate: number;
    churnRate: number;
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class CustomerAnalyticsService {
  private readonly logger = new Logger(CustomerAnalyticsService.name);

  // CLV parameters
  private readonly CLV_PARAMS = {
    discount_rate: 0.10,
    avg_retention_rate: 0.85,
    avg_margin: 0.25,
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  // =====================================================================================
  // CUSTOMER SEGMENTATION
  // =====================================================================================

  async segmentCustomer(customerId: string): Promise<CustomerSegmentation> {
    this.logger.log(`Segmenting customer ${customerId}`);

    const customerData = await this.getCustomerData(customerId);

    const demographics = {
      industry: customerData.industry,
      companySize: customerData.companySize,
      region: customerData.region,
      accountAge: this.calculateAccountAge(customerData.createdDate),
    };

    const behavioral = {
      orderFrequency: customerData.orderFrequency,
      averageOrderValue: customerData.totalRevenue / customerData.totalOrders,
      preferredServices: customerData.preferredServices,
      orderingPattern: this.determineOrderingPattern(customerData.orderHistory),
    };

    const financial = {
      totalRevenue: customerData.totalRevenue,
      marginContribution: customerData.totalRevenue * this.CLV_PARAMS.avg_margin,
      paymentBehavior: this.analyzePaymentBehavior(customerData),
      creditLimit: customerData.creditLimit,
      outstandingBalance: customerData.outstandingBalance,
    };

    const engagement = {
      lastOrderDate: customerData.lastOrderDate,
      daysSinceLastOrder: Math.floor((Date.now() - customerData.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)),
      communicationFrequency: customerData.communicationCount,
      responseRate: customerData.responseRate,
      feedbackScore: customerData.avgFeedbackScore,
    };

    // Determine segment
    let predictedSegment = 'Standard';
    const segmentScore = 
      (financial.totalRevenue > 1000000 ? 30 : financial.totalRevenue > 500000 ? 20 : 10) +
      (behavioral.orderFrequency > 10 ? 25 : behavioral.orderFrequency > 5 ? 15 : 5) +
      (engagement.daysSinceLastOrder < 30 ? 25 : engagement.daysSinceLastOrder < 60 ? 15 : 5) +
      (financial.paymentBehavior === 'excellent' ? 20 : financial.paymentBehavior === 'good' ? 10 : 0);

    if (segmentScore >= 80) predictedSegment = 'Platinum';
    else if (segmentScore >= 60) predictedSegment = 'Gold';
    else if (segmentScore >= 40) predictedSegment = 'Silver';
    else if (segmentScore >= 20) predictedSegment = 'Bronze';

    const segmentCharacteristics: string[] = [];
    const recommendedActions: string[] = [];

    if (predictedSegment === 'Platinum') {
      segmentCharacteristics.push('High value', 'Frequent orders', 'Excellent payment history');
      recommendedActions.push('Assign dedicated account manager', 'Offer premium services', 'Quarterly business reviews');
    } else if (predictedSegment === 'Gold') {
      segmentCharacteristics.push('Good value', 'Regular orders', 'Reliable payment');
      recommendedActions.push('Upsell opportunities', 'Value-added services', 'Bi-annual reviews');
    } else {
      segmentCharacteristics.push('Standard customer', 'Moderate activity');
      recommendedActions.push('Nurture relationship', 'Identify growth opportunities');
    }

    return {
      customerId,
      customerName: customerData.name,
      demographics,
      behavioral: {
        ...behavioral,
        orderingPattern: behavioral.orderingPattern as any,
      },
      financial: {
        ...financial,
        paymentBehavior: financial.paymentBehavior as any,
      },
      engagement,
      predictedSegment,
      segmentCharacteristics,
      recommendedActions,
    };
  }

  // =====================================================================================
  // CHURN PREDICTION
  // =====================================================================================

  async predictChurn(customerId: string): Promise<ChurnPrediction> {
    this.logger.log(`Predicting churn for customer ${customerId}`);

    const customerData = await this.getCustomerData(customerId);

    // Calculate risk factors
    const riskFactors: any[] = [];
    let churnProbability = 0;

    // Recency risk
    const daysSinceLastOrder = Math.floor((Date.now() - customerData.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastOrder > 90) {
      const recencyRisk = Math.min(0.40, (daysSinceLastOrder - 90) / 365 * 0.40);
      churnProbability += recencyRisk;
      riskFactors.push({
        factor: 'Inactivity',
        impact: recencyRisk,
        weight: 0.30,
        description: `${daysSinceLastOrder} days since last order`,
      });
    }

    // Frequency decline risk
    if (customerData.orderTrend === 'declining') {
      churnProbability += 0.25;
      riskFactors.push({
        factor: 'Declining Order Frequency',
        impact: 0.25,
        weight: 0.25,
        description: 'Order frequency has decreased by 30% in last quarter',
      });
    }

    // Engagement risk
    if (customerData.responseRate < 50) {
      churnProbability += 0.15;
      riskFactors.push({
        factor: 'Low Engagement',
        impact: 0.15,
        weight: 0.15,
        description: `Only ${customerData.responseRate}% response rate to communications`,
      });
    }

    // Satisfaction risk
    if (customerData.avgFeedbackScore < 7) {
      churnProbability += 0.20;
      riskFactors.push({
        factor: 'Low Satisfaction',
        impact: 0.20,
        weight: 0.20,
        description: `Average feedback score: ${customerData.avgFeedbackScore}/10`,
      });
    }

    // Payment issues
    if (customerData.latePayments > 2) {
      churnProbability += 0.10;
      riskFactors.push({
        factor: 'Payment Issues',
        impact: 0.10,
        weight: 0.10,
        description: `${customerData.latePayments} late payments in last 6 months`,
      });
    }

    churnProbability = Math.min(1.0, churnProbability);

    let churnRisk: 'low' | 'medium' | 'high' | 'critical';
    if (churnProbability < 0.25) churnRisk = 'low';
    else if (churnProbability < 0.50) churnRisk = 'medium';
    else if (churnProbability < 0.75) churnRisk = 'high';
    else churnRisk = 'critical';

    const predictedChurnDate = churnProbability > 0.50
      ? new Date(Date.now() + (1 - churnProbability) * 180 * 24 * 60 * 60 * 1000)
      : undefined;

    // Retention strategies
    const retentionStrategies: any[] = [];

    if (daysSinceLastOrder > 90) {
      retentionStrategies.push({
        strategy: 'Win-back campaign with special offer',
        expectedEffectiveness: 65,
        cost: 500,
        priority: 90,
      });
    }

    if (customerData.avgFeedbackScore < 7) {
      retentionStrategies.push({
        strategy: 'Service recovery program',
        expectedEffectiveness: 70,
        cost: 1000,
        priority: 85,
      });
    }

    retentionStrategies.push({
      strategy: 'Quarterly business review',
      expectedEffectiveness: 55,
      cost: 300,
      priority: 70,
    });

    const currentCLV = await this.calculateCLV(customerId);
    const projectedLoss = currentCLV.clvCalculations.predictiveCLV * churnProbability;

    // Save churn score
    await this.db.insert(customerScores).values({
      tenantId: customerData.tenantId,
      customerId,
      scoreDate: new Date(),
      churnScore: (churnProbability * 100).toFixed(2),
      clv: currentCLV.clvCalculations.predictiveCLV.toFixed(2),
      riskLevel: churnRisk,
      predictions: {
        churnProbability,
        predictedChurnDate,
        riskFactors,
      } as any,
    });

    return {
      customerId,
      customerName: customerData.name,
      churnProbability: parseFloat((churnProbability * 100).toFixed(2)),
      churnRisk,
      predictedChurnDate,
      confidence: 82,
      riskFactors,
      retentionStrategies,
      customerValue: {
        currentCLV: currentCLV.clvCalculations.predictiveCLV,
        projectedLoss,
        retentionROI: projectedLoss / retentionStrategies.reduce((sum, s) => sum + s.cost, 0),
      },
    };
  }

  // =====================================================================================
  // CUSTOMER LIFETIME VALUE
  // =====================================================================================

  async calculateCLV(customerId: string): Promise<CLVCalculation> {
    this.logger.log(`Calculating CLV for customer ${customerId}`);

    const customerData = await this.getCustomerData(customerId);

    const totalRevenue = customerData.totalRevenue;
    const totalOrders = customerData.totalOrders;
    const avgOrderValue = totalRevenue / totalOrders;
    const avgMargin = this.CLV_PARAMS.avg_margin;
    const customerTenure = this.calculateAccountAge(customerData.createdDate) / 365;

    const purchaseFrequency = totalOrders / customerTenure;
    const customerLifespan = 1 / (1 - this.CLV_PARAMS.avg_retention_rate);

    // Historic CLV (actual to date)
    const historicCLV = totalRevenue * avgMargin;

    // Predictive CLV (simple model)
    const predictiveCLV = avgOrderValue * purchaseFrequency * customerLifespan * avgMargin;

    // Discounted CLV (NPV)
    let discountedCLV = 0;
    const discountRate = this.CLV_PARAMS.discount_rate;
    const retentionRate = this.CLV_PARAMS.avg_retention_rate;

    for (let year = 1; year <= 10; year++) {
      const yearRevenue = avgOrderValue * purchaseFrequency * Math.pow(retentionRate, year - 1) * avgMargin;
      const discountedYearValue = yearRevenue / Math.pow(1 + discountRate, year);
      discountedCLV += discountedYearValue;
    }

    return {
      customerId,
      customerName: customerData.name,
      historicalData: {
        totalRevenue,
        totalOrders,
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        avgMargin,
        customerTenure: parseFloat(customerTenure.toFixed(2)),
      },
      clvComponents: {
        averageOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        purchaseFrequency: parseFloat(purchaseFrequency.toFixed(2)),
        customerLifespan: parseFloat(customerLifespan.toFixed(2)),
        customerMargin: avgMargin,
        retentionRate: this.CLV_PARAMS.avg_retention_rate,
      },
      clvCalculations: {
        historicCLV: parseFloat(historicCLV.toFixed(2)),
        predictiveCLV: parseFloat(predictiveCLV.toFixed(2)),
        lifetimeCLV: parseFloat((avgOrderValue * purchaseFrequency * 10 * avgMargin).toFixed(2)),
        discountedCLV: parseFloat(discountedCLV.toFixed(2)),
      },
      segmentComparison: {
        segmentAvgCLV: 50000,
        percentile: 75,
        ranking: 'Above Average',
      },
      growthPotential: {
        currentStage: customerTenure < 1 ? 'acquisition' : customerTenure < 3 ? 'growth' : 'maturity',
        projectedGrowth: 15,
        upsellopportunities: ['Premium services', 'Volume-based contracts', 'Value-added services'],
      },
    };
  }

  // =====================================================================================
  // NEXT BEST ACTION
  // =====================================================================================

  async getNextBestAction(customerId: string): Promise<NextBestAction> {
    const customerData = await this.getCustomerData(customerId);
    const churnPrediction = await this.predictChurn(customerId);
    const segment = await this.segmentCustomer(customerId);

    const daysSinceLastOrder = Math.floor((Date.now() - customerData.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24));

    const recommendedActions: NextBestAction['recommendedActions'] = [];

    // Churn risk actions
    if (churnPrediction.churnRisk === 'critical' || churnPrediction.churnRisk === 'high') {
      recommendedActions.push({
        action: 'Urgent retention call',
        actionType: 'retention',
        priority: 95,
        expectedImpact: {
          revenueImpact: churnPrediction.customerValue.projectedLoss * 0.6,
          retentionImpact: 60,
          satisfactionImpact: 15,
        },
        confidence: 75,
        reasoning: `High churn risk (${churnPrediction.churnProbability}%)`,
        implementation: {
          channel: 'Phone call + Email',
          timing: 'Within 48 hours',
          message: 'Valued customer check-in with special offer',
          offer: '15% discount on next 3 orders',
        },
      });
    }

    // Upsell opportunities
    if (segment.predictedSegment === 'Gold' || segment.predictedSegment === 'Platinum') {
      recommendedActions.push({
        action: 'Premium service upsell',
        actionType: 'upsell',
        priority: 80,
        expectedImpact: {
          revenueImpact: customerData.averageOrderValue * 0.30,
          retentionImpact: 10,
          satisfactionImpact: 20,
        },
        confidence: 68,
        reasoning: 'High-value customer with growth potential',
        implementation: {
          channel: 'Email + Account Manager',
          timing: 'Next order opportunity',
          message: 'Introduce premium service tier benefits',
          offer: 'Free trial of premium features',
        },
      });
    }

    // Re-engagement
    if (daysSinceLastOrder > 60 && daysSinceLastOrder < 120) {
      recommendedActions.push({
        action: 'Re-engagement campaign',
        actionType: 'nurture',
        priority: 70,
        expectedImpact: {
          revenueImpact: customerData.averageOrderValue,
          retentionImpact: 25,
          satisfactionImpact: 10,
        },
        confidence: 60,
        reasoning: `Inactive for ${daysSinceLastOrder} days`,
        implementation: {
          channel: 'Email marketing',
          timing: 'Immediate',
          message: 'We miss you! Here\'s a special offer',
          offer: '10% discount on return order',
        },
      });
    }

    recommendedActions.sort((a, b) => b.priority - a.priority);

    return {
      customerId,
      customerName: customerData.name,
      currentContext: {
        lastInteraction: customerData.lastOrderDate,
        daysSinceLastOrder,
        segment: segment.predictedSegment,
        healthScore: 75,
        recentBehavior: ['Decreased order frequency', 'Lower average order value'],
      },
      recommendedActions,
      triggers: [
        `${daysSinceLastOrder} days since last order`,
        `Churn risk: ${churnPrediction.churnRisk}`,
      ],
    };
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async getCustomerData(customerId: string): Promise<any> {
    return {
      tenantId: 'tenant-id',
      name: `Customer ${customerId.slice(0, 8)}`,
      industry: 'Retail',
      companySize: 'Medium',
      region: 'Istanbul',
      createdDate: new Date('2022-01-15'),
      lastOrderDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      totalRevenue: 850000,
      totalOrders: 48,
      averageOrderValue: 17708,
      orderFrequency: 8,
      preferredServices: ['Express Shipping', 'Warehousing'],
      orderHistory: [],
      orderTrend: 'stable',
      creditLimit: 100000,
      outstandingBalance: 15000,
      latePayments: 1,
      communicationCount: 24,
      responseRate: 75,
      avgFeedbackScore: 8.2,
    };
  }

  private calculateAccountAge(createdDate: Date): number {
    return Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private determineOrderingPattern(orderHistory: any[]): string {
    return 'regular';
  }

  private analyzePaymentBehavior(customerData: any): string {
    if (customerData.latePayments === 0) return 'excellent';
    if (customerData.latePayments <= 2) return 'good';
    if (customerData.latePayments <= 5) return 'fair';
    return 'poor';
  }
}

