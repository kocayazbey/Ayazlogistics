import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Drivers E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;
  let createdDriverId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Mock authentication - in real scenario, this would be obtained from login
    authToken = 'Bearer test-token';
    tenantId = 'test-tenant-123';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Driver Management Workflow', () => {
    it('should create, read, update, and delete a driver', async () => {
      // Step 1: Create a new driver
      const driverData = {
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

      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(driverData)
        .expect(201);

      expect(createResponse.body).toHaveProperty('id');
      expect(createResponse.body.firstName).toBe('John');
      expect(createResponse.body.lastName).toBe('Doe');
      expect(createResponse.body.email).toBe(driverData.email);
      expect(createResponse.body.phone).toBe(driverData.phone);

      createdDriverId = createResponse.body.id;

      // Step 2: Read the created driver
      const getResponse = await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${createdDriverId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(getResponse.body.id).toBe(createdDriverId);
      expect(getResponse.body.firstName).toBe('John');
      expect(getResponse.body.lastName).toBe('Doe');

      // Step 3: Get driver statistics
      const statsResponse = await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${createdDriverId}/stats`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(statsResponse.body).toHaveProperty('driverId', createdDriverId);
      expect(statsResponse.body).toHaveProperty('totalRoutes');
      expect(statsResponse.body).toHaveProperty('completedRoutes');
      expect(statsResponse.body).toHaveProperty('averageRating');

      // Step 4: Update the driver
      const updateData = {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1234567891'
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/api/v1/tms/drivers/${createdDriverId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.id).toBe(createdDriverId);
      expect(updateResponse.body.name).toBe(updateData.name);
      expect(updateResponse.body.email).toBe(updateData.email);
      expect(updateResponse.body.phone).toBe(updateData.phone);

      // Step 5: Assign vehicle to driver
      const assignmentData = {
        vehicleId: 'vehicle-123',
        assignmentDate: '2025-01-27'
      };

      const assignResponse = await request(app.getHttpServer())
        .post(`/api/v1/tms/drivers/${createdDriverId}/assign-vehicle`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(assignmentData)
        .expect(200);

      expect(assignResponse.body).toHaveProperty('success', true);
      expect(assignResponse.body).toHaveProperty('driverId', createdDriverId);
      expect(assignResponse.body).toHaveProperty('vehicleId', assignmentData.vehicleId);

      // Step 6: Unassign vehicle from driver
      const unassignResponse = await request(app.getHttpServer())
        .post(`/api/v1/tms/drivers/${createdDriverId}/unassign-vehicle`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(unassignResponse.body).toHaveProperty('success', true);
      expect(unassignResponse.body).toHaveProperty('driverId', createdDriverId);

      // Step 7: Delete the driver
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/api/v1/tms/drivers/${createdDriverId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('success', true);
      expect(deleteResponse.body).toHaveProperty('deletedId', createdDriverId);

      // Step 8: Verify driver is deleted
      await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${createdDriverId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(404);
    });
  });

  describe('Driver List Management', () => {
    let testDriverIds: string[] = [];

    beforeAll(async () => {
      // Create test drivers
      const drivers = [
        {
          name: 'Alice Johnson',
          email: 'alice.johnson@example.com',
          phone: '+1234567890',
          licenseNumber: 'A123456789',
          licenseType: 'B+E',
          experience: '3 yıl',
          rating: 4.2,
          location: 'İstanbul, Beşiktaş'
        },
        {
          name: 'Bob Smith',
          email: 'bob.smith@example.com',
          phone: '+1234567891',
          licenseNumber: 'A123456790',
          licenseType: 'C',
          experience: '7 yıl',
          rating: 4.8,
          location: 'Ankara, Çankaya'
        },
        {
          name: 'Charlie Brown',
          email: 'charlie.brown@example.com',
          phone: '+1234567892',
          licenseNumber: 'A123456791',
          licenseType: 'B+E',
          experience: '2 yıl',
          rating: 3.9,
          location: 'İzmir, Konak'
        }
      ];

      for (const driverData of drivers) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/tms/drivers')
          .set('Authorization', authToken)
          .set('X-Tenant-ID', tenantId)
          .send(driverData)
          .expect(201);

        testDriverIds.push(response.body.id);
      }
    });

    afterAll(async () => {
      // Clean up test drivers
      for (const driverId of testDriverIds) {
        await request(app.getHttpServer())
          .delete(`/api/v1/tms/drivers/${driverId}`)
          .set('Authorization', authToken)
          .set('X-Tenant-ID', tenantId);
      }
    });

    it('should list all drivers with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('drivers');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.drivers)).toBe(true);
      expect(response.body.drivers.length).toBeGreaterThanOrEqual(3);
    });

    it('should search drivers by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ search: 'Alice' })
        .expect(200);

      expect(response.body.drivers.length).toBeGreaterThan(0);
      expect(response.body.drivers[0].firstName).toContain('Alice');
    });

    it('should filter drivers by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ status: 'available' })
        .expect(200);

      expect(response.body.drivers.length).toBeGreaterThan(0);
      response.body.drivers.forEach((driver: any) => {
        expect(driver.status).toBe('available');
      });
    });

    it('should sort drivers by rating', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ sortBy: 'rating', sortOrder: 'desc' })
        .expect(200);

      expect(response.body.drivers.length).toBeGreaterThan(1);
      
      // Verify sorting (ratings should be in descending order)
      for (let i = 1; i < response.body.drivers.length; i++) {
        expect(response.body.drivers[i-1].rating).toBeGreaterThanOrEqual(
          response.body.drivers[i].rating
        );
      }
    });

    it('should handle pagination correctly', async () => {
      // First page
      const firstPageResponse = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(firstPageResponse.body.page).toBe(1);
      expect(firstPageResponse.body.limit).toBe(2);
      expect(firstPageResponse.body.drivers.length).toBeLessThanOrEqual(2);

      // Second page
      const secondPageResponse = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ page: 2, limit: 2 })
        .expect(200);

      expect(secondPageResponse.body.page).toBe(2);
      expect(secondPageResponse.body.limit).toBe(2);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid driver data', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        phone: 'invalid-phone',
        rating: 6.0 // Invalid rating
      };

      await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(invalidData)
        .expect(400);
    });

    it('should handle non-existent driver operations', async () => {
      const nonExistentId = 'non-existent-driver-123';

      // Try to get non-existent driver
      await request(app.getHttpServer())
        .get(`/api/v1/tms/drivers/${nonExistentId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(404);

      // Try to update non-existent driver
      await request(app.getHttpServer())
        .put(`/api/v1/tms/drivers/${nonExistentId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send({ name: 'Updated Name' })
        .expect(404);

      // Try to delete non-existent driver
      await request(app.getHttpServer())
        .delete(`/api/v1/tms/drivers/${nonExistentId}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(404);
    });

    it('should handle unauthorized access', async () => {
      // Try to access without authentication
      await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .expect(401);

      await request(app.getHttpServer())
        .post('/api/v1/tms/drivers')
        .send({ name: 'Test Driver' })
        .expect(401);
    });

    it('should handle missing tenant ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .expect(400);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of drivers efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/api/v1/tms/drivers')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ limit: 100 })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Response should be fast (less than 1 second)
      expect(responseTime).toBeLessThan(1000);
      expect(response.body.drivers).toBeDefined();
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/api/v1/tms/drivers')
            .set('Authorization', authToken)
            .set('X-Tenant-ID', tenantId)
            .query({ page: 1, limit: 10 })
        );
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('drivers');
      });
    });
  });
});
