import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('WMS Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Admin123!',
      });
    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Inventory Management', () => {
    let inventoryId: string;

    it('should create inventory item', () => {
      return request(app.getHttpServer())
        .post('/api/v1/wms/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: 'TEST-SKU-001',
          name: 'Test Product',
          quantity: 100,
          location: 'A1-B2-C3',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.sku).toBe('TEST-SKU-001');
          inventoryId = res.body.id;
        });
    });

    it('should get all inventory items', () => {
      return request(app.getHttpServer())
        .get('/api/v1/wms/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should get inventory by id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/wms/inventory/${inventoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(inventoryId);
        });
    });

    it('should update inventory', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/wms/inventory/${inventoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 150 })
        .expect(200)
        .expect((res) => {
          expect(res.body.quantity).toBe(150);
        });
    });

    it('should delete inventory', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/wms/inventory/${inventoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Receipt Management', () => {
    let receiptId: string;

    it('should create receipt', () => {
      return request(app.getHttpServer())
        .post('/api/v1/wms/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          poNumber: 'PO-001',
          supplier: 'Test Supplier',
          items: [],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.poNumber).toBe('PO-001');
          receiptId = res.body.id;
        });
    });

    it('should get all receipts', () => {
      return request(app.getHttpServer())
        .get('/api/v1/wms/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Pick Management', () => {
    let pickId: string;

    it('should create pick order', () => {
      return request(app.getHttpServer())
        .post('/api/v1/wms/picks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderNumber: 'ORD-001',
          items: [],
          priority: 'high',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.orderNumber).toBe('ORD-001');
          pickId = res.body.id;
        });
    });

    it('should get all picks', () => {
      return request(app.getHttpServer())
        .get('/api/v1/wms/picks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Shipment Management', () => {
    let shipmentId: string;

    it('should create shipment', () => {
      return request(app.getHttpServer())
        .post('/api/v1/wms/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: 'TRK-001',
          carrier: 'Test Carrier',
          items: [],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.trackingNumber).toBe('TRK-001');
          shipmentId = res.body.id;
        });
    });

    it('should get all shipments', () => {
      return request(app.getHttpServer())
        .get('/api/v1/wms/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
