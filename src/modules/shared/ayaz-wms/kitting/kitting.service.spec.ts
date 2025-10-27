import { Test, TestingModule } from '@nestjs/testing';
import { KittingService } from './kitting.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('KittingService', () => {
  let service: KittingService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([
        { id: 'inv-1', quantityAvailable: 100 },
      ]),
      limit: jest.fn().mockResolvedValue([{
        id: 'prod-1',
        metadata: { unitCost: 10 },
      }]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KittingService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<KittingService>(KittingService);
  });

  it('should create kit definition', async () => {
    const data = {
      kitSku: 'KIT-001',
      kitName: 'Starter Kit',
      components: [
        { componentProductId: 'comp-1', quantityRequired: 2 },
        { componentProductId: 'comp-2', quantityRequired: 1 },
      ],
    };

    const result = await service.createKit(data, 'tenant-1');

    expect(result.id).toBeDefined();
    expect(mockEventBus.emit).toHaveBeenCalledWith('kit.created', expect.any(Object));
  });

  it('should calculate kit cost', async () => {
    const result = await service.calculateKitCost('kit-1');

    expect(result.materialCost).toBeDefined();
    expect(result.laborCost).toBeDefined();
    expect(result.totalCost).toBeDefined();
  });
});

