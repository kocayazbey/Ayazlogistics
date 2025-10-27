import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../src/health/health.controller';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthCheckService as CustomHealthCheckService } from '../../src/health/health-check.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let customHealthCheckService: jest.Mocked<CustomHealthCheckService>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn()
    };

    const mockCustomHealthCheckService = {
      checkDatabase: jest.fn(),
      checkRedis: jest.fn(),
      checkExternalServices: jest.fn(),
      checkSystemResources: jest.fn(),
      getDetailedHealth: jest.fn(),
      getHealthMetrics: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService
        },
        {
          provide: CustomHealthCheckService,
          useValue: mockCustomHealthCheckService
        }
      ]
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    customHealthCheckService = module.get(CustomHealthCheckService);
  });

  describe('check', () => {
    it('should return health check results', async () => {
      const mockHealthResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
          externalServices: { status: 'up' },
          systemResources: { status: 'up' }
        },
        error: {},
        details: {
          database: { status: 'up' },
          redis: { status: 'up' },
          externalServices: { status: 'up' },
          systemResources: { status: 'up' }
        }
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      ]);
    });

    it('should handle health check failures', async () => {
      const mockHealthResult = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Connection failed' }
        },
        details: {
          database: { status: 'down', message: 'Connection failed' }
        }
      };

      healthCheckService.check.mockResolvedValue(mockHealthResult);

      const result = await controller.check();

      expect(result).toEqual(mockHealthResult);
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health status', async () => {
      const mockDetailedHealth = {
        status: 'ok',
        timestamp: '2025-01-27T10:30:00.000Z',
        services: [
          { index: 0, status: 'fulfilled', value: { database: { status: 'up' } } },
          { index: 1, status: 'fulfilled', value: { redis: { status: 'up' } } },
          { index: 2, status: 'fulfilled', value: { externalServices: { status: 'up' } } },
          { index: 3, status: 'fulfilled', value: { systemResources: { status: 'up' } } }
        ]
      };

      customHealthCheckService.getDetailedHealth.mockResolvedValue(mockDetailedHealth);

      const result = await controller.getDetailedHealth();

      expect(result).toEqual(mockDetailedHealth);
      expect(customHealthCheckService.getDetailedHealth).toHaveBeenCalled();
    });

    it('should handle service failures in detailed health', async () => {
      const mockDetailedHealth = {
        status: 'ok',
        timestamp: '2025-01-27T10:30:00.000Z',
        services: [
          { index: 0, status: 'rejected', value: new Error('Database connection failed') },
          { index: 1, status: 'fulfilled', value: { redis: { status: 'up' } } },
          { index: 2, status: 'fulfilled', value: { externalServices: { status: 'up' } } },
          { index: 3, status: 'fulfilled', value: { systemResources: { status: 'up' } } }
        ]
      };

      customHealthCheckService.getDetailedHealth.mockResolvedValue(mockDetailedHealth);

      const result = await controller.getDetailedHealth();

      expect(result).toEqual(mockDetailedHealth);
      expect(result.services[0].status).toBe('rejected');
    });
  });

  describe('getHealthMetrics', () => {
    it('should return health metrics', async () => {
      const mockMetrics = {
        timestamp: '2025-01-27T10:30:00.000Z',
        memory: {
          rss: 123456789,
          heapTotal: 987654321,
          heapUsed: 456789123,
          external: 12345678
        },
        cpu: {
          user: 1234567,
          system: 2345678
        },
        uptime: 3600,
        version: 'v18.17.0',
        platform: 'win32',
        arch: 'x64'
      };

      customHealthCheckService.getHealthMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getHealthMetrics();

      expect(result).toEqual(mockMetrics);
      expect(customHealthCheckService.getHealthMetrics).toHaveBeenCalled();
    });

    it('should include all required metrics', async () => {
      const mockMetrics = {
        timestamp: '2025-01-27T10:30:00.000Z',
        memory: {
          rss: 123456789,
          heapTotal: 987654321,
          heapUsed: 456789123,
          external: 12345678
        },
        cpu: {
          user: 1234567,
          system: 2345678
        },
        uptime: 3600,
        version: 'v18.17.0',
        platform: 'win32',
        arch: 'x64'
      };

      customHealthCheckService.getHealthMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getHealthMetrics();

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('cpu');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('arch');
    });
  });

  describe('error handling', () => {
    it('should handle health check service errors', async () => {
      healthCheckService.check.mockRejectedValue(new Error('Health check failed'));

      await expect(controller.check()).rejects.toThrow('Health check failed');
    });

    it('should handle detailed health service errors', async () => {
      customHealthCheckService.getDetailedHealth.mockRejectedValue(new Error('Detailed health check failed'));

      await expect(controller.getDetailedHealth()).rejects.toThrow('Detailed health check failed');
    });

    it('should handle metrics service errors', async () => {
      customHealthCheckService.getHealthMetrics.mockRejectedValue(new Error('Metrics retrieval failed'));

      await expect(controller.getHealthMetrics()).rejects.toThrow('Metrics retrieval failed');
    });
  });
});
