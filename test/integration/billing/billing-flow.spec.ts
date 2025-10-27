import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Billing Flow (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Login to get token
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@ayazlogistics.test',
        password: 'admin123',
      });
    
    accessToken = response.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Usage-Based Billing', () => {
    it('should record usage', () => {
      return request(app.getHttpServer())
        .post('/api/billing/usage/record')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contractId: 'CONTRACT_TEST',
          serviceType: 'storage',
          quantity: 100,
          unit: 'pallet',
          usageDate: new Date().toISOString(),
        })
        .expect(201);
    });

    it('should get usage stats', () => {
      return request(app.getHttpServer())
        .get('/api/billing/usage/CONTRACT_TEST/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          startDate: new Date('2025-01-01').toISOString(),
          endDate: new Date('2025-01-31').toISOString(),
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalQuantity');
        });
    });
  });

  describe('Price Calculation', () => {
    it('should calculate service price', () => {
      return request(app.getHttpServer())
        .post('/api/v1/billing/calculate-price')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contractId: 'CONTRACT_TEST',
          serviceType: 'storage',
          quantity: 100,
          usageDate: new Date().toISOString(),
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalCost');
        });
    });
  });
});

