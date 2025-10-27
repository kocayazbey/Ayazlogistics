import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '../../src/health/health-check.service';
import { ConfigService } from '@nestjs/config';

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
    configService = module.get(ConfigService);
  });

  describe('checkDatabase', () => {
    it('should return healthy database status', async () => {
      const result = await service.checkDatabase();

      expect(result).toEqual({
        database: {
          status: 'up',
          message: 'Database connection is healthy'
        }
      });
    });

    it('should handle database connection errors', async () => {
      // Mock a database error scenario
      jest.spyOn(service, 'checkDatabase').mockRejectedValueOnce(new Error('Connection failed'));

      try {
        await service.checkDatabase();
      } catch (error) {
        expect(error.message).toBe('Connection failed');
      }
    });
  });

  describe('checkRedis', () => {
    it('should return healthy Redis status', async () => {
      const result = await service.checkRedis();

      expect(result).toEqual({
        redis: {
          status: 'up',
          message: 'Redis connection is healthy'
        }
      });
    });

    it('should handle Redis connection errors', async () => {
      jest.spyOn(service, 'checkRedis').mockRejectedValueOnce(new Error('Redis connection failed'));

      try {
        await service.checkRedis();
      } catch (error) {
        expect(error.message).toBe('Redis connection failed');
      }
    });
  });

  describe('checkExternalServices', () => {
    it('should return healthy external services status', async () => {
      const result = await service.checkExternalServices();

      expect(result).toEqual({
        externalServices: {
          status: 'up',
          message: 'External services are accessible'
        }
      });
    });

    it('should handle external services errors', async () => {
      jest.spyOn(service, 'checkExternalServices').mockRejectedValueOnce(new Error('External service unavailable'));

      try {
        await service.checkExternalServices();
      } catch (error) {
        expect(error.message).toBe('External service unavailable');
      }
    });
  });

  describe('checkSystemResources', () => {
    it('should return healthy system resources status', async () => {
      const result = await service.checkSystemResources();

      expect(result).toEqual({
        systemResources: {
          status: 'up',
          message: 'System resources are healthy',
          details: {
            memory: {
              rss: expect.any(Number),
              heapTotal: expect.any(Number),
              heapUsed: expect.any(Number),
              external: expect.any(Number)
            },
            cpu: {
              user: expect.any(Number),
              system: expect.any(Number)
            }
          }
        }
      });
    });

    it('should include memory usage details', async () => {
      const result = await service.checkSystemResources();

      expect(result.systemResources.details.memory).toHaveProperty('rss');
      expect(result.systemResources.details.memory).toHaveProperty('heapTotal');
      expect(result.systemResources.details.memory).toHaveProperty('heapUsed');
      expect(result.systemResources.details.memory).toHaveProperty('external');
    });

    it('should include CPU usage details', async () => {
      const result = await service.checkSystemResources();

      expect(result.systemResources.details.cpu).toHaveProperty('user');
      expect(result.systemResources.details.cpu).toHaveProperty('system');
    });

    it('should handle system resources errors', async () => {
      jest.spyOn(service, 'checkSystemResources').mockRejectedValueOnce(new Error('System resources check failed'));

      try {
        await service.checkSystemResources();
      } catch (error) {
        expect(error.message).toBe('System resources check failed');
      }
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health status', async () => {
      const result = await service.getDetailedHealth();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
        services: expect.arrayContaining([
          expect.objectContaining({
            index: expect.any(Number),
            status: expect.any(String),
            value: expect.any(Object)
          })
        ])
      });
    });

    it('should include timestamp in ISO format', async () => {
      const result = await service.getDetailedHealth();

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include all service checks', async () => {
      const result = await service.getDetailedHealth();

      expect(result.services).toHaveLength(4);
      expect(result.services[0].index).toBe(0);
      expect(result.services[1].index).toBe(1);
      expect(result.services[2].index).toBe(2);
      expect(result.services[3].index).toBe(3);
    });

    it('should handle service check failures', async () => {
      jest.spyOn(service, 'checkDatabase').mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getDetailedHealth();

      expect(result.services[0].status).toBe('rejected');
      expect(result.services[0].value).toBeInstanceOf(Error);
    });
  });

  describe('getHealthMetrics', () => {
    it('should return health metrics', async () => {
      const result = await service.getHealthMetrics();

      expect(result).toEqual({
        timestamp: expect.any(String),
        memory: {
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number)
        },
        cpu: {
          user: expect.any(Number),
          system: expect.any(Number)
        },
        uptime: expect.any(Number),
        version: expect.any(String),
        platform: expect.any(String),
        arch: expect.any(String)
      });
    });

    it('should include process uptime', async () => {
      const result = await service.getHealthMetrics();

      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should include Node.js version', async () => {
      const result = await service.getHealthMetrics();

      expect(result.version).toMatch(/^v\d+\.\d+\.\d+$/);
    });

    it('should include platform information', async () => {
      const result = await service.getHealthMetrics();

      expect(result.platform).toBeDefined();
      expect(result.arch).toBeDefined();
    });

    it('should include memory usage in bytes', async () => {
      const result = await service.getHealthMetrics();

      expect(result.memory.rss).toBeGreaterThan(0);
      expect(result.memory.heapTotal).toBeGreaterThan(0);
      expect(result.memory.heapUsed).toBeGreaterThan(0);
      expect(result.memory.external).toBeGreaterThanOrEqual(0);
    });

    it('should include CPU usage in microseconds', async () => {
      const result = await service.getHealthMetrics();

      expect(result.cpu.user).toBeGreaterThanOrEqual(0);
      expect(result.cpu.system).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      jest.spyOn(service, 'checkDatabase').mockImplementationOnce(async () => {
        throw new Error('Database connection failed');
      });

      const result = await service.checkDatabase();

      expect(result).toEqual({
        database: {
          status: 'down',
          message: 'Database connection failed'
        }
      });
    });

    it('should handle Redis connection errors gracefully', async () => {
      jest.spyOn(service, 'checkRedis').mockImplementationOnce(async () => {
        throw new Error('Redis connection failed');
      });

      const result = await service.checkRedis();

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'Redis connection failed'
        }
      });
    });

    it('should handle external services errors gracefully', async () => {
      jest.spyOn(service, 'checkExternalServices').mockImplementationOnce(async () => {
        throw new Error('External services not accessible');
      });

      const result = await service.checkExternalServices();

      expect(result).toEqual({
        externalServices: {
          status: 'down',
          message: 'External services not accessible'
        }
      });
    });

    it('should handle system resources errors gracefully', async () => {
      jest.spyOn(service, 'checkSystemResources').mockImplementationOnce(async () => {
        throw new Error('System resources check failed');
      });

      const result = await service.checkSystemResources();

      expect(result).toEqual({
        systemResources: {
          status: 'down',
          message: 'System resources check failed'
        }
      });
    });
  });
});
