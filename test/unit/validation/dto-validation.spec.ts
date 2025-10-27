import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RouteOptimizationRequestDto } from '../../src/common/dto/ai-route-optimization.dto';
import { DemandForecastingRequestDto } from '../../src/common/dto/ai-demand-forecasting.dto';
import { AIInsightsRequestDto } from '../../src/common/dto/ai-insights.dto';

describe('DTO Validation', () => {
  describe('RouteOptimizationRequestDto', () => {
    it('should validate correct route optimization request', async () => {
      const validData = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [
          {
            location: { lat: 40.7589, lng: -73.9851 },
            priority: 5,
            name: 'Warehouse A',
          },
        ],
        constraints: {
          maxDistance: 100,
          maxTime: 2,
        },
        algorithm: 'genetic',
        includeTraffic: true,
        includeWeather: false,
      };

      const dto = plainToInstance(RouteOptimizationRequestDto, validData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid coordinates', async () => {
      const invalidData = {
        origin: { lat: 200, lng: -74.0060 }, // Invalid latitude
        destinations: [],
        constraints: {},
      };

      const dto = plainToInstance(RouteOptimizationRequestDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('origin');
    });

    it('should reject invalid priority values', async () => {
      const invalidData = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [
          {
            location: { lat: 40.7589, lng: -73.9851 },
            priority: 15, // Invalid priority (should be 1-10)
            name: 'Warehouse A',
          },
        ],
        constraints: {},
      };

      const dto = plainToInstance(RouteOptimizationRequestDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid algorithm', async () => {
      const invalidData = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [],
        constraints: {},
        algorithm: 'invalid_algorithm',
      };

      const dto = plainToInstance(RouteOptimizationRequestDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle optional fields', async () => {
      const minimalData = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [],
        constraints: {},
      };

      const dto = plainToInstance(RouteOptimizationRequestDto, minimalData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('DemandForecastingRequestDto', () => {
    it('should validate correct demand forecasting request', async () => {
      const validData = {
        sku: 'PROD-001',
        historicalData: [100, 120, 110, 130, 125, 140, 135, 150, 145, 160],
        horizon: 30,
        modelType: 'lstm',
        includeConfidence: true,
        includeSeasonal: true,
        includeExternalFactors: false,
      };

      const dto = plainToInstance(DemandForecastingRequestDto, validData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid horizon values', async () => {
      const invalidData = {
        sku: 'PROD-001',
        historicalData: [100, 120, 110],
        horizon: 500, // Invalid horizon (should be 1-365)
      };

      const dto = plainToInstance(DemandForecastingRequestDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject negative historical data', async () => {
      const invalidData = {
        sku: 'PROD-001',
        historicalData: [100, -50, 110], // Negative values not allowed
        horizon: 30,
      };

      const dto = plainToInstance(DemandForecastingRequestDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid model type', async () => {
      const invalidData = {
        sku: 'PROD-001',
        historicalData: [100, 120, 110],
        horizon: 30,
        modelType: 'invalid_model',
      };

      const dto = plainToInstance(DemandForecastingRequestDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty historical data', async () => {
      const invalidData = {
        sku: 'PROD-001',
        historicalData: [],
        horizon: 30,
      };

      const dto = plainToInstance(DemandForecastingRequestDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('AIInsightsRequestDto', () => {
    it('should validate correct insights request', async () => {
      const validData = {
        data: {
          shipments: { total: 1000, onTime: 950, delayed: 50 },
          warehouses: { utilization: 0.8, capacity: 10000, throughput: 500 },
          routes: { averageDistance: 45, averageTime: 2, fuelEfficiency: 0.7 },
          customers: { satisfaction: 4.5, complaints: 5, retention: 0.9 },
        },
        analysisType: 'comprehensive',
        includeRecommendations: true,
        includeRiskAssessment: true,
        includeBenchmarking: false,
      };

      const dto = plainToInstance(AIInsightsRequestDto, validData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should reject invalid analysis type', async () => {
      const invalidData = {
        data: {
          shipments: { total: 1000, onTime: 950, delayed: 50 },
          warehouses: { utilization: 0.8, capacity: 10000, throughput: 500 },
          routes: { averageDistance: 45, averageTime: 2, fuelEfficiency: 0.7 },
          customers: { satisfaction: 4.5, complaints: 5, retention: 0.9 },
        },
        analysisType: 'invalid_type',
      };

      const dto = plainToInstance(AIInsightsRequestDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle missing optional fields', async () => {
      const minimalData = {
        data: {
          shipments: { total: 1000, onTime: 950, delayed: 50 },
          warehouses: { utilization: 0.8, capacity: 10000, throughput: 500 },
          routes: { averageDistance: 45, averageTime: 2, fuelEfficiency: 0.7 },
          customers: { satisfaction: 4.5, complaints: 5, retention: 0.9 },
        },
      };

      const dto = plainToInstance(AIInsightsRequestDto, minimalData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', async () => {
      const dto = plainToInstance(RouteOptimizationRequestDto, null);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle undefined values', async () => {
      const dto = plainToInstance(RouteOptimizationRequestDto, undefined);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty objects', async () => {
      const dto = plainToInstance(RouteOptimizationRequestDto, {});
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle arrays with wrong types', async () => {
      const invalidData = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: 'not_an_array',
        constraints: {},
      };

      const dto = plainToInstance(RouteOptimizationRequestDto, invalidData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
