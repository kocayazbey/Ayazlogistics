import { Test, TestingModule } from '@nestjs/testing';
import { InventoryQueryService } from './inventory-query.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { CacheService } from '../../common/services/cache.service';

describe('InventoryQueryService', () => {
  let service: InventoryQueryService;
  let mockDb: any;
  let mockCache: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockResolvedValue([
        {
          inventory: { id: 'inv-1', quantityOnHand: 100, productId: 'prod-1' },
          product: { id: 'prod-1', sku: 'SKU-1', name: 'Product 1' },
          location: { id: 'loc-1', code: 'A1-01-01', zone: 'A' },
          warehouse: { id: 'wh-1', name: 'Warehouse 1', tenantId: 'tenant-1' },
        },
      ]),
    };

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryQueryService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<InventoryQueryService>(InventoryQueryService);
  });

  it('should get inventory with filters', async () => {
    const filters = {
      warehouseId: 'wh-1',
      zone: 'A',
    };

    const result = await service.getInventory('tenant-1', filters);

    expect(Array.isArray(result)).toBe(true);
    expect(mockCache.set).toHaveBeenCalled();
  });

  it('should perform ABC analysis', async () => {
    mockDb.where.mockResolvedValueOnce([
      {
        inventory: { quantityOnHand: 100 },
        product: { metadata: { unitCost: 10 } },
      },
      {
        inventory: { quantityOnHand: 50 },
        product: { metadata: { unitCost: 5 } },
      },
    ]);

    const result = await service.getInventoryABCAnalysis('wh-1');

    expect(result.summary).toBeDefined();
    expect(result.summary.A).toBeDefined();
    expect(result.totalItems).toBe(2);
  });
});

