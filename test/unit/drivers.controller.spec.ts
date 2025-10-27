import { Test, TestingModule } from '@nestjs/testing';
import { DriversController } from '../../src/modules/logistics/tms/controllers/drivers.controller';
import { TMSService } from '../../src/modules/logistics/tms/services/tms.service';
import { CreateDriverDto, UpdateDriverDto, GetDriversDto } from '../../src/modules/logistics/tms/dto';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('DriversController', () => {
  let controller: DriversController;
  let tmsService: jest.Mocked<TMSService>;

  const mockDriver = {
    id: 'driver-123',
    driverNumber: 'DRV-001',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    email: 'john.doe@example.com',
    licenseNumber: 'A123456789',
    licenseExpiry: '2025-12-31',
    status: 'available' as const,
    rating: 4.5,
    totalRoutes: 10,
    completedRoutes: 9,
    totalDistance: 5000,
    totalHours: 200,
    metadata: {},
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  };

  const mockCreateDriverDto: CreateDriverDto = {
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

  const mockUpdateDriverDto: UpdateDriverDto = {
    name: 'John Smith',
    email: 'john.smith@example.com'
  };

  const mockGetDriversDto: GetDriversDto = {
    page: 1,
    limit: 10,
    search: 'John',
    status: 'available',
    sortBy: 'firstName',
    sortOrder: 'asc'
  };

  beforeEach(async () => {
    const mockTMSService = {
      getDrivers: jest.fn(),
      getDriverById: jest.fn(),
      getDriverStats: jest.fn(),
      createDriver: jest.fn(),
      updateDriver: jest.fn(),
      deleteDriver: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriversController],
      providers: [
        {
          provide: TMSService,
          useValue: mockTMSService
        }
      ]
    }).compile();

    controller = module.get<DriversController>(DriversController);
    tmsService = module.get(TMSService);
  });

  describe('getDrivers', () => {
    it('should return paginated drivers list', async () => {
      const mockResponse = {
        drivers: [mockDriver],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };

      tmsService.getDrivers.mockResolvedValue(mockResponse);

      const result = await controller.getDrivers(
        mockGetDriversDto,
        'tenant-123',
        'user-123'
      );

      expect(result).toEqual(mockResponse);
      expect(tmsService.getDrivers).toHaveBeenCalledWith('tenant-123', mockGetDriversDto);
    });

    it('should throw error when tenantId is missing', async () => {
      await expect(
        controller.getDrivers(mockGetDriversDto, '', 'user-123')
      ).rejects.toThrow(HttpException);
    });

    it('should throw error when userId is missing', async () => {
      await expect(
        controller.getDrivers(mockGetDriversDto, 'tenant-123', '')
      ).rejects.toThrow(HttpException);
    });

    it('should handle service errors', async () => {
      tmsService.getDrivers.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.getDrivers(mockGetDriversDto, 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getDriverById', () => {
    it('should return driver by id', async () => {
      tmsService.getDriverById.mockResolvedValue(mockDriver);

      const result = await controller.getDriverById(
        'driver-123',
        'tenant-123',
        'user-123'
      );

      expect(result).toEqual(mockDriver);
      expect(tmsService.getDriverById).toHaveBeenCalledWith('driver-123', 'tenant-123');
    });

    it('should throw error when driverId is missing', async () => {
      await expect(
        controller.getDriverById('', 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });

    it('should handle service errors', async () => {
      tmsService.getDriverById.mockRejectedValue(new Error('Driver not found'));

      await expect(
        controller.getDriverById('driver-123', 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getDriverStats', () => {
    it('should return driver statistics', async () => {
      const mockStats = {
        driverId: 'driver-123',
        totalRoutes: 10,
        completedRoutes: 9,
        averageRating: 4.5,
        totalDistance: 5000,
        totalHours: 200
      };

      tmsService.getDriverStats.mockResolvedValue(mockStats);

      const result = await controller.getDriverStats(
        'driver-123',
        'tenant-123',
        'user-123'
      );

      expect(result).toEqual(mockStats);
      expect(tmsService.getDriverStats).toHaveBeenCalledWith('driver-123', 'tenant-123');
    });

    it('should throw error when driverId is missing', async () => {
      await expect(
        controller.getDriverStats('', 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('createDriver', () => {
    it('should create a new driver', async () => {
      const createdDriver = { ...mockDriver, id: 'new-driver-123' };
      tmsService.createDriver.mockResolvedValue(createdDriver);

      const result = await controller.createDriver(
        mockCreateDriverDto,
        'tenant-123',
        'user-123'
      );

      expect(result).toEqual(createdDriver);
      expect(tmsService.createDriver).toHaveBeenCalledWith(mockCreateDriverDto, 'tenant-123');
    });

    it('should throw error when required fields are missing', async () => {
      const invalidDto = { ...mockCreateDriverDto, name: '' };

      await expect(
        controller.createDriver(invalidDto, 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });

    it('should throw error when email is missing', async () => {
      const invalidDto = { ...mockCreateDriverDto, email: '' };

      await expect(
        controller.createDriver(invalidDto, 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });

    it('should throw error when phone is missing', async () => {
      const invalidDto = { ...mockCreateDriverDto, phone: '' };

      await expect(
        controller.createDriver(invalidDto, 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });

    it('should handle service errors', async () => {
      tmsService.createDriver.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.createDriver(mockCreateDriverDto, 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('updateDriver', () => {
    it('should update an existing driver', async () => {
      const updatedDriver = { ...mockDriver, ...mockUpdateDriverDto };
      tmsService.updateDriver.mockResolvedValue(updatedDriver);

      const result = await controller.updateDriver(
        'driver-123',
        mockUpdateDriverDto,
        'tenant-123',
        'user-123'
      );

      expect(result).toEqual(updatedDriver);
      expect(tmsService.updateDriver).toHaveBeenCalledWith('driver-123', mockUpdateDriverDto, 'tenant-123');
    });

    it('should throw error when driverId is missing', async () => {
      await expect(
        controller.updateDriver('', mockUpdateDriverDto, 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });

    it('should handle service errors', async () => {
      tmsService.updateDriver.mockRejectedValue(new Error('Driver not found'));

      await expect(
        controller.updateDriver('driver-123', mockUpdateDriverDto, 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('deleteDriver', () => {
    it('should delete a driver', async () => {
      const deleteResult = { success: true, deletedId: 'driver-123' };
      tmsService.deleteDriver.mockResolvedValue(deleteResult);

      const result = await controller.deleteDriver(
        'driver-123',
        'tenant-123',
        'user-123'
      );

      expect(result).toEqual(deleteResult);
      expect(tmsService.deleteDriver).toHaveBeenCalledWith('driver-123', 'tenant-123');
    });

    it('should throw error when driverId is missing', async () => {
      await expect(
        controller.deleteDriver('', 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });

    it('should handle service errors', async () => {
      tmsService.deleteDriver.mockRejectedValue(new Error('Driver not found'));

      await expect(
        controller.deleteDriver('driver-123', 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('assignVehicle', () => {
    it('should assign vehicle to driver', async () => {
      const assignmentData = { vehicleId: 'vehicle-123', assignmentDate: '2025-01-27' };

      const result = await controller.assignVehicle(
        'driver-123',
        assignmentData,
        'tenant-123',
        'user-123'
      );

      expect(result).toEqual({
        success: true,
        driverId: 'driver-123',
        vehicleId: 'vehicle-123',
        assignedAt: expect.any(Date),
        assignedBy: 'user-123'
      });
    });

    it('should throw error when vehicleId is missing', async () => {
      const invalidData = { vehicleId: '', assignmentDate: '2025-01-27' };

      await expect(
        controller.assignVehicle('driver-123', invalidData, 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });
  });

  describe('unassignVehicle', () => {
    it('should unassign vehicle from driver', async () => {
      const result = await controller.unassignVehicle(
        'driver-123',
        'tenant-123',
        'user-123'
      );

      expect(result).toEqual({
        success: true,
        driverId: 'driver-123',
        unassignedAt: expect.any(Date),
        unassignedBy: 'user-123'
      });
    });

    it('should throw error when driverId is missing', async () => {
      await expect(
        controller.unassignVehicle('', 'tenant-123', 'user-123')
      ).rejects.toThrow(HttpException);
    });
  });
});
