import { Test, TestingModule } from '@nestjs/testing';
import { CycleCountingService } from './cycle-counting.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('CycleCountingService', () => {
  let service: CycleCountingService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([
        { id: 'inv-1', productId: 'prod-1', locationId: 'loc-1', quantityOnHand: 100 },
        { id: 'inv-2', productId: 'prod-2', locationId: 'loc-2', quantityOnHand: 50 },
      ]),
      limit: jest.fn().mockResolvedValue([
        { id: 'loc-1', code: 'A1-01-01' },
      ]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CycleCountingService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<CycleCountingService>(CycleCountingService);
  });

  it('should generate cycle count tasks with ABC strategy', async () => {
    const result = await service.generateCycleCountTasks('wh-1', 'ABC', 10);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'cycle.count.tasks.generated',
      expect.objectContaining({ strategy: 'ABC' })
    );
  });

  it('should generate random cycle count tasks', async () => {
    const result = await service.generateCycleCountTasks('wh-1', 'RANDOM', 5);

    expect(result.length).toBeGreaterThan(0);
  });

  it('should record count with variance', async () => {
    const result = await service.recordCount('task-1', 95, 'wh-1', 'user-1', 'tenant-1');

    expect(result).toBeDefined();
    expect(result.status).toBe('counted');
    expect(mockEventBus.emit).toHaveBeenCalledWith(
      'cycle.count.recorded',
      expect.any(Object)
    );
  });

  it('should reconcile variance and adjust inventory', async () => {
    mockDb.where.mockReturnThis();
    mockDb.update = jest.fn().mockReturnThis();
    mockDb.set = jest.fn().mockReturnThis();

    const data = {
      taskId: 'task-1',
      productId: 'prod-1',
      locationId: 'loc-1',
      warehouseId: 'wh-1',
      systemQuantity: 100,
      countedQuantity: 95,
      approvedBy: 'manager-1',
      reason: 'Physical count variance',
    };

    const result = await service.reconcileVariance(data, 'tenant-1');

    expect(result.reconciled).toBe(true);
    expect(result.variance).toBe(-5);
    expect(result.newQuantity).toBe(95);
  });
});

