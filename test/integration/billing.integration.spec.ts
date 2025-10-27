import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Billing Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;
  let contractId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Create test user and get auth token
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `billing${Date.now()}@ayazlogistics.com`,
        password: 'TestPassword123!',
        firstName: 'Billing',
        lastName: 'Test',
        tenantId: 'billing-test-tenant',
      });

    tenantId = registerRes.body.tenantId;

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: registerRes.body.email,
        password: 'TestPassword123!',
      });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/billing/contracts', () => {
    it('should create a billing contract', () => {
      return request(app.getHttpServer())
        .post('/api/v1/billing/contracts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customerId: 'CUST-001',
          contractNumber: `CONTRACT-${Date.now()}`,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          billingModel: 'monthly',
          currency: 'TRY',
          rates: [
            {
              rateType: 'storage',
              rateName: 'Pallet Storage',
              rateAmount: '10.50',
              unitOfMeasure: 'pallet/day',
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('contractNumber');
          contractId = res.body.id;
        });
    });
  });

  describe('GET /api/v1/billing/contracts', () => {
    it('should list billing contracts', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/contracts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('POST /api/v1/billing/calculate-price', () => {
    it('should calculate price with volume discount', () => {
      return request(app.getHttpServer())
        .post('/api/v1/billing/calculate-price')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contractId,
          serviceType: 'storage',
          quantity: 1000,
          usageDate: new Date().toISOString(),
          distance: 250,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalAmount');
          expect(res.body).toHaveProperty('volumeDiscount');
          expect(res.body).toHaveProperty('fuelSurcharge');
          expect(res.body.volumeDiscount).toBeGreaterThan(0);
        });
    });

    it('should calculate price with peak season surcharge', () => {
      const december = new Date();
      december.setMonth(11);

      return request(app.getHttpServer())
        .post('/api/v1/billing/calculate-price')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contractId,
          serviceType: 'storage',
          quantity: 100,
          usageDate: december.toISOString(),
          isPeakSeason: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('peakSeasonSurcharge');
          expect(res.body.peakSeasonSurcharge).toBeGreaterThan(0);
        });
    });
  });

  describe('POST /api/v1/billing/generate-invoice', () => {
    it('should generate monthly invoice', () => {
      const now = new Date();
      
      return request(app.getHttpServer())
        .post('/api/v1/billing/generate-invoice')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          contractId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('invoiceNumber');
          expect(res.body).toHaveProperty('totalAmount');
          expect(res.body).toHaveProperty('lineItems');
          invoiceId = res.body.id;
        });
    });
  });

  describe('GET /api/v1/billing/invoices/:id', () => {
    it('should get invoice by ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/billing/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('invoiceNumber');
          expect(res.body).toHaveProperty('lineItems');
        });
    });
  });

  describe('GET /api/v1/billing/invoices', () => {
    it('should list invoices with pagination', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });

    it('should filter invoices by status', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/invoices')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'draft' })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });
  });

  describe('Authorization', () => {
    it('should reject unauthorized access', () => {
      return request(app.getHttpServer())
        .get('/api/v1/billing/contracts')
        .expect(401);
    });

    it('should reject access to other tenant data', async () => {
      const otherTenantRes = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: `other${Date.now()}@ayazlogistics.com`,
          password: 'TestPassword123!',
          firstName: 'Other',
          lastName: 'Tenant',
          tenantId: 'other-tenant',
        });

      const otherLoginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: otherTenantRes.body.email,
          password: 'TestPassword123!',
        });

      return request(app.getHttpServer())
        .get(`/api/v1/billing/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${otherLoginRes.body.accessToken}`)
        .expect(403);
    });
  });
});

