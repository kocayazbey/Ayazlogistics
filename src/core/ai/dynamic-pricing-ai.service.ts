import { Injectable, Logger } from '@nestjs/common';

// TensorFlow is optional
let tf: any = null;
try {
  tf = require('@tensorflow/tfjs-node');
} catch (error) {
  console.warn('TensorFlow.js not available - Dynamic pricing AI features will be limited');
}

interface PricingFactors {
  customerSegment: 'enterprise' | 'mid_market' | 'smb';
  orderVolume: number;
  serviceLevel: 'standard' | 'premium' | 'vip';
  seasonality: number; // 0-1
  competitorPricing?: number;
  demandLevel: 'low' | 'medium' | 'high';
  customerLTV: number;
  historicalSpend: number;
  paymentTerms: number; // days
  contractDuration?: number; // months
}

interface PricingRecommendation {
  basePrice: number;
  recommendedPrice: number;
  priceAdjustments: Array<{
    factor: string;
    adjustment: number;
    percentage: number;
  }>;
  confidence: number;
  expectedRevenue: number;
  winProbability: number;
}

@Injectable()
export class DynamicPricingAIService {
  private readonly logger = new Logger(DynamicPricingAIService.name);
  private model: tf.LayersModel | null = null;

  async initializeModel(): Promise<void> {
    try {
      // Create a simple neural network for price optimization
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [10], units: 64, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 32, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({ units: 16, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'linear' }),
        ],
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae'],
      });

      this.logger.log('Dynamic pricing AI model initialized');
    } catch (error: any) {
      this.logger.error(`Failed to initialize AI model: ${error.message}`);
    }
  }

  async recommendPrice(
    basePrice: number,
    factors: PricingFactors,
  ): Promise<PricingRecommendation> {
    const adjustments: Array<{ factor: string; adjustment: number; percentage: number }> = [];
    let recommendedPrice = basePrice;

    // Customer segment adjustment
    const segmentMultiplier = {
      'enterprise': 0.85, // Volume discount
      'mid_market': 1.0,
      'smb': 1.15,
    }[factors.customerSegment];

    const segmentAdj = basePrice * (segmentMultiplier - 1);
    adjustments.push({
      factor: 'Customer Segment',
      adjustment: segmentAdj,
      percentage: (segmentMultiplier - 1) * 100,
    });
    recommendedPrice *= segmentMultiplier;

    // Volume discount
    if (factors.orderVolume > 1000) {
      const volumeDiscount = -0.15;
      adjustments.push({
        factor: 'High Volume Discount',
        adjustment: recommendedPrice * volumeDiscount,
        percentage: volumeDiscount * 100,
      });
      recommendedPrice *= (1 + volumeDiscount);
    } else if (factors.orderVolume > 500) {
      const volumeDiscount = -0.10;
      adjustments.push({
        factor: 'Volume Discount',
        adjustment: recommendedPrice * volumeDiscount,
        percentage: volumeDiscount * 100,
      });
      recommendedPrice *= (1 + volumeDiscount);
    }

    // Service level premium
    const servicePremium = {
      'standard': 0,
      'premium': 0.20,
      'vip': 0.35,
    }[factors.serviceLevel];

    if (servicePremium > 0) {
      adjustments.push({
        factor: 'Service Level Premium',
        adjustment: recommendedPrice * servicePremium,
        percentage: servicePremium * 100,
      });
      recommendedPrice *= (1 + servicePremium);
    }

    // Seasonality adjustment
    if (factors.seasonality > 0.7) {
      const seasonalPremium = 0.25;
      adjustments.push({
        factor: 'Peak Season Surcharge',
        adjustment: recommendedPrice * seasonalPremium,
        percentage: seasonalPremium * 100,
      });
      recommendedPrice *= (1 + seasonalPremium);
    }

    // Demand-based pricing
    const demandMultiplier = {
      'low': 0.95,
      'medium': 1.0,
      'high': 1.10,
    }[factors.demandLevel];

    if (demandMultiplier !== 1.0) {
      adjustments.push({
        factor: 'Demand Adjustment',
        adjustment: recommendedPrice * (demandMultiplier - 1),
        percentage: (demandMultiplier - 1) * 100,
      });
      recommendedPrice *= demandMultiplier;
    }

    // Customer loyalty discount
    if (factors.customerLTV > 100000) {
      const loyaltyDiscount = -0.10;
      adjustments.push({
        factor: 'Loyalty Discount (High LTV)',
        adjustment: recommendedPrice * loyaltyDiscount,
        percentage: loyaltyDiscount * 100,
      });
      recommendedPrice *= (1 + loyaltyDiscount);
    }

    // Payment terms adjustment
    if (factors.paymentTerms > 30) {
      const paymentPremium = 0.05;
      adjustments.push({
        factor: 'Extended Payment Terms',
        adjustment: recommendedPrice * paymentPremium,
        percentage: paymentPremium * 100,
      });
      recommendedPrice *= (1 + paymentPremium);
    }

    // Contract duration discount
    if (factors.contractDuration && factors.contractDuration >= 12) {
      const contractDiscount = -0.12;
      adjustments.push({
        factor: 'Annual Contract Discount',
        adjustment: recommendedPrice * contractDiscount,
        percentage: contractDiscount * 100,
      });
      recommendedPrice *= (1 + contractDiscount);
    }

    // Calculate win probability based on price vs market
    const winProbability = this.calculateWinProbability(
      recommendedPrice,
      basePrice,
      factors.competitorPricing,
    );

    return {
      basePrice,
      recommendedPrice: Math.round(recommendedPrice * 100) / 100,
      priceAdjustments: adjustments,
      confidence: 0.85,
      expectedRevenue: recommendedPrice * factors.orderVolume,
      winProbability,
    };
  }

  async optimizePriceForConversion(
    basePrice: number,
    factors: PricingFactors,
    targetConversionRate: number,
  ): Promise<number> {
    // Optimize price to maximize conversion while maintaining margin
    const maxDiscount = 0.25; // Max 25% discount
    const minDiscount = 0;

    let optimalPrice = basePrice;
    let bestScore = 0;

    for (let discount = minDiscount; discount <= maxDiscount; discount += 0.01) {
      const testPrice = basePrice * (1 - discount);
      const conversionProb = this.estimateConversionProbability(testPrice, basePrice, factors);
      const expectedRevenue = testPrice * conversionProb * factors.orderVolume;
      
      const score = expectedRevenue;

      if (score > bestScore) {
        bestScore = score;
        optimalPrice = testPrice;
      }
    }

    return Math.round(optimalPrice * 100) / 100;
  }

  async predictCustomerChurnRisk(
    customerId: string,
    recentPricingChanges: number,
    serviceQuality: number,
    competitorActivity: number,
  ): Promise<{ churnRisk: number; recommendation: string }> {
    let churnRisk = 0;

    // Price sensitivity
    if (recentPricingChanges > 0.15) {
      churnRisk += 0.3;
    } else if (recentPricingChanges > 0.10) {
      churnRisk += 0.2;
    }

    // Service quality
    if (serviceQuality < 0.8) {
      churnRisk += 0.4;
    } else if (serviceQuality < 0.9) {
      churnRisk += 0.2;
    }

    // Competitor activity
    if (competitorActivity > 0.7) {
      churnRisk += 0.3;
    }

    churnRisk = Math.min(churnRisk, 1.0);

    let recommendation = '';
    if (churnRisk > 0.7) {
      recommendation = 'HIGH RISK: Offer retention discount and schedule account review';
    } else if (churnRisk > 0.4) {
      recommendation = 'MEDIUM RISK: Monitor closely and consider loyalty program';
    } else {
      recommendation = 'LOW RISK: Continue current pricing strategy';
    }

    return {
      churnRisk: Math.round(churnRisk * 100) / 100,
      recommendation,
    };
  }

  private calculateWinProbability(
    ourPrice: number,
    basePrice: number,
    competitorPrice?: number,
  ): number {
    if (!competitorPrice) {
      return 0.75; // Default probability
    }

    const priceDiff = (ourPrice - competitorPrice) / competitorPrice;

    if (priceDiff <= -0.10) return 0.95; // 10% cheaper
    if (priceDiff <= -0.05) return 0.85; // 5% cheaper
    if (priceDiff <= 0) return 0.75; // Same or slightly cheaper
    if (priceDiff <= 0.05) return 0.60; // 5% more expensive
    if (priceDiff <= 0.10) return 0.40; // 10% more expensive
    return 0.20; // More than 10% expensive
  }

  private estimateConversionProbability(
    price: number,
    basePrice: number,
    factors: PricingFactors,
  ): number {
    const priceElasticity = -1.5; // Typical B2B elasticity
    const priceChange = (price - basePrice) / basePrice;
    
    let baseConversion = 0.30; // 30% base conversion

    // Adjust for customer segment
    if (factors.customerSegment === 'enterprise') {
      baseConversion *= 1.2; // Enterprises are more likely to convert
    }

    // Apply price elasticity
    const conversionChange = priceElasticity * priceChange;
    const estimatedConversion = baseConversion * (1 + conversionChange);

    return Math.max(0.05, Math.min(0.95, estimatedConversion));
  }

  async trainModel(trainingData: Array<{
    features: number[];
    actualPrice: number;
  }>): Promise<void> {
    if (!this.model) {
      await this.initializeModel();
    }

    if (!this.model || trainingData.length === 0) {
      return;
    }

    const xs = tf.tensor2d(trainingData.map(d => d.features));
    const ys = tf.tensor2d(trainingData.map(d => [d.actualPrice]));

    await this.model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            this.logger.debug(`Epoch ${epoch}: loss = ${logs?.loss}`);
          }
        },
      },
    });

    xs.dispose();
    ys.dispose();

    this.logger.log('Model training completed');
  }
}


