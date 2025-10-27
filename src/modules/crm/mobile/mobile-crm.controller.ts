import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { MobileCrmService } from './mobile-crm.service';

@ApiTags('Mobile CRM')
@Controller('api/crm')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MobileCrmController {
  constructor(private readonly mobileCrmService: MobileCrmService) {}

  @Get('opportunities')
  @Roles('sales_rep', 'manager')
  @ApiOperation({ summary: 'Get opportunities' })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'minValue', required: false, type: Number })
  @ApiQuery({ name: 'maxValue', required: false, type: Number })
  @ApiQuery({ name: 'probability', required: false, type: Number })
  async getOpportunities(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('stage') stage?: string,
    @Query('minValue') minValue?: number,
    @Query('maxValue') maxValue?: number,
    @Query('probability') probability?: number,
  ) {
    const filters = {
      stage,
      minValue,
      maxValue,
      probability,
    };
    return await this.mobileCrmService.getOpportunities(tenantId, userId, filters);
  }

  @Get('opportunities/:id')
  @Roles('sales_rep', 'manager')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  async getOpportunityById(
    @Param('id') opportunityId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.mobileCrmService.getOpportunityById(opportunityId, tenantId);
  }

  @Patch('opportunities/:id')
  @Roles('sales_rep', 'manager')
  @ApiOperation({ summary: 'Update opportunity' })
  async updateOpportunity(
    @Param('id') opportunityId: string,
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.mobileCrmService.updateOpportunity(opportunityId, data, tenantId);
  }

  @Get('customers')
  @Roles('sales_rep', 'manager')
  @ApiOperation({ summary: 'Get customers' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'minRevenue', required: false, type: Number })
  @ApiQuery({ name: 'maxRevenue', required: false, type: Number })
  async getCustomers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('minRevenue') minRevenue?: number,
    @Query('maxRevenue') maxRevenue?: number,
  ) {
    const filters = {
      status,
      search,
      minRevenue,
      maxRevenue,
    };
    return await this.mobileCrmService.getCustomers(tenantId, filters);
  }

  @Get('customers/:id')
  @Roles('sales_rep', 'manager')
  @ApiOperation({ summary: 'Get customer details' })
  async getCustomerDetails(
    @Param('id') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.mobileCrmService.getCustomerById(customerId, tenantId);
  }

  @Patch('customers/:id')
  @Roles('sales_rep', 'manager')
  @ApiOperation({ summary: 'Update customer' })
  async updateCustomer(
    @Param('id') customerId: string,
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.mobileCrmService.updateCustomer(customerId, data, tenantId);
  }

  @Get('customers/:id/contacts')
  @Roles('sales_rep', 'manager')
  @ApiOperation({ summary: 'Get customer contacts' })
  async getCustomerContacts(
    @Param('id') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.mobileCrmService.getCustomerContacts(customerId, tenantId);
  }

  @Get('pipeline')
  @Roles('sales_rep', 'manager')
  @ApiOperation({ summary: 'Get sales pipeline' })
  async getSalesPipeline(@CurrentUser('tenantId') tenantId: string) {
    return await this.mobileCrmService.getSalesPipeline(tenantId);
  }

  @Get('metrics')
  @Roles('sales_rep', 'manager')
  @ApiOperation({ summary: 'Get sales metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  async getSalesMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ) {
    return await this.mobileCrmService.getSalesMetrics(tenantId, period);
  }
}

