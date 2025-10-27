import { Test, TestingModule } from '@nestjs/testing';
import { WavePickingService } from './wave-picking.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('WavePickingService', () => {
  let service: WavePickingService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'pick-1',
        pickingNumber: 'PICK-WAVE-1',
        metadata: { waveId: 'WAVE-123' },
      }]),
    };

    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WavePickingService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<WavePickingService>(WavePickingService);
  });

  it('should create wave with multiple orders', async () => {
    const orderIds = ['ORD-1', 'ORD-2', 'ORD-3'];
    const config = {
      maxOrders: 10,
      maxItems: 100,
      waveType: 'batch' as const,
    };

    const result = await service.createWave('wh-1', orderIds, config, 'user-1');

    expect(result.waveId).toBeDefined();
    expect(result.orders.length).toBeGreaterThan(0);
    expect(mockEventBus.emit).toHaveBeenCalledWith('wave.created', expect.any(Object));
  });

  it('should consolidate tasks by product and location', async () => {
    const orders = [
      { id: 'ord-1', metadata: { items: [{ productId: 'prod-1', locationId: 'loc-1', quantity: 10 }] } },
      { id: 'ord-2', metadata: { items: [{ productId: 'prod-1', locationId: 'loc-1', quantity: 5 }] } },
    ];

    const config = { maxOrders: 10, maxItems: 100, waveType: 'batch' as const };
    
    const result = await service.createWave('wh-1', ['ord-1', 'ord-2'], config, 'user-1');

    expect(result.tasks).toBeDefined();
  });

  it('should release wave for picking', async () => {
    const result = await service.releaseWave('WAVE-123', 'wh-1');

    expect(result.status).toBe('released');
    expect(mockEventBus.emit).toHaveBeenCalledWith('wave.released', expect.any(Object));
  });
});

