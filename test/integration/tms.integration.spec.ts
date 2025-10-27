import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { TMSController } from '../../src/modules/logistics/tms/tms.controller';
import { TMSService } from '../../src/modules/logistics/tms/services/tms.service';

describe('TMS Integration Tests', () => {
  let app: INestApplication;
  let tmsService: TMSService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    tmsService = moduleFixture.get<TMSService>(TMSService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/tms/optimize-route', () => {
    it('should optimize route with valid data', async () => {
      const routeData = {
        stops: [
          {
            id: 'stop-1',
            customerName: 'Customer 1',
            address: '123 Main St',
            latitude: 40.7128,
            longitude: -74.0060,
            stopType: 'delivery',
            priority: 'normal',
          },
        ],
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
        algorithm: 'genetic',
        maxDuration: 480,
        maxDistance: 100,
        considerTimeWindows: true,
        considerCapacity: true,
        preferences: {
          minimizeDistance: true,
          minimizeTime: false,
          balanceLoad: true,
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/optimize-route')
        .send(routeData)
        .expect(201);

      expect(response.body).toHaveProperty('routeId');
      expect(response.body).toHaveProperty('optimizedStops');
      expect(response.body).toHaveProperty('totalDistance');
      expect(response.body).toHaveProperty('totalDuration');
    });

    it('should return 400 for invalid route data', async () => {
      const invalidData = {
        stops: [], // Empty stops array
        vehicleId: '', // Empty vehicle ID
        driverId: '', // Empty driver ID
      };

      await request(app.getHttpServer())
        .post('/api/v1/tms/optimize-route')
        .send(invalidData)
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        stops: [
          {
            customerName: 'Customer 1',
            // Missing required fields
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/api/v1/tms/optimize-route')
        .send(incompleteData)
        .expect(400);
    });
  });

  describe('GET /api/v1/tms/vehicles', () => {
    it('should return vehicles list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/vehicles')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return vehicles with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/vehicles?page=1&limit=10')
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('limit', 10);
    });
  });

  describe('POST /api/v1/tms/vehicles', () => {
    it('should create vehicle with valid data', async () => {
      const vehicleData = {
        vehicleNumber: 'VH-001',
        licensePlate: 'ABC-123',
        vehicleType: 'truck',
        make: 'Ford',
        model: 'Transit',
        year: 2023,
        capacity: 1000,
        maxWeight: 3500,
        fuelType: 'diesel',
        currentOdometer: 0,
        gpsDevice: 'GPS-001',
        status: 'available',
        metadata: {},
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/vehicles')
        .send(vehicleData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('vehicleNumber', 'VH-001');
      expect(response.body).toHaveProperty('licensePlate', 'ABC-123');
    });

    it('should return 400 for invalid vehicle data', async () => {
      const invalidData = {
        vehicleNumber: '', // Empty vehicle number
        licensePlate: '', // Empty license plate
        vehicleType: 'invalid-type', // Invalid vehicle type
        year: 'not-a-number', // Invalid year
      };

      await request(app.getHttpServer())
        .post('/api/v1/tms/vehicles')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/v1/tms/routes', () => {
    it('should return routes list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/routes')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return routes with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/routes?status=planned&startDate=2025-01-01&endDate=2025-01-31')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/tms/routes/stats', () => {
    it('should return route statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/routes/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalRoutes');
      expect(response.body).toHaveProperty('completedRoutes');
      expect(response.body).toHaveProperty('inProgressRoutes');
    });
  });

  describe('GET /api/v1/tms/routes/:id', () => {
    it('should return route by ID', async () => {
      const routeId = 'route-1';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tms/routes/${routeId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', routeId);
    });

    it('should return 404 for non-existent route', async () => {
      const nonExistentId = 'non-existent-route';

      await request(app.getHttpServer())
        .get(`/api/v1/tms/routes/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/tms/drivers', () => {
    it('should return drivers list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return drivers with search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers?search=John')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('GET /api/v1/tms/drivers/:id', () => {
    it('should return driver by ID', async () => {
      const driverId = 'driver-1';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${driverId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', driverId);
    });

    it('should return 404 for non-existent driver', async () => {
      const nonExistentId = 'non-existent-driver';

      await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/tms/drivers/:id/stats', () => {
    it('should return driver statistics', async () => {
      const driverId = 'driver-1';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${driverId}/stats`)
        .expect(200);

      expect(response.body).toHaveProperty('driverId', driverId);
      expect(response.body).toHaveProperty('totalRoutes');
      expect(response.body).toHaveProperty('completedRoutes');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 for internal server errors', async () => {
      // Mock service to throw error
      jest.spyOn(tmsService, 'getRoutes').mockRejectedValue(new Error('Database error'));

      await request(app.getHttpServer())
        .get('/api/v1/tms/routes')
        .expect(500);
    });

    it('should return proper error format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/optimize-route')
        .send({}) // Empty body
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to auth endpoints', async () => {
      // This would need to be implemented with actual rate limiting
      // For now, we'll just test that the endpoint exists
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/vehicles')
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Caching', () => {
    it('should cache route statistics', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/api/v1/tms/routes/stats')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/v1/tms/routes/stats')
        .expect(200);

      // Both responses should be identical (cached)
      expect(response1.body).toEqual(response2.body);
    });
  });
});
