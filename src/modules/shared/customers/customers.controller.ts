import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@Controller({ path: 'customers', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles('admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Customers list retrieved successfully' })
  async getCustomers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.customersService.getAll(tenantId, { page, limit, search, type, status });
  }

  @Get('stats')
  @Roles('admin', 'sales')
  @ApiOperation({ summary: 'Get customer statistics' })
  async getStats(@CurrentUser('tenantId') tenantId: string) {
    return this.customersService.getStats(tenantId);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get customer types' })
  async getTypes(@CurrentUser('tenantId') tenantId: string) {
    return this.customersService.getTypes(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Get customer by ID' })
  async getCustomerById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.customersService.getById(id, tenantId);
  }

  @Post()
  @Roles('admin', 'sales')
  @ApiOperation({ summary: 'Create new customer' })
  async createCustomer(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.customersService.create(data, tenantId, userId);
  }

  @Put(':id')
  @Roles('admin', 'sales')
  @ApiOperation({ summary: 'Update customer' })
  async updateCustomer(@Param('id') id: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.customersService.update(id, data, tenantId);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete customer' })
  async deleteCustomer(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.customersService.delete(id, tenantId);
  }

  @Patch(':id/status')
  @Roles('admin', 'sales')
  @ApiOperation({ summary: 'Update customer status' })
  async updateStatus(
    @Param('id') id: string, 
    @Body('status') status: string, 
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.customersService.updateStatus(id, status, tenantId);
  }

  @Get(':id/orders')
  @Roles('admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Get customer orders' })
  async getCustomerOrders(
    @Param('id') id: string, 
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.customersService.getCustomerOrders(id, tenantId, { page, limit });
  }

  @Get(':id/activities')
  @Roles('admin', 'sales', 'operator')
  @ApiOperation({ summary: 'Get customer activities' })
  async getCustomerActivities(
    @Param('id') id: string, 
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    return this.customersService.getCustomerActivities(id, tenantId, { page, limit });
  }
}
