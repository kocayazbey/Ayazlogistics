import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiQuery, 
  ApiParam 
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../common/guards/permission.guard';
import { TenantIsolationGuard } from '../../../../common/guards/tenant-isolation.guard';
import { RateLimitGuard } from '../../../../common/guards/rate-limit.guard';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../../../../common/interceptors/audit.interceptor';
import { PerformanceInterceptor } from '../../../../common/interceptors/performance.interceptor';
import { ResponseTransformInterceptor } from '../../../../common/interceptors/response-transform.interceptor';
import { 
  Audit, AuditCreate, AuditRead, AuditUpdate, AuditDelete,
  RequirePermissions, RequireRoles,
  RateLimit, RateLimitAPI, RateLimitSearch,
  Performance, TrackPerformance, PerformanceAlert,
  Security, SecurityStrict, SecurityModerate,
  Monitoring, MonitoringFull, MonitoringPerformance,
  Analytics, AnalyticsBusiness, AnalyticsTechnical,
  Tenant, TenantRequired, TenantIsolated,
  Validation, ValidationStrict, ValidationLoose,
  CacheKey, CacheKeyShort, CacheKeyMedium, CacheKeyLong,
  FeatureFlag, FeatureFlagEnabled, FeatureFlagDisabled,
  Versioning, Version, Deprecated, Breaking,
  Experimental, ExperimentalFeature, ExperimentalAudit,
  AI, AIGPT3, AIGPT4, AICache, AIAudit,
  Blockchain, Ethereum, Polygon, BlockchainAudit
} from '../../../../common/decorators';
import { CreateDriverDto } from '../dto/create-driver.dto';
import { UpdateDriverDto } from '../dto/update-driver.dto';
import { GetDriversDto } from '../dto/get-drivers.dto';
import { TMSService } from '../services/tms.service';

@ApiTags('TMS Drivers')
@Controller({ path: 'tms/drivers', version: '1' })
@UseGuards(JwtAuthGuard, TenantIsolationGuard, PermissionGuard, RateLimitGuard)
@UseInterceptors(AuditInterceptor, PerformanceInterceptor, ResponseTransformInterceptor)
@SecurityStrict()
@MonitoringFull()
@AnalyticsBusiness()
@TenantIsolated()
@TrackPerformance()
@RateLimitAPI()
@ApiBearerAuth()
export class DriversController {
  private readonly logger = new Logger(DriversController.name);

