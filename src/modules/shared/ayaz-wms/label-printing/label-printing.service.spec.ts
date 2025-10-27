import { Test, TestingModule } from '@nestjs/testing';
import { LabelPrintingService } from './label-printing.service';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('LabelPrintingService', () => {
  let service: LabelPrintingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelPrintingService,
        { provide: EventBusService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<LabelPrintingService>(LabelPrintingService);
  });

  it('should generate barcode', async () => {
    const result = await service.generateBarcode('1234567890123', 'EAN13');

    expect(result.barcode).toBe('1234567890123');
    expect(result.format).toBe('EAN13');
    expect(result.imageUrl).toBeDefined();
  });

  it('should generate shipping label', async () => {
    const data = {
      shipmentNumber: 'SHP-123',
      trackingNumber: 'TRK-123',
      carrier: 'Aras Kargo',
      shipFrom: { name: 'Warehouse', address: 'Address 1' },
      shipTo: { name: 'Customer', address: 'Address 2' },
      weight: 10,
      service: 'Express',
    };

    const result = await service.generateShippingLabel(data);

    expect(result.labelType).toBe('shipping');
    expect(result.labelUrl).toContain('https://');
  });

  it('should batch print multiple labels', async () => {
    const labels = [
      { type: 'shipping' as const, data: {} },
      { type: 'product' as const, data: { sku: 'SKU-1', productName: 'Product 1' } },
    ];

    const result = await service.batchPrintLabels(labels, 'PRINTER-01');

    expect(result.totalLabels).toBe(2);
    expect(result.labels.length).toBe(2);
  });
});

