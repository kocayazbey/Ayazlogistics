import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { AnalyticsService } from '../ayaz-analytics/analytics.service';

@ApiTags('Analytics')
@Controller({ path: 'analytics', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get analytics dashboard data' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period for analytics' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardData(
    @Query('period') period?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getDashboardData(tenantId, period);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get key performance indicators' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for KPIs' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for KPIs' })
  @ApiResponse({ status: 200, description: 'KPIs retrieved successfully' })
  async getKPIs(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getKPIs(tenantId, { startDate, endDate });
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'period', required: false, description: 'Revenue period' })
  @ApiQuery({ name: 'groupBy', required: false, description: 'Group by field' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  async getRevenueAnalytics(
    @Query('period') period?: string,
    @Query('groupBy') groupBy?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getRevenueAnalytics(tenantId, { period, groupBy });
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer analytics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for customer analytics' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for customer analytics' })
  @ApiResponse({ status: 200, description: 'Customer analytics retrieved successfully' })
  async getCustomerAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getCustomerAnalytics(tenantId, { startDate, endDate });
  }

  @Get('operations')
  @ApiOperation({ summary: 'Get operations analytics' })
  @ApiQuery({ name: 'period', required: false, description: 'Operations period' })
  @ApiResponse({ status: 200, description: 'Operations analytics retrieved successfully' })
  async getOperationsAnalytics(
    @Query('period') period?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getOperationsAnalytics(tenantId, period);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for performance' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for performance' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getPerformanceMetrics(tenantId, { startDate, endDate });
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get trend analysis' })
  @ApiQuery({ name: 'metric', required: false, description: 'Trend metric' })
  @ApiQuery({ name: 'period', required: false, description: 'Trend period' })
  @ApiResponse({ status: 200, description: 'Trend analysis retrieved successfully' })
  async getTrendAnalysis(
    @Query('metric') metric?: string,
    @Query('period') period?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getTrendAnalysis(tenantId, { metric, period });
  }

  @Get('predictions')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Get predictive analytics' })
  @ApiQuery({ name: 'model', required: false, description: 'Prediction model' })
  @ApiQuery({ name: 'horizon', required: false, description: 'Prediction horizon' })
  @ApiResponse({ status: 200, description: 'Predictive analytics retrieved successfully' })
  async getPredictiveAnalytics(
    @Query('model') model?: string,
    @Query('horizon') horizon?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.getPredictiveAnalytics(tenantId, { model, horizon });
  }

  @Get('reports/custom')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Generate custom report' })
  @ApiQuery({ name: 'reportType', required: false, description: 'Report type' })
  @ApiQuery({ name: 'filters', required: false, description: 'Report filters' })
  @ApiResponse({ status: 200, description: 'Custom report generated successfully' })
  async generateCustomReport(
    @Query('reportType') reportType?: string,
    @Query('filters') filters?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.generateCustomReport(tenantId, { reportType, filters });
  }
}
