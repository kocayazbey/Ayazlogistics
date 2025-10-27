import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import * as request from 'supertest';

export class TestHelper {
  private app: INestApplication;
  private moduleRef: TestingModule;

  constructor(private readonly AppModule: any) {}

  async setup(): Promise<void> {
    this.moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DB_HOST || 'localhost',
          port: parseInt(process.env.TEST_DB_PORT || '5432'),
          username: process.env.TEST_DB_USERNAME || 'postgres',
          password: process.env.TEST_DB_PASSWORD || 'postgres',
          database: process.env.TEST_DB_NAME || 'ayazlogistics_test',
          entities: [],
          synchronize: true, // Only for tests
          dropSchema: true, // Clean database for each test run
        }),
        JwtModule.register({
          global: true,
          secret: process.env.JWT_SECRET || 'test-secret',
          signOptions: { expiresIn: '24h' },
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        ThrottlerModule.forRoot({
          ttl: 60,
          limit: 10,
        }),
        ScheduleModule.forRoot(),
        EventEmitterModule.forRoot(),
        this.AppModule,
      ],
    }).compile();

    this.app = this.moduleRef.createNestApplication();
    await this.app.init();
  }

  async teardown(): Promise<void> {
    await this.app.close();
    await this.moduleRef.close();
  }

  getApp(): INestApplication {
    return this.app;
  }

  getModuleRef(): TestingModule {
    return this.moduleRef;
  }

  async makeRequest(method: 'get' | 'post' | 'put' | 'delete', url: string, data?: any): Promise<request.Response> {
    const agent = request(this.app.getHttpServer());

    switch (method) {
      case 'get':
        return agent.get(url);
      case 'post':
        return agent.post(url).send(data);
      case 'put':
        return agent.put(url).send(data);
      case 'delete':
        return agent.delete(url);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }

  async makeAuthenticatedRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    token: string,
    data?: any,
  ): Promise<request.Response> {
    const agent = request(this.app.getHttpServer());

    switch (method) {
      case 'get':
        return agent.get(url).set('Authorization', `Bearer ${token}`);
      case 'post':
        return agent.post(url).set('Authorization', `Bearer ${token}`).send(data);
      case 'put':
        return agent.put(url).set('Authorization', `Bearer ${token}`).send(data);
      case 'delete':
        return agent.delete(url).set('Authorization', `Bearer ${token}`);
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
  }
}

