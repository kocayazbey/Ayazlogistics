import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { DynamicRouteOptimizationService } from './dynamic-route-optimization.service';
import {
  RouteOptimizationRequestDto,
  RouteOptimizationResponseDto,
  RealTimeDataDto,
  RouteHistoryDto,
  RoutePerformanceDto,
  RouteComparisonDto,
  RouteValidationDto,
  RouteSimulationDto,
} from './dynamic-route-optimization.dto';

@ApiTags('Dynamic Route Optimization')
@Controller({ path: 'tms/dynamic-route-optimization', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DynamicRouteOptimizationController {
  constructor(private readonly dynamicRouteOptimizationService: DynamicRouteOptimizationService) {}

  @Post('optimize')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Optimize routes with real-time data and constraints' })
  @ApiResponse({ status: 200, description: 'Route optimization completed successfully', type: RouteOptimizationResponseDto })
  async optimizeRoutes(
    @Body() request: RouteOptimizationRequestDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.optimizeRoutes(request, tenantId);
  }

  @Get('real-time-data')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get real-time traffic, weather, and fuel data' })
  @ApiQuery({ name: 'origin', required: true, description: 'Origin coordinates (lat,lng)' })
  @ApiQuery({ name: 'destination', required: true, description: 'Destination coordinates (lat,lng)' })
  @ApiResponse({ status: 200, description: 'Real-time data retrieved successfully', type: RealTimeDataDto })
  async getRealTimeData(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const [originLat, originLng] = origin.split(',').map(Number);
    const [destLat, destLng] = destination.split(',').map(Number);
    
    return this.dynamicRouteOptimizationService.getRealTimeData(
      { latitude: originLat, longitude: originLng },
      { latitude: destLat, longitude: destLng },
      tenantId,
    );
  }

  @Get('route-history/:routeId')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get historical performance data for a route' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Route history retrieved successfully', type: RouteHistoryDto })
  async getRouteHistory(
    @Param('routeId') routeId: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.getRouteHistory(routeId, tenantId, timeRange);
  }

  @Get('route-performance')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get route performance metrics and analytics' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'Vehicle ID filter' })
  @ApiQuery({ name: 'driverId', required: false, description: 'Driver ID filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Route performance retrieved successfully', type: RoutePerformanceDto })
  async getRoutePerformance(
    @Query('vehicleId') vehicleId: string,
    @Query('driverId') driverId: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.getRoutePerformance(
      vehicleId,
      driverId,
      tenantId,
      timeRange,
    );
  }

  @Post('compare-routes')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Compare multiple route options' })
  @ApiResponse({ status: 200, description: 'Route comparison completed successfully', type: RouteComparisonDto })
  async compareRoutes(
    @Body() comparisonRequest: { routes: any[]; criteria: string[] },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.compareRoutes(
      comparisonRequest.routes,
      comparisonRequest.criteria,
      tenantId,
    );
  }

  @Post('validate-route')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Validate route feasibility and constraints' })
  @ApiResponse({ status: 200, description: 'Route validation completed successfully', type: RouteValidationDto })
  async validateRoute(
    @Body() routeValidationRequest: { route: any; constraints: any },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.validateRoute(
      routeValidationRequest.route,
      routeValidationRequest.constraints,
      tenantId,
    );
  }

  @Post('simulate-route')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Simulate route execution with different scenarios' })
  @ApiResponse({ status: 200, description: 'Route simulation completed successfully', type: RouteSimulationDto })
  async simulateRoute(
    @Body() simulationRequest: { route: any; scenarios: any[] },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.simulateRoute(
      simulationRequest.route,
      simulationRequest.scenarios,
      tenantId,
    );
  }

  @Get('optimization-algorithms')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get available optimization algorithms' })
  @ApiResponse({ status: 200, description: 'Available algorithms retrieved successfully' })
  async getOptimizationAlgorithms() {
    return this.dynamicRouteOptimizationService.getOptimizationAlgorithms();
  }

  @Get('constraints')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get available route constraints' })
  @ApiResponse({ status: 200, description: 'Available constraints retrieved successfully' })
  async getAvailableConstraints() {
    return this.dynamicRouteOptimizationService.getAvailableConstraints();
  }

  @Get('fuel-prices')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get current fuel prices by region' })
  @ApiQuery({ name: 'region', required: false, description: 'Region filter' })
  @ApiResponse({ status: 200, description: 'Fuel prices retrieved successfully' })
  async getFuelPrices(
    @Query('region') region: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.getFuelPrices(region, tenantId);
  }

  @Get('traffic-conditions')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get current traffic conditions' })
  @ApiQuery({ name: 'region', required: false, description: 'Region filter' })
  @ApiResponse({ status: 200, description: 'Traffic conditions retrieved successfully' })
  async getTrafficConditions(
    @Query('region') region: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.getTrafficConditions(region, tenantId);
  }

  @Get('weather-conditions')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get current weather conditions' })
  @ApiQuery({ name: 'location', required: true, description: 'Location coordinates (lat,lng)' })
  @ApiResponse({ status: 200, description: 'Weather conditions retrieved successfully' })
  async getWeatherConditions(
    @Query('location') location: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const [lat, lng] = location.split(',').map(Number);
    return this.dynamicRouteOptimizationService.getWeatherConditions(
      { latitude: lat, longitude: lng },
      tenantId,
    );
  }

  @Get('route-recommendations')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get route recommendations based on historical data' })
  @ApiQuery({ name: 'origin', required: true, description: 'Origin coordinates (lat,lng)' })
  @ApiQuery({ name: 'destination', required: true, description: 'Destination coordinates (lat,lng)' })
  @ApiQuery({ name: 'vehicleType', required: false, description: 'Vehicle type filter' })
  @ApiResponse({ status: 200, description: 'Route recommendations retrieved successfully' })
  async getRouteRecommendations(
    @Query('origin') origin: string,
    @Query('destination') destination: string,
    @Query('vehicleType') vehicleType: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const [originLat, originLng] = origin.split(',').map(Number);
    const [destLat, destLng] = destination.split(',').map(Number);
    
    return this.dynamicRouteOptimizationService.getRouteRecommendations(
      { latitude: originLat, longitude: originLng },
      { latitude: destLat, longitude: destLng },
      vehicleType,
      tenantId,
    );
  }

  @Post('save-route')
  @Roles('admin', 'manager', 'dispatcher')
  @ApiOperation({ summary: 'Save optimized route for future use' })
  @ApiResponse({ status: 201, description: 'Route saved successfully' })
  async saveRoute(
    @Body() saveRouteRequest: { route: any; name: string; description?: string },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dynamicRouteOptimizationService.saveRoute(
      saveRouteRequest.route,
      saveRouteRequest.name,
      saveRouteRequest.description,
      tenantId,
      userId,
    );
  }

  @Get('saved-routes')
  @Roles('admin', 'manager', 'dispatcher', 'analyst')
  @ApiOperation({ summary: 'Get saved routes' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiResponse({ status: 200, description: 'Saved routes retrieved successfully' })
  async getSavedRoutes(
    @Query('search') search: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.getSavedRoutes(search, tenantId);
  }

  @Delete('saved-routes/:routeId')
  @Roles('admin', 'manager', 'dispatcher')
  @ApiOperation({ summary: 'Delete saved route' })
  @ApiParam({ name: 'routeId', description: 'Route ID' })
  @ApiResponse({ status: 200, description: 'Route deleted successfully' })
  async deleteSavedRoute(
    @Param('routeId') routeId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.dynamicRouteOptimizationService.deleteSavedRoute(routeId, tenantId);
  }
}
