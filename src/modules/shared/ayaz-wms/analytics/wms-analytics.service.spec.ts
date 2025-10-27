import { Test, TestingModule } from '@nestjs/testing';
import { WmsAnalyticsService } from './wms-analytics.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';

describe('WmsAnalyticsService', () => {
  let service: WmsAnalyticsService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([
        {
          id: 'ord-1',
          status: 'completed',
          createdAt: new Date('2025-10-01'),
          startedAt: new Date('2025-10-01T08:00:00'),
          completedAt: new Date('2025-10-01T09:30:00'),
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WmsAnalyticsService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
      ],
    }).compile();

    service = module.get<WmsAnalyticsService>(WmsAnalyticsService);
  });

  it('should calculate warehouse performance', async () => {
    const period = {
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-10-31'),
    };

    const result = await service.getWarehousePerformance('wh-1', period);

    expect(result).toBeDefined();
    expect(result.receiving).toBeDefined();
    expect(result.picking).toBeDefined();
    expect(result.shipping).toBeDefined();
    expect(result.inventory).toBeDefined();
    expect(result.overallScore).toBeDefined();
  });

  it('should calculate operational costs', async () => {
    mockDb.where.mockResolvedValueOnce([
      { usageType: 'handling_receiving', totalAmount: '1000' },
      { usageType: 'rack_storage', totalAmount: '5000' },
    ]);

    const period = {
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-10-31'),
    };

    const result = await service.getOperationalCosts('wh-1', period);

    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.costsByType).toBeDefined();
    expect(result.breakdown).toBeDefined();
  });

  it('should calculate productivity metrics', async () => {
    const period = {
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-10-31'),
    };

    const result = await service.getProductivityMetrics('wh-1', period);

    expect(result.linesPerHour).toBeDefined();
    expect(result.receivingProductivity).toBeDefined();
    expect(result.pickingProductivity).toBeDefined();
  });
});

