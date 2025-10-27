import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdvancedValidationPipe } from '../../src/common/pipes/advanced-validation.pipe';
import { RouteOptimizationRequestDto } from '../../src/common/dto/ai-route-optimization.dto';
import { DemandForecastingRequestDto } from '../../src/common/dto/ai-demand-forecasting.dto';

describe('AdvancedValidationPipe', () => {
  let pipe: AdvancedValidationPipe;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdvancedValidationPipe],
    }).compile();

    pipe = module.get<AdvancedValidationPipe>(AdvancedValidationPipe);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  describe('Route Optimization Validation', () => {
    it('should validate correct route optimization request', async () => {
      const validRequest = {
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

      const result = await pipe.transform(validRequest, {
        metatype: RouteOptimizationRequestDto,
      });

      expect(result).toBeDefined();
      expect(result.origin).toBeDefined();
      expect(result.destinations).toHaveLength(1);
    });

    it('should reject invalid coordinates', async () => {
      const invalidRequest = {
        origin: { lat: 200, lng: -74.0060 }, // Invalid latitude
        destinations: [],
        constraints: {},
      };

      await expect(
        pipe.transform(invalidRequest, {
          metatype: RouteOptimizationRequestDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid priority values', async () => {
      const invalidRequest = {
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

      await expect(
        pipe.transform(invalidRequest, {
          metatype: RouteOptimizationRequestDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid algorithm', async () => {
      const invalidRequest = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [],
        constraints: {},
        algorithm: 'invalid_algorithm',
      };

      await expect(
        pipe.transform(invalidRequest, {
          metatype: RouteOptimizationRequestDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Demand Forecasting Validation', () => {
    it('should validate correct demand forecasting request', async () => {
      const validRequest = {
        sku: 'PROD-001',
        historicalData: [100, 120, 110, 130, 125, 140, 135, 150, 145, 160],
        horizon: 30,
        modelType: 'lstm',
        includeConfidence: true,
        includeSeasonal: true,
        includeExternalFactors: false,
      };

      const result = await pipe.transform(validRequest, {
        metatype: DemandForecastingRequestDto,
      });

      expect(result).toBeDefined();
      expect(result.sku).toBe('PROD-001');
      expect(result.historicalData).toHaveLength(10);
    });

    it('should reject invalid horizon values', async () => {
      const invalidRequest = {
        sku: 'PROD-001',
        historicalData: [100, 120, 110],
        horizon: 500, // Invalid horizon (should be 1-365)
      };

      await expect(
        pipe.transform(invalidRequest, {
          metatype: DemandForecastingRequestDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject negative historical data', async () => {
      const invalidRequest = {
        sku: 'PROD-001',
        historicalData: [100, -50, 110], // Negative values not allowed
        horizon: 30,
      };

      await expect(
        pipe.transform(invalidRequest, {
          metatype: DemandForecastingRequestDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid model type', async () => {
      const invalidRequest = {
        sku: 'PROD-001',
        historicalData: [100, 120, 110],
        horizon: 30,
        modelType: 'invalid_model',
      };

      await expect(
        pipe.transform(invalidRequest, {
          metatype: DemandForecastingRequestDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays', async () => {
      const request = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [],
        constraints: {},
      };

      const result = await pipe.transform(request, {
        metatype: RouteOptimizationRequestDto,
      });

      expect(result).toBeDefined();
      expect(result.destinations).toHaveLength(0);
    });

    it('should handle optional fields', async () => {
      const request = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destinations: [],
        constraints: {},
        // Optional fields omitted
      };

      const result = await pipe.transform(request, {
        metatype: RouteOptimizationRequestDto,
      });

      expect(result).toBeDefined();
      expect(result.algorithm).toBeUndefined();
    });

    it('should handle primitive types', async () => {
      const result = await pipe.transform('test', {
        metatype: String,
      });

      expect(result).toBe('test');
    });

    it('should handle null metatype', async () => {
      const result = await pipe.transform({ test: 'value' }, {
        metatype: null,
      });

      expect(result).toEqual({ test: 'value' });
    });
  });

  describe('Error Formatting', () => {
    it('should format validation errors correctly', async () => {
      const invalidRequest = {
        origin: { lat: 200, lng: -74.0060 },
        destinations: [
          {
            location: { lat: 40.7589, lng: -73.9851 },
            priority: 15,
            name: 'Warehouse A',
          },
        ],
        constraints: {},
      };

      try {
        await pipe.transform(invalidRequest, {
          metatype: RouteOptimizationRequestDto,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.response.success).toBe(false);
        expect(error.response.errorCode).toBe('VALIDATION_ERROR');
        expect(error.response.errors).toBeInstanceOf(Array);
        expect(error.response.timestamp).toBeDefined();
      }
    });
  });
});
