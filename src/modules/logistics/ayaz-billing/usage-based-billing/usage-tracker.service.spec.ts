import { Test, TestingModule } from '@nestjs/testing';
import { UsageTrackerService } from './usage-tracker.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('UsageTrackerService', () => {
  let service: UsageTrackerService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: '1', quantity: '100' }]),
      limit: jest.fn().mockResolvedValue([]),
      orderBy: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageTrackerService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<UsageTrackerService>(UsageTrackerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordUsage', () => {
    it('should record usage successfully', async () => {
      const usageRecord = {
        tenantId: 'tenant-1',
        contractId: 'contract-1',
        usageType: 'forklift_operator',
        quantity: 10,
        unitOfMeasure: 'hours',
        usageDate: new Date(),
      };

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValue([{ rateAmount: '100', contractId: 'contract-1' }]);

      const result = await service.recordUsage(usageRecord);

      expect(result).toBeDefined();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'billing.usage.recorded',
        expect.any(Object)
      );
    });
  });

  describe('bulkRecordUsage', () => {
    it('should record multiple usage records', async () => {
      const records = [
        {
          tenantId: 'tenant-1',
          contractId: 'contract-1',
          usageType: 'forklift_operator',
          quantity: 10,
          unitOfMeasure: 'hours',
          usageDate: new Date(),
        },
        {
          tenantId: 'tenant-1',
          contractId: 'contract-1',
          usageType: 'rack_storage',
          quantity: 50,
          unitOfMeasure: 'pallets',
          usageDate: new Date(),
        },
      ];

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.limit.mockResolvedValue([{ rateAmount: '100' }]);

      const result = await service.bulkRecordUsage(records);

      expect(result).toHaveLength(2);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'billing.usage.bulk_recorded',
        expect.any(Object)
      );
    });
  });

  describe('getUsageStats', () => {
    it('should calculate usage statistics', async () => {
      const contractId = 'contract-1';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockDb.select.mockReturnValue(mockDb);
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.groupBy.mockResolvedValue([
        { usageType: 'forklift_operator', totalQuantity: 100, totalAmount: 10000 },
      ]);

      const result = await service.getUsageStats(contractId, startDate, endDate);

      expect(result).toHaveProperty('totalAmount');
      expect(result).toHaveProperty('totalRecords');
      expect(result).toHaveProperty('breakdown');
    });
  });
});

