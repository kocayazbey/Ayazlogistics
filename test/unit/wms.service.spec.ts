import { Test, TestingModule } from '@nestjs/testing';
import { WmsService } from '../../src/modules/shared/wms/wms.service';

describe('WmsService', () => {
  let service: WmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WmsService],
    }).compile();

    service = module.get<WmsService>(WmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Inventory Management', () => {
    it('should create inventory item', async () => {
      const inventoryData = {
        sku: 'TEST-SKU-001',
        name: 'Test Product',
        quantity: 100,
        location: 'A1-B2-C3',
      };

      const result = await service.createInventory(inventoryData);
      expect(result).toBeDefined();
      expect(result.sku).toBe(inventoryData.sku);
    });

    it('should get all inventory items', async () => {
      const result = await service.getAllInventory();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get inventory by id', async () => {
      const id = '1';
      const result = await service.getInventoryById(id);
      expect(result).toBeDefined();
    });

    it('should update inventory', async () => {
      const id = '1';
      const updateData = { quantity: 150 };
      const result = await service.updateInventory(id, updateData);
      expect(result).toBeDefined();
    });

    it('should delete inventory', async () => {
      const id = '1';
      const result = await service.deleteInventory(id);
      expect(result).toBeDefined();
    });
  });

  describe('Receipt Management', () => {
    it('should create receipt', async () => {
      const receiptData = {
        poNumber: 'PO-001',
        supplier: 'Test Supplier',
        items: [],
      };

      const result = await service.createReceipt(receiptData);
      expect(result).toBeDefined();
      expect(result.poNumber).toBe(receiptData.poNumber);
    });

    it('should get all receipts', async () => {
      const result = await service.getAllReceipts();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Pick Management', () => {
    it('should create pick order', async () => {
      const pickData = {
        orderNumber: 'ORD-001',
        items: [],
        priority: 'high',
      };

      const result = await service.createPick(pickData);
      expect(result).toBeDefined();
      expect(result.orderNumber).toBe(pickData.orderNumber);
    });

    it('should get all picks', async () => {
      const result = await service.getAllPicks();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Shipment Management', () => {
    it('should create shipment', async () => {
      const shipmentData = {
        trackingNumber: 'TRK-001',
        carrier: 'Test Carrier',
        items: [],
      };

      const result = await service.createShipment(shipmentData);
      expect(result).toBeDefined();
      expect(result.trackingNumber).toBe(shipmentData.trackingNumber);
    });

    it('should get all shipments', async () => {
      const result = await service.getAllShipments();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
