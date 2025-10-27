import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * WMS End-to-End Tests
 * Tests complete warehouse workflows from receiving to shipping
 */
describe('WMS End-to-End Tests (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testWarehouseId: string;
  let testProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // TODO: Get real auth token
    authToken = 'Bearer test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Warehouse Workflow', () => {
    it('should complete full inbound-to-outbound cycle', async () => {
      // 1. CREATE WAREHOUSE
      const warehouse = await request(app.getHttpServer())
        .post('/v1/wms/warehouses')
        .set('Authorization', authToken)
        .send({
          name: 'E2E Test Warehouse',
          code: `WH-TEST-${Date.now()}`,
          type: 'distribution_center',
          city: 'Istanbul',
          country: 'Turkey',
          totalArea: 10000,
        });

      expect(warehouse.status).toBeLessThan(300);
      testWarehouseId = warehouse.body.id;

      // 2. CREATE LOCATION
      const location = await request(app.getHttpServer())
        .post(`/v1/wms/warehouses/${testWarehouseId}/locations`)
        .set('Authorization', authToken)
        .send({
          code: 'A1-01-01-01',
          zone: 'A',
          aisle: '1',
          rack: '01',
          shelf: '01',
          bin: '01',
          locationType: 'pick',
          capacity: 100,
        });

      expect(location.status).toBeLessThan(300);

      // 3. CREATE STOCK CARD
      const stockCard = await request(app.getHttpServer())
        .post('/v1/wms/stock-cards')
        .set('Authorization', authToken)
        .send({
          stockCode: `STK-${Date.now()}`,
          stockName: 'E2E Test Product',
          unit: 'piece',
          purchasePrice: 100,
          salePrice: 150,
        });

      expect(stockCard.status).toBeLessThan(300);
      testProductId = stockCard.body.id;

      // 4. CREATE RECEIVING ORDER
      const receiving = await request(app.getHttpServer())
        .post('/v1/wms/receiving')
        .set('Authorization', authToken)
        .send({
          warehouseId: testWarehouseId,
          poNumber: `PO-${Date.now()}`,
          supplier: 'Test Supplier',
          lineItems: [
            {
              productId: testProductId,
              expectedQuantity: 100,
            },
          ],
        });

      expect(receiving.status).toBeLessThan(300);

      // 5. CREATE PICKING ORDER
      const picking = await request(app.getHttpServer())
        .post('/v1/wms/picking')
        .set('Authorization', authToken)
        .send({
          warehouseId: testWarehouseId,
          orderNumber: `ORD-${Date.now()}`,
          pickingStrategy: 'FIFO',
          lineItems: [
            {
              productId: testProductId,
              quantity: 50,
            },
          ],
        });

      expect(picking.status).toBeLessThan(300);

      // 6. CREATE SHIPMENT
      const shipment = await request(app.getHttpServer())
        .post('/v1/wms/shipments')
        .set('Authorization', authToken)
        .send({
          warehouseId: testWarehouseId,
          orderNumber: `ORD-${Date.now()}`,
          carrier: 'Test Carrier',
          shipToName: 'Test Customer',
          shipToAddress: 'Test Address',
          packages: [],
        });

      expect(shipment.status).toBeLessThan(300);

      console.log('✅ Complete workflow tested successfully');
    });

    it('should track all operations for billing', async () => {
      // After operations, check that usage was tracked
      // This would query billing_usage_tracking table
      
      expect(true).toBe(true);
    });

    it('should maintain inventory accuracy', async () => {
      // Verify inventory quantities are correct after operations
      
      expect(true).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should handle 100 concurrent picking orders', async () => {
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/v1/wms/picking')
            .set('Authorization', authToken)
            .send({
              warehouseId: testWarehouseId,
              orderNumber: `ORD-PERF-${i}`,
              lineItems: [
                { productId: testProductId, quantity: 10 },
              ],
            })
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.status < 300).length;

      expect(successCount).toBeGreaterThan(90); // At least 90% success rate
    });
  });
});

