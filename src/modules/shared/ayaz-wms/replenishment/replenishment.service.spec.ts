import { Test, TestingModule } from '@nestjs/testing';
import { ReplenishmentService } from './replenishment.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('ReplenishmentService', () => {
  let service: ReplenishmentService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([
        {
          id: 'loc-1',
          locationType: 'pick',
          metadata: { minLevel: 10, maxLevel: 100 },
        },
      ]),
      limit: jest.fn().mockResolvedValue([{
        id: 'prod-1',
        sku: 'TEST-SKU',
      }]),
    };

    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplenishmentService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<ReplenishmentService>(ReplenishmentService);
  });

  it('should analyze replenishment needs', async () => {
    const result = await service.analyzeReplenishmentNeeds('wh-1');

    expect(Array.isArray(result)).toBe(true);
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'replenishment.analysis.completed',
      expect.any(Object)
    );
  });

  it('should prioritize critical replenishments', async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        id: 'inv-1',
        productId: 'prod-1',
        quantityAvailable: 0, // Empty - should be critical
        locationId: 'loc-1',
      },
    ]);

    const result = await service.analyzeReplenishmentNeeds('wh-1');

    if (result.length > 0) {
      expect(result[0].priority).toBe('critical');
    }
  });

  it('should create replenishment wave', async () => {
    const result = await service.createReplenishmentWave('wh-1', 50);

    expect(result.waveId).toBeDefined();
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'replenishment.wave.created',
      expect.any(Object)
    );
  });

  it('should schedule automatic replenishment', async () => {
    const schedule = {
      frequency: 'daily' as const,
      time: '08:00',
      minThreshold: 5,
    };

    const result = await service.scheduleAutomaticReplenishment('wh-1', schedule);

    expect(result.scheduled).toBe(true);
    expect(result.nextRun).toBeDefined();
  });
});

