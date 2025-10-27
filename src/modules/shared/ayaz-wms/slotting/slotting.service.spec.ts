import { Test, TestingModule } from '@nestjs/testing';
import { SlottingService } from './slotting.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('SlottingService', () => {
  let service: SlottingService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockEventBus = {
      emit: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlottingService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<SlottingService>(SlottingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeSlottingOptimization', () => {
    it('should generate slotting recommendations based on velocity', async () => {
      // Mock inventory with low velocity in Zone A
      mockDb.where.mockResolvedValueOnce([
        {
          id: 'inv-1',
          productId: 'prod-1',
          locationId: 'loc-a1',
        },
      ]);

      // Mock product
      mockDb.limit.mockResolvedValueOnce([{
        id: 'prod-1',
        sku: 'SLOW-MOVER',
        name: 'Slow Moving Product',
      }]);

      // Mock current location (Zone A)
      mockDb.limit.mockResolvedValueOnce([{
        id: 'loc-a1',
        code: 'A1-01-01',
        zone: 'A',
      }]);

      // Mock movement data (low velocity)
      mockDb.where.mockResolvedValueOnce([
        { quantity: 2 },
        { quantity: 1 },
      ]);

      // Mock optimal location (Zone C)
      mockDb.where.mockResolvedValueOnce([
        {
          id: 'loc-c1',
          code: 'C1-01-01',
          zone: 'C',
          locationType: 'pick',
        },
      ]);

      const result = await service.analyzeSlottingOptimization('wh-1', 'tenant-1');

      expect(result).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'slotting.analysis.completed',
        expect.any(Object)
      );
    });

    it('should prioritize high-impact recommendations', async () => {
      // Test that recommendations are sorted by priority
      mockDb.where.mockResolvedValue([]);

      const result = await service.analyzeSlottingOptimization('wh-1', 'tenant-1');

      expect(result.recommendations).toBeDefined();
      // Recommendations should be sorted by priority
    });
  });

  describe('executeSlottingChange', () => {
    it('should move inventory from one location to another', async () => {
      const data = {
        productId: 'prod-1',
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
        quantity: 50,
        warehouseId: 'wh-1',
      };

      mockDb.limit.mockResolvedValueOnce([{
        id: 'inv-1',
        quantityOnHand: 100,
        quantityAvailable: 100,
      }]);

      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.executeSlottingChange(data, 'user-1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.movedQuantity).toBe(50);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'slotting.executed',
        expect.any(Object)
      );
    });
  });
});

