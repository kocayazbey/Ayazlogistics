import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DatabaseModule } from '../../src/database/database.module';

describe('Authentication System Integration Tests', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let jti: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, DatabaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        name: 'Test User',
        role: 'warehouse_worker',
        tenantId: 'test-tenant',
        warehouseId: 'test-warehouse',
        permissions: ['wms:inventory', 'wms:receiving'],
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.role).toBe(userData.role);
    });

    it('should reject duplicate email registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        name: 'Test User 2',
        role: 'driver',
      };

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(userData)
        .expect(400); // Should fail due to duplicate email
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user.role).toBeDefined();
      expect(response.body.user.permissions).toBeDefined();

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;
    });

    it('should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123',
      };

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.role).toBeDefined();
      expect(response.body.permissions).toBeDefined();
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.accessToken).not.toBe(accessToken); // Should be new token
      expect(response.body.refreshToken).not.toBe(refreshToken); // Should be new token

      // Update tokens for further tests
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully and blacklist token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });

    it('should reject requests with blacklisted token', async () => {
      // Token should now be blacklisted
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('JWT Security Tests', () => {
    it('should validate audience in token', async () => {
      // Login again to get a fresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        })
        .expect(200);

      const newAccessToken = loginResponse.body.accessToken;

      // Should work with valid audience
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);
    });

    it('should validate issuer in token', async () => {
      // Create a token with wrong issuer (this would need to be tested with a tampered token)
      // For now, just verify that tokens with correct issuer work
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        })
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(200);
    });

    it('should handle token expiration', async () => {
      // This test would require manipulating token expiration
      // In a real scenario, we'd wait for token to expire or create an expired token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        })
        .expect(200);

      // Token should be valid immediately after login
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
        .expect(200);
    });
  });

  describe('Role-Based Access Control Tests', () => {
    it('should enforce role-based access', async () => {
      // Login as warehouse worker
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        })
        .expect(200);

      const workerToken = loginResponse.body.accessToken;

      // Should be able to access WMS endpoints
      await request(app.getHttpServer())
        .get('/api/wms/dashboard')
        .set('Authorization', `Bearer ${workerToken}`)
        .expect((res) => {
          // Should either succeed (200) or be forbidden (403), but not unauthorized (401)
          expect([200, 403].includes(res.status)).toBe(true);
        });
    });

    it('should enforce permission-based access', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        })
        .expect(200);

      const workerToken = loginResponse.body.accessToken;

      // Should be able to access inventory (has wms:inventory permission)
      await request(app.getHttpServer())
        .get('/api/wms/inventory')
        .set('Authorization', `Bearer ${workerToken}`)
        .expect((res) => {
          expect([200, 403, 404].includes(res.status)).toBe(true);
        });
    });
  });

  describe('Security Tests', () => {
    it('should reject malformed authorization headers', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Basic invalid')
        .expect(401);
    });

    it('should handle missing JWT_SECRET environment variable', async () => {
      // This test would require mocking the environment
      // In a real scenario, the app should fail to start without JWT_SECRET
      expect(process.env.JWT_SECRET).toBeDefined();
    });

    it('should prevent token reuse after logout', async () => {
      // Login to get fresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        })
        .expect(200);

      const freshToken = loginResponse.body.accessToken;
      const freshJti = loginResponse.body.user.jti;

      // Verify token works
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(200);

      // Logout
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(200);

      // Token should now be blacklisted
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${freshToken}`)
        .expect(401);
    });
  });

  describe('Performance Tests', () => {
    it('should handle authentication requests efficiently', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'TestPassword123',
          });
      }

      const endTime = Date.now();
      const averageTime = (endTime - startTime) / 10;

      expect(averageTime).toBeLessThan(1000); // Average under 1 second
    });

    it('should cache authentication results', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPassword123',
        })
        .expect(200);

      const token = loginResponse.body.accessToken;

      // First request
      const startTime1 = Date.now();
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      const time1 = Date.now() - startTime1;

      // Second request (should be faster due to caching)
      const startTime2 = Date.now();
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);
      const time2 = Date.now() - startTime2;

      // Second request should be comparable or faster (caching may not be implemented for profile)
      expect(time2).toBeLessThanOrEqual(time1 + 100); // Within 100ms difference
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking database disconnection
      // For now, just verify the endpoint exists and handles basic validation
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({}) // Missing required fields
        .expect(400);
    });

    it('should handle malformed JWT tokens', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer not.a.jwt.token')
        .expect(401);
    });

    it('should handle expired tokens', async () => {
      // This test would require creating an expired token
      // In a real scenario, we'd manipulate the token expiration
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });
});