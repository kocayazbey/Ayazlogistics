import { Test, TestingModule } from '@nestjs/testing';
import { TMSService } from '../../src/modules/logistics/tms/services/tms.service';
import { PaginationService } from '../../src/common/services/pagination.service';
import { QueryBuilderService } from '../../src/common/services/query-builder.service';

describe('TMSService', () => {
  let service: TMSService;
  let paginationService: jest.Mocked<PaginationService>;
  let queryBuilderService: jest.Mocked<QueryBuilderService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockDriver = {
    id: 'driver-123',
    driverNumber: 'DRV-001',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    status: 'available',
    rating: 4.5,
    totalRoutes: 10,
    completedRoutes: 9,
    totalDistance: 5000,
    totalHours: 200,
    metadata: {},
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  };

  const mockRoute = {
    id: 'route-123',
    routeNumber: 'ROUTE-001',
    status: 'planned',
    totalDistance: 100,
    totalStops: 5,
    stops: []
  };

  beforeEach(async () => {
    const mockPaginationService = {
      validatePagination: jest.fn(),
      createPaginatedResponse: jest.fn()
    };

    const mockQueryBuilderService = {
      buildQuery: jest.fn(),
      executeQuery: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TMSService,
        {
          provide: PaginationService,
          useValue: mockPaginationService
        },
        {
          provide: QueryBuilderService,
          useValue: mockQueryBuilderService
        }
      ]
    }).compile();

    service = module.get<TMSService>(TMSService);
    paginationService = module.get(PaginationService);
    queryBuilderService = module.get(QueryBuilderService);
  });

  describe('getRoutes', () => {
    it('should return paginated routes', async () => {
      const mockFilters = { page: 1, limit: 10 };
      const mockPagination = { page: 1, limit: 10 };
      const mockResponse = {
        routes: [mockRoute],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      paginationService.validatePagination.mockReturnValue(mockPagination);
      paginationService.createPaginatedResponse.mockReturnValue(mockResponse);

      const result = await service.getRoutes(mockTenantId, mockFilters);

      expect(result).toEqual(mockResponse);
      expect(paginationService.validatePagination).toHaveBeenCalledWith(mockFilters);
      expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith([], 0, mockFilters);
    });

    it('should handle empty results', async () => {
      const mockFilters = { page: 1, limit: 10 };
      const mockPagination = { page: 1, limit: 10 };
      const mockResponse = {
        routes: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      };

      paginationService.validatePagination.mockReturnValue(mockPagination);
      paginationService.createPaginatedResponse.mockReturnValue(mockResponse);

      const result = await service.getRoutes(mockTenantId, mockFilters);

      expect(result.routes).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getRouteStats', () => {
    it('should return route statistics', async () => {
      const result = await service.getRouteStats(mockTenantId);

      expect(result).toEqual({
        totalRoutes: 0,
        completedRoutes: 0,
        inProgressRoutes: 0,
        averageDistance: 0,
        averageDuration: 0
      });
    });
  });

  describe('getRouteById', () => {
    it('should return route by id', async () => {
      const routeId = 'route-123';
      const result = await service.getRouteById(routeId, mockTenantId);

      expect(result).toEqual({
        id: routeId,
        routeNumber: 'ROUTE-001',
        status: 'planned',
        totalDistance: 0,
        totalStops: 0,
        stops: []
      });
    });

    it('should throw error when routeId is missing', async () => {
      await expect(
        service.getRouteById('', mockTenantId)
      ).rejects.toThrow('Route ID is required');
    });
  });

  describe('getDrivers', () => {
    it('should return paginated drivers', async () => {
      const mockQuery = { page: 1, limit: 10 };
      const mockPagination = { page: 1, limit: 10 };
      const mockResponse = {
        drivers: [mockDriver],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      paginationService.validatePagination.mockReturnValue(mockPagination);
      paginationService.createPaginatedResponse.mockReturnValue(mockResponse);

      const result = await service.getDrivers(mockTenantId, mockQuery);

      expect(result).toEqual(mockResponse);
      expect(paginationService.validatePagination).toHaveBeenCalledWith(mockQuery);
      expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith([], 0, mockPagination);
    });
  });

  describe('getDriverById', () => {
    it('should return driver by id', async () => {
      const driverId = 'driver-123';
      const result = await service.getDriverById(driverId, mockTenantId);

      expect(result).toEqual({
        id: driverId,
        driverNumber: 'DRV-001',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        status: 'available',
        recentRoutes: []
      });
    });

    it('should throw error when driverId is missing', async () => {
      await expect(
        service.getDriverById('', mockTenantId)
      ).rejects.toThrow('Driver ID is required');
    });
  });

  describe('getDriverStats', () => {
    it('should return driver statistics', async () => {
      const driverId = 'driver-123';
      const result = await service.getDriverStats(driverId, mockTenantId);

      expect(result).toEqual({
        driverId,
        totalRoutes: 0,
        completedRoutes: 0,
        averageRating: 0,
        totalDistance: 0,
        totalHours: 0
      });
    });

    it('should throw error when driverId is missing', async () => {
      await expect(
        service.getDriverStats('', mockTenantId)
      ).rejects.toThrow('Driver ID is required');
    });
  });

  describe('createRoute', () => {
    it('should create a new route', async () => {
      const routeData = {
        routeNumber: 'ROUTE-002',
        status: 'planned',
        totalDistance: 200,
        totalStops: 3
      };

      const result = await service.createRoute(routeData, mockTenantId, mockUserId);

      expect(result).toEqual({
        id: expect.stringMatching(/^route-\d+$/),
        ...routeData,
        tenantId: mockTenantId,
        createdBy: mockUserId,
        createdAt: expect.any(Date)
      });
    });
  });

  describe('createDriver', () => {
    it('should create a new driver', async () => {
      const driverData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890'
      };

      const result = await service.createDriver(driverData, mockTenantId);

      expect(result).toEqual({
        id: expect.stringMatching(/^driver-\d+$/),
        ...driverData,
        tenantId: mockTenantId,
        createdAt: expect.any(Date)
      });
    });
  });

  describe('updateRoute', () => {
    it('should update an existing route', async () => {
      const routeId = 'route-123';
      const updateData = { status: 'in_progress' };

      const result = await service.updateRoute(routeId, updateData, mockTenantId);

      expect(result).toEqual({
        id: routeId,
        ...updateData,
        updatedAt: expect.any(Date)
      });
    });

    it('should throw error when routeId is missing', async () => {
      await expect(
        service.updateRoute('', {}, mockTenantId)
      ).rejects.toThrow('Route ID is required');
    });
  });

  describe('updateDriver', () => {
    it('should update an existing driver', async () => {
      const driverId = 'driver-123';
      const updateData = { status: 'busy' };

      const result = await service.updateDriver(driverId, updateData, mockTenantId);

      expect(result).toEqual({
        id: driverId,
        ...updateData,
        updatedAt: expect.any(Date)
      });
    });

    it('should throw error when driverId is missing', async () => {
      await expect(
        service.updateDriver('', {}, mockTenantId)
      ).rejects.toThrow('Driver ID is required');
    });
  });

  describe('deleteRoute', () => {
    it('should delete a route', async () => {
      const routeId = 'route-123';
      const result = await service.deleteRoute(routeId, mockTenantId);

      expect(result).toEqual({
        success: true,
        deletedId: routeId
      });
    });

    it('should throw error when routeId is missing', async () => {
      await expect(
        service.deleteRoute('', mockTenantId)
      ).rejects.toThrow('Route ID is required');
    });
  });

  describe('deleteDriver', () => {
    it('should delete a driver', async () => {
      const driverId = 'driver-123';
      const result = await service.deleteDriver(driverId, mockTenantId);

      expect(result).toEqual({
        success: true,
        deletedId: driverId
      });
    });

    it('should throw error when driverId is missing', async () => {
      await expect(
        service.deleteDriver('', mockTenantId)
      ).rejects.toThrow('Driver ID is required');
    });
  });
});