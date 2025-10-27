import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean, IsObject, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum CustomerType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
  GOVERNMENT = 'government',
}

export enum SegmentPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum CommunicationPreference {
  EMAIL = 'email',
  SMS = 'sms',
  PHONE = 'phone',
  APP = 'app',
}

export enum ServiceLevel {
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum DeliverySpeed {
  STANDARD = 'standard',
  EXPRESS = 'express',
  OVERNIGHT = 'overnight',
  SCHEDULED = 'scheduled',
}

export enum DeliveryLocation {
  HOME = 'home',
  OFFICE = 'office',
  PICKUP_POINT = 'pickup_point',
  LOCKER = 'locker',
}

// Request DTOs
export class CustomerSegmentationRequestDto {
  @ApiPropertyOptional({ description: 'Include AI insights', default: true })
  @IsOptional()
  @IsBoolean()
  includeAIInsights?: boolean = true;

  @ApiPropertyOptional({ description: 'Include personalization', default: true })
  @IsOptional()
  @IsBoolean()
  includePersonalization?: boolean = true;

  @ApiPropertyOptional({ description: 'Include predictive analytics', default: true })
  @IsOptional()
  @IsBoolean()
  includePredictiveAnalytics?: boolean = true;

  @ApiPropertyOptional({ description: 'Segment threshold', default: 0.7, minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  segmentThreshold?: number = 0.7;
}

export class SegmentDefinitionDto {
  @ApiProperty({ description: 'Segment name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Segment description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Segment criteria' })
  @IsObject()
  criteria: {
    behavioral: {
      orderFrequency: { min: number; max: number };
      averageOrderValue: { min: number; max: number };
      totalValue: { min: number; max: number };
    };
    demographic: {
      industry: string[];
      customerType: string[];
      companySize: string[];
    };
    financial: {
      creditScore: { min: number; max: number };
      paymentReliability: { min: number; max: number };
    };
  };

  @ApiProperty({ description: 'Segment characteristics', type: [String] })
  @IsArray()
  @IsString({ each: true })
  characteristics: string[];

  @ApiProperty({ description: 'Segment strategies' })
  @IsObject()
  strategies: {
    marketing: string[];
    sales: string[];
    service: string[];
    pricing: string[];
  };

  @ApiProperty({ description: 'Segment KPIs' })
  @IsObject()
  kpis: {
    targetRetention: number;
    targetGrowth: number;
    targetSatisfaction: number;
  };
}

// Response DTOs
export class CustomerProfileDto {
  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Basic information' })
  basicInfo: {
    name: string;
    companyName: string;
    industry: string;
    customerType: CustomerType;
    registrationDate: Date;
    lastActivityDate: Date;
  };

  @ApiProperty({ description: 'Behavioral metrics' })
  behavioralMetrics: {
    totalOrders: number;
    totalValue: number;
    averageOrderValue: number;
    orderFrequency: number;
    lastOrderDate: Date;
    preferredServiceTypes: string[];
    preferredDeliveryTimes: string[];
    preferredPaymentMethods: string[];
    customerLifetimeValue: number;
    churnRisk: number;
    satisfactionScore: number;
  };

  @ApiProperty({ description: 'Logistics preferences' })
  logisticsPreferences: {
    deliverySpeed: DeliverySpeed;
    deliveryLocation: DeliveryLocation;
    specialRequirements: string[];
    preferredCarriers: string[];
    packagingPreferences: string[];
    communicationPreferences: CommunicationPreference;
  };

  @ApiProperty({ description: 'Financial metrics' })
  financialMetrics: {
    creditLimit: number;
    paymentTerms: string;
    averagePaymentTime: number;
    outstandingBalance: number;
    creditScore: number;
    paymentReliability: number;
  };

  @ApiProperty({ description: 'Customer segment' })
  segment: {
    primary: string;
    secondary: string;
    confidence: number;
    characteristics: string[];
    recommendations: string[];
  };

  @ApiProperty({ description: 'AI insights' })
  aiInsights: {
    predictedChurn: number;
    nextOrderPrediction: Date;
    recommendedServices: string[];
    upsellingOpportunities: string[];
    crossSellingOpportunities: string[];
    personalizedOffers: string[];
  };
}

export class CustomerSegmentDto {
  @ApiProperty({ description: 'Segment ID' })
  id: string;

  @ApiProperty({ description: 'Segment name' })
  name: string;

  @ApiProperty({ description: 'Segment description' })
  description: string;

  @ApiProperty({ description: 'Segment criteria' })
  criteria: {
    behavioral: {
      orderFrequency: { min: number; max: number };
      averageOrderValue: { min: number; max: number };
      totalValue: { min: number; max: number };
    };
    demographic: {
      industry: string[];
      customerType: string[];
      companySize: string[];
    };
    financial: {
      creditScore: { min: number; max: number };
      paymentReliability: { min: number; max: number };
    };
  };

  @ApiProperty({ description: 'Segment characteristics', type: [String] })
  characteristics: string[];

  @ApiProperty({ description: 'Segment strategies' })
  strategies: {
    marketing: string[];
    sales: string[];
    service: string[];
    pricing: string[];
  };

  @ApiProperty({ description: 'Segment KPIs' })
  kpis: {
    targetRetention: number;
    targetGrowth: number;
    targetSatisfaction: number;
  };

  @ApiProperty({ description: 'Customer count' })
  customerCount: number;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class PersonalizationEngineDto {
  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Personalized content' })
  personalizedContent: {
    homepage: {
      featuredServices: string[];
      recommendedProducts: string[];
      specialOffers: string[];
      notifications: string[];
    };
    communication: {
      preferredChannels: string[];
      messageTone: string;
      frequency: string;
      topics: string[];
    };
    service: {
      priorityLevel: string;
      dedicatedSupport: boolean;
      customPricing: boolean;
      specialHandling: boolean;
    };
  };

  @ApiProperty({ description: 'Recommendations' })
  recommendations: {
    products: Array<{
      productId: string;
      productName: string;
      confidence: number;
      reason: string;
    }>;
    services: Array<{
      serviceId: string;
      serviceName: string;
      confidence: number;
      reason: string;
    }>;
    promotions: Array<{
      promotionId: string;
      title: string;
      discount: number;
      confidence: number;
      reason: string;
    }>;
  };
}

export class CustomerAnalyticsDto {
  @ApiProperty({ description: 'Total customers' })
  totalCustomers: number;

  @ApiProperty({ description: 'Segment distribution' })
  segmentDistribution: Array<{
    segment: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Average customer value' })
  averageCustomerValue: number;

  @ApiProperty({ description: 'Top performing segments' })
  topPerformingSegments: string[];

  @ApiProperty({ description: 'Recommendations' })
  recommendations: string[];

  @ApiProperty({ description: 'Growth metrics' })
  growthMetrics: {
    newCustomers: number;
    churnedCustomers: number;
    netGrowth: number;
    growthRate: number;
  };

  @ApiProperty({ description: 'Revenue metrics' })
  revenueMetrics: {
    totalRevenue: number;
    averageRevenuePerCustomer: number;
    revenueBySegment: Array<{
      segment: string;
      revenue: number;
      percentage: number;
    }>;
  };
}

export class CustomerInsightsDto {
  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Predicted churn' })
  predictedChurn: number;

  @ApiProperty({ description: 'Next order prediction' })
  nextOrderPrediction: Date;

  @ApiProperty({ description: 'Recommended services' })
  recommendedServices: string[];

  @ApiProperty({ description: 'Upselling opportunities' })
  upsellingOpportunities: string[];

  @ApiProperty({ description: 'Cross-selling opportunities' })
  crossSellingOpportunities: string[];

  @ApiProperty({ description: 'Personalized offers' })
  personalizedOffers: string[];

  @ApiProperty({ description: 'Risk factors' })
  riskFactors: string[];

  @ApiProperty({ description: 'Opportunity factors' })
  opportunityFactors: string[];

  @ApiProperty({ description: 'Action recommendations' })
  actionRecommendations: string[];
}

export class CustomerJourneyDto {
  @ApiProperty({ description: 'Customer ID' })
  customerId: string;

  @ApiProperty({ description: 'Journey stages' })
  stages: Array<{
    stage: string;
    status: string;
    date: Date;
    duration: number;
    touchpoints: number;
  }>;

  @ApiProperty({ description: 'Touchpoints' })
  touchpoints: Array<{
    type: string;
    channel: string;
    date: Date;
    outcome: string;
    satisfaction: number;
  }>;

  @ApiProperty({ description: 'Journey metrics' })
  metrics: {
    totalDuration: number;
    touchpointCount: number;
    conversionRate: number;
    satisfactionScore: number;
  };

  @ApiProperty({ description: 'Next actions' })
  nextActions: string[];
}

export class SegmentPerformanceDto {
  @ApiProperty({ description: 'Segment ID' })
  segmentId: string;

  @ApiProperty({ description: 'Segment name' })
  segmentName: string;

  @ApiProperty({ description: 'Performance metrics' })
  metrics: {
    customerCount: number;
    revenue: number;
    averageOrderValue: number;
    retentionRate: number;
    satisfactionScore: number;
    churnRate: number;
  };

  @ApiProperty({ description: 'Growth metrics' })
  growth: {
    customerGrowth: number;
    revenueGrowth: number;
    marketShare: number;
  };

  @ApiProperty({ description: 'Efficiency metrics' })
  efficiency: {
    costPerAcquisition: number;
    lifetimeValue: number;
    returnOnInvestment: number;
  };

  @ApiProperty({ description: 'Recommendations' })
  recommendations: string[];
}

export class CustomerSegmentationResponseDto {
  @ApiProperty({ description: 'Customer segments', type: [CustomerSegmentDto] })
  segments: CustomerSegmentDto[];

  @ApiProperty({ description: 'Customer profiles', type: [CustomerProfileDto] })
  customerProfiles: CustomerProfileDto[];

  @ApiProperty({ description: 'Segmentation insights' })
  segmentationInsights: {
    totalCustomers: number;
    segmentDistribution: Array<{
      segment: string;
      count: number;
      percentage: number;
    }>;
    averageCustomerValue: number;
    topPerformingSegments: string[];
    recommendations: string[];
  };
}

// Additional DTOs
export class SegmentCriteriaDto {
  @ApiProperty({ description: 'Behavioral criteria' })
  behavioral: {
    orderFrequency: { min: number; max: number };
    averageOrderValue: { min: number; max: number };
    totalValue: { min: number; max: number };
  };

  @ApiProperty({ description: 'Demographic criteria' })
  demographic: {
    industry: string[];
    customerType: string[];
    companySize: string[];
  };

  @ApiProperty({ description: 'Financial criteria' })
  financial: {
    creditScore: { min: number; max: number };
    paymentReliability: { min: number; max: number };
  };
}

export class SegmentStrategyDto {
  @ApiProperty({ description: 'Marketing strategies', type: [String] })
  marketing: string[];

  @ApiProperty({ description: 'Sales strategies', type: [String] })
  sales: string[];

  @ApiProperty({ description: 'Service strategies', type: [String] })
  service: string[];

  @ApiProperty({ description: 'Pricing strategies', type: [String] })
  pricing: string[];
}

export class SegmentKPIDto {
  @ApiProperty({ description: 'Target retention rate' })
  targetRetention: number;

  @ApiProperty({ description: 'Target growth rate' })
  targetGrowth: number;

  @ApiProperty({ description: 'Target satisfaction score' })
  targetSatisfaction: number;
}

export class CustomerBehaviorDto {
  @ApiProperty({ description: 'Total orders' })
  totalOrders: number;

  @ApiProperty({ description: 'Total value' })
  totalValue: number;

  @ApiProperty({ description: 'Average order value' })
  averageOrderValue: number;

  @ApiProperty({ description: 'Order frequency' })
  orderFrequency: number;

  @ApiProperty({ description: 'Last order date' })
  lastOrderDate: Date;

  @ApiProperty({ description: 'Preferred service types', type: [String] })
  preferredServiceTypes: string[];

  @ApiProperty({ description: 'Preferred delivery times', type: [String] })
  preferredDeliveryTimes: string[];

  @ApiProperty({ description: 'Preferred payment methods', type: [String] })
  preferredPaymentMethods: string[];

  @ApiProperty({ description: 'Customer lifetime value' })
  customerLifetimeValue: number;

  @ApiProperty({ description: 'Churn risk' })
  churnRisk: number;

  @ApiProperty({ description: 'Satisfaction score' })
  satisfactionScore: number;
}

export class CustomerLogisticsDto {
  @ApiProperty({ description: 'Delivery speed preference', enum: DeliverySpeed })
  deliverySpeed: DeliverySpeed;

  @ApiProperty({ description: 'Delivery location preference', enum: DeliveryLocation })
  deliveryLocation: DeliveryLocation;

  @ApiProperty({ description: 'Special requirements', type: [String] })
  specialRequirements: string[];

  @ApiProperty({ description: 'Preferred carriers', type: [String] })
  preferredCarriers: string[];

  @ApiProperty({ description: 'Packaging preferences', type: [String] })
  packagingPreferences: string[];

  @ApiProperty({ description: 'Communication preferences', enum: CommunicationPreference })
  communicationPreferences: CommunicationPreference;
}

export class CustomerFinancialDto {
  @ApiProperty({ description: 'Credit limit' })
  creditLimit: number;

  @ApiProperty({ description: 'Payment terms' })
  paymentTerms: string;

  @ApiProperty({ description: 'Average payment time' })
  averagePaymentTime: number;

  @ApiProperty({ description: 'Outstanding balance' })
  outstandingBalance: number;

  @ApiProperty({ description: 'Credit score' })
  creditScore: number;

  @ApiProperty({ description: 'Payment reliability' })
  paymentReliability: number;
}

export class CustomerSegmentInfoDto {
  @ApiProperty({ description: 'Primary segment' })
  primary: string;

  @ApiProperty({ description: 'Secondary segment' })
  secondary: string;

  @ApiProperty({ description: 'Confidence level' })
  confidence: number;

  @ApiProperty({ description: 'Segment characteristics', type: [String] })
  characteristics: string[];

  @ApiProperty({ description: 'Recommendations', type: [String] })
  recommendations: string[];
}

export class CustomerAIDto {
  @ApiProperty({ description: 'Predicted churn' })
  predictedChurn: number;

  @ApiProperty({ description: 'Next order prediction' })
  nextOrderPrediction: Date;

  @ApiProperty({ description: 'Recommended services', type: [String] })
  recommendedServices: string[];

  @ApiProperty({ description: 'Upselling opportunities', type: [String] })
  upsellingOpportunities: string[];

  @ApiProperty({ description: 'Cross-selling opportunities', type: [String] })
  crossSellingOpportunities: string[];

  @ApiProperty({ description: 'Personalized offers', type: [String] })
  personalizedOffers: string[];
}

export class PersonalizationContentDto {
  @ApiProperty({ description: 'Homepage content' })
  homepage: {
    featuredServices: string[];
    recommendedProducts: string[];
    specialOffers: string[];
    notifications: string[];
  };

  @ApiProperty({ description: 'Communication preferences' })
  communication: {
    preferredChannels: string[];
    messageTone: string;
    frequency: string;
    topics: string[];
  };

  @ApiProperty({ description: 'Service preferences' })
  service: {
    priorityLevel: string;
    dedicatedSupport: boolean;
    customPricing: boolean;
    specialHandling: boolean;
  };
}

export class RecommendationDto {
  @ApiProperty({ description: 'Product recommendations' })
  products: Array<{
    productId: string;
    productName: string;
    confidence: number;
    reason: string;
  }>;

  @ApiProperty({ description: 'Service recommendations' })
  services: Array<{
    serviceId: string;
    serviceName: string;
    confidence: number;
    reason: string;
  }>;

  @ApiProperty({ description: 'Promotion recommendations' })
  promotions: Array<{
    promotionId: string;
    title: string;
    discount: number;
    confidence: number;
    reason: string;
  }>;
}
