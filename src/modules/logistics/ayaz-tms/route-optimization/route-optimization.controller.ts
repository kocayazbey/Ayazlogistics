import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { RouteOptimizationService } from './route-optimization.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('TMS - Route Optimization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/tms/routes')
export class RouteOptimizationController {
  constructor(private readonly routeOptimizationService: RouteOptimizationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all routes' })
  @ApiResponse({ status: 200, description: 'Routes retrieved successfully' })
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.routeOptimizationService.findAll(user.tenantId, { status, vehicleId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route by ID' })
  @ApiResponse({ status: 200, description: 'Route retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.routeOptimizationService.findOne(id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new route' })
  @ApiResponse({ status: 201, description: 'Route created successfully' })
  async create(@CurrentUser() user: any, @Body() routeData: any) {
    return this.routeOptimizationService.create(routeData, user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update route' })
  @ApiResponse({ status: 200, description: 'Route updated successfully' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() routeData: any,
  ) {
    return this.routeOptimizationService.update(id, routeData, user.tenantId);
  }

  @Post(':id/optimize')
  @ApiOperation({ summary: 'Optimize route' })
  @ApiResponse({ status: 200, description: 'Route optimized successfully' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  async optimizeRoute(@CurrentUser() user: any, @Param('id') id: string) {
    return this.routeOptimizationService.optimizeRoute(id, user.tenantId);
  }

  @Get('metrics/overview')
  @ApiOperation({ summary: 'Get route metrics' })
  @ApiResponse({ status: 200, description: 'Route metrics retrieved successfully' })
  async getMetrics(@CurrentUser() user: any) {
    return this.routeOptimizationService.getRouteMetrics(user.tenantId);
  }

  @Get(':id/fuel-optimization')
  @ApiOperation({ summary: 'Get fuel optimization for route' })
  @ApiResponse({ status: 200, description: 'Fuel optimization retrieved successfully' })
  async getFuelOptimization(@CurrentUser() user: any, @Param('id') id: string) {
    return this.routeOptimizationService.getFuelOptimization(id, user.tenantId);
  }
}
