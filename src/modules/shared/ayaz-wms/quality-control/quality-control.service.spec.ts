import { Test, TestingModule } from '@nestjs/testing';
import { QualityControlService } from './quality-control.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('QualityControlService', () => {
  let service: QualityControlService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = { insert: jest.fn(), select: jest.fn(), from: jest.fn(), where: jest.fn() };
    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityControlService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<QualityControlService>(QualityControlService);
  });

  it('should perform inspection', async () => {
    const data = {
      orderId: 'order-1',
      orderType: 'receiving' as const,
      productId: 'prod-1',
      inspectionCriteria: [
        { criterion: 'packaging', passed: true },
        { criterion: 'labeling', passed: true },
      ],
    };

    const result = await service.performInspection(data, 'tenant-1', 'inspector-1');

    expect(result.passed).toBe(true);
    expect(mockEventBus.emit).toHaveBeenCalledWith('quality.inspection.passed', expect.any(Object));
  });

  it('should fail inspection with defects', async () => {
    const data = {
      orderId: 'order-1',
      orderType: 'receiving' as const,
      productId: 'prod-1',
      inspectionCriteria: [
        { criterion: 'packaging', passed: false, notes: 'Damaged box' },
        { criterion: 'labeling', passed: true },
      ],
    };

    const result = await service.performInspection(data, 'tenant-1', 'inspector-1');

    expect(result.passed).toBe(false);
    expect(result.defects).toContain('packaging');
    expect(mockEventBus.emit).toHaveBeenCalledWith('quality.inspection.failed', expect.any(Object));
  });
});

