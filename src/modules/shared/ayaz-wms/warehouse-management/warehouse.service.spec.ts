import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseService } from './warehouse.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('WarehouseService', () => {
  let service: WarehouseService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'wh-1',
        code: 'WH-001',
        name: 'Test Warehouse',
      }]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockEventBus = {
      emit: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<WarehouseService>(WarehouseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWarehouse', () => {
    it('should create warehouse with tenant isolation', async () => {
      const data = {
        code: 'WH-IST-001',
        name: 'Istanbul Warehouse',
        city: 'Istanbul',
      };

      const result = await service.createWarehouse(data, 'tenant-1');

      expect(result).toBeDefined();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          ...data,
        })
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'warehouse.created',
        expect.any(Object)
      );
    });
  });

  describe('createLocation', () => {
    it('should create location with proper hierarchy', async () => {
      const data = {
        code: 'A1-01-02-03',
        zone: 'A',
        aisle: '1',
        rack: '01',
        shelf: '02',
        bin: '03',
      };

      const result = await service.createLocation('wh-1', data);

      expect(result).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'location.created',
        expect.any(Object)
      );
    });
  });

  describe('findAvailableLocation', () => {
    it('should find available location based on criteria', async () => {
      mockDb.limit.mockResolvedValueOnce([{
        id: 'loc-1',
        code: 'A1-01-01-01',
        isOccupied: false,
        isLocked: false,
        zone: 'A',
      }]);

      const result = await service.findAvailableLocation('wh-1', {
        zone: 'A',
      });

      expect(result).toBeDefined();
      expect(result.zone).toBe('A');
    });

    it('should return null if no location available', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.findAvailableLocation('wh-1');

      expect(result).toBeUndefined();
    });
  });

  describe('occupyLocation', () => {
    it('should mark location as occupied', async () => {
      mockDb.returning.mockResolvedValueOnce([{
        id: 'loc-1',
        isOccupied: true,
      }]);

      const result = await service.occupyLocation('loc-1');

      expect(result.isOccupied).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'location.occupied',
        { locationId: 'loc-1' }
      );
    });
  });

  describe('releaseLocation', () => {
    it('should mark location as available', async () => {
      mockDb.returning.mockResolvedValueOnce([{
        id: 'loc-1',
        isOccupied: false,
      }]);

      const result = await service.releaseLocation('loc-1');

      expect(result.isOccupied).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'location.released',
        { locationId: 'loc-1' }
      );
    });
  });
});

