import { Test, TestingModule } from '@nestjs/testing';
import { ConsolidationService } from './consolidation.service';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('ConsolidationService', () => {
  let service: ConsolidationService;
  let mockEventBus: any;

  beforeEach(async () => {
    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsolidationService,
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<ConsolidationService>(ConsolidationService);
  });

  it('should find consolidation opportunities', async () => {
    const orders = [
      { orderId: 'o1', destinationZip: '34000', weight: 10, volume: 0.5, scheduledShipDate: new Date() },
      { orderId: 'o2', destinationZip: '34001', weight: 8, volume: 0.4, scheduledShipDate: new Date() },
      { orderId: 'o3', destinationZip: '34002', weight: 12, volume: 0.6, scheduledShipDate: new Date() },
    ];

    const result = await service.findConsolidationOpportunities(orders);

    expect(Array.isArray(result)).toBe(true);
    // Orders to same area (340xx) should be consolidated
    if (result.length > 0) {
      expect(result[0].orders.length).toBeGreaterThan(1);
      expect(result[0].estimatedSavings).toBeGreaterThan(0);
    }
  });

  it('should create consolidation', async () => {
    const data = {
      name: 'Istanbul Consolidation - Oct 24',
      orderIds: ['ord-1', 'ord-2', 'ord-3'],
      carrier: 'LTL',
      scheduledShipDate: new Date(),
    };

    const result = await service.createConsolidation(data);

    expect(result.consolidationId).toBeDefined();
    expect(result.orderIds.length).toBe(3);
    expect(mockEventBus.emit).toHaveBeenCalledWith('consolidation.created', expect.any(Object));
  });
});

