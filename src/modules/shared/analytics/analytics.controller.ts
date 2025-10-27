import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { AnalyticsService } from './services/analytics.service';
import { DashboardService } from '../ayaz-analytics/dashboards/dashboard.service';
import { KPIService } from '../ayaz-analytics/kpi/kpi.service';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('Analytics')
@Controller({ path: 'analytics', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly dashboardService: DashboardService,
    private readonly kpiService: KPIService,
  ) {}

  @Get('dashboards')
  @ApiOperation({ summary: 'Get dashboards' })
  async getDashboards(@CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.getDashboards(tenantId);
  }

  @Post('dashboards')
  @ApiOperation({ summary: 'Create dashboard' })
  async createDashboard(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.dashboardService.createDashboard(data, tenantId);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get KPIs' })
  async getKPIs(@CurrentUser('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.kpiService.getKPIs(tenantId, category);
  }

  @Post('kpis')
  @ApiOperation({ summary: 'Create KPI' })
  async createKPI(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.kpiService.createKPI(data, tenantId);
  }

  @Get('kpis/dashboard')
  @ApiOperation({ summary: 'Get KPI dashboard' })
  async getKPIDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.kpiService.getKPIDashboard(tenantId, new Date(periodStart), new Date(periodEnd));
  }

  @Get('dashboard-metrics')
  @ApiOperation({ summary: 'Get comprehensive dashboard KPIs' })
  @ApiResponse({ status: 200, description: 'Returns comprehensive dashboard metrics' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getDashboardMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    return this.analyticsService.getDashboardKPIs(tenantId, start, end);
  }

  @Get('financial-summary')
  @ApiOperation({ summary: 'Get financial summary' })
  @ApiResponse({ status: 200, description: 'Returns financial summary by period' })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'month', required: false })
  async getFinancialSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.analyticsService.getFinancialSummary(
      tenantId,
      parseInt(year),
      month ? parseInt(month) : undefined
    );
  }

  @Get('operational-metrics')
  @ApiOperation({ summary: 'Get operational metrics' })
  @ApiResponse({ status: 200, description: 'Returns operational performance metrics' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getOperationalMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.analyticsService.getOperationalMetrics(
      tenantId,
      new Date(startDate),
      new Date(endDate)
    );
  }
}

