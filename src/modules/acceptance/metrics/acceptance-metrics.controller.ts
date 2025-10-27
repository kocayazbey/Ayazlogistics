import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { AcceptanceMetricsService } from './acceptance-metrics.service';
import { CreateNRRMetricDto } from './dto/create-nrr-metric.dto';
import { CreateSLAMetricDto } from './dto/create-sla-metric.dto';
import { CreateIncidentMetricDto } from './dto/create-incident-metric.dto';
import { CreateCostPerOrderDto } from './dto/create-cost-per-order.dto';

@ApiTags('Acceptance Metrics')
@Controller({ path: 'acceptance-metrics', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AcceptanceMetricsController {
  constructor(private readonly acceptanceMetricsService: AcceptanceMetricsService) {}

  @Get('dashboard')
  @Roles('admin', 'metrics_manager', 'viewer')
  @ApiOperation({ summary: 'Get acceptance metrics dashboard' })
  @ApiResponse({ status: 200, description: 'Acceptance metrics dashboard retrieved successfully' })
  async getAcceptanceMetricsDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.acceptanceMetricsService.getAcceptanceMetricsDashboard(tenantId);
  }

  @Post('nrr-metrics')
  @Roles('admin', 'metrics_manager')
  @ApiOperation({ summary: 'Record NRR metric' })
  @ApiResponse({ status: 201, description: 'NRR metric recorded successfully' })
  async recordNRRMetric(
    @Body() createNRRMetricDto: CreateNRRMetricDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.acceptanceMetricsService.recordNRRMetric({ ...createNRRMetricDto, tenantId });
  }

  @Get('nrr-metrics')
  @Roles('admin', 'metrics_manager', 'viewer')
  @ApiOperation({ summary: 'Get NRR metrics' })
  @ApiResponse({ status: 200, description: 'NRR metrics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getNRRMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { period?: string }
  ) {
    return this.acceptanceMetricsService.getNRRMetrics(tenantId, query.period);
  }

  @Post('sla-metrics')
  @Roles('admin', 'metrics_manager')
  @ApiOperation({ summary: 'Record SLA metric' })
  @ApiResponse({ status: 201, description: 'SLA metric recorded successfully' })
  async recordSLAMetric(
    @Body() createSLAMetricDto: CreateSLAMetricDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.acceptanceMetricsService.recordSLAMetric({ ...createSLAMetricDto, tenantId });
  }

  @Get('sla-metrics')
  @Roles('admin', 'metrics_manager', 'viewer')
  @ApiOperation({ summary: 'Get SLA metrics' })
  @ApiResponse({ status: 200, description: 'SLA metrics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getSLAMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { period?: string }
  ) {
    return this.acceptanceMetricsService.getSLAMetrics(tenantId, query.period);
  }

  @Post('incident-metrics')
  @Roles('admin', 'metrics_manager')
  @ApiOperation({ summary: 'Record incident metric' })
  @ApiResponse({ status: 201, description: 'Incident metric recorded successfully' })
  async recordIncidentMetric(
    @Body() createIncidentMetricDto: CreateIncidentMetricDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.acceptanceMetricsService.recordIncidentMetric({ ...createIncidentMetricDto, tenantId });
  }

  @Get('incident-metrics')
  @Roles('admin', 'metrics_manager', 'viewer')
  @ApiOperation({ summary: 'Get incident metrics' })
  @ApiResponse({ status: 200, description: 'Incident metrics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getIncidentMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { period?: string }
  ) {
    return this.acceptanceMetricsService.getIncidentMetrics(tenantId, query.period);
  }

  @Post('cost-per-order')
  @Roles('admin', 'metrics_manager')
  @ApiOperation({ summary: 'Record cost per order' })
  @ApiResponse({ status: 201, description: 'Cost per order recorded successfully' })
  async recordCostPerOrder(
    @Body() createCostPerOrderDto: CreateCostPerOrderDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.acceptanceMetricsService.recordCostPerOrder({ ...createCostPerOrderDto, tenantId });
  }

  @Get('cost-per-order')
  @Roles('admin', 'metrics_manager', 'viewer')
  @ApiOperation({ summary: 'Get cost per order' })
  @ApiResponse({ status: 200, description: 'Cost per order retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getCostPerOrder(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { period?: string }
  ) {
    return this.acceptanceMetricsService.getCostPerOrder(tenantId, query.period);
  }
}