// Test Data Factories
export class TestDataFactory {
  static createUser(overrides: Partial<any> = {}) {
    return {
      email: faker.internet.email(),
      password: faker.internet.password(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      role: faker.helpers.arrayElement(['admin', 'user', 'customer', 'driver']),
      isActive: true,
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      ...overrides,
    };
  }

  static createTenant(overrides: Partial<any> = {}) {
    return {
      name: faker.company.name(),
      code: faker.string.alphanumeric(10).toUpperCase(),
      domain: faker.internet.domainName(),
      status: 'active',
      settings: {
        timezone: 'Europe/Istanbul',
        currency: 'TRY',
        language: 'tr',
      },
      ...overrides,
    };
  }

  static createCustomer(overrides: Partial<any> = {}) {
    return {
      customerNumber: faker.string.alphanumeric(10).toUpperCase(),
      name: faker.company.name(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      company: faker.company.name(),
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      country: 'Türkiye',
      postalCode: faker.location.zipCode(),
      type: faker.helpers.arrayElement(['individual', 'business']),
      status: 'active',
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      ...overrides,
    };
  }

  static createOrder(overrides: Partial<any> = {}) {
    return {
      orderNumber: `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
      customerId: '550e8400-e29b-41d4-a716-446655440200',
      orderDate: faker.date.recent(),
      status: faker.helpers.arrayElement(['pending', 'confirmed', 'processing', 'shipped', 'delivered']),
      totalAmount: faker.number.float({ min: 100, max: 10000, multipleOf: 0.01 }),
      currency: 'TRY',
      shippingAddress: faker.location.streetAddress(),
      notes: faker.lorem.sentence(),
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      ...overrides,
    };
  }

  static createShipment(overrides: Partial<any> = {}) {
    return {
      trackingNumber: `TRK-${faker.string.alphanumeric(10).toUpperCase()}`,
      orderId: '550e8400-e29b-41d4-a716-446655440400',
      status: faker.helpers.arrayElement(['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered']),
      weight: faker.number.float({ min: 1, max: 100, multipleOf: 0.1 }),
      dimensions: `${faker.number.int({ min: 10, max: 100 })}x${faker.number.int({ min: 10, max: 100 })}x${faker.number.int({ min: 10, max: 100 })}`,
      value: faker.number.float({ min: 100, max: 5000, multipleOf: 0.01 }),
      senderAddress: faker.location.streetAddress(),
      receiverAddress: faker.location.streetAddress(),
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      ...overrides,
    };
  }

  static createInventoryItem(overrides: Partial<any> = {}) {
    return {
      sku: faker.string.alphanumeric(10).toUpperCase(),
      name: faker.commerce.productName(),
      description: faker.lorem.sentence(),
      category: faker.commerce.department(),
      quantity: faker.number.int({ min: 0, max: 10000 }),
      minStockLevel: faker.number.int({ min: 10, max: 500 }),
      unitCost: faker.number.float({ min: 1, max: 1000, multipleOf: 0.01 }),
      warehouseLocation: `DEP-A-R${faker.number.int({ min: 1, max: 10 }).toString().padStart(2, '0')}-S${faker.number.int({ min: 1, max: 10 }).toString().padStart(2, '0')}`,
      supplier: faker.company.name(),
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      ...overrides,
    };
  }

  static createVehicle(overrides: Partial<any> = {}) {
    return {
      vehicleNumber: `VH-${faker.number.int({ min: 1, max: 999 }).toString().padStart(3, '0')}`,
      licensePlate: faker.string.alphanumeric(2).toUpperCase() + ' ' + faker.string.alphanumeric(3).toUpperCase() + ' ' + faker.number.int({ min: 100, max: 999 }),
      vehicleType: faker.helpers.arrayElement(['truck', 'van', 'car']),
      make: faker.vehicle.manufacturer(),
      model: faker.vehicle.model(),
      year: faker.number.int({ min: 2015, max: 2024 }),
      capacity: faker.number.float({ min: 1000, max: 25000, multipleOf: 100 }),
      maxWeight: faker.number.float({ min: 1000, max: 25000, multipleOf: 100 }),
      fuelType: faker.helpers.arrayElement(['diesel', 'gasoline', 'electric', 'hybrid']),
      status: faker.helpers.arrayElement(['available', 'in_use', 'maintenance']),
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      ...overrides,
    };
  }

  static createDriver(overrides: Partial<any> = {}) {
    return {
      driverNumber: `DRV-${faker.number.int({ min: 1, max: 999 }).toString().padStart(3, '0')}`,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phone: faker.phone.number(),
      email: faker.internet.email(),
      licenseNumber: `SRC-${faker.string.alphanumeric(9).toUpperCase()}`,
      licenseExpiry: faker.date.future(),
      status: faker.helpers.arrayElement(['available', 'busy', 'off_duty']),
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      ...overrides,
    };
  }

  static createWarehouse(overrides: Partial<any> = {}) {
    return {
      code: `DEP-${faker.string.alphanumeric(1).toUpperCase()}`,
      name: faker.company.name() + ' Deposu',
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      country: 'Türkiye',
      capacity: faker.number.int({ min: 10000, max: 100000 }),
      currentUtilization: faker.number.float({ min: 0, max: 1, multipleOf: 0.01 }),
      status: faker.helpers.arrayElement(['active', 'inactive', 'maintenance']),
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      ...overrides,
    };
  }

  static createTask(overrides: Partial<any> = {}) {
    return {
      taskType: faker.helpers.arrayElement(['picking', 'putaway', 'cycle_count', 'replenishment']),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      assignedTo: faker.string.uuid(),
      priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
      status: faker.helpers.arrayElement(['pending', 'in_progress', 'completed', 'cancelled']),
      location: `DEP-A-R${faker.number.int({ min: 1, max: 10 }).toString().padStart(2, '0')}`,
      estimatedDuration: faker.number.int({ min: 15, max: 180 }),
      tenantId: '550e8400-e29b-41d4-a716-446655440001',
      ...overrides,
    };
  }
}

// Test Authentication Helpers
export class TestAuthHelper {
  static createValidJWT(userId: string, role: string = 'user'): string {
    // In a real test, you would use JwtService to sign a token
    return `mock-jwt-token-${userId}-${role}-${Date.now()}`;
  }

  static createInvalidJWT(): string {
    return 'invalid.jwt.token';
  }

  static createExpiredJWT(): string {
    return 'expired.jwt.token';
  }

  static getAuthHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  static getBasicAuthHeaders(username: string, password: string): Record<string, string> {
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }
}

// Test Database Helpers
export class TestDatabaseHelper {
  static async clearDatabase(app: INestApplication): Promise<void> {
    // Clear all data while keeping schema
    const entities = [
      'orders', 'shipments', 'inventory_items', 'customers',
      'vehicles', 'drivers', 'routes', 'route_stops', 'gps_tracking',
      'users', 'tenants', 'audit_logs', 'notifications'
    ];

    for (const entity of entities) {
      await app.get('DatabaseConnection').query(`DELETE FROM ${entity}`);
    }
  }

  static async seedTestData(app: INestApplication): Promise<void> {
    // Create test tenant
    await app.get('DatabaseConnection').query(`
      INSERT INTO tenants (id, name, code, domain, status, settings, created_at, updated_at)
      VALUES ('550e8400-e29b-41d4-a716-446655440001', 'Test Tenant', 'TEST', 'test.com', 'active', '{}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    // Create test user
    await app.get('DatabaseConnection').query(`
      INSERT INTO users (id, tenant_id, email, password_hash, name, role, is_active, created_at, updated_at)
      VALUES ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001',
              'test@example.com', '$2b$10$test.hash', 'Test User', 'admin', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  }
}

// Mock Services for Testing
export class MockServices {
  static createMockDatabaseService() {
    return {
      findOne: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
      transaction: jest.fn(),
    };
  }

  static createMockCacheService() {
    return {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      getStats: jest.fn(),
    };
  }

  static createMockEventService() {
    return {
      emit: jest.fn(),
      emitAsync: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    };
  }

  static createMockLoggerService() {
    return {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };
  }
}

// Performance Testing Helpers
export class PerformanceTestHelper {
  static async measureExecutionTime<T>(
    operation: () => Promise<T>,
    operationName: string = 'operation',
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    const result = await operation();
    const duration = Date.now() - startTime;

    console.log(`[PERFORMANCE] ${operationName}: ${duration}ms`);

    return { result, duration };
  }

  static async runLoadTest<T>(
    operation: () => Promise<T>,
    iterations: number = 100,
    concurrency: number = 10,
  ): Promise<{
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    successCount: number;
    errorCount: number;
  }> {
    const results: number[] = [];
    let successCount = 0;
    let errorCount = 0;

    const startTime = Date.now();

    // Run operations in batches for concurrency control
    for (let i = 0; i < iterations; i += concurrency) {
      const batch = Array.from({ length: Math.min(concurrency, iterations - i) }, async (_, index) => {
        try {
          const { duration } = await this.measureExecutionTime(operation, `operation-${i + index}`);
          results.push(duration);
          successCount++;
        } catch (error) {
          errorCount++;
        }
      });

      await Promise.all(batch);
    }

    const totalDuration = Date.now() - startTime;
    const averageDuration = results.reduce((a, b) => a + b, 0) / results.length;
    const minDuration = Math.min(...results);
    const maxDuration = Math.max(...results);

    return {
      totalDuration,
      averageDuration,
      minDuration,
      maxDuration,
      successCount,
      errorCount,
    };
  }
}

// API Response Assertions
export class APIResponseAssertions {
  static expectSuccess(response: request.Response, expectedStatus: number = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', true);
  }

  static expectError(response: request.Response, expectedStatus: number, expectedMessage?: string): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    if (expectedMessage) {
      expect(response.body).toHaveProperty('message', expectedMessage);
    }
  }

  static expectValidationError(response: request.Response): void {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('errorCode', 'VALIDATION_ERROR');
  }

  static expectUnauthorized(response: request.Response): void {
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('success', false);
  }

  static expectForbidden(response: request.Response): void {
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('success', false);
  }

  static expectRateLimited(response: request.Response): void {
    expect(response.status).toBe(429);
    expect(response.body).toHaveProperty('success', false);
  }

  static expectPagination(response: request.Response): void {
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('pagination');
    expect(response.body.pagination).toHaveProperty('page');
    expect(response.body.pagination).toHaveProperty('limit');
    expect(response.body.pagination).toHaveProperty('total');
    expect(response.body.pagination).toHaveProperty('totalPages');
  }
}

// WebSocket Testing Helpers
export class WebSocketTestHelper {
  static createMockSocket() {
    return {
      id: faker.string.uuid(),
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
      rooms: new Set(),
      handshake: {
        headers: {},
        auth: {},
        query: {},
      },
    };
  }

  static createMockServer() {
    return {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      sockets: {
        sockets: new Map(),
      },
    };
  }
}

// File Upload Testing Helpers
export class FileUploadTestHelper {
  static createMockFile(overrides: Partial<any> = {}) {
    return {
      fieldname: 'file',
      originalname: faker.system.fileName(),
      encoding: '7bit',
      mimetype: faker.system.mimeType(),
      buffer: Buffer.from(faker.lorem.paragraph()),
      size: faker.number.int({ min: 1000, max: 10000000 }),
      ...overrides,
    };
  }

  static createMockMulterFile(overrides: Partial<any> = {}) {
    const file = this.createMockFile(overrides);
    return {
      ...file,
      filename: faker.system.fileName(),
      path: faker.system.filePath(),
      destination: faker.system.directoryPath(),
    };
  }
}
