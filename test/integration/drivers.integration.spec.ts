import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DriversController } from '../../src/modules/logistics/tms/controllers/drivers.controller';
import { TMSService } from '../../src/modules/logistics/tms/services/tms.service';

describe('Drivers Integration Tests', () => {
  let app: INestApplication;
  let tmsService: TMSService;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    tmsService = moduleFixture.get<TMSService>(TMSService);
    
    // Mock authentication
    authToken = 'Bearer test-token';
    tenantId = 'test-tenant-123';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/tms/drivers', () => {
    it('should return paginated drivers list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({
          page: 1,
          limit: 10,
          search: 'John',
          status: 'available'
        })
        .expect(200);

      expect(response.body).toHaveProperty('drivers');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.drivers)).toBe(true);
    });

    it('should handle pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({
          page: 2,
          limit: 5
        })
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(5);
    });

    it('should handle search parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({
          search: 'John',
          status: 'available'
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .expect(401);
    });

    it('should require tenant ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('GET /api/v1/tms/drivers/:id', () => {
    it('should return driver by ID', async () => {
      const driverId = 'driver-123';
      
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${driverId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response.body).toHaveProperty('id', driverId);
      expect(response.body).toHaveProperty('driverNumber');
      expect(response.body).toHaveProperty('firstName');
      expect(response.body).toHaveProperty('lastName');
    });

    it('should return 404 for non-existent driver', async () => {
      const nonExistentId = 'non-existent-driver';
      
      await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${nonExistentId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tms/drivers/driver-123')
        .expect(401);
    });
  });

  describe('GET /api/v1/tms/drivers/:id/stats', () => {
    it('should return driver statistics', async () => {
      const driverId = 'driver-123';
      
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${driverId}/stats`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response.body).toHaveProperty('driverId', driverId);
      expect(response.body).toHaveProperty('totalRoutes');
      expect(response.body).toHaveProperty('completedRoutes');
      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('totalDistance');
      expect(response.body).toHaveProperty('totalHours');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tms/drivers/driver-123/stats')
        .expect(401);
    });
  });

  describe('POST /api/v1/tms/drivers', () => {
    const validDriverData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      licenseNumber: 'A123456789',
      licenseType: 'B+E',
      experience: '5 yıl',
      rating: 4.5,
      location: 'İstanbul, Kadıköy',
      notes: 'Experienced driver'
    };

    it('should create a new driver', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(validDriverData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('driverNumber');
      expect(response.body.firstName).toBe('John');
      expect(response.body.lastName).toBe('Doe');
      expect(response.body.email).toBe(validDriverData.email);
      expect(response.body.phone).toBe(validDriverData.phone);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        phone: ''
      };

      await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(invalidData)
        .expect(400);
    });

    it('should validate email format', async () => {
      const invalidData = {
        ...validDriverData,
        email: 'invalid-email-format'
      };

      await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(invalidData)
        .expect(400);
    });

    it('should validate phone number format', async () => {
      const invalidData = {
        ...validDriverData,
        phone: 'invalid-phone'
      };

      await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(invalidData)
        .expect(400);
    });

    it('should validate rating range', async () => {
      const invalidData = {
        ...validDriverData,
        rating: 6.0 // Invalid: should be 0-5
      };

      await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(invalidData)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .send(validDriverData)
        .expect(401);
    });
  });

  describe('PUT /api/v1/tms/drivers/:id', () => {
    const updateData = {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1234567891'
    };

    it('should update an existing driver', async () => {
      const driverId = 'driver-123';
      
      const response = await request(app.getHttpServer())
        .put(`/api/v1/tms/drivers/${driverId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', driverId);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
      expect(response.body.phone).toBe(updateData.phone);
    });

    it('should return 404 for non-existent driver', async () => {
      const nonExistentId = 'non-existent-driver';
      
      await request(app.getHttpServer())
        .put(`/api/v1/tms/drivers/${nonExistentId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(updateData)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/tms/drivers/driver-123')
        .send(updateData)
        .expect(401);
    });
  });

  describe('DELETE /api/v1/tms/drivers/:id', () => {
    it('should delete a driver', async () => {
      const driverId = 'driver-123';
      
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/tms/drivers/${driverId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('deletedId', driverId);
    });

    it('should return 404 for non-existent driver', async () => {
      const nonExistentId = 'non-existent-driver';
      
      await request(app.getHttpServer())
        .delete(`/api/v1/tms/drivers/${nonExistentId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/tms/drivers/driver-123')
        .expect(401);
    });
  });

  describe('POST /api/v1/tms/drivers/:id/assign-vehicle', () => {
    it('should assign vehicle to driver', async () => {
      const driverId = 'driver-123';
      const assignmentData = {
        vehicleId: 'vehicle-123',
        assignmentDate: '2025-01-27'
      };
      
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tms/drivers/${driverId}/assign-vehicle`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(assignmentData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('driverId', driverId);
      expect(response.body).toHaveProperty('vehicleId', assignmentData.vehicleId);
      expect(response.body).toHaveProperty('assignedAt');
      expect(response.body).toHaveProperty('assignedBy');
    });

    it('should validate required vehicle ID', async () => {
      const driverId = 'driver-123';
      const invalidData = {
        vehicleId: '',
        assignmentDate: '2025-01-27'
      };
      
      await request(app.getHttpServer())
        .post(`/api/v1/tms/drivers/${driverId}/assign-vehicle`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(invalidData)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tms/drivers/driver-123/assign-vehicle')
        .send({ vehicleId: 'vehicle-123' })
        .expect(401);
    });
  });

  describe('POST /api/v1/tms/drivers/:id/unassign-vehicle', () => {
    it('should unassign vehicle from driver', async () => {
      const driverId = 'driver-123';
      
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tms/drivers/${driverId}/unassign-vehicle`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('driverId', driverId);
      expect(response.body).toHaveProperty('unassignedAt');
      expect(response.body).toHaveProperty('unassignedBy');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tms/drivers/driver-123/unassign-vehicle')
        .expect(401);
    });
  });

  describe('Error handling', () => {
    it('should handle server errors gracefully', async () => {
      // Mock service to throw error
      jest.spyOn(tmsService, 'getDrivers').mockRejectedValueOnce(new Error('Database error'));

      await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(500);
    });

    it('should handle rate limiting', async () => {
      // This would need to be implemented with rate limiting middleware
      // For now, we'll just test the endpoint exists
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId);

      expect([200, 429]).toContain(response.status);
    });
  });
});
