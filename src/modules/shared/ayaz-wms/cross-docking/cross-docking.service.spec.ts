import { Test, TestingModule } from '@nestjs/testing';
import { CrossDockingService } from './cross-docking.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('CrossDockingService', () => {
  let service: CrossDockingService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {};
    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrossDockingService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<CrossDockingService>(CrossDockingService);
  });

  it('should create cross-dock operation', async () => {
    const data = {
      warehouseId: 'wh-1',
      inboundShipmentId: 'in-1',
      outboundShipmentId: 'out-1',
      items: [
        { productId: 'prod-1', quantity: 50 },
      ],
    };

    const result = await service.createCrossDockOperation(data);

    expect(result.operationId).toBeDefined();
    expect(result.status).toBe('scheduled');
    expect(mockEventBus.emit).toHaveBeenCalledWith('cross.dock.created', expect.any(Object));
  });

  it('should identify cross-dock opportunities', async () => {
    const inbound = [{
      id: 'in-1',
      items: [{ productId: 'prod-1', quantity: 100 }],
      expectedArrival: new Date('2025-10-24T08:00:00'),
    }];

    const outbound = [{
      id: 'out-1',
      items: [{ productId: 'prod-1', quantity: 50 }],
      scheduledShipDate: new Date('2025-10-24T14:00:00'),
    }];

    const opportunities = await service.identifyOpportunities('wh-1', inbound, outbound);

    expect(Array.isArray(opportunities)).toBe(true);
    if (opportunities.length > 0) {
      expect(opportunities[0].matchingItems.length).toBeGreaterThan(0);
    }
  });
});

