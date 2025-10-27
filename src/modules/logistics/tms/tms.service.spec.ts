import { Test, TestingModule } from '@nestjs/testing';
import { TmsService } from './tms.service';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { TransactionManagerService } from '../../../core/database/transaction-manager.service';
import { QueryOptimizerService } from '../../../core/database/query-optimizer.service';
import { NotFoundException } from '@nestjs/common';

describe('TmsService', () => {
  let service: TmsService;
  let mockDb: any;
  let mockTransactionManager: any;
  let mockQueryOptimizer: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'test-route-id' }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    mockTransactionManager = {
      executeTenantTransaction: jest.fn(),
    };

    mockQueryOptimizer = {
      optimizeQuery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TmsService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
        {
          provide: TransactionManagerService,
          useValue: mockTransactionManager,
        },
        {
          provide: QueryOptimizerService,
          useValue: mockQueryOptimizer,
        },
      ],
    }).compile();

    service = module.get<TmsService>(TmsService);
  });

  describe('getRoutes', () => {
    it('should return routes with pagination', async () => {
      const mockRoutes = [
        { id: 'route-1', routeNumber: 'R001', status: 'planned' },
        { id: 'route-2', routeNumber: 'R002', status: 'in_progress' },
      ];

      mockQueryOptimizer.optimizeQuery.mockResolvedValue({
        items: mockRoutes,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });

      const result = await service.getRoutes({
        page: 1,
        limit: 10,
        tenantId: 'tenant-123',
      });

      expect(result).toEqual({
        items: mockRoutes,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          pages: 1,
        },
      });
      expect(mockQueryOptimizer.optimizeQuery).toHaveBeenCalled();
    });

    it('should filter routes by status', async () => {
      const mockRoutes = [{ id: 'route-1', status: 'planned' }];

      mockQueryOptimizer.optimizeQuery.mockResolvedValue({
        items: mockRoutes,
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      });

      await service.getRoutes({
        page: 1,
        limit: 10,
        status: 'planned',
        tenantId: 'tenant-123',
      });

      expect(mockQueryOptimizer.optimizeQuery).toHaveBeenCalled();
    });
  });

  describe('createRoute', () => {
    it('should create route with transaction', async () => {
      const routeData = {
        tenantId: 'tenant-123',
        routeNumber: 'R001',
        vehicleId: 'vehicle-123',
        driverId: 'driver-123',
        routeDate: '2024-01-15',
      };

      const mockRoute = { id: 'route-123', ...routeData };
      mockTransactionManager.executeTenantTransaction.mockResolvedValue(mockRoute);

      const result = await service.createRoute(routeData);

      expect(result).toEqual(mockRoute);
      expect(mockTransactionManager.executeTenantTransaction).toHaveBeenCalledWith(
        'tenant-123',
        expect.any(Function),
        expect.objectContaining({
          isolationLevel: 'READ_COMMITTED',
          timeout: 10000,
          metadata: { operation: 'createRoute' },
        })
      );
    });

    it('should throw NotFoundException when vehicle not found', async () => {
      const routeData = {
        tenantId: 'tenant-123',
        routeNumber: 'R001',
        vehicleId: 'invalid-vehicle',
        driverId: 'driver-123',
        routeDate: '2024-01-15',
      };

      mockTransactionManager.executeTenantTransaction.mockImplementation(
        async (tenantId, callback) => {
          // Mock vehicle not found scenario
          const mockTx = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]), // Empty result = not found
          };
          return callback(mockTx);
        }
      );

      await expect(service.createRoute(routeData)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getVehicles', () => {
    it('should return vehicles with pagination', async () => {
      const mockVehicles = [
        { id: 'vehicle-1', licensePlate: 'ABC-123', status: 'available' },
        { id: 'vehicle-2', licensePlate: 'XYZ-789', status: 'assigned' },
      ];

      const [vehiclesData, totalCount] = await Promise.all([
        Promise.resolve(mockVehicles),
        Promise.resolve([{ count: 2 }]),
      ]);

      mockDb.select.mockResolvedValue(vehiclesData);
      mockDb.select.mockResolvedValueOnce(vehiclesData).mockResolvedValueOnce([{ count: 2 }]);

      const result = await service.getVehicles({
        page: 1,
        limit: 10,
        tenantId: 'tenant-123',
      });

      expect(result.items).toEqual(mockVehicles);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('getDrivers', () => {
    it('should return drivers with pagination', async () => {
      const mockDrivers = [
        { id: 'driver-1', name: 'John Doe', status: 'active' },
        { id: 'driver-2', name: 'Jane Smith', status: 'active' },
      ];

      mockDb.select.mockResolvedValue(mockDrivers);
      mockDb.select.mockResolvedValueOnce(mockDrivers).mockResolvedValueOnce([{ count: 2 }]);

      const result = await service.getDrivers({
        page: 1,
        limit: 10,
        tenantId: 'tenant-123',
      });

      expect(result.items).toEqual(mockDrivers);
      expect(result.pagination.total).toBe(2);
    });
  });

  describe('getTracking', () => {
    it('should return GPS tracking data', async () => {
      const mockTracking = [
        {
          id: 'track-1',
          vehicleId: 'vehicle-123',
          latitude: 40.7128,
          longitude: -74.0060,
          timestamp: new Date(),
        },
      ];

      mockDb.select.mockResolvedValue(mockTracking);

      const result = await service.getTracking({
        page: 1,
        limit: 10,
        tenantId: 'tenant-123',
      });

      expect(result.items).toEqual(mockTracking);
    });
  });

  describe('startRoute', () => {
    it('should start route and update status', async () => {
      const routeId = 'route-123';
      const mockRoute = { id: routeId, status: 'planned' };

      mockDb.select.mockResolvedValue([mockRoute]);
      mockDb.update.mockResolvedValue([{ ...mockRoute, status: 'in_progress' }]);

      const result = await service.startRoute(routeId, 'tenant-123');

      expect(result.status).toBe('in_progress');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when route not found', async () => {
      const routeId = 'invalid-route';

      mockDb.select.mockResolvedValue([]);

      await expect(service.startRoute(routeId, 'tenant-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('completeRoute', () => {
    it('should complete route and update status', async () => {
      const routeId = 'route-123';
      const mockRoute = { id: routeId, status: 'in_progress' };

      mockDb.select.mockResolvedValue([mockRoute]);
      mockDb.update.mockResolvedValue([{ ...mockRoute, status: 'completed' }]);

      const result = await service.completeRoute(routeId, 'tenant-123');

      expect(result.status).toBe('completed');
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('getPerformanceAnalytics', () => {
    it('should return performance analytics', async () => {
      const mockAnalytics = {
        totalRoutes: 100,
        completedRoutes: 85,
        averageCompletionTime: 2.5,
        onTimeDelivery: 92.5,
      };

      mockDb.select.mockResolvedValue([mockAnalytics]);

      const result = await service.getPerformanceAnalytics('tenant-123');

      expect(result).toEqual(mockAnalytics);
  });
});

  describe('getFuelAnalytics', () => {
    it('should return fuel analytics', async () => {
      const mockAnalytics = {
        totalFuelConsumed: 1500.5,
        averageFuelEfficiency: 8.2,
        fuelCost: 4500.75,
        carbonEmissions: 3.2,
      };

      mockDb.select.mockResolvedValue([mockAnalytics]);

      const result = await service.getFuelAnalytics('tenant-123');

      expect(result).toEqual(mockAnalytics);
    });
  });
});