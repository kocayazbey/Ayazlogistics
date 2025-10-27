import { Test, TestingModule } from '@nestjs/testing';
import { RouteOptimizationService } from '../../src/modules/logistics/ayaz-tms/route-optimization/route-optimization.service';
import { DRIZZLE_ORM } from '../../src/core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../src/database/schema';

describe('RouteOptimizationService', () => {
  let service: RouteOptimizationService;
  let mockDb: jest.Mocked<PostgresJsDatabase<typeof schema>>;

  beforeEach(async () => {
    const mockDatabase = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      where: jest.fn(),
      from: jest.fn(),
      orderBy: jest.fn(),
      returning: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteOptimizationService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDatabase,
        },
      ],
    }).compile();

    service = module.get<RouteOptimizationService>(RouteOptimizationService);
    mockDb = module.get(DRIZZLE_ORM);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return routes for tenant', async () => {
      const mockRoutes = [
        {
          id: '1',
          routeNumber: 'RT-001',
          tenantId: 'tenant-1',
          status: 'planned',
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockRoutes),
      } as any);

      const result = await service.findAll('tenant-1');

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockRoutes);
    });

    it('should filter routes by status', async () => {
      const mockRoutes = [
        {
          id: '1',
          routeNumber: 'RT-001',
          tenantId: 'tenant-1',
          status: 'completed',
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockRoutes),
      } as any);

      const result = await service.findAll('tenant-1', { status: 'completed' });

      expect(mockDb.select).toHaveBeenCalled();
      expect(result).toEqual(mockRoutes);
    });
  });

  describe('optimizeRoute', () => {
    it('should optimize route successfully', async () => {
      const mockRoute = {
        id: '1',
        routeNumber: 'RT-001',
        tenantId: 'tenant-1',
        status: 'planned',
        totalDistance: 100,
        estimatedTime: 120,
        stops: [],
        createdAt: new Date(),
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ route: mockRoute }]),
      } as any);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.optimizeRoute('1', 'tenant-1');

      expect(result).toBeDefined();
      expect(result.originalDistance).toBe(100);
      expect(result.optimizedDistance).toBe(85); // 15% improvement
      expect(result.savings).toBeGreaterThan(0);
    });

    it('should throw error if route not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      } as any);

      await expect(service.optimizeRoute('1', 'tenant-1')).rejects.toThrow('Route not found');
    });
  });

  describe('getRouteMetrics', () => {
    it('should calculate route metrics correctly', async () => {
      const mockRoutes = [
        { id: '1', status: 'completed', tenantId: 'tenant-1' },
        { id: '2', status: 'in_progress', tenantId: 'tenant-1' },
        { id: '3', status: 'pending', tenantId: 'tenant-1' },
      ];

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockRoutes),
      } as any);

      const result = await service.getRouteMetrics('tenant-1');

      expect(result.total).toBe(3);
      expect(result.completed).toBe(1);
      expect(result.inProgress).toBe(1);
      expect(result.pending).toBe(1);
      expect(result.completionRate).toBeCloseTo(33.33, 1);
    });
  });
});
