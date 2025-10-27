import { Test, TestingModule } from '@nestjs/testing';
import { VolumeDiscountService } from './volume-discount.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('VolumeDiscountService', () => {
  let service: VolumeDiscountService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {};
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolumeDiscountService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<VolumeDiscountService>(VolumeDiscountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateVolumeDiscount', () => {
    it('should calculate discount for quantity >= 100', async () => {
      const result = await service.calculateVolumeDiscount(
        'tenant-1',
        'contract-1',
        'forklift_operator',
        150,
        100,
        new Date()
      );

      expect(result.originalPrice).toBe(15000);
      expect(result.discountAmount).toBeGreaterThan(0);
      expect(result.finalPrice).toBeLessThan(result.originalPrice);
    });

    it('should not apply discount for low quantities', async () => {
      const result = await service.calculateVolumeDiscount(
        'tenant-1',
        'contract-1',
        'forklift_operator',
        50,
        100,
        new Date()
      );

      expect(result.discountAmount).toBe(0);
      expect(result.finalPrice).toBe(result.originalPrice);
    });
  });

  describe('getVolumeDiscountSummary', () => {
    it('should return discount summary', async () => {
      const summary = await service.getVolumeDiscountSummary(
        'tenant-1',
        'contract-1',
        'forklift_operator'
      );

      expect(summary).toHaveProperty('hasActiveRule');
      expect(summary).toHaveProperty('serviceType');
    });
  });
});

