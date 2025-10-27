import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../src/core/database/database.module';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';

describe('API Endpoints Integration Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    
    // Generate test token
    accessToken = jwtService.sign({
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      tenantId: 'test-tenant',
      warehouseId: 'test-warehouse',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication Endpoints', () => {
    it('POST /api/v1/auth/login - should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@ayazlogistics.com',
          password: 'admin123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
    });

    it('POST /api/v1/auth/login - should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('POST /api/v1/auth/register - should register new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          role: 'warehouse_worker',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('email', 'newuser@example.com');
    });

    it('GET /api/v1/auth/profile - should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('role');
    });
  });

  describe('WMS Endpoints', () => {
    it('GET /api/v1/wms/inventory - should get inventory list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/wms/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('POST /api/v1/wms/inventory - should create inventory item', async () => {
      const inventoryData = {
        sku: 'TEST-API-001',
        name: 'API Test Product',
        description: 'Product for API testing',
        category: 'Test',
        currentStock: 100,
        minStock: 10,
        maxStock: 500,
        unitCost: 25.50,
        location: 'A1-B2-C3',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/wms/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(inventoryData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('sku', inventoryData.sku);
    });

    it('GET /api/v1/wms/operations - should get operations list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/wms/operations')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'receiving', status: 'completed' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /api/v1/wms/operations/stats - should get operations statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/wms/operations/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalOperations');
      expect(response.body).toHaveProperty('completedOperations');
      expect(response.body).toHaveProperty('pendingOperations');
      expect(typeof response.body.totalOperations).toBe('number');
    });

    it('GET /api/v1/wms/zones - should get warehouse zones', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/wms/zones')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('TMS Endpoints', () => {
    it('GET /api/v1/tms/routes - should get routes list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/routes')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('items');
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('POST /api/v1/tms/routes - should create new route', async () => {
      const routeData = {
        routeNumber: 'ROUTE-API-001',
        vehicleId: 'vehicle-001',
        driverId: 'driver-001',
        routeDate: '2024-12-01',
        stops: [
          {
            address: 'Test Address 1',
            city: 'Test City',
            coordinates: { lat: 40.7128, lng: -74.0060 },
            order: 1,
          }
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/routes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(routeData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('AI Endpoints', () => {
    it('GET /api/v1/ai/churn-prediction/:customerId - should predict churn', async () => {
      const customerId = 'test-customer-id';
      
      const response = await request(app.getHttpServer())
        .get(`/api/v1/ai/churn-prediction/${customerId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('customerId');
      expect(response.body).toHaveProperty('probability');
      expect(response.body).toHaveProperty('riskLevel');
    });

    it('POST /api/v1/ai/fraud-detection - should detect fraud', async () => {
      const transactionData = {
        transactionId: 'test-transaction-id',
        amount: 1000,
        customerId: 'test-customer-id',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/fraud-detection')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(transactionData)
        .expect(200);

      expect(response.body).toHaveProperty('isFraud');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('riskScore');
    });

    it('POST /api/v1/ai/sentiment-analysis - should analyze sentiment', async () => {
      const feedbackData = {
        feedback: 'Great service, very satisfied with the delivery!',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/ai/sentiment-analysis')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(feedbackData)
        .expect(200);

      expect(response.body).toHaveProperty('sentiment');
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('topics');
      expect(response.body).toHaveProperty('urgency');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unauthorized requests', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/wms/inventory')
        .expect(401);
    });

    it('should return 400 for invalid request data', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/wms/inventory')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({}) // Empty data
        .expect(400);
    });

    it('should return 404 for non-existent endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/non-existent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting', async () => {
      const promises = [];
      
      // Make multiple requests to test rate limiting
      for (let i = 0; i < 100; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/api/v1/wms/inventory')
            .set('Authorization', `Bearer ${accessToken}`)
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
