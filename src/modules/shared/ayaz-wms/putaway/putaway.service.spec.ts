import { Test, TestingModule } from '@nestjs/testing';
import { PutawayService } from './putaway.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('PutawayService', () => {
  let service: PutawayService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{
        id: 'prod-1',
        sku: 'TEST-SKU',
        isHazmat: false,
        isPerishable: false,
      }]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PutawayService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<PutawayService>(PutawayService);
  });

  it('should suggest optimal putaway location', async () => {
    mockDb.where.mockResolvedValueOnce([
      { id: 'loc-1', zone: 'A', capacity: '100', isOccupied: false },
      { id: 'loc-2', zone: 'B', capacity: '100', isOccupied: false },
    ]);

    const data = {
      warehouseId: 'wh-1',
      productId: 'prod-1',
      quantity: 50,
    };

    const result = await service.suggestPutawayLocation(data);

    expect(result.recommended).toBeDefined();
    expect(result.alternatives).toBeDefined();
    expect(Array.isArray(result.alternatives)).toBe(true);
  });

  it('should handle hazmat products', async () => {
    mockDb.limit.mockResolvedValueOnce([{
      id: 'prod-1',
      isHazmat: true,
    }]);

    mockDb.where.mockResolvedValueOnce([
      { id: 'loc-hazmat', locationType: 'hazmat', isOccupied: false, capacity: '100' },
    ]);

    const data = {
      warehouseId: 'wh-1',
      productId: 'prod-1',
      quantity: 10,
      isHazmat: true,
    };

    const result = await service.suggestPutawayLocation(data);

    expect(result.recommended.locationType).toBe('hazmat');
  });

  it('should perform putaway', async () => {
    mockDb.where.mockResolvedValueOnce([]);

    const data = {
      receivingOrderId: 'recv-1',
      productId: 'prod-1',
      quantity: 50,
      fromLocation: 'staging',
      toLocation: 'loc-1',
    };

    const result = await service.putaway(data, 'wh-1', 'user-1');

    expect(result.status).toBe('completed');
    expect(result.locationId).toBe('loc-1');
    expect(mockEventBus.emit).toHaveBeenCalledWith('putaway.completed', expect.any(Object));
  });
});

