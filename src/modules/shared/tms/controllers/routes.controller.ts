import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { RoutesService } from '../ayaz-tms/routes/routes.service';
import { CreateRouteDto } from '../ayaz-tms/routes/dto/create-route.dto';
import { UpdateRouteDto } from '../ayaz-tms/routes/dto/update-route.dto';
import { OptimizeRouteDto } from '../ayaz-tms/routes/dto/optimize-route.dto';

@ApiTags('TMS Routes')
@Controller({ path: 'tms/routes', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all routes' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by route status' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Filter by vehicle ID' })
  @ApiQuery({ name: 'driverId', required: false, description: 'Filter by driver ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Routes retrieved successfully' })
  async getRoutes(
    @Query('status') status?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('driverId') driverId?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.getRoutes({
      tenantId,
      status,
      vehicleId,
      driverId,
      page,
      limit
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get routes statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getRoutesStats(@CurrentUser('tenantId') tenantId: string) {
    return this.routesService.getRoutesStats(tenantId);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get routes performance metrics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for metrics' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getRoutesPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.getRoutesPerformance(tenantId, { startDate, endDate });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route by ID' })
  @ApiResponse({ status: 200, description: 'Route retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async getRoute(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.getRoute(id, tenantId);
  }

  @Post()
  @Roles('admin', 'manager', 'dispatcher')
  @ApiOperation({ summary: 'Create new route' })
  @ApiResponse({ status: 201, description: 'Route created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createRoute(
    @Body() createRouteDto: CreateRouteDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.createRoute(createRouteDto, userId, tenantId);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'dispatcher')
  @ApiOperation({ summary: 'Update route' })
  @ApiResponse({ status: 200, description: 'Route updated successfully' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async updateRoute(
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.updateRoute(id, updateRouteDto, userId, tenantId);
  }

  @Post('optimize')
  @Roles('admin', 'manager', 'dispatcher')
  @ApiOperation({ summary: 'Optimize routes' })
  @ApiResponse({ status: 200, description: 'Routes optimized successfully' })
  @ApiResponse({ status: 400, description: 'Invalid optimization parameters' })
  async optimizeRoutes(
    @Body() optimizeRouteDto: OptimizeRouteDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.optimizeRoutes(optimizeRouteDto, userId, tenantId);
  }

  @Post(':id/start')
  @Roles('admin', 'manager', 'dispatcher', 'driver')
  @ApiOperation({ summary: 'Start route' })
  @ApiResponse({ status: 200, description: 'Route started successfully' })
  @ApiResponse({ status: 400, description: 'Route cannot be started' })
  async startRoute(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.startRoute(id, userId, tenantId);
  }

  @Post(':id/complete')
  @Roles('admin', 'manager', 'dispatcher', 'driver')
  @ApiOperation({ summary: 'Complete route' })
  @ApiResponse({ status: 200, description: 'Route completed successfully' })
  @ApiResponse({ status: 400, description: 'Route cannot be completed' })
  async completeRoute(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.completeRoute(id, userId, tenantId);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get route tracking data' })
  @ApiResponse({ status: 200, description: 'Tracking data retrieved successfully' })
  async getRouteTracking(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.getRouteTracking(id, tenantId);
  }

  @Get(':id/stops')
  @ApiOperation({ summary: 'Get route stops' })
  @ApiResponse({ status: 200, description: 'Route stops retrieved successfully' })
  async getRouteStops(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.getRouteStops(id, tenantId);
  }

  @Post(':id/stops/:stopId/arrive')
  @Roles('admin', 'manager', 'dispatcher', 'driver')
  @ApiOperation({ summary: 'Mark stop as arrived' })
  @ApiResponse({ status: 200, description: 'Stop marked as arrived' })
  async arriveAtStop(
    @Param('id') id: string,
    @Param('stopId') stopId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.arriveAtStop(id, stopId, userId, tenantId);
  }

  @Post(':id/stops/:stopId/complete')
  @Roles('admin', 'manager', 'dispatcher', 'driver')
  @ApiOperation({ summary: 'Mark stop as completed' })
  @ApiResponse({ status: 200, description: 'Stop marked as completed' })
  async completeStop(
    @Param('id') id: string,
    @Param('stopId') stopId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.routesService.completeStop(id, stopId, userId, tenantId);
  }
}
