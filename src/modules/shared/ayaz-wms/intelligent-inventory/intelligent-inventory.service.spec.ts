import { Test, TestingModule } from '@nestjs/testing';
import { IntelligentInventoryService } from './intelligent-inventory.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('IntelligentInventoryService', () => {
  let service: IntelligentInventoryService;
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
        IntelligentInventoryService,
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

    service = module.get<IntelligentInventoryService>(IntelligentInventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('performABCXYZAnalysis', () => {
    it('should perform ABC/XYZ analysis successfully', async () => {
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';
      const analysisPeriod = 90;

      mockDb.select.mockResolvedValue([
        {
          productId: 'product-1',
          totalQuantity: 100,
          totalValue: 50000,
          movementCount: 10,
        },
      ]);

      const result = await service.performABCXYZAnalysis(warehouseId, tenantId, analysisPeriod);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'inventory.abc_xyz_analysis_completed',
        expect.objectContaining({
          warehouseId,
          tenantId,
          analysisPeriod,
        }),
      );
    });

    it('should handle empty sales data', async () => {
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';
      const analysisPeriod = 90;

      mockDb.select.mockResolvedValue([]);

      const result = await service.performABCXYZAnalysis(warehouseId, tenantId, analysisPeriod);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('generateReorderRecommendations', () => {
    it('should generate reorder recommendations successfully', async () => {
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';

      mockDb.select.mockResolvedValue([
        {
          productId: 'product-1',
          availableQuantity: 10,
          reorderPoint: 20,
        },
      ]);

      const result = await service.generateReorderRecommendations(warehouseId, tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'inventory.reorder_recommendations_generated',
        expect.objectContaining({
          warehouseId,
          tenantId,
        }),
      );
    });

    it('should handle no low stock products', async () => {
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';

      mockDb.select.mockResolvedValue([]);

      const result = await service.generateReorderRecommendations(warehouseId, tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('generateDemandForecast', () => {
    it('should generate demand forecast successfully', async () => {
      const productId = 'product-123';
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';
      const forecastDays = 30;

      const result = await service.generateDemandForecast(productId, warehouseId, tenantId, forecastDays);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.forecastPeriod).toBe(forecastDays);
      expect(result.forecastedDemand).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBeLessThanOrEqual(1);
    });
  });

  describe('optimizeInventoryLevels', () => {
    it('should optimize inventory levels successfully', async () => {
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';

      // Mock the ABC/XYZ analysis
      jest.spyOn(service, 'performABCXYZAnalysis').mockResolvedValue([
        {
          productId: 'product-1',
          sku: 'SKU-001',
          productName: 'Test Product',
          currentStock: 100,
          abcCategory: 'A',
          xyzCategory: 'X',
          demandVariability: 0.2,
          leadTime: 7,
          safetyStock: 20,
          reorderPoint: 30,
          economicOrderQuantity: 50,
          stockoutRisk: 0.1,
          carryingCost: 2,
          stockoutCost: 50,
          recommendations: ['Maintain current level'],
        },
      ]);

      const result = await service.optimizeInventoryLevels(warehouseId, tenantId);

      expect(result).toBeDefined();
      expect(result.totalSavings).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('calculateSafetyStock', () => {
    it('should calculate safety stock correctly', async () => {
      const productId = 'product-123';
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';

      const result = await service.calculateSafetyStock(productId, warehouseId, tenantId);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateReorderPoint', () => {
    it('should calculate reorder point correctly', async () => {
      const productId = 'product-123';
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';

      const result = await service.calculateReorderPoint(productId, warehouseId, tenantId);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateEOQ', () => {
    it('should calculate EOQ correctly', async () => {
      const productId = 'product-123';
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';

      const result = await service.calculateEOQ(productId, warehouseId, tenantId);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateStockoutRisk', () => {
    it('should calculate stockout risk correctly', async () => {
      const productId = 'product-123';
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';

      const result = await service.calculateStockoutRisk(productId, warehouseId, tenantId);

      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('getInventoryAnalytics', () => {
    it('should get inventory analytics successfully', async () => {
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';
      const timeRange = 30;

      const result = await service.getInventoryAnalytics(warehouseId, tenantId, timeRange);

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('performBulkAnalysis', () => {
    it('should perform bulk analysis successfully', async () => {
      const productIds = ['product-1', 'product-2', 'product-3'];
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';
      const analysisType = 'abc_xyz';

      const result = await service.performBulkAnalysis(productIds, warehouseId, tenantId, analysisType);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getInventoryAlerts', () => {
    it('should get inventory alerts successfully', async () => {
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';
      const alertType = 'low_stock';

      const result = await service.getInventoryAlerts(warehouseId, tenantId, alertType);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';

      mockDb.select.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.performABCXYZAnalysis(warehouseId, tenantId, 90)).rejects.toThrow();
    });

    it('should handle invalid parameters', async () => {
      const warehouseId = '';
      const tenantId = 'tenant-123';

      await expect(service.performABCXYZAnalysis(warehouseId, tenantId, 90)).rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('should complete analysis within reasonable time', async () => {
      const warehouseId = 'warehouse-123';
      const tenantId = 'tenant-123';

      mockDb.select.mockResolvedValue([
        {
          productId: 'product-1',
          totalQuantity: 100,
          totalValue: 50000,
          movementCount: 10,
        },
      ]);

      const startTime = Date.now();
      await service.performABCXYZAnalysis(warehouseId, tenantId, 90);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
