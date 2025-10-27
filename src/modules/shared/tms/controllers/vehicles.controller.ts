import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { VehiclesService } from '../ayaz-tms/vehicles/vehicles.service';
import { CreateVehicleDto } from '../ayaz-tms/vehicles/dto/create-vehicle.dto';
import { UpdateVehicleDto } from '../ayaz-tms/vehicles/dto/update-vehicle.dto';

@ApiTags('TMS Vehicles')
@Controller({ path: 'tms/vehicles', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all vehicles' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by vehicle status' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by vehicle type' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Vehicles retrieved successfully' })
  async getVehicles(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.getVehicles({
      tenantId,
      status,
      type,
      search,
      page,
      limit
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get vehicles statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getVehiclesStats(@CurrentUser('tenantId') tenantId: string) {
    return this.vehiclesService.getVehiclesStats(tenantId);
  }

  @Get('maintenance')
  @ApiOperation({ summary: 'Get vehicles requiring maintenance' })
  @ApiQuery({ name: 'dueDate', required: false, description: 'Maintenance due date' })
  @ApiResponse({ status: 200, description: 'Maintenance vehicles retrieved successfully' })
  async getMaintenanceVehicles(
    @Query('dueDate') dueDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.getMaintenanceVehicles(tenantId, dueDate);
  }

  @Get('fuel-efficiency')
  @ApiOperation({ summary: 'Get fuel efficiency report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for report' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for report' })
  @ApiResponse({ status: 200, description: 'Fuel efficiency report retrieved successfully' })
  async getFuelEfficiencyReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.getFuelEfficiencyReport(tenantId, { startDate, endDate });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  @ApiResponse({ status: 200, description: 'Vehicle retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async getVehicle(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.getVehicle(id, tenantId);
  }

  @Post()
  @Roles('admin', 'manager', 'fleet_manager')
  @ApiOperation({ summary: 'Create new vehicle' })
  @ApiResponse({ status: 201, description: 'Vehicle created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createVehicle(
    @Body() createVehicleDto: CreateVehicleDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.createVehicle(createVehicleDto, userId, tenantId);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'fleet_manager')
  @ApiOperation({ summary: 'Update vehicle' })
  @ApiResponse({ status: 200, description: 'Vehicle updated successfully' })
  @ApiResponse({ status: 404, description: 'Vehicle not found' })
  async updateVehicle(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.updateVehicle(id, updateVehicleDto, userId, tenantId);
  }

  @Get(':id/routes')
  @ApiOperation({ summary: 'Get vehicle routes' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by route status' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for routes' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for routes' })
  @ApiResponse({ status: 200, description: 'Vehicle routes retrieved successfully' })
  async getVehicleRoutes(
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.getVehicleRoutes(id, tenantId, { status, startDate, endDate });
  }

  @Get(':id/maintenance')
  @ApiOperation({ summary: 'Get vehicle maintenance history' })
  @ApiResponse({ status: 200, description: 'Maintenance history retrieved successfully' })
  async getVehicleMaintenance(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.getVehicleMaintenance(id, tenantId);
  }

  @Get(':id/fuel-consumption')
  @ApiOperation({ summary: 'Get vehicle fuel consumption' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for consumption' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for consumption' })
  @ApiResponse({ status: 200, description: 'Fuel consumption retrieved successfully' })
  async getVehicleFuelConsumption(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.getVehicleFuelConsumption(id, tenantId, { startDate, endDate });
  }

  @Get(':id/location')
  @ApiOperation({ summary: 'Get vehicle current location' })
  @ApiResponse({ status: 200, description: 'Vehicle location retrieved successfully' })
  async getVehicleLocation(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.getVehicleLocation(id, tenantId);
  }

  @Post(':id/maintenance')
  @Roles('admin', 'manager', 'fleet_manager', 'mechanic')
  @ApiOperation({ summary: 'Schedule vehicle maintenance' })
  @ApiResponse({ status: 201, description: 'Maintenance scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid maintenance data' })
  async scheduleMaintenance(
    @Param('id') id: string,
    @Body() maintenanceData: any,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.vehiclesService.scheduleMaintenance(id, maintenanceData, userId, tenantId);
  }
}
