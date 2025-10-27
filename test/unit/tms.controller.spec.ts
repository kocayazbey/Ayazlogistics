import { Test, TestingModule } from '@nestjs/testing';
import { TMSController } from '../../src/modules/logistics/tms/tms.controller';
import { TMSService } from '../../src/modules/logistics/tms/services/tms.service';
import { RouteOptimizationService } from '../../src/modules/logistics/ayaz-tms/route-optimization/route-optimization.service';
import { VehicleService } from '../../src/modules/logistics/ayaz-tms/vehicle-management/vehicle.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('TMSController', () => {
  let controller: TMSController;
  let tmsService: jest.Mocked<TMSService>;
  let routeOptimizationService: jest.Mocked<RouteOptimizationService>;
  let vehicleService: jest.Mocked<VehicleService>;

  beforeEach(async () => {
    const mockTMSService = {
      getRoutes: jest.fn(),
      getRouteStats: jest.fn(),
      getRouteById: jest.fn(),
      getDrivers: jest.fn(),
      getDriverById: jest.fn(),
      getDriverStats: jest.fn(),
    };

    const mockRouteOptimizationService = {
      createOptimizedRoute: jest.fn(),
    };

    const mockVehicleService = {
      getVehicles: jest.fn(),
      createVehicle: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TMSController],
      providers: [
        {
          provide: TMSService,
          useValue: mockTMSService,
        },
        {
          provide: RouteOptimizationService,
          useValue: mockRouteOptimizationService,
        },
        {
          provide: VehicleService,
          useValue: mockVehicleService,
        },
      ],
    }).compile();

    controller = module.get<TMSController>(TMSController);
    tmsService = module.get(TMSService);
    routeOptimizationService = module.get(RouteOptimizationService);
    vehicleService = module.get(VehicleService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('optimizeRoute', () => {
    it('should optimize route successfully', async () => {
      const mockDto = {
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

      const mockResult = {
        routeId: 'route-1',
        routeNumber: 'ROUTE-001',
        optimizedStops: [],
        totalDistance: 50.5,
        totalDuration: 120,
        totalStops: 1,
        algorithm: 'genetic',
        optimizationScore: 95,
        timeWindowViolations: 0,
        capacityViolations: 0,
        estimatedFuelConsumption: 5.2,
        estimatedCost: 150.0,
        metadata: {
          createdAt: '2025-01-27T10:00:00Z',
          optimizedAt: '2025-01-27T10:05:00Z',
          optimizationTime: 300,
          constraints: ['time_windows', 'capacity'],
        },
      };

      routeOptimizationService.createOptimizedRoute.mockResolvedValue(mockResult);

      const result = await controller.optimizeRoute(
        mockDto,
        'tenant-1',
        'user-1'
      );

      expect(result).toEqual(mockResult);
      expect(routeOptimizationService.createOptimizedRoute).toHaveBeenCalledWith(
        mockDto.stops,
        mockDto.vehicleId,
        mockDto.driverId,
        'tenant-1',
        'user-1',
        mockDto.algorithm,
        mockDto.maxDuration,
        mockDto.maxDistance,
        mockDto.considerTimeWindows,
        mockDto.considerCapacity,
        mockDto.preferences
      );
    });

    it('should throw HttpException when optimization fails', async () => {
      const mockDto = {
        stops: [],
        vehicleId: 'vehicle-1',
        driverId: 'driver-1',
      };

      routeOptimizationService.createOptimizedRoute.mockRejectedValue(
        new Error('Optimization failed')
      );

      await expect(
        controller.optimizeRoute(mockDto, 'tenant-1', 'user-1')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getVehicles', () => {
    it('should return vehicles successfully', async () => {
      const mockVehicles = [
        {
          id: 'vehicle-1',
          vehicleNumber: 'VH-001',
          licensePlate: 'ABC-123',
          vehicleType: 'truck',
          make: 'Ford',
          model: 'Transit',
          year: 2023,
          capacity: 1000,
          maxWeight: 3500,
          fuelType: 'diesel',
          currentOdometer: 15000,
          gpsDevice: 'GPS-001',
          status: 'available',
          metadata: {},
          createdAt: '2025-01-27T10:00:00Z',
          updatedAt: '2025-01-27T10:00:00Z',
        },
      ];

      vehicleService.getVehicles.mockResolvedValue(mockVehicles);

      const result = await controller.getVehicles('tenant-1');

      expect(result).toEqual(mockVehicles);
      expect(vehicleService.getVehicles).toHaveBeenCalledWith('tenant-1');
    });

    it('should throw HttpException when service fails', async () => {
      vehicleService.getVehicles.mockRejectedValue(new Error('Service failed'));

      await expect(controller.getVehicles('tenant-1')).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('createVehicle', () => {
    it('should create vehicle successfully', async () => {
      const mockDto = {
        vehicleNumber: 'VH-002',
        licensePlate: 'XYZ-789',
        vehicleType: 'van',
        make: 'Mercedes',
        model: 'Sprinter',
        year: 2024,
        capacity: 500,
        maxWeight: 2500,
        fuelType: 'diesel',
        currentOdometer: 0,
        gpsDevice: 'GPS-002',
        status: 'available',
        metadata: {},
      };

      const mockResult = {
        id: 'vehicle-2',
        ...mockDto,
        createdAt: '2025-01-27T10:00:00Z',
        updatedAt: '2025-01-27T10:00:00Z',
      };

      vehicleService.createVehicle.mockResolvedValue(mockResult);

      const result = await controller.createVehicle(mockDto, 'tenant-1');

      expect(result).toEqual(mockResult);
      expect(vehicleService.createVehicle).toHaveBeenCalledWith(
        mockDto,
        'tenant-1'
      );
    });
  });

  describe('getRoutes', () => {
    it('should return routes with filters', async () => {
      const mockQuery = {
        page: 1,
        limit: 20,
        status: 'planned',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const mockResult = {
        routes: [],
        total: 0,
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        success: true,
        timestamp: '2025-01-27T10:00:00Z',
      };

      tmsService.getRoutes.mockResolvedValue(mockResult);

      const result = await controller.getRoutes('tenant-1', mockQuery);

      expect(result).toEqual(mockResult);
      expect(tmsService.getRoutes).toHaveBeenCalledWith('tenant-1', {
        ...mockQuery,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });
    });
  });

  describe('getRouteStats', () => {
    it('should return route statistics', async () => {
      const mockStats = {
        totalRoutes: 150,
        completedRoutes: 120,
        inProgressRoutes: 20,
        averageDistance: 45.5,
        averageDuration: 180,
      };

      tmsService.getRouteStats.mockResolvedValue(mockStats);

      const result = await controller.getRouteStats('tenant-1');

      expect(result).toEqual(mockStats);
      expect(tmsService.getRouteStats).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('getRouteById', () => {
    it('should return route by ID', async () => {
      const routeId = 'route-1';
      const mockRoute = {
        id: routeId,
        routeNumber: 'ROUTE-001',
        status: 'planned',
        totalDistance: 50.5,
        totalStops: 5,
        stops: [],
      };

      tmsService.getRouteById.mockResolvedValue(mockRoute);

      const result = await controller.getRouteById(routeId, 'tenant-1');

      expect(result).toEqual(mockRoute);
      expect(tmsService.getRouteById).toHaveBeenCalledWith(routeId, 'tenant-1');
    });
  });

  describe('getDrivers', () => {
    it('should return drivers with query parameters', async () => {
      const mockQuery = {
        page: 1,
        limit: 20,
        status: 'available',
        search: 'John',
      };

      const mockResult = {
        drivers: [],
        total: 0,
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        success: true,
        timestamp: '2025-01-27T10:00:00Z',
      };

      tmsService.getDrivers.mockResolvedValue(mockResult);

      const result = await controller.getDrivers('tenant-1', mockQuery);

      expect(result).toEqual(mockResult);
      expect(tmsService.getDrivers).toHaveBeenCalledWith('tenant-1', mockQuery);
    });
  });

  describe('getDriverById', () => {
    it('should return driver by ID', async () => {
      const driverId = 'driver-1';
      const mockDriver = {
        id: driverId,
        driverNumber: 'DRV-001',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'john.doe@example.com',
        licenseNumber: 'LIC-123',
        licenseExpiry: '2026-12-31',
        status: 'available',
        metadata: {},
        createdAt: '2025-01-27T10:00:00Z',
        updatedAt: '2025-01-27T10:00:00Z',
      };

      tmsService.getDriverById.mockResolvedValue(mockDriver);

      const result = await controller.getDriverById(driverId, 'tenant-1');

      expect(result).toEqual(mockDriver);
      expect(tmsService.getDriverById).toHaveBeenCalledWith(driverId, 'tenant-1');
    });
  });

  describe('getDriverStats', () => {
    it('should return driver statistics', async () => {
      const driverId = 'driver-1';
      const mockStats = {
        driverId,
        totalRoutes: 50,
        completedRoutes: 45,
        averageRating: 4.8,
        totalDistance: 2500,
        totalHours: 200,
      };

      tmsService.getDriverStats.mockResolvedValue(mockStats);

      const result = await controller.getDriverStats(driverId, 'tenant-1');

      expect(result).toEqual(mockStats);
      expect(tmsService.getDriverStats).toHaveBeenCalledWith(driverId, 'tenant-1');
    });
  });
});
