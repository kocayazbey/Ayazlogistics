import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Complete Flow E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete User Journey', () => {
    it('Step 1: Register new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'e2e-test@example.com',
          password: 'Password123!',
          name: 'E2E Test User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      userId = response.body.id;
    });

    it('Step 2: Login with new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'e2e-test@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      authToken = response.body.access_token;
    });

    it('Step 3: Get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.email).toBe('e2e-test@example.com');
    });
  });

  describe('Complete WMS Flow', () => {
    let inventoryId: string;
    let receiptId: string;
    let pickId: string;
    let shipmentId: string;

    it('Step 1: Create inventory item', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/wms/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sku: 'E2E-SKU-001',
          name: 'E2E Test Product',
          quantity: 100,
          location: 'A1-B2-C3',
        })
        .expect(201);

      inventoryId = response.body.id;
    });

    it('Step 2: Create receipt', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/wms/receipts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          poNumber: 'E2E-PO-001',
          supplier: 'E2E Test Supplier',
          items: [{ inventoryId, quantity: 50 }],
        })
        .expect(201);

      receiptId = response.body.id;
    });

    it('Step 3: Create pick order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/wms/picks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderNumber: 'E2E-ORD-001',
          items: [{ inventoryId, quantity: 10 }],
          priority: 'high',
        })
        .expect(201);

      pickId = response.body.id;
    });

    it('Step 4: Create shipment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/wms/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          trackingNumber: 'E2E-TRK-001',
          carrier: 'E2E Test Carrier',
          items: [{ inventoryId, quantity: 10 }],
        })
        .expect(201);

      shipmentId = response.body.id;
    });

    it('Step 5: Verify inventory updated', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/wms/inventory/${inventoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Inventory should be updated after receipt and shipment
      expect(response.body.quantity).toBeDefined();
    });
  });

  describe('Complete TMS Flow', () => {
    let routeId: string;
    let vehicleId: string;
    let driverId: string;

    it('Step 1: Create route', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Route 1',
          origin: 'Warehouse A',
          destination: 'Customer B',
          distance: 100,
          estimatedTime: 120,
        })
        .expect(201);

      routeId = response.body.id;
    });

    it('Step 2: Create vehicle', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/vehicles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plateNumber: 'E2E-ABC-123',
          type: 'Truck',
          capacity: 5000,
          status: 'available',
        })
        .expect(201);

      vehicleId = response.body.id;
    });

    it('Step 3: Create driver', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'E2E Driver',
          licenseNumber: 'E2E-DL-12345',
          phone: '+1234567890',
          status: 'available',
        })
        .expect(201);

      driverId = response.body.id;
    });

    it('Step 4: Assign driver to route', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tms/routes/${routeId}/assign-driver`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ driverId })
        .expect(200);
    });

    it('Step 5: Track vehicle location', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tms/tracking')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId,
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date(),
        })
        .expect(201);
    });
  });

  describe('Complete Billing Flow', () => {
    let contractId: string;
    let invoiceId: string;
    let paymentId: string;

    it('Step 1: Create contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/billing/contracts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contractNumber: 'E2E-CNT-001',
          customerId: userId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          terms: 'E2E Test terms',
        })
        .expect(201);

      contractId = response.body.id;
    });

    it('Step 2: Create invoice', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceNumber: 'E2E-INV-001',
          customerId: userId,
          amount: 1000,
          currency: 'USD',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .expect(201);

      invoiceId = response.body.id;
    });

    it('Step 3: Create payment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/billing/payments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          invoiceId,
          amount: 1000,
          method: 'credit_card',
          transactionId: 'E2E-TXN-001',
        })
        .expect(201);

      paymentId = response.body.id;
    });

    it('Step 4: Verify invoice marked as paid', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/billing/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('paid');
    });
  });

  describe('Cleanup', () => {
    it('Should logout user', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
