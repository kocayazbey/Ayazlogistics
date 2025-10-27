import { Test, TestingModule } from '@nestjs/testing';
import { ReceivingService } from './receiving.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

describe('ReceivingService', () => {
  let service: ReceivingService;
  let mockDb: any;
  let mockEventBus: any;
  let mockWsGateway: any;

  beforeEach(async () => {
    // Mock database
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'test-id',
        receivingNumber: 'RCV-12345',
        status: 'pending',
      }]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    // Mock event bus
    mockEventBus = {
      emit: jest.fn().mockResolvedValue(true),
    };

    // Mock WebSocket gateway
    mockWsGateway = {
      sendToRoom: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceivingService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
        {
          provide: WebSocketGateway,
          useValue: mockWsGateway,
        },
      ],
    }).compile();

    service = module.get<ReceivingService>(ReceivingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReceivingOrder', () => {
    it('should create a receiving order successfully', async () => {
      const data = {
        warehouseId: 'warehouse-1',
        poNumber: 'PO-12345',
        supplier: 'Test Supplier',
        expectedDate: new Date(),
        lineItems: [
          { productId: 'prod-1', expectedQuantity: 100 },
        ],
      };

      const result = await service.createReceivingOrder(data, 'tenant-1', 'user-1');

      expect(result).toBeDefined();
      expect(result.receivingOrder).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'receiving.order.created',
        expect.any(Object)
      );
      expect(mockWsGateway.sendToRoom).toHaveBeenCalled();
    });

    it('should generate unique receiving number', async () => {
      const data = {
        warehouseId: 'warehouse-1',
        lineItems: [],
      };

      await service.createReceivingOrder(data, 'tenant-1', 'user-1');

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          receivingNumber: expect.stringMatching(/^RCV-\d+$/),
        })
      );
    });
  });

  describe('startReceiving', () => {
    it('should update status to in_progress', async () => {
      mockDb.returning.mockResolvedValueOnce([{
        id: 'recv-1',
        warehouseId: 'warehouse-1',
        status: 'in_progress',
      }]);

      const result = await service.startReceiving('recv-1', 'user-1');

      expect(result.status).toBe('in_progress');
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'receiving.started',
        expect.any(Object)
      );
    });

    it('should throw error if receiving order not found', async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        service.startReceiving('invalid-id', 'user-1')
      ).rejects.toThrow('Receiving order not found');
    });
  });

  describe('receiveItem', () => {
    it('should handle good condition items', async () => {
      const data = {
        receivingOrderId: 'recv-1',
        productId: 'prod-1',
        quantity: 50,
        condition: 'good' as const,
      };

      mockDb.limit.mockResolvedValueOnce([{ id: 'prod-1', sku: 'TEST-SKU' }]);
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await service.receiveItem(
        data,
        'warehouse-1',
        'tenant-1',
        'user-1'
      );

      expect(result.status).toBe('received');
      expect(result.locationId).toBeDefined();
    });

    it('should handle damaged items separately', async () => {
      const data = {
        receivingOrderId: 'recv-1',
        productId: 'prod-1',
        quantity: 5,
        condition: 'damaged' as const,
        damageNotes: 'Box crushed',
      };

      mockDb.limit.mockResolvedValueOnce([{ id: 'prod-1' }]);

      const result = await service.receiveItem(
        data,
        'warehouse-1',
        'tenant-1',
        'user-1'
      );

      expect(result.status).toBe('non_conforming');
    });
  });

  describe('completeReceiving', () => {
    it('should mark receiving as completed', async () => {
      mockDb.returning.mockResolvedValueOnce([{
        id: 'recv-1',
        status: 'completed',
        receivedDate: new Date(),
      }]);

      const result = await service.completeReceiving('recv-1', 'warehouse-1');

      expect(result.status).toBe('completed');
      expect(result.receivedDate).toBeDefined();
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'receiving.completed',
        expect.any(Object)
      );
    });
  });

  describe('generateASN', () => {
    it('should generate ASN with correct format', async () => {
      const data = {
        poNumber: 'PO-12345',
        supplier: 'Test Supplier',
        expectedDate: new Date(),
        lineItems: [
          { sku: 'SKU-1', quantity: 100 },
          { sku: 'SKU-2', quantity: 50 },
        ],
      };

      const result = await service.generateASN(data);

      expect(result.asnNumber).toMatch(/^ASN-\d+$/);
      expect(result.totalItems).toBe(2);
      expect(result.totalQuantity).toBe(150);
    });
  });
});

