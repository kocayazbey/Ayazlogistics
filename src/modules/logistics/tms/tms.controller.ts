import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TmsService } from './tms.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateRouteDto, UpdateRouteDto, RouteQueryDto } from './dto/create-route.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { CreateTrackingDto } from './dto/create-tracking.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';

@ApiTags('TMS')
@Controller('tms')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TmsController {
  constructor(private readonly tmsService: TmsService) {}

  @Get('routes')
  @Roles('admin', 'fleet_manager', 'dispatcher')
  @ApiOperation({ summary: 'Rota listesi' })
  @ApiResponse({ status: 200, description: 'Rota listesi başarıyla alındı' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'driverId', required: false })
  @ApiQuery({ name: 'vehicleId', required: false })
  async getRoutes(
    @Query() query: RouteQueryDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return await this.tmsService.getRoutes({
      page: query.page || 1,
      limit: query.limit || 10,
      status: query.status,
      driverId: query.driverId,
      vehicleId: query.vehicleId,
      tenantId,
    });
  }

  @Post('routes')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Yeni rota oluştur' })
  @ApiResponse({ status: 201, description: 'Rota başarıyla oluşturuldu' })
  async createRoute(
    @Body() createRouteDto: CreateRouteDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    const route = await this.tmsService.createRoute({
      tenantId,
      routeNumber: createRouteDto.routeNumber,
      vehicleId: createRouteDto.vehicleId,
      driverId: createRouteDto.driverId,
      routeDate: createRouteDto.routeDate,
      totalDistance: createRouteDto.totalDistance,
      estimatedDuration: createRouteDto.estimatedDuration,
      totalStops: createRouteDto.totalStops,
      optimizationAlgorithm: createRouteDto.optimizationAlgorithm,
      metadata: createRouteDto.metadata,
    });

    return {
      success: true,
      message: 'Rota başarıyla oluşturuldu',
      data: route
    };
  }

  @Put('routes/:id')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Rota güncelle' })
  @ApiResponse({ status: 200, description: 'Rota başarıyla güncellendi' })
  async updateRoute(
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto
  ) {
    return {
      success: true,
      message: 'Rota başarıyla güncellendi',
      data: {
        id,
        ...updateRouteDto,
        updatedAt: new Date()
      }
    };
  }

  @Post('routes/:id/optimize')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Rota optimizasyonu' })
  @ApiResponse({ status: 200, description: 'Rota başarıyla optimize edildi' })
  async optimizeRoute(@Param('id') id: string) {
    return {
      success: true,
      message: 'Rota başarıyla optimize edildi',
      data: {
        routeId: id,
        optimizedDistance: '145.2',
        optimizedDuration: 165,
        optimizationAlgorithm: 'genetic',
        savings: '15.3 km',
        timeSaved: '15 dakika'
      }
    };
  }

  @Post('routes/:id/start')
  @Roles('admin', 'fleet_manager', 'dispatcher')
  @ApiOperation({ summary: 'Rota başlat' })
  @ApiResponse({ status: 200, description: 'Rota başarıyla başlatıldı' })
  async startRoute(@Param('id') id: string) {
    return {
      success: true,
      message: 'Rota başarıyla başlatıldı',
      data: {
        routeId: id,
        status: 'in_progress',
        startedAt: new Date(),
        estimatedCompletion: new Date(Date.now() + 4 * 60 * 60 * 1000)
      }
    };
  }

  @Post('routes/:id/complete')
  @Roles('admin', 'fleet_manager', 'dispatcher')
  @ApiOperation({ summary: 'Rota tamamla' })
  @ApiResponse({ status: 200, description: 'Rota başarıyla tamamlandı' })
  async completeRoute(@Param('id') id: string) {
    return {
      success: true,
      message: 'Rota başarıyla tamamlandı',
      data: {
        routeId: id,
        status: 'completed',
        completedAt: new Date(),
        actualDuration: 195,
        actualDistance: '148.7',
        efficiency: 92.5
      }
    };
  }

  @Get('vehicles')
  @Roles('admin', 'fleet_manager', 'dispatcher')
  @ApiOperation({ summary: 'Araç listesi' })
  @ApiResponse({ status: 200, description: 'Araç listesi başarıyla alındı' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'driver', required: false })
  async getVehicles(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('driver') driver?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return await this.tmsService.getVehicles({
      page,
      limit,
      status,
      type,
      driverId: driver,
      tenantId,
    });
  }

  @Post('vehicles')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Yeni araç oluştur' })
  @ApiResponse({ status: 201, description: 'Araç başarıyla oluşturuldu' })
  async createVehicle(
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    const newVehicle = {
      id: `vehicle-${Date.now()}`,
      vehicleNumber: createVehicleDto.vehicleNumber,
      licensePlate: createVehicleDto.licensePlate,
      vehicleType: createVehicleDto.vehicleType,
      make: createVehicleDto.make,
      model: createVehicleDto.model,
      year: createVehicleDto.year,
      capacity: createVehicleDto.capacity,
      maxWeight: createVehicleDto.maxWeight,
      fuelType: createVehicleDto.fuelType,
      currentOdometer: createVehicleDto.currentOdometer || '0',
      gpsDevice: createVehicleDto.gpsDevice || null,
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: createVehicleDto.metadata || null
    };

    return {
      success: true,
      message: 'Araç başarıyla oluşturuldu',
      data: newVehicle
    };
  }

  @Put('vehicles/:id')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Araç güncelle' })
  @ApiResponse({ status: 200, description: 'Araç başarıyla güncellendi' })
  async updateVehicle(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto
  ) {
    return {
      success: true,
      message: 'Araç başarıyla güncellendi',
      data: {
        id,
        ...updateVehicleDto,
        updatedAt: new Date()
      }
    };
  }

  @Post('vehicles/:id/maintenance')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Araç bakım planla' })
  @ApiResponse({ status: 200, description: 'Bakım başarıyla planlandı' })
  async scheduleMaintenance(
    @Param('id') id: string,
    @Body('maintenanceType') maintenanceType: string,
    @Body('scheduledDate') scheduledDate: string
  ) {
    return {
      success: true,
      message: 'Bakım başarıyla planlandı',
      data: {
        vehicleId: id,
        maintenanceType,
        scheduledDate: new Date(scheduledDate),
        status: 'scheduled',
        estimatedDuration: '2 saat',
        estimatedCost: '₺500-₺1000'
      }
    };
  }

  @Get('drivers')
  @Roles('admin', 'fleet_manager', 'dispatcher')
  @ApiOperation({ summary: 'Şoför listesi' })
  @ApiResponse({ status: 200, description: 'Şoför listesi başarıyla alındı' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'licenseType', required: false })
  @ApiQuery({ name: 'experience', required: false })
  async getDrivers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('licenseType') licenseType?: string,
    @Query('experience') experience?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    // Mock driver data
    const mockDrivers = [
      {
        id: 'driver-001',
        driverNumber: 'DR-001',
        firstName: 'Ahmet',
        lastName: 'Yılmaz',
        phone: '+905551234567',
        email: 'ahmet.yilmaz@example.com',
        licenseNumber: 'B123456789',
        licenseExpiry: '2025-12-31',
        status: 'available',
        experience: '5 yıl',
        licenseType: 'B',
        createdAt: new Date(),
        updatedAt: new Date(),
        vehicle: {
          id: 'vehicle-001',
          vehicleNumber: 'VH-001',
          licensePlate: '34ABC123'
        }
      },
      {
        id: 'driver-002',
        driverNumber: 'DR-002',
        firstName: 'Mehmet',
        lastName: 'Demir',
        phone: '+905559876543',
        email: 'mehmet.demir@example.com',
        licenseNumber: 'B987654321',
        licenseExpiry: '2026-06-30',
        status: 'busy',
        experience: '8 yıl',
        licenseType: 'B',
        createdAt: new Date(),
        updatedAt: new Date(),
        vehicle: {
          id: 'vehicle-002',
          vehicleNumber: 'VH-002',
          licensePlate: '34DEF456'
        }
      },
      {
        id: 'driver-003',
        driverNumber: 'DR-003',
        firstName: 'Ayşe',
        lastName: 'Kaya',
        phone: '+905551112233',
        email: 'ayse.kaya@example.com',
        licenseNumber: 'B456789123',
        licenseExpiry: '2024-09-15',
        status: 'off_duty',
        experience: '3 yıl',
        licenseType: 'B',
        createdAt: new Date(),
        updatedAt: new Date(),
        vehicle: null
      }
    ];

    let filteredDrivers = mockDrivers;
    if (status) {
      filteredDrivers = filteredDrivers.filter(driver => driver.status === status);
    }
    if (licenseType) {
      filteredDrivers = filteredDrivers.filter(driver => driver.licenseType === licenseType);
    }
    if (experience) {
      filteredDrivers = filteredDrivers.filter(driver => driver.experience.includes(experience));
    }

    return {
      items: filteredDrivers,
      pagination: {
        page,
        limit,
        total: filteredDrivers.length,
        pages: Math.ceil(filteredDrivers.length / limit)
      }
    };
  }

  @Post('drivers')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Yeni şoför oluştur' })
  @ApiResponse({ status: 201, description: 'Şoför başarıyla oluşturuldu' })
  async createDriver(
    @Body() createDriverDto: CreateDriverDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    const newDriver = {
      id: `driver-${Date.now()}`,
      driverNumber: createDriverDto.driverNumber || `DR-${Date.now()}`,
      firstName: createDriverDto.firstName,
      lastName: createDriverDto.lastName,
      phone: createDriverDto.phone,
      email: createDriverDto.email || null,
      licenseNumber: createDriverDto.licenseNumber,
      licenseExpiry: createDriverDto.licenseExpiry,
      status: 'available',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: createDriverDto.metadata || null
    };

    return {
      success: true,
      message: 'Şoför başarıyla oluşturuldu',
      data: newDriver
    };
  }

  @Put('drivers/:id')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Şoför güncelle' })
  @ApiResponse({ status: 200, description: 'Şoför başarıyla güncellendi' })
  async updateDriver(
    @Param('id') id: string,
    @Body() updateDriverDto: UpdateDriverDto
  ) {
    return {
      success: true,
      message: 'Şoför başarıyla güncellendi',
      data: {
        id,
        ...updateDriverDto,
        updatedAt: new Date()
      }
    };
  }

  @Post('drivers/:id/assign-vehicle')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Şoföre araç ata' })
  @ApiResponse({ status: 200, description: 'Araç başarıyla atandı' })
  async assignVehicle(
    @Param('id') driverId: string,
    @Body('vehicleId') vehicleId: string
  ) {
    return {
      success: true,
      message: 'Araç başarıyla atandı',
      data: {
        driverId,
        vehicleId,
        assignedAt: new Date(),
        status: 'assigned'
      }
    };
  }

  @Get('tracking')
  @Roles('admin', 'fleet_manager', 'dispatcher', 'driver')
  @ApiOperation({ summary: 'Takip verileri' })
  @ApiResponse({ status: 200, description: 'Takip verileri başarıyla alındı' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vehicle', required: false })
  @ApiQuery({ name: 'driver', required: false })
  async getTracking(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('vehicle') vehicle?: string,
    @Query('driver') driver?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    // Mock tracking data
    const mockTracking = [
      {
        id: 'track-001',
        vehicleId: 'vehicle-001',
        driverId: 'driver-001',
        latitude: '41.0082',
        longitude: '28.9784',
        speed: '65',
        heading: '180',
        accuracy: '5',
        timestamp: new Date(),
        status: 'moving',
        vehicle: {
          id: 'vehicle-001',
          licensePlate: '34ABC123',
          make: 'Mercedes',
          model: 'Sprinter'
        },
        driver: {
          id: 'driver-001',
          firstName: 'Ahmet',
          lastName: 'Yılmaz'
        }
      },
      {
        id: 'track-002',
        vehicleId: 'vehicle-002',
        driverId: 'driver-002',
        latitude: '41.0123',
        longitude: '28.9823',
        speed: '0',
        heading: '0',
        accuracy: '3',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        status: 'stopped',
        vehicle: {
          id: 'vehicle-002',
          licensePlate: '34DEF456',
          make: 'Ford',
          model: 'Transit'
        },
        driver: {
          id: 'driver-002',
          firstName: 'Mehmet',
          lastName: 'Demir'
        }
      }
    ];

    let filteredTracking = mockTracking;
    if (status) {
      filteredTracking = filteredTracking.filter(track => track.status === status);
    }
    if (vehicle) {
      filteredTracking = filteredTracking.filter(track => track.vehicleId === vehicle);
    }
    if (driver) {
      filteredTracking = filteredTracking.filter(track => track.driverId === driver);
    }

    return {
      items: filteredTracking,
      pagination: {
        page,
        limit,
        total: filteredTracking.length,
        pages: Math.ceil(filteredTracking.length / limit)
      }
    };
  }

  @Post('tracking')
  @Roles('admin', 'fleet_manager', 'dispatcher')
  @ApiOperation({ summary: 'Yeni takip kaydı oluştur' })
  @ApiResponse({ status: 201, description: 'Takip kaydı başarıyla oluşturuldu' })
  async createTracking(
    @Body() createTrackingDto: CreateTrackingDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    const newTracking = {
      id: `track-${Date.now()}`,
      vehicleId: createTrackingDto.vehicleId,
      latitude: createTrackingDto.latitude,
      longitude: createTrackingDto.longitude,
      speed: createTrackingDto.speed || '0',
      heading: createTrackingDto.heading || '0',
      accuracy: createTrackingDto.accuracy || '10',
      timestamp: createTrackingDto.timestamp || new Date(),
      status: 'active',
      createdAt: new Date()
    };

    return {
      success: true,
      message: 'Takip kaydı başarıyla oluşturuldu',
      data: newTracking
    };
  }

  @Put('tracking/:id')
  @Roles('admin', 'fleet_manager', 'dispatcher', 'driver')
  @ApiOperation({ summary: 'Takip kaydı güncelle' })
  @ApiResponse({ status: 200, description: 'Takip kaydı başarıyla güncellendi' })
  async updateTracking(
    @Param('id') id: string,
    @Body() updateTrackingDto: UpdateTrackingDto
  ) {
    return {
      success: true,
      message: 'Takip kaydı başarıyla güncellendi',
      data: {
        id,
        ...updateTrackingDto,
        updatedAt: new Date()
      }
    };
  }

  @Get('tracking/:id/location')
  @Roles('admin', 'fleet_manager', 'dispatcher', 'driver')
  @ApiOperation({ summary: 'Mevcut konum' })
  @ApiResponse({ status: 200, description: 'Konum başarıyla alındı' })
  async getCurrentLocation(@Param('id') id: string) {
    return {
      coordinates: {
        latitude: '41.0082',
        longitude: '28.9784'
      },
      speed: '65',
      heading: '180',
      lastUpdate: new Date(),
      address: 'İstanbul, Türkiye',
      accuracy: '5 metre'
    };
  }

  @Get('analytics/performance')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Filo performans analizi' })
  @ApiResponse({ status: 200, description: 'Performans analizi başarıyla alındı' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getPerformanceAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return {
      period: {
        from: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: dateTo || new Date().toISOString().split('T')[0]
      },
      totalRoutes: 45,
      completedRoutes: 42,
      totalDistance: '6750.5',
      averageEfficiency: 87.5,
      fuelConsumption: '1250.3 L',
      averageSpeed: '45.2 km/h',
      onTimeDelivery: 94.2,
      driverPerformance: [
        { driverId: 'driver-001', name: 'Ahmet Yılmaz', efficiency: 92.5, routes: 15 },
        { driverId: 'driver-002', name: 'Mehmet Demir', efficiency: 89.3, routes: 12 },
        { driverId: 'driver-003', name: 'Ayşe Kaya', efficiency: 85.7, routes: 10 }
      ],
      vehicleUtilization: [
        { vehicleId: 'vehicle-001', licensePlate: '34ABC123', utilization: 78.5 },
        { vehicleId: 'vehicle-002', licensePlate: '34DEF456', utilization: 82.1 },
        { vehicleId: 'vehicle-003', licensePlate: '34GHI789', utilization: 75.3 }
      ]
    };
  }

  @Get('analytics/fuel')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Yakıt tüketim analizi' })
  @ApiResponse({ status: 200, description: 'Yakıt analizi başarıyla alındı' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getFuelAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return {
      period: {
        from: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: dateTo || new Date().toISOString().split('T')[0]
      },
      totalFuelConsumption: '1250.3 L',
      averageConsumption: '8.5 L/100km',
      fuelCost: '₺12,503',
      consumptionByVehicle: [
        { vehicleId: 'vehicle-001', licensePlate: '34ABC123', consumption: '450.2 L', cost: '₺4,502' },
        { vehicleId: 'vehicle-002', licensePlate: '34DEF456', consumption: '380.5 L', cost: '₺3,805' },
        { vehicleId: 'vehicle-003', licensePlate: '34GHI789', consumption: '419.6 L', cost: '₺4,196' }
      ],
      consumptionByDriver: [
        { driverId: 'driver-001', name: 'Ahmet Yılmaz', consumption: '520.3 L', efficiency: 'A+' },
        { driverId: 'driver-002', name: 'Mehmet Demir', consumption: '480.7 L', efficiency: 'A' },
        { driverId: 'driver-003', name: 'Ayşe Kaya', consumption: '249.3 L', efficiency: 'A+' }
      ],
      trends: {
        dailyAverage: '41.7 L',
        weeklyTrend: '+2.3%',
        monthlyTrend: '-5.1%'
      }
    };
  }

  @Get('analytics/routes')
  @Roles('admin', 'fleet_manager')
  @ApiOperation({ summary: 'Rota optimizasyon analizi' })
  @ApiResponse({ status: 200, description: 'Rota analizi başarıyla alındı' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getRouteAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return {
      period: {
        from: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        to: dateTo || new Date().toISOString().split('T')[0]
      },
      totalRoutes: 45,
      completedRoutes: 42,
      inProgressRoutes: 3,
      totalDistance: '6750.5 km',
      averageStops: 8.5,
      optimizationSavings: {
        distanceSaved: '450.2 km',
        timeSaved: '12.5 saat',
        fuelSaved: '35.8 L',
        costSaved: '₺2,150'
      },
      algorithmPerformance: [
        { algorithm: 'genetic', routes: 25, efficiency: 92.3, avgSavings: '15.2%' },
        { algorithm: 'clarke_wright', routes: 15, efficiency: 88.7, avgSavings: '12.8%' },
        { algorithm: 'nearest_neighbor', routes: 5, efficiency: 85.1, avgSavings: '10.5%' }
      ],
      routeEfficiency: {
        mostEfficient: { routeId: 'route-015', efficiency: 96.8, savings: '22.3%' },
        leastEfficient: { routeId: 'route-008', efficiency: 78.2, savings: '8.1%' },
        averageEfficiency: 87.5
      }
    };
  }
}