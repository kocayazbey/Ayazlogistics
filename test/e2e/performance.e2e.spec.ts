import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Performance E2E Tests', () => {
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

  describe('Response Time Tests', () => {
    it('should respond to health check within 100ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(100);
    });

    it('should respond to auth profile within 200ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(200);
    });

    it('should respond to inventory list within 500ms', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/wms/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Load Tests', () => {
    it('should handle 100 concurrent requests', async () => {
      const promises = Array.from({ length: 100 }, () =>
        request(app.getHttpServer())
          .get('/api/v1/health')
          .expect(200)
      );

      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      // Should handle 100 requests within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle multiple inventory queries', async () => {
      const promises = Array.from({ length: 50 }, () =>
        request(app.getHttpServer())
          .get('/api/v1/wms/inventory')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200)
      );

      const start = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - start;

      // Should handle 50 queries within 10 seconds
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Cache Performance', () => {
    it('should return cached data faster on second request', async () => {
      // First request (no cache)
      const start1 = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/wms/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration1 = Date.now() - start1;

      // Second request (cached)
      const start2 = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/wms/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration2 = Date.now() - start2;

      // Cached request should be faster
      expect(duration2).toBeLessThanOrEqual(duration1);
    });
  });

  describe('Database Query Performance', () => {
    it('should handle complex queries efficiently', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/wms/inventory?page=1&limit=100&sort=name')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;

      // Complex query should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle joins efficiently', async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get('/api/v1/wms/shipments?include=items,tracking')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      const duration = Date.now() - start;

      // Query with joins should complete within 1.5 seconds
      expect(duration).toBeLessThan(1500);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory on repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Make 1000 requests
      for (let i = 0; i < 1000; i++) {
        await request(app.getHttpServer())
          .get('/api/v1/health')
          .expect(200);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});
