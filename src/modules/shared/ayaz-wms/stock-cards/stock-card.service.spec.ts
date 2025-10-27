import { Test, TestingModule } from '@nestjs/testing';
import { StockCardService } from './stock-card.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('StockCardService', () => {
  let service: StockCardService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'stock-1',
        stockCode: 'STK-001',
        stockName: 'Test Product',
      }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockCardService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<StockCardService>(StockCardService);
  });

  it('should create stock card', async () => {
    const data = {
      stockCode: 'STK-001',
      stockName: 'Test Product',
      unit: 'piece',
      purchasePrice: 100,
      salePrice: 150,
      minStockLevel: 10,
      maxStockLevel: 100,
    };

    const result = await service.createStockCard(data, 'tenant-1', 'user-1');

    expect(result.stockCode).toBe('STK-001');
    expect(mockEventBus.emit).toHaveBeenCalledWith('stock.card.created', expect.any(Object));
  });

  it('should adjust stock', async () => {
    mockDb.limit.mockResolvedValueOnce([{
      id: 'stock-1',
      currentStock: '100',
    }]);

    const data = {
      stockCardId: 'stock-1',
      quantity: 10,
      movementType: 'in' as const,
      reason: 'Purchase',
    };

    const result = await service.adjustStock(data, 'tenant-1', 'user-1');

    expect(result.newStock).toBe(110);
    expect(mockEventBus.emit).toHaveBeenCalledWith('stock.adjusted', expect.any(Object));
  });

  it('should get low stock items', async () => {
    mockDb.where.mockResolvedValueOnce([
      { id: 'stock-1', currentStock: '5', minStockLevel: '10' },
      { id: 'stock-2', currentStock: '50', minStockLevel: '10' },
    ]);

    const result = await service.getLowStockItems('tenant-1');

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('stock-1');
  });
});

