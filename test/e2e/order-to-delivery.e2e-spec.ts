import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Order to Delivery Flow (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let customerId: string;
  let orderId: string;
  let shipmentId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin@ayazlogistics.com',
        password: 'Admin123!',
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Step 1: Customer Creation', () => {
    it('should create a new customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/crm/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Customer Ltd.',
          email: 'test@customer.com',
          phone: '+905551234567',
          address: 'Istanbul, Turkey',
          customerType: 'corporate',
        })
        .expect(201);

      customerId = response.body.id;
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Customer Ltd.');
    });
  });

  describe('Step 2: Order Creation', () => {
    it('should create a new order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId,
          orderDate: new Date().toISOString(),
          items: [
            {
              sku: 'TEST-SKU-001',
              quantity: 100,
              unitPrice: 50,
            },
          ],
          deliveryAddress: {
            street: 'Test Street 123',
            city: 'Istanbul',
            postalCode: '34000',
            country: 'Turkey',
          },
        })
        .expect(201);

      orderId = response.body.id;
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body.status).toBe('pending');
    });
  });

  describe('Step 3: Warehouse Operations', () => {
    it('should create picking order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/wms/picking-orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId,
          warehouseId: 'warehouse-1',
          priority: 'high',
        })
        .expect(201);

      expect(response.body).toHaveProperty('pickingNumber');
      expect(response.body.status).toBe('pending');
    });

    it('should pick items', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/wms/picking-orders/${orderId}/pick`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          items: [
            { sku: 'TEST-SKU-001', quantityPicked: 100, locationId: 'LOC-A-001' },
          ],
        })
        .expect(200);
    });

    it('should create shipment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/wms/shipments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId,
          warehouseId: 'warehouse-1',
          carrier: 'aras',
        })
        .expect(201);

      shipmentId = response.body.id;
      expect(response.body).toHaveProperty('trackingNumber');
    });
  });

  describe('Step 4: Route Optimization', () => {
    it('should optimize delivery route', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/routes/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shipments: [shipmentId],
          vehicleType: 'truck',
        })
        .expect(200);

      expect(response.body).toHaveProperty('optimizedRoute');
      expect(response.body.estimatedDistance).toBeGreaterThan(0);
    });
  });

  describe('Step 5: Vehicle Assignment', () => {
    it('should assign vehicle and driver', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tms/routes/assign')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          routeId: 'route-1',
          vehicleId: 'vehicle-1',
          driverId: 'driver-1',
        })
        .expect(200);
    });
  });

  describe('Step 6: Shipment Tracking', () => {
    it('should update vehicle location', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tracking/vehicles/location')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          vehicleId: 'vehicle-1',
          latitude: 41.0082,
          longitude: 28.9784,
          speed: 60,
          timestamp: new Date().toISOString(),
        })
        .expect(200);
    });

    it('should track shipment status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tracking/shipments/${shipmentId}/tracking`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('currentLocation');
    });
  });

  describe('Step 7: Delivery Confirmation', () => {
    it('should confirm delivery', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/shipments/${shipmentId}/deliver`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deliveredAt: new Date().toISOString(),
          recipientName: 'John Doe',
          signature: 'base64_signature_data',
        })
        .expect(200);
    });

    it('should update order status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('delivered');
    });
  });

  describe('Step 8: Billing', () => {
    it('should generate invoice', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/billing/invoices/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId,
          orderId,
        })
        .expect(201);

      invoiceId = response.body.id;
      expect(response.body).toHaveProperty('invoiceNumber');
      expect(response.body.amount).toBeGreaterThan(0);
    });

    it('should get invoice PDF', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/billing/invoices/${invoiceId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect('Content-Type', /pdf/);
    });
  });

  describe('Step 9: Analytics', () => {
    it('should update KPIs', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/kpis/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});

