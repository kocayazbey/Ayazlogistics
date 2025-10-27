import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Critical Business Paths (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Admin login
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@ayazlogistics.test',
        password: 'admin123',
      });
    
    adminToken = response.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Customer Onboarding Flow', () => {
    let customerId: string;

    it('1. should create new customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/crm/customers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Test Customer ${Date.now()}`,
          email: `customer${Date.now()}@test.com`,
          phone: '+905551234567',
          type: 'enterprise',
        })
        .expect(201);

      customerId = response.body.id;
      expect(customerId).toBeDefined();
    });

    it('2. should create billing contract', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/billing/contracts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customerId,
          billingModel: 'usage_based',
          startDate: new Date().toISOString(),
          currency: 'TRY',
        })
        .expect(201);

      expect(response.body).toHaveProperty('contractId');
    });

    it('3. should verify customer can be retrieved', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/crm/customers/${customerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(customerId);
        });
    });
  });

  describe('Shipment Lifecycle', () => {
    let shipmentId: string;

    it('1. should create shipment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/shipments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          origin: 'Istanbul',
          destination: 'Ankara',
          pickupDate: new Date().toISOString(),
          customerId: 'CUST_TEST',
        })
        .expect(201);

      shipmentId = response.body.id;
    });

    it('2. should update shipment status', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tms/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'in_transit',
          location: 'Izmit',
        })
        .expect(200);
    });

    it('3. should track shipment', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tracking/shipments/${shipmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe('in_transit');
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on auth endpoints', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: 'test@test.com',
            password: 'wrong',
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Security', () => {
    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/crm/customers')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/crm/customers')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});

