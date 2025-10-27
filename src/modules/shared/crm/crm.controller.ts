import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UseFilters, UseInterceptors, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../common/guards/permission.guard';
import { TenantIsolationGuard } from '../../../common/guards/tenant-isolation.guard';
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { PerformanceInterceptor } from '../../../common/interceptors/performance.interceptor';
import { ResponseTransformInterceptor } from '../../../common/interceptors/response-transform.interceptor';
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
  CacheKey, CacheKeyShort, CacheKeyMedium, CacheKeyLong
} from '../../../common/decorators';
import { CRMService } from './services/crm.service';
import { CustomersService } from '../ayaz-crm/customers/customers.service';
import { LeadsService } from '../ayaz-crm/leads/leads.service';
import { DealersService } from '../ayaz-crm/dealers/dealers.service';
import { ActivitiesService } from '../ayaz-crm/activities/activities.service';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { GetCustomersDto } from './dto/get-customers.dto';
import { GetLeadsDto } from './dto/get-leads.dto';

@ApiTags('CRM')
@Controller({ path: 'crm', version: '1' })
@UseGuards(JwtAuthGuard, TenantIsolationGuard, PermissionGuard, RateLimitGuard)
@UseInterceptors(AuditInterceptor, PerformanceInterceptor, ResponseTransformInterceptor)
@SecurityStrict()
@MonitoringFull()
@AnalyticsBusiness()
@TenantIsolated()
@TrackPerformance()
@RateLimitAPI()
@ApiBearerAuth()
export class CRMController {
  private readonly logger = new Logger(CRMController.name);
  constructor(
    private readonly crmService: CRMService,
    private readonly customersService: CustomersService,
    private readonly leadsService: LeadsService,
    private readonly dealersService: DealersService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Get('customers')
  @ApiOperation({ 
    summary: 'Get customers',
    description: 'Retrieve customers with comprehensive filtering, pagination, and security controls'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Customers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: { $ref: '#/components/schemas/Customer' } },
        meta: { $ref: '#/components/schemas/PaginationMeta' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @AuditRead('customers')
  @RequirePermissions('crm:customers:read')
  @RequireRoles('admin', 'manager', 'sales_manager', 'customer_service')
  @TrackPerformance()
  @SecurityModerate()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @RateLimitAPI()
  @CacheKeyMedium('customers')
  async getCustomers(
    @CurrentUser('tenantId') tenantId: string, 
    @Query() query: GetCustomersDto
  ) {
    try {
      this.logger.log(`Getting customers for tenant: ${tenantId}`);
      
      if (!tenantId) {
        throw new HttpException('Tenant ID is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.crmService.getCustomers(tenantId, query);
      
      this.logger.log(`Successfully retrieved ${result.data?.length || 0} customers for tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to get customers for tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to retrieve customers: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('customers/stats')
  @ApiOperation({ summary: 'Get customer statistics' })
  @ApiResponse({ status: 200, description: 'Returns customer statistics' })
  async getCustomerStats(@CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getCustomerStats(tenantId);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create customer' })
  async createCustomer(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.createCustomer(data, tenantId, userId);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer by ID' })
  @ApiResponse({ status: 200, description: 'Returns customer details with activities' })
  async getCustomerById(@Param('id') customerId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getCustomerById(customerId, tenantId);
  }

  @Put('customers/:id')
  @ApiOperation({ summary: 'Update customer' })
  async updateCustomer(@Param('id') customerId: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.updateCustomer(customerId, data, tenantId);
  }

  @Get('leads')
  @ApiOperation({ summary: 'Get leads' })
  @ApiResponse({ status: 200, description: 'Returns list of leads' })
  async getLeads(@CurrentUser('tenantId') tenantId: string, @Query() query: GetLeadsDto) {
    return this.crmService.getLeads(tenantId, query);
  }

  @Get('leads/stats')
  @ApiOperation({ summary: 'Get lead statistics' })
  @ApiResponse({ status: 200, description: 'Returns lead statistics' })
  async getLeadStats(@CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getLeadStats(tenantId);
  }

  @Post('leads')
  @ApiOperation({ summary: 'Create lead' })
  async createLead(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.createLead(data, tenantId, userId);
  }

  @Get('leads/:id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Returns lead details with activities' })
  async getLeadById(@Param('id') leadId: string, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.getLeadById(leadId, tenantId);
  }

  @Put('leads/:id')
  @ApiOperation({ summary: 'Update lead' })
  async updateLead(@Param('id') leadId: string, @Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.crmService.updateLead(leadId, data, tenantId);
  }

  @Post('leads/:id/convert')
  @ApiOperation({ summary: 'Convert lead to customer' })
  @ApiResponse({ status: 200, description: 'Returns converted customer and updated lead' })
  async convertLead(@Param('id') leadId: string, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.crmService.convertLeadToCustomer(leadId, tenantId, userId);
  }

  @Get('dealers')
  @ApiOperation({ summary: 'Get dealers' })
  async getDealers(@CurrentUser('tenantId') tenantId: string) {
    return this.dealersService.getDealers(tenantId);
  }

  @Post('dealers')
  @ApiOperation({ summary: 'Create dealer' })
  async createDealer(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.dealersService.createDealer(data, tenantId, userId);
  }

  @Get('activities')
  @ApiOperation({ summary: 'Get activities' })
  async getActivities(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.activitiesService.getActivities(tenantId, filters);
  }

  @Post('activities')
  @ApiOperation({ summary: 'Create activity' })
  async createActivity(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.activitiesService.createActivity(data, tenantId, userId);
  }
}

