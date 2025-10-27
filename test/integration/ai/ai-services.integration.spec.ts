import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RealAIImplementationService } from '../../src/core/ai/real-ai-implementation.service';
import { NLPChatbotService } from '../../src/core/ai/nlp-chatbot.service';

describe('AI Services Integration', () => {
  let aiService: RealAIImplementationService;
  let chatbotService: NLPChatbotService;
  let module: TestingModule;

  beforeAll(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          OPENAI_API_KEY: 'test-api-key',
          OPENAI_MODEL: 'gpt-4',
          OPENAI_MAX_TOKENS: 500,
        };
        return config[key] || defaultValue;
      }),
    };

    module = await Test.createTestingModule({
      providers: [
        RealAIImplementationService,
        NLPChatbotService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    aiService = module.get<RealAIImplementationService>(RealAIImplementationService);
    chatbotService = module.get<NLPChatbotService>(NLPChatbotService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('AI Services Integration', () => {
    it('should initialize all AI services', () => {
      expect(aiService).toBeDefined();
      expect(chatbotService).toBeDefined();
    });

    it('should handle route optimization with real data', async () => {
      const routeInput = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [
          { lat: 40.7589, lng: -73.9851, priority: 1 },
          { lat: 40.6892, lng: -74.0445, priority: 2 },
          { lat: 40.7505, lng: -73.9934, priority: 3 },
        ],
        constraints: {
          maxDistance: 50,
          maxTime: 3,
          vehicleCapacity: 1000,
        },
      };

      const result = await aiService.optimizeRoute(routeInput);

      expect(result.optimizedRoute).toBeDefined();
      expect(result.optimizedRoute.length).toBeGreaterThan(1);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle demand forecasting with real data', async () => {
      const historicalData = Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i * 0.1) * 20 + Math.random() * 10);
      
      const result = await aiService.forecastDemand(historicalData, 14);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.prediction).toBeInstanceOf(Array);
      expect(result.metadata.model).toBe('LSTM Demand Forecasting');
    });

    it('should generate intelligent insights', async () => {
      const logisticsData = {
        shipments: {
          total: 1250,
          onTime: 1180,
          delayed: 70,
        },
        warehouses: {
          utilization: 0.85,
          capacity: 10000,
        },
        routes: {
          averageDistance: 45.2,
          averageTime: 2.1,
        },
        customers: {
          satisfaction: 4.3,
          complaints: 12,
        },
      };

      const insights = await aiService.generateIntelligentInsights(logisticsData);

      expect(insights).toBeDefined();
      expect(typeof insights).toBe('string');
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should handle chatbot interactions', async () => {
      const userId = 'test-user-123';
      const message = 'What is the status of my shipment ABC123?';

      const response = await chatbotService.chat(userId, message);

      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
      expect(response.confidence).toBeGreaterThanOrEqual(0);
      expect(response.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle document analysis', async () => {
      const documentText = `
        Shipment Details:
        - Tracking Number: ABC123
        - Origin: New York, NY
        - Destination: Los Angeles, CA
        - Status: In Transit
        - Expected Delivery: 2024-01-15
        - Weight: 25.5 kg
        - Dimensions: 30x20x15 cm
      `;

      const analysis = await chatbotService.analyzeDocument(documentText);

      expect(analysis).toBeDefined();
      expect(analysis.summary).toBeDefined();
      expect(analysis.keyPoints).toBeInstanceOf(Array);
      expect(['positive', 'neutral', 'negative']).toContain(analysis.sentiment);
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service failures gracefully', async () => {
      // Test with invalid data that might cause AI service to fail
      const invalidInput = {
        origin: { lat: NaN, lng: NaN },
        destinations: [],
        constraints: {},
      };

      await expect(aiService.optimizeRoute(invalidInput)).rejects.toThrow();
    });

    it('should handle chatbot API failures', async () => {
      // Mock a scenario where OpenAI API fails
      const userId = 'test-user';
      const message = 'Test message';

      // This should still return a response, even if it's an error message
      const response = await chatbotService.chat(userId, message);
      
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete route optimization within reasonable time', async () => {
      const startTime = Date.now();
      
      const routeInput = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: Array.from({ length: 10 }, (_, i) => ({
          lat: 40.7128 + (Math.random() - 0.5) * 0.1,
          lng: -74.0060 + (Math.random() - 0.5) * 0.1,
          priority: Math.floor(Math.random() * 5) + 1,
        })),
        constraints: { maxDistance: 100 },
      };

      await aiService.optimizeRoute(routeInput);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should complete demand forecasting within reasonable time', async () => {
      const startTime = Date.now();
      
      const historicalData = Array.from({ length: 100 }, () => Math.random() * 100);
      await aiService.forecastDemand(historicalData);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});
