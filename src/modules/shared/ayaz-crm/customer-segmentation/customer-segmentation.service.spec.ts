import { Test, TestingModule } from '@nestjs/testing';
import { CustomerSegmentationService } from './customer-segmentation.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('CustomerSegmentationService', () => {
  let service: CustomerSegmentationService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    mockEventBus = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerSegmentationService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<CustomerSegmentationService>(CustomerSegmentationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeCustomerSegmentation', () => {
    it('should analyze customer segmentation successfully', async () => {
      const tenantId = 'tenant-123';
      const request = {
        includeAIInsights: true,
        includePersonalization: true,
        includePredictiveAnalytics: true,
        segmentThreshold: 0.7,
      };

      mockDb.select.mockResolvedValue([
        {
          customerId: 'customer-1',
          totalOrders: 10,
          totalValue: 5000,
          averageOrderValue: 500,
          orderFrequency: 2.5,
          lastOrderDate: new Date(),
          preferredServiceTypes: ['express', 'standard'],
          preferredDeliveryTimes: ['morning', 'afternoon'],
          preferredPaymentMethods: ['credit_card', 'bank_transfer'],
          customerLifetimeValue: 15000,
          churnRisk: 0.2,
          satisfactionScore: 4.5,
        },
      ]);

      const result = await service.analyzeCustomerSegmentation(tenantId, request);

      expect(result).toBeDefined();
      expect(result.segments).toBeDefined();
      expect(Array.isArray(result.segments)).toBe(true);
      expect(result.customerProfiles).toBeDefined();
      expect(Array.isArray(result.customerProfiles)).toBe(true);
      expect(result.segmentationInsights).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'customer.segmentation.analysis.completed',
        expect.objectContaining({
          tenantId,
        }),
      );
    });

    it('should handle empty customer data', async () => {
      const tenantId = 'tenant-123';
      const request = {
        includeAIInsights: false,
        includePersonalization: false,
        includePredictiveAnalytics: false,
        segmentThreshold: 0.5,
      };

      mockDb.select.mockResolvedValue([]);

      const result = await service.analyzeCustomerSegmentation(tenantId, request);

      expect(result).toBeDefined();
      expect(result.segments).toBeDefined();
      expect(Array.isArray(result.segments)).toBe(true);
      expect(result.segments.length).toBe(0);
    });
  });

  describe('getCustomerSegments', () => {
    it('should get customer segments successfully', async () => {
      const tenantId = 'tenant-123';
      const active = true;

      mockDb.select.mockResolvedValue([
        {
          id: 'segment-1',
          name: 'High Value Customers',
          description: 'Customers with high lifetime value',
          criteria: {
            behavioral: {
              orderFrequency: { min: 2, max: 10 },
              averageOrderValue: { min: 500, max: 5000 },
              totalValue: { min: 10000, max: 100000 },
            },
            demographic: {
              industry: ['technology', 'finance'],
              customerType: ['enterprise'],
              companySize: ['large'],
            },
            financial: {
              creditScore: { min: 700, max: 850 },
              paymentReliability: { min: 0.9, max: 1.0 },
            },
          },
          characteristics: ['high_value', 'enterprise', 'reliable'],
          strategies: {
            marketing: ['premium_content', 'exclusive_offers'],
            sales: ['dedicated_account_manager', 'custom_pricing'],
            service: ['priority_support', 'white_glove_service'],
            pricing: ['volume_discounts', 'custom_contracts'],
          },
          kpis: {
            targetRetention: 0.95,
            targetGrowth: 0.15,
            targetSatisfaction: 4.8,
          },
          customerCount: 150,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getCustomerSegments(tenantId, active);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCustomerSegment', () => {
    it('should get specific customer segment successfully', async () => {
      const segmentId = 'segment-123';
      const tenantId = 'tenant-123';

      mockDb.select.mockResolvedValue([
        {
          id: segmentId,
          name: 'High Value Customers',
          description: 'Customers with high lifetime value',
          criteria: {
            behavioral: {
              orderFrequency: { min: 2, max: 10 },
              averageOrderValue: { min: 500, max: 5000 },
              totalValue: { min: 10000, max: 100000 },
            },
            demographic: {
              industry: ['technology', 'finance'],
              customerType: ['enterprise'],
              companySize: ['large'],
            },
            financial: {
              creditScore: { min: 700, max: 850 },
              paymentReliability: { min: 0.9, max: 1.0 },
            },
          },
          characteristics: ['high_value', 'enterprise', 'reliable'],
          strategies: {
            marketing: ['premium_content', 'exclusive_offers'],
            sales: ['dedicated_account_manager', 'custom_pricing'],
            service: ['priority_support', 'white_glove_service'],
            pricing: ['volume_discounts', 'custom_contracts'],
          },
          kpis: {
            targetRetention: 0.95,
            targetGrowth: 0.15,
            targetSatisfaction: 4.8,
          },
          customerCount: 150,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getCustomerSegment(segmentId, tenantId);

      expect(result).toBeDefined();
      expect(result.id).toBe(segmentId);
    });
  });

  describe('getCustomerProfiles', () => {
    it('should get customer profiles successfully', async () => {
      const tenantId = 'tenant-123';
      const segmentId = 'segment-123';
      const limit = 100;
      const offset = 0;

      mockDb.select.mockResolvedValue([
        {
          customerId: 'customer-1',
          basicInfo: {
            name: 'John Doe',
            companyName: 'Acme Corp',
            industry: 'technology',
            customerType: 'enterprise',
            registrationDate: new Date(),
            lastActivityDate: new Date(),
          },
          behavioralMetrics: {
            totalOrders: 10,
            totalValue: 5000,
            averageOrderValue: 500,
            orderFrequency: 2.5,
            lastOrderDate: new Date(),
            preferredServiceTypes: ['express', 'standard'],
            preferredDeliveryTimes: ['morning', 'afternoon'],
            preferredPaymentMethods: ['credit_card', 'bank_transfer'],
            customerLifetimeValue: 15000,
            churnRisk: 0.2,
            satisfactionScore: 4.5,
          },
          logisticsPreferences: {
            deliverySpeed: 'express',
            deliveryLocation: 'office',
            specialRequirements: ['fragile_handling'],
            preferredCarriers: ['ups', 'fedex'],
            packagingPreferences: ['eco_friendly'],
            communicationPreferences: 'email',
          },
          financialMetrics: {
            creditLimit: 50000,
            paymentTerms: 'net_30',
            averagePaymentTime: 25,
            outstandingBalance: 5000,
            creditScore: 750,
            paymentReliability: 0.95,
          },
          segment: {
            primary: 'high_value',
            secondary: 'enterprise',
            confidence: 0.85,
            characteristics: ['high_value', 'enterprise', 'reliable'],
            recommendations: ['upsell_premium_services', 'cross_sell_additional_products'],
          },
          aiInsights: {
            predictedChurn: 0.15,
            nextOrderPrediction: new Date(),
            recommendedServices: ['premium_shipping', 'white_glove_service'],
            upsellingOpportunities: ['premium_packaging', 'expedited_processing'],
            crossSellingOpportunities: ['storage_services', 'fulfillment_services'],
            personalizedOffers: ['volume_discount', 'loyalty_reward'],
          },
        },
      ]);

      const result = await service.getCustomerProfiles(tenantId, segmentId, limit, offset);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getCustomerProfile', () => {
    it('should get specific customer profile successfully', async () => {
      const customerId = 'customer-123';
      const tenantId = 'tenant-123';

      mockDb.select.mockResolvedValue([
        {
          customerId,
          basicInfo: {
            name: 'John Doe',
            companyName: 'Acme Corp',
            industry: 'technology',
            customerType: 'enterprise',
            registrationDate: new Date(),
            lastActivityDate: new Date(),
          },
          behavioralMetrics: {
            totalOrders: 10,
            totalValue: 5000,
            averageOrderValue: 500,
            orderFrequency: 2.5,
            lastOrderDate: new Date(),
            preferredServiceTypes: ['express', 'standard'],
            preferredDeliveryTimes: ['morning', 'afternoon'],
            preferredPaymentMethods: ['credit_card', 'bank_transfer'],
            customerLifetimeValue: 15000,
            churnRisk: 0.2,
            satisfactionScore: 4.5,
          },
          logisticsPreferences: {
            deliverySpeed: 'express',
            deliveryLocation: 'office',
            specialRequirements: ['fragile_handling'],
            preferredCarriers: ['ups', 'fedex'],
            packagingPreferences: ['eco_friendly'],
            communicationPreferences: 'email',
          },
          financialMetrics: {
            creditLimit: 50000,
            paymentTerms: 'net_30',
            averagePaymentTime: 25,
            outstandingBalance: 5000,
            creditScore: 750,
            paymentReliability: 0.95,
          },
          segment: {
            primary: 'high_value',
            secondary: 'enterprise',
            confidence: 0.85,
            characteristics: ['high_value', 'enterprise', 'reliable'],
            recommendations: ['upsell_premium_services', 'cross_sell_additional_products'],
          },
          aiInsights: {
            predictedChurn: 0.15,
            nextOrderPrediction: new Date(),
            recommendedServices: ['premium_shipping', 'white_glove_service'],
            upsellingOpportunities: ['premium_packaging', 'expedited_processing'],
            crossSellingOpportunities: ['storage_services', 'fulfillment_services'],
            personalizedOffers: ['volume_discount', 'loyalty_reward'],
          },
        },
      ]);

      const result = await service.getCustomerProfile(customerId, tenantId);

      expect(result).toBeDefined();
      expect(result.customerId).toBe(customerId);
    });
  });

  describe('getPersonalizationEngine', () => {
    it('should get personalization engine successfully', async () => {
      const customerId = 'customer-123';
      const tenantId = 'tenant-123';

      const result = await service.getPersonalizationEngine(customerId, tenantId);

      expect(result).toBeDefined();
      expect(result.customerId).toBe(customerId);
      expect(result.personalizedContent).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });
  });

  describe('getCustomerAnalytics', () => {
    it('should get customer analytics successfully', async () => {
      const tenantId = 'tenant-123';
      const timeRange = 30;

      const result = await service.getCustomerAnalytics(tenantId, timeRange);

      expect(result).toBeDefined();
      expect(result.totalCustomers).toBeDefined();
      expect(result.segmentDistribution).toBeDefined();
      expect(Array.isArray(result.segmentDistribution)).toBe(true);
      expect(result.averageCustomerValue).toBeDefined();
      expect(result.topPerformingSegments).toBeDefined();
      expect(Array.isArray(result.topPerformingSegments)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('getCustomerInsights', () => {
    it('should get customer insights successfully', async () => {
      const customerId = 'customer-123';
      const tenantId = 'tenant-123';

      const result = await service.getCustomerInsights(customerId, tenantId);

      expect(result).toBeDefined();
      expect(result.customerId).toBe(customerId);
      expect(result.predictedChurn).toBeDefined();
      expect(result.nextOrderPrediction).toBeDefined();
      expect(result.recommendedServices).toBeDefined();
      expect(Array.isArray(result.recommendedServices)).toBe(true);
      expect(result.upsellingOpportunities).toBeDefined();
      expect(Array.isArray(result.upsellingOpportunities)).toBe(true);
      expect(result.crossSellingOpportunities).toBeDefined();
      expect(Array.isArray(result.crossSellingOpportunities)).toBe(true);
      expect(result.personalizedOffers).toBeDefined();
      expect(Array.isArray(result.personalizedOffers)).toBe(true);
      expect(result.riskFactors).toBeDefined();
      expect(Array.isArray(result.riskFactors)).toBe(true);
      expect(result.opportunityFactors).toBeDefined();
      expect(Array.isArray(result.opportunityFactors)).toBe(true);
      expect(result.actionRecommendations).toBeDefined();
      expect(Array.isArray(result.actionRecommendations)).toBe(true);
    });
  });

  describe('getCustomerJourney', () => {
    it('should get customer journey successfully', async () => {
      const customerId = 'customer-123';
      const tenantId = 'tenant-123';
      const timeRange = 90;

      const result = await service.getCustomerJourney(customerId, tenantId, timeRange);

      expect(result).toBeDefined();
      expect(result.customerId).toBe(customerId);
      expect(result.stages).toBeDefined();
      expect(Array.isArray(result.stages)).toBe(true);
      expect(result.touchpoints).toBeDefined();
      expect(Array.isArray(result.touchpoints)).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.nextActions).toBeDefined();
      expect(Array.isArray(result.nextActions)).toBe(true);
    });
  });

  describe('getSegmentPerformance', () => {
    it('should get segment performance successfully', async () => {
      const tenantId = 'tenant-123';
      const timeRange = 30;

      const result = await service.getSegmentPerformance(tenantId, timeRange);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('createSegment', () => {
    it('should create segment successfully', async () => {
      const segmentDefinition = {
        name: 'High Value Customers',
        description: 'Customers with high lifetime value',
        criteria: {
          behavioral: {
            orderFrequency: { min: 2, max: 10 },
            averageOrderValue: { min: 500, max: 5000 },
            totalValue: { min: 10000, max: 100000 },
          },
          demographic: {
            industry: ['technology', 'finance'],
            customerType: ['enterprise'],
            companySize: ['large'],
          },
          financial: {
            creditScore: { min: 700, max: 850 },
            paymentReliability: { min: 0.9, max: 1.0 },
          },
        },
        characteristics: ['high_value', 'enterprise', 'reliable'],
        strategies: {
          marketing: ['premium_content', 'exclusive_offers'],
          sales: ['dedicated_account_manager', 'custom_pricing'],
          service: ['priority_support', 'white_glove_service'],
          pricing: ['volume_discounts', 'custom_contracts'],
        },
        kpis: {
          targetRetention: 0.95,
          targetGrowth: 0.15,
          targetSatisfaction: 4.8,
        },
      };
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.createSegment(segmentDefinition, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.name).toBe(segmentDefinition.name);
      expect(result.description).toBe(segmentDefinition.description);
    });
  });

  describe('updateSegment', () => {
    it('should update segment successfully', async () => {
      const segmentId = 'segment-123';
      const segmentDefinition = {
        name: 'Updated High Value Customers',
        description: 'Updated description',
        criteria: {
          behavioral: {
            orderFrequency: { min: 2, max: 10 },
            averageOrderValue: { min: 500, max: 5000 },
            totalValue: { min: 10000, max: 100000 },
          },
          demographic: {
            industry: ['technology', 'finance'],
            customerType: ['enterprise'],
            companySize: ['large'],
          },
          financial: {
            creditScore: { min: 700, max: 850 },
            paymentReliability: { min: 0.9, max: 1.0 },
          },
        },
        characteristics: ['high_value', 'enterprise', 'reliable'],
        strategies: {
          marketing: ['premium_content', 'exclusive_offers'],
          sales: ['dedicated_account_manager', 'custom_pricing'],
          service: ['priority_support', 'white_glove_service'],
          pricing: ['volume_discounts', 'custom_contracts'],
        },
        kpis: {
          targetRetention: 0.95,
          targetGrowth: 0.15,
          targetSatisfaction: 4.8,
        },
      };
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.updateSegment(segmentId, segmentDefinition, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(segmentId);
      expect(result.name).toBe(segmentDefinition.name);
    });
  });

  describe('deleteSegment', () => {
    it('should delete segment successfully', async () => {
      const segmentId = 'segment-123';
      const tenantId = 'tenant-123';

      const result = await service.deleteSegment(segmentId, tenantId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('reassignCustomers', () => {
    it('should reassign customers successfully', async () => {
      const segmentId = 'segment-123';
      const customerIds = ['customer-1', 'customer-2', 'customer-3'];
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.reassignCustomers(segmentId, customerIds, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.reassignedCount).toBe(customerIds.length);
    });
  });

  describe('getSegmentDistribution', () => {
    it('should get segment distribution successfully', async () => {
      const tenantId = 'tenant-123';

      const result = await service.getSegmentDistribution(tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getChurnAnalysis', () => {
    it('should get churn analysis successfully', async () => {
      const tenantId = 'tenant-123';
      const timeRange = 90;

      const result = await service.getChurnAnalysis(tenantId, timeRange);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getLifetimeValueAnalysis', () => {
    it('should get lifetime value analysis successfully', async () => {
      const tenantId = 'tenant-123';
      const timeRange = 365;

      const result = await service.getLifetimeValueAnalysis(tenantId, timeRange);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('exportSegments', () => {
    it('should export segments successfully', async () => {
      const format = 'csv';
      const segmentIds = ['segment-1', 'segment-2'];
      const tenantId = 'tenant-123';

      const result = await service.exportSegments(format, segmentIds, tenantId);

      expect(result).toBeDefined();
      expect(result.format).toBe(format);
      expect(result.downloadUrl).toBeDefined();
    });
  });

  describe('getRecommendations', () => {
    it('should get recommendations successfully', async () => {
      const customerId = 'customer-123';
      const type = 'products';
      const tenantId = 'tenant-123';

      const result = await service.getRecommendations(customerId, type, tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.select.mockRejectedValue(new Error('Database connection failed'));

      const tenantId = 'tenant-123';
      const request = {
        includeAIInsights: true,
        includePersonalization: true,
        includePredictiveAnalytics: true,
        segmentThreshold: 0.7,
      };

      await expect(service.analyzeCustomerSegmentation(tenantId, request)).rejects.toThrow();
    });

    it('should handle invalid parameters', async () => {
      const tenantId = '';
      const request = {
        includeAIInsights: true,
        includePersonalization: true,
        includePredictiveAnalytics: true,
        segmentThreshold: 0.7,
      };

      await expect(service.analyzeCustomerSegmentation(tenantId, request)).rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const tenantId = 'tenant-123';
      const request = {
        includeAIInsights: true,
        includePersonalization: true,
        includePredictiveAnalytics: true,
        segmentThreshold: 0.7,
      };

      mockDb.select.mockResolvedValue([
        {
          customerId: 'customer-1',
          totalOrders: 10,
          totalValue: 5000,
          averageOrderValue: 500,
          orderFrequency: 2.5,
          lastOrderDate: new Date(),
          preferredServiceTypes: ['express', 'standard'],
          preferredDeliveryTimes: ['morning', 'afternoon'],
          preferredPaymentMethods: ['credit_card', 'bank_transfer'],
          customerLifetimeValue: 15000,
          churnRisk: 0.2,
          satisfactionScore: 4.5,
        },
      ]);

      const startTime = Date.now();
      await service.analyzeCustomerSegmentation(tenantId, request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
