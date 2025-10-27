import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RealAIImplementationService } from '../../src/core/ai/real-ai-implementation.service';

describe('Route Optimization Service', () => {
  let service: RealAIImplementationService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealAIImplementationService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RealAIImplementationService>(RealAIImplementationService);
    configService = module.get(ConfigService);
  });

  describe('Route Optimization', () => {
    it('should optimize simple route', async () => {
      const input = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [
          { lat: 40.7589, lng: -73.9851, priority: 1 },
          { lat: 40.6892, lng: -74.0445, priority: 2 },
        ],
        constraints: { maxDistance: 100 },
      };

      const result = await service.optimizeRoute(input);

      expect(result.optimizedRoute).toBeDefined();
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle complex multi-stop route', async () => {
      const input = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: Array.from({ length: 10 }, (_, i) => ({
          lat: 40.7128 + (Math.random() - 0.5) * 0.1,
          lng: -74.0060 + (Math.random() - 0.5) * 0.1,
          priority: Math.floor(Math.random() * 5) + 1,
        })),
        constraints: { maxDistance: 200, maxTime: 8 },
      };

      const result = await service.optimizeRoute(input);

      expect(result.optimizedRoute.length).toBeGreaterThan(1);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
    });

    it('should handle edge cases', async () => {
      const input = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [],
        constraints: {},
      };

      const result = await service.optimizeRoute(input);

      expect(result.optimizedRoute).toHaveLength(1);
      expect(result.totalDistance).toBe(0);
    });

    it('should respect constraints', async () => {
      const input = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [
          { lat: 40.7589, lng: -73.9851, priority: 1 },
          { lat: 40.6892, lng: -74.0445, priority: 2 },
        ],
        constraints: { maxDistance: 1 }, // Very small distance
      };

      const result = await service.optimizeRoute(input);

      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.recommendations).toContain(
        expect.stringContaining('exceeds maximum distance')
      );
    });
  });

  describe('Demand Forecasting', () => {
    it('should forecast demand with sufficient data', async () => {
      const historicalData = Array.from({ length: 30 }, (_, i) => 
        100 + Math.sin(i * 0.1) * 20 + Math.random() * 10
      );

      const result = await service.forecastDemand(historicalData, 7);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.prediction).toBeInstanceOf(Array);
      expect(result.metadata.model).toBe('LSTM Demand Forecasting');
    });

    it('should handle insufficient data', async () => {
      const historicalData = [100, 120];

      await expect(service.forecastDemand(historicalData)).rejects.toThrow();
    });

    it('should handle empty data', async () => {
      const historicalData: number[] = [];

      await expect(service.forecastDemand(historicalData)).rejects.toThrow();
    });

    it('should handle negative values', async () => {
      const historicalData = [100, -50, 110];

      await expect(service.forecastDemand(historicalData)).rejects.toThrow();
    });
  });

  describe('Intelligent Insights', () => {
    it('should generate insights for logistics data', async () => {
      const data = {
        shipments: { total: 1000, onTime: 950, delayed: 50 },
        warehouses: { utilization: 0.8, capacity: 10000 },
        routes: { averageDistance: 45, averageTime: 2 },
        customers: { satisfaction: 4.5, complaints: 5 },
      };

      const insights = await service.generateIntelligentInsights(data);

      expect(insights).toBeDefined();
      expect(typeof insights).toBe('string');
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should handle empty data gracefully', async () => {
      const data = {};

      const insights = await service.generateIntelligentInsights(data);

      expect(insights).toBeDefined();
    });

    it('should handle API failures gracefully', async () => {
      configService.get.mockReturnValue('invalid-key');

      const data = { test: 'data' };
      const insights = await service.generateIntelligentInsights(data);

      expect(insights).toBe('Failed to generate insights');
    });
  });

  describe('Performance', () => {
    it('should complete route optimization within time limit', async () => {
      const startTime = Date.now();

      const input = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: Array.from({ length: 5 }, (_, i) => ({
          lat: 40.7128 + (Math.random() - 0.5) * 0.1,
          lng: -74.0060 + (Math.random() - 0.5) * 0.1,
          priority: Math.floor(Math.random() * 5) + 1,
        })),
        constraints: { maxDistance: 100 },
      };

      await service.optimizeRoute(input);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should complete demand forecasting within time limit', async () => {
      const startTime = Date.now();

      const historicalData = Array.from({ length: 50 }, () => Math.random() * 100);
      await service.forecastDemand(historicalData);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinates', async () => {
      const input = {
        origin: { lat: NaN, lng: NaN },
        destinations: [],
        constraints: {},
      };

      await expect(service.optimizeRoute(input)).rejects.toThrow();
    });

    it('should handle null/undefined inputs', async () => {
      await expect(service.optimizeRoute(null as any)).rejects.toThrow();
      await expect(service.forecastDemand(null as any)).rejects.toThrow();
    });
  });
});
