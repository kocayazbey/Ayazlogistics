import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface CustomerProfile {
  customerId: string;
  demographics: {
    industry: string;
    companySize: string;
    location: string;
  };
  behavior: {
    orderFrequency: number;
    avgOrderValue: number;
    preferredServices: string[];
    paymentHistory: 'excellent' | 'good' | 'fair' | 'poor';
  };
  engagement: {
    lastOrderDate: Date;
    totalOrders: number;
    lifetimeValue: number;
    tenure: number;
  };
}

interface ChurnPrediction {
  customerId: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contributingFactors: Array<{
    factor: string;
    impact: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
  recommendations: string[];
  estimatedRevenueLoss: number;
  preventionActions: Array<{
    action: string;
    priority: number;
    expectedImpact: number;
    cost: number;
  }>;
}

interface CustomerSegment {
  name: string;
  criteria: Record<string, any>;
  customerCount: number;
  characteristics: {
    avgLifetimeValue: number;
    avgTenure: number;
    churnRate: number;
    profitability: number;
  };
  recommendedStrategy: string;
}

interface CustomerInsight {
  customerId: string;
  insights: Array<{
    type: 'opportunity' | 'risk' | 'behavior_change' | 'satisfaction';
    priority: number;
    description: string;
    suggestedAction: string;
    potentialImpact: number;
  }>;
  nextBestAction: string;
  estimatedCLV: number;
}

@Injectable()
export class CustomerAnalyticsService {
  private readonly logger = new Logger(CustomerAnalyticsService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async predictChurn(customerId: string): Promise<ChurnPrediction> {
    this.logger.log(`Predicting churn for customer ${customerId}`);

    const profile = await this.getCustomerProfile(customerId);
    
    const factors: ChurnPrediction['contributingFactors'] = [];
    let churnProbability = 0;

    const daysSinceLastOrder = (Date.now() - profile.engagement.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastOrder > 90) {
      factors.push({
        factor: 'Inactivity',
        impact: 0.35,
        trend: 'increasing',
      });
      churnProbability += 0.35;
    }

    if (profile.behavior.orderFrequency < profile.engagement.totalOrders / (profile.engagement.tenure / 12)) {
      factors.push({
        factor: 'Declining order frequency',
        impact: 0.25,
        trend: 'decreasing',
      });
      churnProbability += 0.25;
    }

    if (profile.behavior.paymentHistory === 'poor' || profile.behavior.paymentHistory === 'fair') {
      factors.push({
        factor: 'Payment issues',
        impact: 0.15,
        trend: 'stable',
      });
      churnProbability += 0.15;
    }

    const avgOrderValue = profile.behavior.avgOrderValue;
    if (avgOrderValue < 1000) {
      factors.push({
        factor: 'Low order value',
        impact: 0.10,
        trend: 'stable',
      });
      churnProbability += 0.10;
    }

    const riskLevel = churnProbability > 0.7 ? 'critical' : 
                      churnProbability > 0.5 ? 'high' : 
                      churnProbability > 0.3 ? 'medium' : 'low';

    const recommendations: string[] = [];
    const preventionActions: ChurnPrediction['preventionActions'] = [];

    if (daysSinceLastOrder > 90) {
      recommendations.push('Reach out with personalized offer');
      preventionActions.push({
        action: 'Send targeted discount campaign (15% off next order)',
        priority: 1,
        expectedImpact: 0.4,
        cost: profile.behavior.avgOrderValue * 0.15,
      });
    }

    if (factors.some(f => f.factor === 'Declining order frequency')) {
      recommendations.push('Schedule account review call');
      preventionActions.push({
        action: 'Assign dedicated account manager',
        priority: 2,
        expectedImpact: 0.3,
        cost: 5000,
      });
    }

    const estimatedRevenueLoss = profile.engagement.lifetimeValue / profile.engagement.tenure * 12;

    return {
      customerId,
      churnProbability,
      riskLevel,
      contributingFactors: factors.sort((a, b) => b.impact - a.impact),
      recommendations,
      estimatedRevenueLoss,
      preventionActions: preventionActions.sort((a, b) => b.expectedImpact - a.expectedImpact),
    };
  }

  private async getCustomerProfile(customerId: string): Promise<CustomerProfile> {
    const customerResult = await this.db.execute(
      `SELECT * FROM customers WHERE id = $1`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const customer = customerResult.rows[0];

    const ordersResult = await this.db.execute(
      `SELECT 
        COUNT(*) as total_orders,
        AVG(total_amount) as avg_order_value,
        MAX(order_date) as last_order_date,
        SUM(total_amount) as lifetime_value
       FROM orders
       WHERE customer_id = $1`,
      [customerId]
    );

    const orders = ordersResult.rows[0];
    const tenure = (Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30);

    return {
      customerId,
      demographics: {
        industry: customer.industry || 'Unknown',
        companySize: customer.company_size || 'Unknown',
        location: customer.city || 'Unknown',
      },
      behavior: {
        orderFrequency: parseFloat(orders.total_orders) / Math.max(1, tenure),
        avgOrderValue: parseFloat(orders.avg_order_value || '0'),
        preferredServices: [],
        paymentHistory: 'good',
      },
      engagement: {
        lastOrderDate: new Date(orders.last_order_date || customer.created_at),
        totalOrders: parseInt(orders.total_orders || '0'),
        lifetimeValue: parseFloat(orders.lifetime_value || '0'),
        tenure,
      },
    };
  }

  async segmentCustomers(): Promise<CustomerSegment[]> {
    this.logger.log('Performing customer segmentation using RFM analysis');

    const rfmData = await this.db.execute(
      `SELECT 
        c.id,
        c.name,
        MAX(o.order_date) as last_order_date,
        COUNT(o.id) as order_count,
        SUM(o.total_amount) as total_spent
       FROM customers c
       LEFT JOIN orders o ON c.id = o.customer_id
       GROUP BY c.id, c.name`
    );

    const customers = rfmData.rows.map(row => ({
      id: row.id,
      name: row.name,
      recency: (Date.now() - new Date(row.last_order_date).getTime()) / (1000 * 60 * 60 * 24),
      frequency: parseInt(row.order_count || '0'),
      monetary: parseFloat(row.total_spent || '0'),
    }));

    const segments: CustomerSegment[] = [
      {
        name: 'Champions',
        criteria: { recency: '<30', frequency: '>10', monetary: '>50000' },
        customerCount: 0,
        characteristics: {
          avgLifetimeValue: 0,
          avgTenure: 0,
          churnRate: 0.05,
          profitability: 0.9,
        },
        recommendedStrategy: 'Reward, engage, and request referrals',
      },
      {
        name: 'Loyal Customers',
        criteria: { recency: '<60', frequency: '>5', monetary: '>20000' },
        customerCount: 0,
        characteristics: {
          avgLifetimeValue: 0,
          avgTenure: 0,
          churnRate: 0.10,
          profitability: 0.75,
        },
        recommendedStrategy: 'Upsell higher value services',
      },
      {
        name: 'At Risk',
        criteria: { recency: '>90', frequency: '>3', monetary: '>10000' },
        customerCount: 0,
        characteristics: {
          avgLifetimeValue: 0,
          avgTenure: 0,
          churnRate: 0.40,
          profitability: 0.50,
        },
        recommendedStrategy: 'Win back campaigns, special offers',
      },
      {
        name: 'Hibernating',
        criteria: { recency: '>180', frequency: '<3', monetary: '<5000' },
        customerCount: 0,
        characteristics: {
          avgLifetimeValue: 0,
          avgTenure: 0,
          churnRate: 0.80,
          profitability: 0.20,
        },
        recommendedStrategy: 'Reactivation campaign or let go',
      },
    ];

    customers.forEach(customer => {
      if (customer.recency < 30 && customer.frequency > 10 && customer.monetary > 50000) {
        segments[0].customerCount++;
        segments[0].characteristics.avgLifetimeValue += customer.monetary;
      } else if (customer.recency < 60 && customer.frequency > 5 && customer.monetary > 20000) {
        segments[1].customerCount++;
        segments[1].characteristics.avgLifetimeValue += customer.monetary;
      } else if (customer.recency > 90 && customer.frequency > 3 && customer.monetary > 10000) {
        segments[2].customerCount++;
        segments[2].characteristics.avgLifetimeValue += customer.monetary;
      } else if (customer.recency > 180) {
        segments[3].customerCount++;
        segments[3].characteristics.avgLifetimeValue += customer.monetary;
      }
    });

    segments.forEach(segment => {
      if (segment.customerCount > 0) {
        segment.characteristics.avgLifetimeValue /= segment.customerCount;
      }
    });

    return segments;
  }

  async calculateCustomerLifetimeValue(customerId: string): Promise<number> {
    const profile = await this.getCustomerProfile(customerId);

    const avgOrderValue = profile.behavior.avgOrderValue;
    const orderFrequencyPerMonth = profile.behavior.orderFrequency;
    const avgCustomerLifespanMonths = 36;
    const profitMargin = 0.25;

    const clv = avgOrderValue * orderFrequencyPerMonth * avgCustomerLifespanMonths * profitMargin;

    this.logger.log(`CLV calculated for ${customerId}: ₺${clv.toFixed(2)}`);

    return clv;
  }

  async identifyUpsellOpportunities(customerId: string): Promise<any[]> {
    const profile = await this.getCustomerProfile(customerId);

    const opportunities = [];

    if (profile.behavior.preferredServices.includes('storage') && !profile.behavior.preferredServices.includes('transport')) {
      opportunities.push({
        service: 'Integrated Transport + Storage',
        estimatedValue: profile.behavior.avgOrderValue * 1.5,
        probability: 0.6,
        reasoning: 'Customer uses storage but not transport services',
      });
    }

    if (profile.behavior.avgOrderValue > 10000 && profile.engagement.totalOrders > 5) {
      opportunities.push({
        service: 'Premium Support Package',
        estimatedValue: 5000,
        probability: 0.7,
        reasoning: 'High-value customer with regular orders',
      });
    }

    return opportunities.sort((a, b) => b.estimatedValue * b.probability - a.estimatedValue * a.probability);
  }

  async analyzeCustomerBehavior(customerId: string): Promise<CustomerInsight> {
    this.logger.log(`Analyzing customer behavior: ${customerId}`);

    const profile = await this.getCustomerProfile(customerId);
    const insights: CustomerInsight['insights'] = [];

    const daysSinceLastOrder = (Date.now() - profile.engagement.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastOrder > 60 && profile.engagement.totalOrders > 5) {
      insights.push({
        type: 'risk',
        priority: 1,
        description: 'Customer has not ordered in 60+ days',
        suggestedAction: 'Initiate win-back campaign',
        potentialImpact: profile.behavior.avgOrderValue * 12,
      });
    }

    if (profile.behavior.avgOrderValue > 20000) {
      insights.push({
        type: 'opportunity',
        priority: 2,
        description: 'High-value customer eligible for VIP program',
        suggestedAction: 'Offer VIP membership with dedicated account manager',
        potentialImpact: profile.behavior.avgOrderValue * 0.2,
      });
    }

    const orderTrend = await this.calculateOrderTrend(customerId);
    if (orderTrend < -0.2) {
      insights.push({
        type: 'behavior_change',
        priority: 1,
        description: 'Declining order pattern detected',
        suggestedAction: 'Schedule customer satisfaction survey',
        potentialImpact: profile.engagement.lifetimeValue * 0.15,
      });
    }

    const clv = await this.calculateCustomerLifetimeValue(customerId);

    return {
      customerId,
      insights: insights.sort((a, b) => a.priority - b.priority),
      nextBestAction: insights[0]?.suggestedAction || 'Continue regular engagement',
      estimatedCLV: clv,
    };
  }

  private async calculateOrderTrend(customerId: string): Promise<number> {
    const result = await this.db.execute(
      `SELECT 
        DATE_TRUNC('month', order_date) as month,
        COUNT(*) as order_count
       FROM orders
       WHERE customer_id = $1 AND order_date > NOW() - INTERVAL '6 months'
       GROUP BY month
       ORDER BY month`,
      [customerId]
    );

    if (result.rows.length < 2) return 0;

    const firstHalf = result.rows.slice(0, Math.floor(result.rows.length / 2));
    const secondHalf = result.rows.slice(Math.floor(result.rows.length / 2));

    const firstAvg = firstHalf.reduce((sum, r) => sum + parseInt(r.order_count), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, r) => sum + parseInt(r.order_count), 0) / secondHalf.length;

    return (secondAvg - firstAvg) / firstAvg;
  }

  async identifyCrossSellopportunities(customerId: string): Promise<any[]> {
    const profile = await this.getCustomerProfile(customerId);
    const opportunities = [];

    const currentServices = await this.db.execute(
      `SELECT DISTINCT service_type FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE o.customer_id = $1`,
      [customerId]
    );

    const usedServices = currentServices.rows.map(r => r.service_type);

    const allServices = ['storage', 'transport', 'customs_clearance', 'packaging', 'insurance'];
    const unusedServices = allServices.filter(s => !usedServices.includes(s));

    unusedServices.forEach(service => {
      opportunities.push({
        service,
        relevance: this.calculateServiceRelevance(service, profile),
        estimatedValue: this.estimateServiceValue(service, profile),
      });
    });

    return opportunities.sort((a, b) => b.relevance * b.estimatedValue - a.relevance * a.estimatedValue);
  }

  private calculateServiceRelevance(service: string, profile: CustomerProfile): number {
    let relevance = 0.5;

    if (service === 'transport' && profile.behavior.preferredServices.includes('storage')) {
      relevance = 0.8;
    }

    if (service === 'insurance' && profile.behavior.avgOrderValue > 50000) {
      relevance = 0.9;
    }

    return relevance;
  }

  private estimateServiceValue(service: string, profile: CustomerProfile): number {
    const baseValue = profile.behavior.avgOrderValue;

    const multipliers: Record<string, number> = {
      transport: 0.3,
      storage: 0.5,
      customs_clearance: 0.2,
      packaging: 0.1,
      insurance: 0.05,
    };

    return baseValue * (multipliers[service] || 0.1);
  }

  async predictNextPurchase(customerId: string): Promise<{ estimatedDate: Date; estimatedValue: number; confidence: number }> {
    const profile = await this.getCustomerProfile(customerId);

    const avgDaysBetweenOrders = 30 / profile.behavior.orderFrequency;
    const daysSinceLastOrder = (Date.now() - profile.engagement.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);

    const estimatedDaysUntilNext = Math.max(0, avgDaysBetweenOrders - daysSinceLastOrder);
    const estimatedDate = new Date(Date.now() + estimatedDaysUntilNext * 24 * 60 * 60 * 1000);

    const confidence = Math.max(0.3, Math.min(0.95, 1 - (daysSinceLastOrder / (avgDaysBetweenOrders * 2))));

    return {
      estimatedDate,
      estimatedValue: profile.behavior.avgOrderValue,
      confidence,
    };
  }

  async generatePersonalizedRecommendations(customerId: string): Promise<any[]> {
    const profile = await this.getCustomerProfile(customerId);
    const recommendations = [];

    if (profile.behavior.orderFrequency > 4) {
      recommendations.push({
        type: 'contract',
        title: 'Monthly Contract Discount',
        description: 'Save 15% with a monthly service contract',
        savings: profile.behavior.avgOrderValue * 12 * 0.15,
        priority: 1,
      });
    }

    if (profile.engagement.lifetimeValue > 100000) {
      recommendations.push({
        type: 'vip',
        title: 'VIP Customer Program',
        description: 'Dedicated account manager and priority service',
        benefits: ['24/7 support', 'Priority scheduling', 'Quarterly business reviews'],
        priority: 1,
      });
    }

    recommendations.push({
      type: 'optimization',
      title: 'Route Optimization Consultation',
      description: 'Free analysis to reduce logistics costs',
      potentialSavings: profile.behavior.avgOrderValue * 0.1,
      priority: 2,
    });

    return recommendations;
  }

  async calculateNPS(customerId: string): Promise<{ score: number; category: 'promoter' | 'passive' | 'detractor' }> {
    const surveyResult = await this.db.execute(
      `SELECT AVG(nps_score) as avg_score
       FROM customer_surveys
       WHERE customer_id = $1 AND created_at > NOW() - INTERVAL '6 months'`,
      [customerId]
    );

    const score = parseInt(surveyResult.rows[0]?.avg_score || '7');

    const category = score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';

    return { score, category };
  }

  async batchAnalyzeChurnRisk(tenantId: string, limit: number = 100): Promise<ChurnPrediction[]> {
    const customers = await this.db.execute(
      `SELECT id FROM customers 
       WHERE tenant_id = $1 AND is_active = true 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [tenantId, limit]
    );

    const predictions = await Promise.all(
      customers.rows.map(c => this.predictChurn(c.id).catch(() => null))
    );

    return predictions.filter(p => p !== null) as ChurnPrediction[];
  }
}


