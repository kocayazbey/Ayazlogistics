import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RealAIImplementationService } from '../../src/core/ai/real-ai-implementation.service';

describe('RealAIImplementationService', () => {
  let service: RealAIImplementationService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizeRoute', () => {
    it('should optimize route successfully', async () => {
      const input = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [
          { lat: 40.7589, lng: -73.9851, priority: 1 },
          { lat: 40.6892, lng: -74.0445, priority: 2 },
        ],
        constraints: {
          maxDistance: 100,
          maxTime: 2,
        },
      };

      const result = await service.optimizeRoute(input);

      expect(result).toBeDefined();
      expect(result.optimizedRoute).toBeDefined();
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.efficiency).toBeGreaterThanOrEqual(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle empty destinations', async () => {
      const input = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [],
        constraints: {},
      };

      const result = await service.optimizeRoute(input);

      expect(result.optimizedRoute).toHaveLength(1); // Only origin
      expect(result.totalDistance).toBe(0);
    });
  });

  describe('forecastDemand', () => {
    it('should forecast demand successfully', async () => {
      const historicalData = [100, 120, 110, 130, 125, 140, 135, 150, 145, 160];
      
      const result = await service.forecastDemand(historicalData, 7);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.prediction).toBeInstanceOf(Array);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.model).toBe('LSTM Demand Forecasting');
    });

    it('should handle insufficient historical data', async () => {
      const historicalData = [100, 120];
      
      await expect(service.forecastDemand(historicalData)).rejects.toThrow();
    });
  });

  describe('generateIntelligentInsights', () => {
    it('should generate insights successfully', async () => {
      configService.get.mockReturnValue('test-api-key');
      
      const data = {
        shipments: 100,
        onTimeDelivery: 95,
        customerSatisfaction: 4.5,
      };

      const result = await service.generateIntelligentInsights(data);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle API errors gracefully', async () => {
      configService.get.mockReturnValue('invalid-key');
      
      const data = { test: 'data' };
      
      const result = await service.generateIntelligentInsights(data);

      expect(result).toBe('Failed to generate insights');
    });
  });
});
