import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { VehicleTrackingService } from './vehicle-tracking.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@ApiTags('Vehicle Tracking')
@Controller({ path: 'vehicle-tracking', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VehicleTrackingController {
  constructor(private readonly vehicleTrackingService: VehicleTrackingService) {}

  @Get('vehicles')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  async getVehicles(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.vehicleTrackingService.getVehicles(tenantId, { page, limit, status });
  }

  @Get('vehicles/:id')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({ status: 200, description: 'Vehicle retrieved successfully' })
  async getVehicleById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.vehicleTrackingService.getVehicleById(id, tenantId);
  }

  @Get('vehicles/:id/location')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get vehicle current location' })
  @ApiResponse({ status: 200, description: 'Vehicle location retrieved successfully' })
  async getVehicleLocation(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.vehicleTrackingService.getVehicleLocation(id, tenantId);
  }

  @Post('vehicles/:id/location')
  @Roles('driver')
  @ApiOperation({ summary: 'Update vehicle location' })
  @ApiResponse({ status: 200, description: 'Vehicle location updated successfully' })
  async updateVehicleLocation(
    @Param('id') id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehicleTrackingService.updateVehicleLocation(id, updateLocationDto, tenantId, userId);
  }

  @Get('vehicles/:id/history')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get vehicle location history' })
  @ApiResponse({ status: 200, description: 'Vehicle history retrieved successfully' })
  async getVehicleHistory(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.vehicleTrackingService.getVehicleHistory(id, tenantId, { dateFrom, dateTo });
  }

  @Get('drivers')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get all drivers' })
  @ApiResponse({ status: 200, description: 'Drivers retrieved successfully' })
  async getDrivers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.vehicleTrackingService.getDrivers(tenantId, { page, limit, status });
  }

  @Get('drivers/:id')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get driver by ID' })
  @ApiResponse({ status: 200, description: 'Driver retrieved successfully' })
  async getDriverById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.vehicleTrackingService.getDriverById(id, tenantId);
  }

  @Get('drivers/:id/status')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get driver status' })
  @ApiResponse({ status: 200, description: 'Driver status retrieved successfully' })
  async getDriverStatus(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.vehicleTrackingService.getDriverStatus(id, tenantId);
  }

  @Post('drivers/:id/status')
  @Roles('driver')
  @ApiOperation({ summary: 'Update driver status' })
  @ApiResponse({ status: 200, description: 'Driver status updated successfully' })
  async updateDriverStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.vehicleTrackingService.updateDriverStatus(id, status, tenantId);
  }

  @Get('routes')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get all routes' })
  @ApiResponse({ status: 200, description: 'Routes retrieved successfully' })
  async getRoutes(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.vehicleTrackingService.getRoutes(tenantId, { page, limit, status, driverId });
  }

  @Get('routes/:id')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get route by ID' })
  @ApiResponse({ status: 200, description: 'Route retrieved successfully' })
  async getRouteById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.vehicleTrackingService.getRouteById(id, tenantId);
  }

  @Post('routes')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Create new route' })
  @ApiResponse({ status: 201, description: 'Route created successfully' })
  async createRoute(
    @Body() createRouteDto: CreateRouteDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehicleTrackingService.createRoute(createRouteDto, tenantId, userId);
  }

  @Put('routes/:id')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Update route' })
  @ApiResponse({ status: 200, description: 'Route updated successfully' })
  async updateRoute(
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.vehicleTrackingService.updateRoute(id, updateRouteDto, tenantId);
  }

  @Post('routes/:id/start')
  @Roles('driver')
  @ApiOperation({ summary: 'Start route' })
  @ApiResponse({ status: 200, description: 'Route started successfully' })
  async startRoute(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehicleTrackingService.startRoute(id, tenantId, userId);
  }

  @Post('routes/:id/complete')
  @Roles('driver')
  @ApiOperation({ summary: 'Complete route' })
  @ApiResponse({ status: 200, description: 'Route completed successfully' })
  async completeRoute(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehicleTrackingService.completeRoute(id, tenantId, userId);
  }

  @Get('routes/:id/stops')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get route stops' })
  @ApiResponse({ status: 200, description: 'Route stops retrieved successfully' })
  async getRouteStops(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.vehicleTrackingService.getRouteStops(id, tenantId);
  }

  @Post('routes/:id/stops/:stopId/arrive')
  @Roles('driver')
  @ApiOperation({ summary: 'Mark stop as arrived' })
  @ApiResponse({ status: 200, description: 'Stop marked as arrived successfully' })
  async arriveAtStop(
    @Param('id') id: string,
    @Param('stopId') stopId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehicleTrackingService.arriveAtStop(id, stopId, tenantId, userId);
  }

  @Post('routes/:id/stops/:stopId/complete')
  @Roles('driver')
  @ApiOperation({ summary: 'Mark stop as completed' })
  @ApiResponse({ status: 200, description: 'Stop marked as completed successfully' })
  async completeStop(
    @Param('id') id: string,
    @Param('stopId') stopId: string,
    @Body('notes') notes: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehicleTrackingService.completeStop(id, stopId, notes, tenantId, userId);
  }

  @Get('deliveries')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get all deliveries' })
  @ApiResponse({ status: 200, description: 'Deliveries retrieved successfully' })
  async getDeliveries(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.vehicleTrackingService.getDeliveries(tenantId, { page, limit, status, driverId });
  }

  @Get('deliveries/:id')
  @Roles('admin', 'warehouse_manager', 'operator', 'driver')
  @ApiOperation({ summary: 'Get delivery by ID' })
  @ApiResponse({ status: 200, description: 'Delivery retrieved successfully' })
  async getDeliveryById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.vehicleTrackingService.getDeliveryById(id, tenantId);
  }

  @Post('deliveries/:id/pickup')
  @Roles('driver')
  @ApiOperation({ summary: 'Mark delivery as picked up' })
  @ApiResponse({ status: 200, description: 'Delivery marked as picked up successfully' })
  async pickupDelivery(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehicleTrackingService.pickupDelivery(id, tenantId, userId);
  }

  @Post('deliveries/:id/deliver')
  @Roles('driver')
  @ApiOperation({ summary: 'Mark delivery as delivered' })
  @ApiResponse({ status: 200, description: 'Delivery marked as delivered successfully' })
  async deliverDelivery(
    @Param('id') id: string,
    @Body('signature') signature: string,
    @Body('notes') notes: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehicleTrackingService.deliverDelivery(id, signature, notes, tenantId, userId);
  }

  @Get('analytics/dashboard')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Get tracking analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Analytics dashboard retrieved successfully' })
  async getAnalyticsDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.vehicleTrackingService.getAnalyticsDashboard(tenantId, { dateFrom, dateTo });
  }

  @Get('analytics/performance')
  @Roles('admin', 'warehouse_manager')
  @ApiOperation({ summary: 'Get driver performance analytics' })
  @ApiResponse({ status: 200, description: 'Performance analytics retrieved successfully' })
  async getPerformanceAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('driverId') driverId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.vehicleTrackingService.getPerformanceAnalytics(tenantId, { driverId, dateFrom, dateTo });
  }

  @Get('alerts')
  @Roles('admin', 'warehouse_manager', 'operator')
  @ApiOperation({ summary: 'Get tracking alerts' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  async getAlerts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('type') type?: string,
    @Query('severity') severity?: string,
  ) {
    return this.vehicleTrackingService.getAlerts(tenantId, { type, severity });
  }
}