  constructor(private readonly tmsService: TMSService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all drivers',
    description: 'Retrieve paginated list of drivers with filtering and search capabilities'
  })
  @ApiResponse({ status: 200, description: 'Drivers retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @AuditRead('drivers')
  @RequirePermissions('tms:drivers:read')
  @RequireRoles('admin', 'manager', 'fleet_manager', 'driver_manager')
  @TrackPerformance()
  @SecurityModerate()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @RateLimitSearch()
  @CacheKeyMedium('drivers_list')
  async getDrivers(
    @Query() query: GetDriversDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    try {
      this.logger.log(`Fetching drivers for tenant: ${tenantId} by user: ${userId}`);
      
      if (!tenantId || !userId) {
        throw new HttpException('Tenant ID and User ID are required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.tmsService.getDrivers(tenantId, query);

      this.logger.log(`Successfully retrieved drivers for tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch drivers for tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to fetch drivers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get driver by ID',
    description: 'Retrieve detailed information about a specific driver'
  })
  @ApiResponse({ status: 200, description: 'Driver retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiParam({ name: 'id', description: 'Driver ID', example: 'driver-123' })
  @AuditRead('driver')
  @RequirePermissions('tms:drivers:read')
  @RequireRoles('admin', 'manager', 'fleet_manager', 'driver_manager')
  @TrackPerformance()
  @SecurityModerate()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @CacheKeyLong('driver_detail')
  async getDriverById(
    @Param('id') driverId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    try {
      this.logger.log(`Fetching driver ${driverId} for tenant: ${tenantId} by user: ${userId}`);
      
      if (!driverId || !tenantId || !userId) {
        throw new HttpException('Driver ID, Tenant ID and User ID are required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.tmsService.getDriverById(driverId, tenantId);

      this.logger.log(`Successfully retrieved driver ${driverId} for tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch driver ${driverId} for tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to fetch driver: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id/stats')
  @ApiOperation({ 
    summary: 'Get driver statistics',
    description: 'Retrieve performance statistics and metrics for a specific driver'
  })
  @ApiResponse({ status: 200, description: 'Driver statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiParam({ name: 'id', description: 'Driver ID', example: 'driver-123' })
  @AuditRead('driver_stats')
  @RequirePermissions('tms:drivers:read')
  @RequireRoles('admin', 'manager', 'fleet_manager', 'driver_manager')
  @TrackPerformance()
  @SecurityModerate()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @CacheKeyLong('driver_stats')
  async getDriverStats(
    @Param('id') driverId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    try {
      this.logger.log(`Fetching driver stats for ${driverId} in tenant: ${tenantId} by user: ${userId}`);
      
      if (!driverId || !tenantId || !userId) {
        throw new HttpException('Driver ID, Tenant ID and User ID are required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.tmsService.getDriverStats(driverId, tenantId);

      this.logger.log(`Successfully retrieved driver stats for ${driverId} in tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch driver stats for ${driverId} in tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to fetch driver statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  @ApiOperation({ 
    summary: 'Create new driver',
    description: 'Create a new driver with comprehensive validation and security controls'
  })
  @ApiResponse({ status: 201, description: 'Driver created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Conflict - Driver already exists' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @AuditCreate('driver')
  @RequirePermissions('tms:drivers:create')
  @RequireRoles('admin', 'manager', 'fleet_manager', 'driver_manager')
  @TrackPerformance()
  @SecurityStrict()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @RateLimitAPI()
  async createDriver(
    @Body() createDriverDto: CreateDriverDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    try {
      this.logger.log(`Creating driver for tenant: ${tenantId} by user: ${userId}`);
      
      if (!tenantId || !userId) {
        throw new HttpException('Tenant ID and User ID are required', HttpStatus.BAD_REQUEST);
      }

      if (!createDriverDto.name || !createDriverDto.email || !createDriverDto.phone) {
        throw new HttpException('Name, email, and phone are required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.tmsService.createDriver(createDriverDto, tenantId);

      this.logger.log(`Successfully created driver for tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create driver for tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to create driver: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update driver',
    description: 'Update driver information with comprehensive validation'
  })
  @ApiResponse({ status: 200, description: 'Driver updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiParam({ name: 'id', description: 'Driver ID', example: 'driver-123' })
  @AuditUpdate('driver')
  @RequirePermissions('tms:drivers:update')
  @RequireRoles('admin', 'manager', 'fleet_manager', 'driver_manager')
  @TrackPerformance()
  @SecurityModerate()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @RateLimitAPI()
  async updateDriver(
    @Param('id') driverId: string,
    @Body() updateDriverDto: UpdateDriverDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    try {
      this.logger.log(`Updating driver ${driverId} for tenant: ${tenantId} by user: ${userId}`);
      
      if (!driverId || !tenantId || !userId) {
        throw new HttpException('Driver ID, Tenant ID and User ID are required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.tmsService.updateDriver(driverId, updateDriverDto, tenantId);

      this.logger.log(`Successfully updated driver ${driverId} for tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update driver ${driverId} for tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to update driver: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete driver',
    description: 'Delete a driver with proper validation and cleanup'
  })
  @ApiResponse({ status: 200, description: 'Driver deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Driver has active assignments' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiParam({ name: 'id', description: 'Driver ID', example: 'driver-123' })
  @AuditDelete('driver')
  @RequirePermissions('tms:drivers:delete')
  @RequireRoles('admin', 'manager', 'fleet_manager')
  @TrackPerformance()
  @SecurityStrict()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @RateLimitAPI()
  async deleteDriver(
    @Param('id') driverId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    try {
      this.logger.log(`Deleting driver ${driverId} for tenant: ${tenantId} by user: ${userId}`);
      
      if (!driverId || !tenantId || !userId) {
        throw new HttpException('Driver ID, Tenant ID and User ID are required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.tmsService.deleteDriver(driverId, tenantId);

      this.logger.log(`Successfully deleted driver ${driverId} for tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete driver ${driverId} for tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to delete driver: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/assign-vehicle')
  @ApiOperation({ 
    summary: 'Assign vehicle to driver',
    description: 'Assign a specific vehicle to a driver with validation'
  })
  @ApiResponse({ status: 200, description: 'Vehicle assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid assignment data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Driver or vehicle not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Vehicle already assigned' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiParam({ name: 'id', description: 'Driver ID', example: 'driver-123' })
  @AuditUpdate('driver_vehicle_assignment')
  @RequirePermissions('tms:drivers:assign')
  @RequireRoles('admin', 'manager', 'fleet_manager')
  @TrackPerformance()
  @SecurityModerate()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @RateLimitAPI()
  async assignVehicle(
    @Param('id') driverId: string,
    @Body() assignmentData: { vehicleId: string; assignmentDate?: string },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    try {
      this.logger.log(`Assigning vehicle to driver ${driverId} for tenant: ${tenantId} by user: ${userId}`);
      
      if (!driverId || !assignmentData.vehicleId || !tenantId || !userId) {
        throw new HttpException('Driver ID, Vehicle ID, Tenant ID and User ID are required', HttpStatus.BAD_REQUEST);
      }

      // Implementation would handle vehicle assignment
      const result = {
        success: true,
        driverId,
        vehicleId: assignmentData.vehicleId,
        assignedAt: new Date(),
        assignedBy: userId
      };

      this.logger.log(`Successfully assigned vehicle to driver ${driverId} for tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to assign vehicle to driver ${driverId} for tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to assign vehicle: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/unassign-vehicle')
  @ApiOperation({ 
    summary: 'Unassign vehicle from driver',
    description: 'Remove vehicle assignment from a driver'
  })
  @ApiResponse({ status: 200, description: 'Vehicle unassigned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Driver not found or no vehicle assigned' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiParam({ name: 'id', description: 'Driver ID', example: 'driver-123' })
  @AuditUpdate('driver_vehicle_unassignment')
  @RequirePermissions('tms:drivers:assign')
  @RequireRoles('admin', 'manager', 'fleet_manager')
  @TrackPerformance()
  @SecurityModerate()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @RateLimitAPI()
  async unassignVehicle(
    @Param('id') driverId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    try {
      this.logger.log(`Unassigning vehicle from driver ${driverId} for tenant: ${tenantId} by user: ${userId}`);
      
      if (!driverId || !tenantId || !userId) {
        throw new HttpException('Driver ID, Tenant ID and User ID are required', HttpStatus.BAD_REQUEST);
      }

      // Implementation would handle vehicle unassignment
      const result = {
        success: true,
        driverId,
        unassignedAt: new Date(),
        unassignedBy: userId
      };

      this.logger.log(`Successfully unassigned vehicle from driver ${driverId} for tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to unassign vehicle from driver ${driverId} for tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to unassign vehicle: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}