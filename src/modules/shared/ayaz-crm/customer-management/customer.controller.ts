import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('CRM - Customer Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/crm/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.customerService.findAll(user.tenantId, { status, type, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customerService.findOne(id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  async create(@CurrentUser() user: any, @Body() customerData: any) {
    return this.customerService.create(customerData, user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() customerData: any,
  ) {
    return this.customerService.update(id, customerData, user.tenantId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update customer status' })
  @ApiResponse({ status: 200, description: 'Customer status updated successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.customerService.updateStatus(id, status, user.tenantId);
  }

  @Get('metrics/overview')
  @ApiOperation({ summary: 'Get customer metrics' })
  @ApiResponse({ status: 200, description: 'Customer metrics retrieved successfully' })
  async getMetrics(@CurrentUser() user: any) {
    return this.customerService.getCustomerMetrics(user.tenantId);
  }

  @Get(':id/value')
  @ApiOperation({ summary: 'Get customer value' })
  @ApiResponse({ status: 200, description: 'Customer value retrieved successfully' })
  async getCustomerValue(@CurrentUser() user: any, @Param('id') id: string) {
    return this.customerService.getCustomerValue(id, user.tenantId);
  }

  @Get('segments/analysis')
  @ApiOperation({ summary: 'Get customer segments' })
  @ApiResponse({ status: 200, description: 'Customer segments retrieved successfully' })
  async getSegments(@CurrentUser() user: any) {
    return this.customerService.getCustomerSegments(user.tenantId);
  }
}
