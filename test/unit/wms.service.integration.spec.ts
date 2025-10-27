import { Test, TestingModule } from '@nestjs/testing';
import { WmsService } from '../../src/modules/shared/wms/wms.service';
import { DatabaseModule } from '../../src/core/database/database.module';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DRIZZLE_ORM } from '../../src/core/database/database.constants';
import { ConfigModule } from '@nestjs/config';

describe('WmsService Integration Tests', () => {
  let service: WmsService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseModule,
      ],
      providers: [
        WmsService,
        EventEmitter2,
      ],
    }).compile();

    service = module.get<WmsService>(WmsService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Inventory Management - Real Database', () => {
    it('should create inventory item with real database', async () => {
      const inventoryData = {
        sku: 'TEST-SKU-INTEGRATION-001',
        name: 'Integration Test Product',
        description: 'Test product for integration testing',
        category: 'Test',
        supplier: 'Test Supplier',
        currentStock: 100,
        minStock: 10,
        maxStock: 500,
        unitCost: 25.50,
        unitPrice: 35.00,
        location: 'A1-B2-C3',
      };

      const result = await service.createInventory(inventoryData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.sku).toBe(inventoryData.sku);
      expect(result.data.name).toBe(inventoryData.name);
      expect(result.data.currentStock).toBe(inventoryData.currentStock);
    });

    it('should get inventory items with real database', async () => {
      const params = {
        page: 1,
        limit: 10,
        search: 'TEST-SKU-INTEGRATION',
      };

      const result = await service.getInventory(params);
      
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('should filter inventory by category', async () => {
      const params = {
        page: 1,
        limit: 10,
        category: 'Test',
      };

      const result = await service.getInventory(params);
      
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      if (result.items.length > 0) {
        expect(result.items[0].category).toBe('Test');
      }
    });

    it('should filter inventory by status', async () => {
      const params = {
        page: 1,
        limit: 10,
        status: 'available',
      };

      const result = await service.getInventory(params);
      
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      if (result.items.length > 0) {
        expect(result.items[0].status).toBe('available');
      }
    });
  });

  describe('Receipt Management - Real Database', () => {
    it('should create receipt with real database', async () => {
      const receiptData = {
        receiptNumber: 'REC-INTEGRATION-001',
        supplier: 'Integration Test Supplier',
        items: [
          {
            sku: 'TEST-SKU-INTEGRATION-001',
            quantity: 50,
            unitCost: 25.50,
          }
        ],
        totalValue: 1275.00,
      };

      const result = await service.createReceipt(receiptData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.receiptNumber).toBe(receiptData.receiptNumber);
    });

    it('should get receipts with real database', async () => {
      const params = {
        page: 1,
        limit: 10,
        status: 'pending',
      };

      const result = await service.getReceipts(params);
      
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.pagination).toBeDefined();
    });
  });

  describe('Pick Management - Real Database', () => {
    it('should create pick order with real database', async () => {
      const pickData = {
        pickNumber: 'PICK-INTEGRATION-001',
        orderId: 'ORD-INTEGRATION-001',
        customer: 'Integration Test Customer',
        items: [
          {
            sku: 'TEST-SKU-INTEGRATION-001',
            quantity: 10,
            location: 'A1-B2-C3',
          }
        ],
        priority: 'high',
        assignedTo: null,
      };

      const result = await service.createPick(pickData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.pickNumber).toBe(pickData.pickNumber);
    });

    it('should get picks with real database', async () => {
      const params = {
        page: 1,
        limit: 10,
        status: 'pending',
      };

      const result = await service.getPicks(params);
      
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.pagination).toBeDefined();
    });

    it('should start pick operation', async () => {
      const pickId = 'test-pick-id';
      
      const result = await service.startPick(pickId);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(pickId);
      expect(result.data.status).toBe('in_progress');
    });

    it('should complete pick operation', async () => {
      const pickId = 'test-pick-id';
      
      const result = await service.completePick(pickId);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(pickId);
      expect(result.data.status).toBe('completed');
    });
  });

  describe('Shipment Management - Real Database', () => {
    it('should create shipment with real database', async () => {
      const shipmentData = {
        shipmentNumber: 'SHP-INTEGRATION-001',
        orderId: 'ORD-INTEGRATION-001',
        customer: 'Integration Test Customer',
        items: [
          {
            sku: 'TEST-SKU-INTEGRATION-001',
            quantity: 10,
            weight: 5.5,
            dimensions: { length: 10, width: 10, height: 10 },
          }
        ],
        destination: 'Test City',
        carrier: 'Test Carrier',
        priority: 'high',
      };

      const result = await service.createShipment(shipmentData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.shipmentNumber).toBe(shipmentData.shipmentNumber);
    });

    it('should get shipments with real database', async () => {
      const params = {
        page: 1,
        limit: 10,
        status: 'pending',
      };

      const result = await service.getShipments(params);
      
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.pagination).toBeDefined();
    });

    it('should dispatch shipment', async () => {
      const shipmentId = 'test-shipment-id';
      
      const result = await service.dispatchShipment(shipmentId);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(shipmentId);
      expect(result.data.status).toBe('dispatched');
    });
  });

  describe('Operations Management - Real Database', () => {
    it('should get operations with real database', async () => {
      const params = {
        type: 'receiving',
        status: 'completed',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      };

      const result = await service.getOperations(params);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should get operations stats', async () => {
      const result = await service.getOperationsStats();
      
      expect(result).toBeDefined();
      expect(result.totalOperations).toBeDefined();
      expect(result.completedOperations).toBeDefined();
      expect(result.pendingOperations).toBeDefined();
      expect(result.inProgressOperations).toBeDefined();
      expect(typeof result.totalOperations).toBe('number');
    });
  });

  describe('Zone Management - Real Database', () => {
    it('should get zones', async () => {
      const result = await service.getZones();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('code');
        expect(result[0]).toHaveProperty('capacity');
      }
    });

    it('should get zone capacity', async () => {
      const zoneId = 'test-zone-id';
      
      const result = await service.getZoneCapacity(zoneId);
      
      expect(result).toBeDefined();
      expect(result.zone).toBeDefined();
      expect(result.capacity).toBeDefined();
      expect(result.zone.id).toBe(zoneId);
      expect(result.capacity.totalCapacity).toBeDefined();
      expect(result.capacity.usedCapacity).toBeDefined();
      expect(result.capacity.availableCapacity).toBeDefined();
    });
  });
});
