import { Test, TestingModule } from '@nestjs/testing';
import { PeakSeasonPricingService } from './peak-season-pricing.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('PeakSeasonPricingService', () => {
  let service: PeakSeasonPricingService;
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
      returning: jest.fn().mockResolvedValue([{ id: '1' }]),
      orderBy: jest.fn().mockResolvedValue([]),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeakSeasonPricingService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<PeakSeasonPricingService>(PeakSeasonPricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateSeasonalPrice', () => {
    it('should return base price when no seasonal rule active', async () => {
      const result = await service.calculateSeasonalPrice(
        'tenant-1',
        'forklift_operator',
        1000,
        new Date('2024-01-01')
      );

      expect(result.basePrice).toBe(1000);
      expect(result.seasonalAdjustment).toBe(0);
      expect(result.finalPrice).toBe(1000);
    });
  });

  describe('getPredefinedSeasons', () => {
    it('should return predefined seasons', async () => {
      const seasons = await service.getPredefinedSeasons();

      expect(seasons).toBeInstanceOf(Array);
      expect(seasons.length).toBeGreaterThan(0);
      expect(seasons[0]).toHaveProperty('seasonType');
      expect(seasons[0]).toHaveProperty('suggestedAdjustment');
    });
  });
});

