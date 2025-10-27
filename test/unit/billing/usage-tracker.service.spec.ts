import { Test, TestingModule } from '@nestjs/testing';
import { UsageTrackerService } from '../../../src/modules/logistics/ayaz-billing/usage-based-billing/usage-tracker.service';

describe('UsageTrackerService', () => {
  let service: UsageTrackerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageTrackerService,
        {
          provide: 'DATABASE_POOL',
          useValue: {
            query: jest.fn(),
          },
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
      const usageData = {
        contractId: 'CONTRACT_123',
        serviceType: 'storage',
        quantity: 100,
        unit: 'pallet',
        usageDate: new Date(),
      };

      const result = await service.recordUsage(usageData);
      expect(result).toBeDefined();
      expect(result.contractId).toBe(usageData.contractId);
    });
  });

  describe('getUsageByPeriod', () => {
    it('should retrieve usage by period', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await service.getUsageByPeriod(
        'CONTRACT_123',
        startDate,
        endDate,
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

