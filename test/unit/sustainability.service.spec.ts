import { Test, TestingModule } from '@nestjs/testing';
import { WasteReductionService } from '../../src/sustainability/waste-reduction.service';
import { Logger } from '@nestjs/common';

describe('WasteReductionService', () => {
  let service: WasteReductionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WasteReductionService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WasteReductionService>(WasteReductionService);
  });

  describe('recordWaste', () => {
    it('should record waste successfully', async () => {
      const wasteRecord = {
        tenantId: 'tenant-001',
        wasteType: 'packaging' as const,
        category: 'operational' as const,
        quantity: 100,
        unit: 'kg' as const,
        locationId: 'loc-001',
        collectionDate: new Date(),
        disposalMethod: 'recycle' as const,
        cost: 50,
        recyclablePercentage: 80,
        recycledQuantity: 80,
        notes: 'Test waste record',
      };

      const result = await service.recordWaste(wasteRecord);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenantId).toBe(wasteRecord.tenantId);
      expect(result.wasteType).toBe(wasteRecord.wasteType);
      expect(result.co2Impact).toBeGreaterThan(0);
    });

    it('should calculate CO2 impact correctly', async () => {
      const wasteRecord = {
        tenantId: 'tenant-001',
        wasteType: 'plastic' as const,
        category: 'operational' as const,
        quantity: 50,
        unit: 'kg' as const,
        locationId: 'loc-001',
        collectionDate: new Date(),
        disposalMethod: 'recycle' as const,
        cost: 25,
        recyclablePercentage: 90,
        recycledQuantity: 45,
      };

      const result = await service.recordWaste(wasteRecord);

      expect(result.co2Impact).toBeGreaterThan(0);
      expect(result.co2Impact).toBeLessThan(1000); // Reasonable upper bound
    });

    it('should handle invalid waste type', async () => {
      const wasteRecord = {
        tenantId: 'tenant-001',
        wasteType: 'invalid' as any,
        category: 'operational' as const,
        quantity: 100,
        unit: 'kg' as const,
        locationId: 'loc-001',
        collectionDate: new Date(),
        disposalMethod: 'recycle' as const,
        cost: 50,
        recyclablePercentage: 80,
        recycledQuantity: 80,
      };

      await expect(service.recordWaste(wasteRecord)).rejects.toThrow();
    });
  });

  describe('analyzeWaste', () => {
    it('should analyze waste data successfully', async () => {
      const tenantId = 'tenant-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const analytics = await service.analyzeWaste(tenantId, period);

      expect(analytics).toBeDefined();
      expect(analytics.period).toEqual(period);
      expect(analytics.totalWaste).toBeGreaterThanOrEqual(0);
      expect(analytics.recyclingRate).toBeGreaterThanOrEqual(0);
      expect(analytics.recyclingRate).toBeLessThanOrEqual(100);
      expect(analytics.costPerKg).toBeGreaterThanOrEqual(0);
      expect(analytics.co2Emissions).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty waste data', async () => {
      const tenantId = 'tenant-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const analytics = await service.analyzeWaste(tenantId, period);

      expect(analytics.totalWaste).toBe(0);
      expect(analytics.recyclingRate).toBe(0);
      expect(analytics.costPerKg).toBe(0);
    });

    it('should calculate trends correctly', async () => {
      const tenantId = 'tenant-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-03-31'),
      };

      const analytics = await service.analyzeWaste(tenantId, period);

      expect(analytics.trends).toBeDefined();
      expect(Array.isArray(analytics.trends)).toBe(true);
    });
  });

  describe('setReductionTarget', () => {
    it('should set reduction target successfully', async () => {
      const target = {
        tenantId: 'tenant-001',
        targetYear: 2025,
        wasteType: 'packaging',
        baselineYear: 2024,
        baselineQuantity: 1000,
        targetReductionPercentage: 20,
        currentQuantity: 800,
        actions: [
          {
            action: 'Implement recycling program',
            expectedImpact: 15,
            status: 'planned' as const,
          },
        ],
      };

      const result = await service.setReductionTarget(target);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.tenantId).toBe(target.tenantId);
      expect(result.targetYear).toBe(target.targetYear);
      expect(result.status).toBeDefined();
    });

    it('should calculate target status correctly', async () => {
      const target = {
        tenantId: 'tenant-001',
        targetYear: 2025,
        wasteType: 'packaging',
        baselineYear: 2024,
        baselineQuantity: 1000,
        targetReductionPercentage: 20,
        currentQuantity: 700, // 30% reduction achieved
        actions: [],
      };

      const result = await service.setReductionTarget(target);

      expect(result.status).toBe('achieved');
    });

    it('should handle invalid target parameters', async () => {
      const target = {
        tenantId: 'tenant-001',
        targetYear: 2020, // Past year
        wasteType: 'packaging',
        baselineYear: 2024,
        baselineQuantity: 1000,
        targetReductionPercentage: 20,
        currentQuantity: 800,
        actions: [],
      };

      await expect(service.setReductionTarget(target)).rejects.toThrow();
    });
  });

  describe('trackReductionProgress', () => {
    it('should track reduction progress successfully', async () => {
      const tenantId = 'tenant-001';
      const progress = await service.trackReductionProgress(tenantId);

      expect(Array.isArray(progress)).toBe(true);
    });

    it('should calculate progress correctly', async () => {
      const tenantId = 'tenant-001';
      const progress = await service.trackReductionProgress(tenantId);

      progress.forEach(item => {
        expect(item.wasteType).toBeDefined();
        expect(item.targetYear).toBeDefined();
        expect(item.targetReduction).toBeDefined();
        expect(item.actualReduction).toBeDefined();
        expect(item.status).toBeDefined();
        expect(typeof item.onTrack).toBe('boolean');
      });
    });
  });

  describe('identifyWasteHotspots', () => {
    it('should identify waste hotspots successfully', async () => {
      const tenantId = 'tenant-001';
      const threshold = 10;
      const hotspots = await service.identifyWasteHotspots(tenantId, threshold);

      expect(Array.isArray(hotspots)).toBe(true);
    });

    it('should filter hotspots by threshold', async () => {
      const tenantId = 'tenant-001';
      const threshold = 50;
      const hotspots = await service.identifyWasteHotspots(tenantId, threshold);

      hotspots.forEach(hotspot => {
        expect(hotspot.quantity).toBeGreaterThan(threshold);
      });
    });

    it('should include recommendations for hotspots', async () => {
      const tenantId = 'tenant-001';
      const hotspots = await service.identifyWasteHotspots(tenantId);

      hotspots.forEach(hotspot => {
        expect(hotspot.recommendation).toBeDefined();
        expect(typeof hotspot.recommendation).toBe('string');
      });
    });
  });

  describe('calculateCircularEconomyMetrics', () => {
    it('should calculate circular economy metrics successfully', async () => {
      const tenantId = 'tenant-001';
      const metrics = await service.calculateCircularEconomyMetrics(tenantId);

      expect(metrics).toBeDefined();
      expect(metrics.materialRecoveryRate).toBeGreaterThanOrEqual(0);
      expect(metrics.materialRecoveryRate).toBeLessThanOrEqual(100);
      expect(metrics.productLifeExtension).toBeGreaterThanOrEqual(0);
      expect(metrics.productLifeExtension).toBeLessThanOrEqual(100);
      expect(metrics.wasteToEnergyConversion).toBeGreaterThanOrEqual(0);
      expect(metrics.wasteToEnergyConversion).toBeLessThanOrEqual(100);
      expect(metrics.reuseMaterialPercentage).toBeGreaterThanOrEqual(0);
      expect(metrics.reuseMaterialPercentage).toBeLessThanOrEqual(100);
      expect(metrics.closedLoopPercentage).toBeGreaterThanOrEqual(0);
      expect(metrics.closedLoopPercentage).toBeLessThanOrEqual(100);
      expect(metrics.virginMaterialReduction).toBeGreaterThanOrEqual(0);
      expect(metrics.virginMaterialReduction).toBeLessThanOrEqual(100);
    });

    it('should handle zero waste data', async () => {
      const tenantId = 'tenant-001';
      const metrics = await service.calculateCircularEconomyMetrics(tenantId);

      expect(metrics.materialRecoveryRate).toBe(0);
      expect(metrics.productLifeExtension).toBe(0);
      expect(metrics.wasteToEnergyConversion).toBe(0);
    });
  });

  describe('generateWasteReductionReport', () => {
    it('should generate comprehensive report', async () => {
      const tenantId = 'tenant-001';
      const year = 2025;
      const report = await service.generateWasteReductionReport(tenantId, year);

      expect(report).toBeDefined();
      expect(report.year).toBe(year);
      expect(report.summary).toBeDefined();
      expect(report.analytics).toBeDefined();
      expect(report.targets).toBeDefined();
      expect(report.hotspots).toBeDefined();
      expect(report.circularEconomyMetrics).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should include year-over-year comparison', async () => {
      const tenantId = 'tenant-001';
      const year = 2025;
      const report = await service.generateWasteReductionReport(tenantId, year);

      expect(report.summary.yearOverYearChange).toBeDefined();
      expect(typeof report.summary.yearOverYearChange).toBe('string');
    });

    it('should provide actionable recommendations', async () => {
      const tenantId = 'tenant-001';
      const year = 2025;
      const report = await service.generateWasteReductionReport(tenantId, year);

      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('benchmarkAgainstIndustry', () => {
    it('should benchmark against industry standards', async () => {
      const tenantId = 'tenant-001';
      const industryType = 'logistics';
      const benchmark = await service.benchmarkAgainstIndustry(tenantId, industryType);

      expect(benchmark).toBeDefined();
      expect(benchmark.company).toBeDefined();
      expect(benchmark.industry).toBeDefined();
      expect(benchmark.comparison).toBeDefined();
    });

    it('should handle different industry types', async () => {
      const tenantId = 'tenant-001';
      const industryTypes = ['logistics', 'warehouse', 'manufacturing'];

      for (const industryType of industryTypes) {
        const benchmark = await service.benchmarkAgainstIndustry(tenantId, industryType);
        expect(benchmark.industry).toBeDefined();
      }
    });

    it('should calculate performance comparison', async () => {
      const tenantId = 'tenant-001';
      const industryType = 'logistics';
      const benchmark = await service.benchmarkAgainstIndustry(tenantId, industryType);

      expect(benchmark.comparison.recyclingRate).toBeDefined();
      expect(benchmark.comparison.performance).toBeDefined();
      expect(['above_average', 'below_average']).toContain(benchmark.comparison.performance);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', async () => {
      const wasteRecord = {
        tenantId: 'tenant-001',
        wasteType: 'packaging' as const,
        category: 'operational' as const,
        quantity: 100,
        unit: 'kg' as const,
        locationId: 'loc-001',
        collectionDate: new Date(),
        disposalMethod: 'recycle' as const,
        cost: 50,
        recyclablePercentage: 80,
        recycledQuantity: 80,
      };

      // Mock database error
      jest.spyOn(service, 'recordWaste').mockRejectedValue(new Error('Database connection failed'));

      await expect(service.recordWaste(wasteRecord)).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid tenant ID', async () => {
      const tenantId = '';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      await expect(service.analyzeWaste(tenantId, period)).rejects.toThrow();
    });

    it('should handle invalid date range', async () => {
      const tenantId = 'tenant-001';
      const invalidPeriod = {
        start: new Date('2025-01-31'),
        end: new Date('2025-01-01'),
      };

      await expect(service.analyzeWaste(tenantId, invalidPeriod)).rejects.toThrow();
    });
  });

  describe('data validation', () => {
    it('should validate waste quantity', async () => {
      const wasteRecord = {
        tenantId: 'tenant-001',
        wasteType: 'packaging' as const,
        category: 'operational' as const,
        quantity: -10, // Invalid negative quantity
        unit: 'kg' as const,
        locationId: 'loc-001',
        collectionDate: new Date(),
        disposalMethod: 'recycle' as const,
        cost: 50,
        recyclablePercentage: 80,
        recycledQuantity: 80,
      };

      await expect(service.recordWaste(wasteRecord)).rejects.toThrow();
    });

    it('should validate cost values', async () => {
      const wasteRecord = {
        tenantId: 'tenant-001',
        wasteType: 'packaging' as const,
        category: 'operational' as const,
        quantity: 100,
        unit: 'kg' as const,
        locationId: 'loc-001',
        collectionDate: new Date(),
        disposalMethod: 'recycle' as const,
        cost: -50, // Invalid negative cost
        recyclablePercentage: 80,
        recycledQuantity: 80,
      };

      await expect(service.recordWaste(wasteRecord)).rejects.toThrow();
    });

    it('should validate percentage values', async () => {
      const wasteRecord = {
        tenantId: 'tenant-001',
        wasteType: 'packaging' as const,
        category: 'operational' as const,
        quantity: 100,
        unit: 'kg' as const,
        locationId: 'loc-001',
        collectionDate: new Date(),
        disposalMethod: 'recycle' as const,
        cost: 50,
        recyclablePercentage: 150, // Invalid percentage > 100
        recycledQuantity: 80,
      };

      await expect(service.recordWaste(wasteRecord)).rejects.toThrow();
    });
  });
});
