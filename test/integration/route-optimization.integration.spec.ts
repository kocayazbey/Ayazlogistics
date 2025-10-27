import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/database/database.module';
import { RouteOptimizationService } from '../../src/modules/logistics/ayaz-tms/route-optimization/route-optimization.service';

describe('Route Optimization Integration Tests', () => {
  let app: INestApplication;
  let routeOptimizationService: RouteOptimizationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    routeOptimizationService = moduleFixture.get<RouteOptimizationService>(RouteOptimizationService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/routes', () => {
    it('should return all routes for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/routes')
        .query({ tenantId: 'test-tenant' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter routes by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/routes')
        .query({ tenantId: 'test-tenant', status: 'completed' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);

      // Verify all returned routes have completed status
      if (response.body.length > 0) {
        response.body.forEach(route => {
          expect(route.status).toBe('completed');
        });
      }
    });

    it('should filter routes by vehicle', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/routes')
        .query({ tenantId: 'test-tenant', vehicleId: 'vehicle-1' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/routes/:id', () => {
    it('should return route details', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/routes/route-1')
        .query({ tenantId: 'test-tenant' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe('route-1');
      expect(response.body.stops).toBeDefined();
    });

    it('should return 404 for non-existent route', async () => {
      await request(app.getHttpServer())
        .get('/api/routes/non-existent')
        .query({ tenantId: 'test-tenant' })
        .expect(404);
    });
  });

  describe('POST /api/routes/:id/optimize', () => {
    it('should optimize route successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/routes/route-1/optimize')
        .query({ tenantId: 'test-tenant' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.originalDistance).toBeDefined();
      expect(response.body.optimizedDistance).toBeDefined();
      expect(response.body.savings).toBeGreaterThanOrEqual(0);
    });

    it('should return 404 for non-existent route', async () => {
      await request(app.getHttpServer())
        .post('/api/routes/non-existent/optimize')
        .query({ tenantId: 'test-tenant' })
        .expect(404);
    });
  });

  describe('GET /api/routes/metrics', () => {
    it('should return route metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/routes/metrics')
        .query({ tenantId: 'test-tenant' })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.total).toBeDefined();
      expect(response.body.completed).toBeDefined();
      expect(response.body.inProgress).toBeDefined();
      expect(response.body.pending).toBeDefined();
      expect(response.body.completionRate).toBeDefined();
      expect(typeof response.body.completionRate).toBe('number');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of routes efficiently', async () => {
      const startTime = Date.now();

      // Create multiple routes for performance testing
      for (let i = 0; i < 100; i++) {
        await routeOptimizationService.create({
          routeNumber: `RT-PERF-${i}`,
          tenantId: 'test-tenant',
          status: 'planned',
        }, 'test-tenant');
      }

      const response = await request(app.getHttpServer())
        .get('/api/routes')
        .query({ tenantId: 'test-tenant' })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.length).toBeGreaterThanOrEqual(100);
    });

    it('should cache optimization results', async () => {
      const startTime1 = Date.now();
      await request(app.getHttpServer())
        .post('/api/routes/route-1/optimize')
        .query({ tenantId: 'test-tenant' })
        .expect(200);
      const time1 = Date.now() - startTime1;

      const startTime2 = Date.now();
      await request(app.getHttpServer())
        .post('/api/routes/route-1/optimize')
        .query({ tenantId: 'test-tenant' })
        .expect(200);
      const time2 = Date.now() - startTime2;

      // Second call should be faster due to caching
      expect(time2).toBeLessThanOrEqual(time1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking database disconnection
      // For now, just verify the endpoint exists
      await request(app.getHttpServer())
        .get('/api/routes')
        .query({ tenantId: 'invalid-tenant' })
        .expect((res) => {
          // Should either return 200 with empty array or handle error appropriately
          expect(res.status).toBeLessThan(500);
        });
    });
  });
});
