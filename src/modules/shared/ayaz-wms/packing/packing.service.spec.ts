import { Test, TestingModule } from '@nestjs/testing';
import { PackingService } from './packing.service';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('PackingService', () => {
  let service: PackingService;
  let mockEventBus: any;

  beforeEach(async () => {
    mockEventBus = { emit: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackingService,
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<PackingService>(PackingService);
  });

  it('should calculate optimal packing', async () => {
    const items = [
      { productId: 'p1', sku: 'SKU1', quantity: 5, length: 10, width: 10, height: 10, weight: 1 },
      { productId: 'p2', sku: 'SKU2', quantity: 3, length: 15, width: 10, height: 10, weight: 2 },
    ];

    const result = await service.calculateOptimalPacking(items);

    expect(result.totalBoxes).toBeGreaterThan(0);
    expect(result.boxes).toBeDefined();
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it('should prioritize fragile items in packing', async () => {
    const items = [
      { productId: 'p1', sku: 'SKU1', quantity: 1, length: 10, width: 10, height: 10, weight: 1, fragile: true },
      { productId: 'p2', sku: 'SKU2', quantity: 1, length: 10, width: 10, height: 10, weight: 2, fragile: false },
    ];

    const result = await service.calculateOptimalPacking(items);

    // Fragile items should be on top (packed last)
    expect(result.boxes[0].items).toBeDefined();
  });

  it('should validate packing accuracy', async () => {
    const expected = [
      { sku: 'SKU1', quantity: 10 },
      { sku: 'SKU2', quantity: 5 },
    ];

    const scanned = [
      { sku: 'SKU1', quantity: 10 },
      { sku: 'SKU2', quantity: 5 },
    ];

    const result = await service.validatePacking({
      orderNumber: 'ORD-123',
      expectedItems: expected,
      scannedItems: scanned,
    });

    expect(result.isValid).toBe(true);
    expect(result.discrepancies.length).toBe(0);
  });

  it('should detect packing discrepancies', async () => {
    const expected = [
      { sku: 'SKU1', quantity: 10 },
    ];

    const scanned = [
      { sku: 'SKU1', quantity: 8 },
    ];

    const result = await service.validatePacking({
      orderNumber: 'ORD-123',
      expectedItems: expected,
      scannedItems: scanned,
    });

    expect(result.isValid).toBe(false);
    expect(result.discrepancies.length).toBe(1);
    expect(result.discrepancies[0].difference).toBe(-2);
  });
});

