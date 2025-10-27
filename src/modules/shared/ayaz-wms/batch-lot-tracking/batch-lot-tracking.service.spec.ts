import { Test, TestingModule } from '@nestjs/testing';
import { BatchLotTrackingService } from './batch-lot-tracking.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('BatchLotTrackingService', () => {
  let service: BatchLotTrackingService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ id: 'batch-1', lotNumber: 'LOT-123', stockCardId: 'stock-1' }]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
    };

    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchLotTrackingService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<BatchLotTrackingService>(BatchLotTrackingService);
  });

  it('should allocate using FIFO', async () => {
    mockDb.where.mockResolvedValueOnce([
      { id: 'batch-1', lotNumber: 'LOT-001', quantity: 50, receivedDate: new Date('2025-01-01') },
      { id: 'batch-2', lotNumber: 'LOT-002', quantity: 100, receivedDate: new Date('2025-01-15') },
    ]);

    const result = await service.allocateFIFO('prod-1', 75, 'wh-1', 'tenant-1');

    expect(result.length).toBe(2);
    expect(result[0].lotNumber).toBe('LOT-001');
    expect(result[0].quantity).toBe(50);
    expect(result[1].quantity).toBe(25);
  });

  it('should allocate using FEFO', async () => {
    mockDb.where.mockResolvedValueOnce([
      { id: 'batch-1', lotNumber: 'LOT-001', quantity: 50, expiryDate: new Date('2025-12-31') },
      { id: 'batch-2', lotNumber: 'LOT-002', quantity: 100, expiryDate: new Date('2025-06-30') },
    ]);

    const result = await service.allocateFEFO('prod-1', 75, 'wh-1', 'tenant-1');

    expect(result.length).toBe(2);
    expect(result[0].lotNumber).toBe('LOT-002'); // Earlier expiry first
  });
});

