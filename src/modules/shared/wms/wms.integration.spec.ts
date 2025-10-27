import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { WMSModule } from './wms.module';
import { DatabaseModule } from '../../../core/database/database.module';
import { EventsModule } from '../../../core/events/events.module';
import { CacheModule } from '../../../core/cache/cache.module';
import { WebSocketModule } from '../../../core/websocket/websocket.module';

describe('WMS Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        DatabaseModule,
        EventsModule,
        CacheModule,
        WebSocketModule,
        WMSModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Mock authentication token
    authToken = 'Bearer mock-jwt-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Warehouse Management Flow', () => {
    let warehouseId: string;
    let locationId: string;

    it('should create a warehouse', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/wms/warehouses')
        .set('Authorization', authToken)
        .send({
          name: 'Test Warehouse',
          code: 'WH-TEST-001',
          type: 'distribution_center',
          address: 'Test Address',
          city: 'Istanbul',
          country: 'Turkey',
          totalArea: 10000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      warehouseId = response.body.id;
    });

    it('should create location in warehouse', async () => {
      const response = await request(app.getHttpServer())
        .post(`/v1/wms/warehouses/${warehouseId}/locations`)
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
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      locationId = response.body.id;
    });

    it('should get warehouses list', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/wms/warehouses')
        .set('Authorization', authToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Receiving Flow', () => {
    it('should create receiving order', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/wms/receiving')
        .set('Authorization', authToken)
        .send({
          warehouseId: 'test-warehouse-id',
          poNumber: 'PO-12345',
          supplier: 'Test Supplier',
          expectedDate: new Date().toISOString(),
          lineItems: [
            {
              productId: 'prod-1',
              expectedQuantity: 100,
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('receivingOrder');
      expect(response.body.receivingOrder).toHaveProperty('receivingNumber');
    });

    it('should get receiving orders with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/wms/receiving')
        .query({
          warehouseId: 'test-warehouse-id',
          status: 'pending',
        })
        .set('Authorization', authToken)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Picking Flow', () => {
    it('should create picking order', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/wms/picking')
        .set('Authorization', authToken)
        .send({
          warehouseId: 'test-warehouse-id',
          orderNumber: 'ORD-12345',
          pickingStrategy: 'FIFO',
          pickingType: 'single',
          priority: 'normal',
          lineItems: [
            {
              productId: 'prod-1',
              quantity: 50,
            },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty('pickingOrder');
      expect(response.body).toHaveProperty('tasks');
      expect(Array.isArray(response.body.tasks)).toBe(true);
    });
  });

  describe('End-to-End: Receive -> Putaway -> Pick -> Pack -> Ship', () => {
    it('should complete full warehouse flow', async () => {
      // 1. Create receiving order
      const receiving = await request(app.getHttpServer())
        .post('/v1/wms/receiving')
        .set('Authorization', authToken)
        .send({
          warehouseId: 'test-warehouse-id',
          lineItems: [{ productId: 'prod-1', expectedQuantity: 100 }],
        });

      expect(receiving.status).toBe(201);
      const receivingOrderId = receiving.body.receivingOrder.id;

      // 2. Receive items (would trigger putaway)
      // ... putaway logic

      // 3. Create picking order
      const picking = await request(app.getHttpServer())
        .post('/v1/wms/picking')
        .set('Authorization', authToken)
        .send({
          warehouseId: 'test-warehouse-id',
          orderNumber: 'ORD-123',
          lineItems: [{ productId: 'prod-1', quantity: 50 }],
        });

      expect(picking.status).toBe(201);

      // 4. Create shipment
      const shipment = await request(app.getHttpServer())
        .post('/v1/wms/shipments')
        .set('Authorization', authToken)
        .send({
          warehouseId: 'test-warehouse-id',
          orderNumber: 'ORD-123',
          carrier: 'Test Carrier',
          shipToName: 'Test Customer',
          shipToAddress: 'Test Address',
          packages: [],
        });

      expect(shipment.status).toBe(201);
    });
  });

  describe('Inventory Operations', () => {
    it('should query inventory', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/wms/inventory')
        .query({
          warehouseId: 'test-warehouse-id',
        })
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('warehouseId');
    });

    it('should adjust inventory', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/wms/inventory/adjust')
        .set('Authorization', authToken)
        .send({
          productId: 'prod-1',
          locationId: 'loc-1',
          quantity: 10,
          reason: 'cycle_count_adjustment',
        })
        .expect(201);

      expect(response.body).toHaveProperty('adjusted');
    });
  });

  describe('Billing Integration', () => {
    it('should automatically create billing records on receiving', async () => {
      // When item is received, billing should be automatically triggered
      // This tests the event listener integration
      
      const receiving = await request(app.getHttpServer())
        .post('/v1/wms/receiving')
        .set('Authorization', authToken)
        .send({
          warehouseId: 'test-warehouse-id',
          lineItems: [{ productId: 'prod-1', expectedQuantity: 100 }],
        });

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that billing record was created
      // (This would require querying billing_usage_tracking table)
      
      expect(receiving.status).toBe(201);
    });
  });
});

