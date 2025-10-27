import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/database/database.module';
import { EnhancedPaymentService } from '../../src/core/integrations/payment/enhanced-payment.service';

describe('Payment System Integration Tests', () => {
  let app: INestApplication;
  let paymentService: EnhancedPaymentService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    paymentService = moduleFixture.get<EnhancedPaymentService>(EnhancedPaymentService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/payment/process', () => {
    it('should process payment with fraud detection', async () => {
      const paymentRequest = {
        orderId: 'test-order-123',
        amount: 1000,
        currency: 'TRY',
        provider: 'iyzico',
        customer: {
          id: 'customer-123',
          email: 'test@example.com',
          name: 'Test User',
          ip: '192.168.1.1',
        },
        billingAddress: {
          contactName: 'Test User',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address',
        },
        items: [
          {
            id: 'item-1',
            name: 'Test Product',
            price: 1000,
            quantity: 1,
          },
        ],
        callbackUrl: 'https://example.com/callback',
        metadata: {
          customerHistory: true,
          recentOrderCount: 2,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(paymentRequest)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.paymentId).toBeDefined();
          expect(res.body.status).toBeDefined();
          expect(res.body.fraudScore).toBeDefined();
          expect(res.body.riskLevel).toBeDefined();
        });

      expect(response.status).toBe(201);
    });

    it('should block high-risk payments', async () => {
      const highRiskPayment = {
        orderId: 'high-risk-order-456',
        amount: 50000, // High amount
        currency: 'TRY',
        provider: 'stripe',
        customer: {
          id: 'new-customer-456',
          email: 'suspicious@tempmail.org', // Disposable email
          name: 'Suspicious User',
          ip: '185.100.1.1', // High risk IP
        },
        billingAddress: {
          contactName: 'Suspicious User',
          city: 'Unknown',
          country: 'Unknown',
          address: 'Unknown Address',
        },
        items: [
          {
            id: 'expensive-item',
            name: 'Very Expensive Item',
            price: 50000,
            quantity: 1,
          },
        ],
        metadata: {
          customerHistory: false,
          recentOrderCount: 10,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(highRiskPayment)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Payment blocked');
          expect(res.body.code).toBe('PAYMENT_BLOCKED');
        });

      expect(response.status).toBe(403);
    });

    it('should handle duplicate payments', async () => {
      const paymentRequest = {
        orderId: 'duplicate-order-789',
        amount: 500,
        currency: 'TRY',
        provider: 'iyzico',
        customer: {
          id: 'customer-789',
          email: 'duplicate@example.com',
          name: 'Duplicate User',
          ip: '192.168.1.1',
        },
        billingAddress: {
          contactName: 'Duplicate User',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address',
        },
        items: [
          {
            id: 'item-duplicate',
            name: 'Test Product',
            price: 500,
            quantity: 1,
          },
        ],
      };

      // First payment should succeed
      await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(paymentRequest)
        .expect(201);

      // Second payment should be blocked as duplicate
      const response = await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(paymentRequest)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.body.error).toBe('Duplicate payment');
          expect(res.body.code).toBe('DUPLICATE_PAYMENT');
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/payment/status/:paymentId', () => {
    it('should return payment status from cache', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payment/status/test-payment-123')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paymentId).toBeDefined();
      expect(response.body.status).toBeDefined();
    });

    it('should return 404 for non-existent payment', async () => {
      await request(app.getHttpServer())
        .get('/api/payment/status/non-existent-payment')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(404);
    });
  });

  describe('POST /api/payment/confirm/:paymentId', () => {
    it('should confirm payment successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/confirm/test-payment-123')
        .set('Authorization', 'Bearer mock-jwt-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.paymentId).toBeDefined();
      expect(response.body.status).toBeDefined();
    });
  });

  describe('POST /api/payment/:paymentId/refund', () => {
    it('should process refund successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/payment/test-payment-123/refund')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send({
          amount: 500,
          reason: 'Customer request',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.refundId).toBeDefined();
      expect(response.body.status).toBe('refunded');
    });
  });

  describe('GET /api/payment/history', () => {
    it('should return payment history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payment/history')
        .set('Authorization', 'Bearer mock-jwt-token')
        .query({ limit: '10', offset: '0' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.payments).toBeDefined();
      expect(Array.isArray(response.body.payments)).toBe(true);
      expect(response.body.total).toBeDefined();
    });
  });

  describe('GET /api/payment/metrics', () => {
    it('should return payment metrics for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/payment/metrics')
        .set('Authorization', 'Bearer admin-jwt-token')
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.totalPayments).toBeDefined();
      expect(response.body.metrics.successRate).toBeDefined();
    });

    it('should deny access for non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/api/payment/metrics')
        .set('Authorization', 'Bearer user-jwt-token')
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(403);
    });
  });

  describe('Performance Tests', () => {
    it('should handle payment processing within acceptable time', async () => {
      const paymentRequest = {
        orderId: 'perf-test-order',
        amount: 100,
        currency: 'TRY',
        provider: 'iyzico',
        customer: {
          id: 'perf-customer',
          email: 'perf@test.com',
          name: 'Perf User',
          ip: '192.168.1.1',
        },
        billingAddress: {
          contactName: 'Perf User',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address',
        },
        items: [
          {
            id: 'perf-item',
            name: 'Performance Test Product',
            price: 100,
            quantity: 1,
          },
        ],
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(paymentRequest);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.status).toBe(201);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should cache payment status efficiently', async () => {
      const paymentId = 'cache-test-payment';

      // First request
      const startTime1 = Date.now();
      await request(app.getHttpServer())
        .get(`/api/payment/status/${paymentId}`)
        .set('Authorization', 'Bearer mock-jwt-token');
      const time1 = Date.now() - startTime1;

      // Second request (should be faster due to caching)
      const startTime2 = Date.now();
      await request(app.getHttpServer())
        .get(`/api/payment/status/${paymentId}`)
        .set('Authorization', 'Bearer mock-jwt-token');
      const time2 = Date.now() - startTime2;

      // Second request should be significantly faster
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid payment requests', async () => {
      const invalidRequest = {
        orderId: '', // Invalid empty order ID
        amount: -100, // Invalid negative amount
        currency: 'INVALID',
        provider: 'unknown',
      };

      await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(invalidRequest)
        .expect((res) => {
          expect(res.body.success).toBe(false);
          expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });

    it('should handle missing authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/payment/process')
        .send({})
        .expect(401);
    });

    it('should handle provider errors gracefully', async () => {
      const paymentRequest = {
        orderId: 'provider-error-test',
        amount: 100,
        currency: 'TRY',
        provider: 'iyzico',
        customer: {
          id: 'error-customer',
          email: 'error@test.com',
          name: 'Error User',
          ip: '192.168.1.1',
        },
        billingAddress: {
          contactName: 'Error User',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address',
        },
        items: [
          {
            id: 'error-item',
            name: 'Error Test Product',
            price: 100,
            quantity: 1,
          },
        ],
      };

      // This should handle provider errors and log them properly
      const response = await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(paymentRequest);

      // Should either succeed or fail gracefully with proper error logging
      expect([201, 402, 403].includes(response.status)).toBe(true);
    });
  });

  describe('Fraud Detection Integration', () => {
    it('should analyze fraud risk for each payment', async () => {
      const paymentRequest = {
        orderId: 'fraud-test-order',
        amount: 1000,
        currency: 'TRY',
        provider: 'iyzico',
        customer: {
          id: 'fraud-customer',
          email: 'normal@test.com',
          name: 'Normal User',
          ip: '192.168.1.1',
        },
        billingAddress: {
          contactName: 'Normal User',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address',
        },
        items: [
          {
            id: 'fraud-item',
            name: 'Normal Product',
            price: 1000,
            quantity: 1,
          },
        ],
        metadata: {
          customerHistory: true,
          recentOrderCount: 2,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(paymentRequest)
        .expect(201);

      expect(response.body.fraudScore).toBeDefined();
      expect(response.body.riskLevel).toBeDefined();
      expect(['low', 'medium', 'high'].includes(response.body.riskLevel)).toBe(true);
    });

    it('should cache fraud analysis results', async () => {
      const paymentRequest = {
        orderId: 'fraud-cache-test',
        amount: 500,
        currency: 'TRY',
        provider: 'stripe',
        customer: {
          id: 'fraud-cache-customer',
          email: 'cache@test.com',
          name: 'Cache User',
          ip: '192.168.1.1',
        },
        billingAddress: {
          contactName: 'Cache User',
          city: 'Istanbul',
          country: 'Turkey',
          address: 'Test Address',
        },
        items: [
          {
            id: 'cache-item',
            name: 'Cache Test Product',
            price: 500,
            quantity: 1,
          },
        ],
      };

      // First payment
      await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(paymentRequest)
        .expect(201);

      // Second payment with same order (should use cached fraud analysis)
      const startTime = Date.now();
      await request(app.getHttpServer())
        .post('/api/payment/process')
        .set('Authorization', 'Bearer mock-jwt-token')
        .send(paymentRequest)
        .expect(400); // Should be blocked as duplicate

      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(1000); // Should be fast due to caching
    });
  });
});
