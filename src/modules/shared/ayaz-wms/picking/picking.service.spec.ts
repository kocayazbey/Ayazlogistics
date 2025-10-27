import { Test, TestingModule } from '@nestjs/testing';
import { PickingService } from './picking.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';
import { CacheService } from '../../common/services/cache.service';

describe('PickingService', () => {
  let service: PickingService;
  let mockDb: any;
  let mockEventBus: any;
  let mockWsGateway: any;
  let mockCache: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'pick-1',
        pickingNumber: 'PICK-12345',
        status: 'pending',
      }]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockEventBus = {
      emit: jest.fn().mockResolvedValue(true),
    };

    mockWsGateway = {
      sendToRoom: jest.fn(),
    };

    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PickingService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: WebSocketGateway, useValue: mockWsGateway },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<PickingService>(PickingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPickingOrder', () => {
    it('should create picking order with FIFO strategy', async () => {
      const data = {
        warehouseId: 'wh-1',
        orderNumber: 'ORD-123',
        pickingStrategy: 'FIFO' as const,
        lineItems: [
          { productId: 'prod-1', quantity: 10 },
        ],
      };

      const result = await service.createPickingOrder(data, 'user-1');

      expect(result.pickingOrder).toBeDefined();
      expect(result.pickingOrder.pickingStrategy).toBe('FIFO');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'picking.order.created',
        expect.any(Object)
      );
    });

    it('should generate picking tasks', async () => {
      const data = {
        warehouseId: 'wh-1',
        orderNumber: 'ORD-123',
        lineItems: [
          { productId: 'prod-1', quantity: 10 },
          { productId: 'prod-2', quantity: 5 },
        ],
      };

      const result = await service.createPickingOrder(data, 'user-1');

      expect(result.tasks).toBeDefined();
      expect(Array.isArray(result.tasks)).toBe(true);
    });
  });

  describe('allocateInventory', () => {
    it('should allocate inventory successfully', async () => {
      const orderItems = [
        { productId: 'prod-1', quantity: 10 },
      ];

      mockDb.limit.mockResolvedValueOnce([{
        id: 'inv-1',
        productId: 'prod-1',
        quantityAvailable: 50,
        quantityOnHand: 50,
        quantityAllocated: 0,
        locationId: 'loc-1',
      }]);

      const result = await service.allocateInventory(orderItems, 'wh-1');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].quantity).toBe(10);
    });

    it('should throw error for insufficient inventory', async () => {
      const orderItems = [
        { productId: 'prod-1', quantity: 100 },
      ];

      mockDb.limit.mockResolvedValueOnce([{
        id: 'inv-1',
        quantityAvailable: 5,
      }]);

      await expect(
        service.allocateInventory(orderItems, 'wh-1')
      ).rejects.toThrow(/Insufficient inventory/);
    });
  });

  describe('getPickingPerformance', () => {
    it('should calculate performance metrics', async () => {
      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      mockDb.where.mockResolvedValueOnce([
        {
          status: 'completed',
          startedAt: new Date('2025-10-15T08:00:00'),
          completedAt: new Date('2025-10-15T09:30:00'),
        },
        {
          status: 'completed',
          startedAt: new Date('2025-10-16T10:00:00'),
          completedAt: new Date('2025-10-16T11:00:00'),
        },
      ]);

      const result = await service.getPickingPerformance('wh-1', startDate, endDate);

      expect(result).toBeDefined();
      expect(result.totalOrders).toBe(2);
      expect(result.completed).toBe(2);
      expect(result.completionRate).toBe(100);
    });
  });
});

