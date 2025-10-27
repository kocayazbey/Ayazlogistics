import { Test, TestingModule } from '@nestjs/testing';
import { ShippingService } from './shipping.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

describe('ShippingService', () => {
  let service: ShippingService;
  let mockDb: any;
  let mockEventBus: any;
  let mockWsGateway: any;

  beforeEach(async () => {
    mockDb = {
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{
        id: 'ship-1',
        shipmentNumber: 'SHP-12345',
        status: 'preparing',
      }]),
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{
        id: 'ship-1',
        shipmentNumber: 'SHP-12345',
        trackingNumber: 'TRK-12345',
      }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };
    mockWsGateway = { sendToRoom: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        { provide: DRIZZLE_ORM, useValue: mockDb },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: WebSocketGateway, useValue: mockWsGateway },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
  });

  it('should create shipment', async () => {
    const data = {
      warehouseId: 'wh-1',
      orderNumber: 'ORD-123',
      carrier: 'Aras Kargo',
      shipToName: 'Test Customer',
      shipToAddress: 'Test Address',
      packages: [{
        weight: 10,
        dimensions: { length: 30, width: 20, height: 15 },
        items: [{ productId: 'prod-1', quantity: 5 }],
      }],
    };

    const result = await service.createShipment(data);

    expect(result.shipment).toBeDefined();
    expect(result.shipment.shipmentNumber).toMatch(/^SHP-\d+$/);
    expect(mockEventBus.emit).toHaveBeenCalledWith('shipment.created', expect.any(Object));
  });

  it('should generate shipping label', async () => {
    const result = await service.generateShippingLabel('ship-1', 1);

    expect(result.trackingNumber).toBeDefined();
    expect(result.labelUrl).toContain('https://');
  });

  it('should manifest shipment', async () => {
    const manifestData = {
      carrier: 'Aras Kargo',
      serviceLevel: 'Express',
      packages: [{ trackingNumber: 'TRK-123', weight: 10 }],
    };

    const result = await service.manifestShipment('ship-1', manifestData);

    expect(result.manifestNumber).toMatch(/^MAN-\d+$/);
    expect(mockEventBus.emit).toHaveBeenCalledWith('shipment.manifested', expect.any(Object));
  });

  it('should track shipment', async () => {
    const result = await service.trackShipment('TRK-12345');

    expect(result).toBeDefined();
    expect(result.trackingNumber).toBe('TRK-12345');
    expect(result.events).toBeDefined();
  });

  it('should get shipping rates', async () => {
    const data = {
      origin: { zipCode: '34000', country: 'TR' },
      destination: { zipCode: '06000', country: 'TR' },
      packages: [{ weight: 10, dimensions: { length: 30, width: 20, height: 15 } }],
    };

    const result = await service.getShippingRates(data);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('carrier');
    expect(result[0]).toHaveProperty('cost');
  });
});

