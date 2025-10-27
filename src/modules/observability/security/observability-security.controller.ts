import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { ObservabilitySecurityService } from './observability-security.service';
import { CreateLogEntryDto } from './dto/create-log-entry.dto';
import { CreateMetricDto } from './dto/create-metric.dto';
import { CreateSSOProviderDto } from './dto/create-sso-provider.dto';
import { CreateMFAConfigDto } from './dto/create-mfa-config.dto';
import { CreateKeyManagementDto } from './dto/create-key-management.dto';

@ApiTags('Observability & Security')
@Controller({ path: 'observability', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ObservabilitySecurityController {
  constructor(private readonly observabilitySecurityService: ObservabilitySecurityService) {}

  @Get('dashboard')
  @Roles('admin', 'security_manager', 'viewer')
  @ApiOperation({ summary: 'Get observability and security dashboard' })
  @ApiResponse({ status: 200, description: 'Observability and security dashboard retrieved successfully' })
  async getObservabilitySecurityDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.observabilitySecurityService.getObservabilitySecurityDashboard(tenantId);
  }

  @Post('logs')
  @Roles('admin', 'security_manager')
  @ApiOperation({ summary: 'Create log entry' })
  @ApiResponse({ status: 201, description: 'Log entry created successfully' })
  async createLogEntry(
    @Body() createLogEntryDto: CreateLogEntryDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.observabilitySecurityService.createLogEntry({ ...createLogEntryDto, tenantId });
  }

  @Get('logs')
  @Roles('admin', 'security_manager', 'viewer')
  @ApiOperation({ summary: 'Get logs' })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  @ApiQuery({ name: 'level', required: false, type: String })
  @ApiQuery({ name: 'service', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLogs(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: {
      level?: string;
      service?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ) {
    const filters = {
      level: query.level,
      service: query.service,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
    };
    return this.observabilitySecurityService.getLogs(tenantId, filters);
  }

  @Post('metrics')
  @Roles('admin', 'security_manager')
  @ApiOperation({ summary: 'Create metric' })
  @ApiResponse({ status: 201, description: 'Metric created successfully' })
  async createMetric(
    @Body() createMetricDto: CreateMetricDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.observabilitySecurityService.createMetric({ ...createMetricDto, tenantId });
  }

  @Get('metrics')
  @Roles('admin', 'security_manager', 'viewer')
  @ApiOperation({ summary: 'Get metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: {
      name?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    return this.observabilitySecurityService.getMetrics(
      tenantId,
      query.name,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined
    );
  }

  @Post('sso-providers')
  @Roles('admin', 'security_manager')
  @ApiOperation({ summary: 'Create SSO provider' })
  @ApiResponse({ status: 201, description: 'SSO provider created successfully' })
  async createSSOProvider(
    @Body() createSSOProviderDto: CreateSSOProviderDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.observabilitySecurityService.createSSOProvider({ ...createSSOProviderDto, tenantId });
  }

  @Post('mfa-configs')
  @Roles('admin', 'security_manager')
  @ApiOperation({ summary: 'Create MFA config' })
  @ApiResponse({ status: 201, description: 'MFA config created successfully' })
  async createMFAConfig(
    @Body() createMFAConfigDto: CreateMFAConfigDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.observabilitySecurityService.createMFAConfig({ ...createMFAConfigDto, tenantId });
  }

  @Post('key-management')
  @Roles('admin', 'security_manager')
  @ApiOperation({ summary: 'Create key management' })
  @ApiResponse({ status: 201, description: 'Key management created successfully' })
  async createKeyManagement(
    @Body() createKeyManagementDto: CreateKeyManagementDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.observabilitySecurityService.createKeyManagement({ ...createKeyManagementDto, tenantId });
  }
}
