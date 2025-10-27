import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { PerformanceMetricsService } from './performance-metrics.service';
import {
  PerformanceMetricsRequestDto,
  PerformanceMetricsResponseDto,
  KPIDto,
  DashboardDto,
  ReportDto,
  AlertDto,
  BenchmarkDto,
  TrendDto,
  ComparisonDto,
  ForecastDto,
} from './performance-metrics.dto';

@ApiTags('Performance Metrics & Analytics')
@Controller({ path: 'analytics/performance-metrics', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PerformanceMetricsController {
  constructor(private readonly performanceMetricsService: PerformanceMetricsService) {}

  @Get('metrics')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get comprehensive performance metrics' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiQuery({ name: 'department', required: false, description: 'Department filter' })
  @ApiQuery({ name: 'metricType', required: false, description: 'Metric type filter' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully', type: PerformanceMetricsResponseDto })
  async getPerformanceMetrics(
    @Query('timeRange') timeRange: number = 30,
    @Query('department') department: string,
    @Query('metricType') metricType: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getPerformanceMetrics(tenantId, timeRange, department, metricType);
  }

  @Get('kpis')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get key performance indicators' })
  @ApiQuery({ name: 'category', required: false, description: 'KPI category filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'KPIs retrieved successfully', type: [KPIDto] })
  async getKPIs(
    @Query('category') category: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getKPIs(tenantId, category, timeRange);
  }

  @Get('dashboard')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get performance dashboard' })
  @ApiQuery({ name: 'dashboardType', required: false, description: 'Dashboard type filter' })
  @ApiResponse({ status: 200, description: 'Performance dashboard retrieved successfully', type: DashboardDto })
  async getDashboard(
    @Query('dashboardType') dashboardType: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getDashboard(tenantId, dashboardType);
  }

  @Get('reports')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get performance reports' })
  @ApiQuery({ name: 'reportType', required: false, description: 'Report type filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Performance reports retrieved successfully', type: [ReportDto] })
  async getReports(
    @Query('reportType') reportType: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getReports(tenantId, reportType, timeRange);
  }

  @Get('alerts')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get performance alerts' })
  @ApiQuery({ name: 'severity', required: false, description: 'Alert severity filter' })
  @ApiQuery({ name: 'status', required: false, description: 'Alert status filter' })
  @ApiResponse({ status: 200, description: 'Performance alerts retrieved successfully', type: [AlertDto] })
  async getAlerts(
    @Query('severity') severity: string,
    @Query('status') status: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getAlerts(tenantId, severity, status);
  }

  @Get('benchmarks')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get performance benchmarks' })
  @ApiQuery({ name: 'industry', required: false, description: 'Industry filter' })
  @ApiQuery({ name: 'companySize', required: false, description: 'Company size filter' })
  @ApiResponse({ status: 200, description: 'Performance benchmarks retrieved successfully', type: [BenchmarkDto] })
  async getBenchmarks(
    @Query('industry') industry: string,
    @Query('companySize') companySize: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getBenchmarks(tenantId, industry, companySize);
  }

  @Get('trends')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get performance trends' })
  @ApiQuery({ name: 'metric', required: false, description: 'Metric filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 90 })
  @ApiResponse({ status: 200, description: 'Performance trends retrieved successfully', type: [TrendDto] })
  async getTrends(
    @Query('metric') metric: string,
    @Query('timeRange') timeRange: number = 90,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getTrends(tenantId, metric, timeRange);
  }

  @Get('comparisons')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get performance comparisons' })
  @ApiQuery({ name: 'comparisonType', required: false, description: 'Comparison type filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Performance comparisons retrieved successfully', type: [ComparisonDto] })
  async getComparisons(
    @Query('comparisonType') comparisonType: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getComparisons(tenantId, comparisonType, timeRange);
  }

  @Get('forecasts')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get performance forecasts' })
  @ApiQuery({ name: 'metric', required: false, description: 'Metric filter' })
  @ApiQuery({ name: 'forecastPeriod', required: false, description: 'Forecast period in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Performance forecasts retrieved successfully', type: [ForecastDto] })
  async getForecasts(
    @Query('metric') metric: string,
    @Query('forecastPeriod') forecastPeriod: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getForecasts(tenantId, metric, forecastPeriod);
  }

  @Get('real-time')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get real-time performance metrics' })
  @ApiQuery({ name: 'metric', required: false, description: 'Metric filter' })
  @ApiResponse({ status: 200, description: 'Real-time metrics retrieved successfully' })
  async getRealTimeMetrics(
    @Query('metric') metric: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getRealTimeMetrics(tenantId, metric);
  }

  @Get('efficiency')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get efficiency metrics' })
  @ApiQuery({ name: 'department', required: false, description: 'Department filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Efficiency metrics retrieved successfully' })
  async getEfficiencyMetrics(
    @Query('department') department: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getEfficiencyMetrics(tenantId, department, timeRange);
  }

  @Get('productivity')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get productivity metrics' })
  @ApiQuery({ name: 'team', required: false, description: 'Team filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Productivity metrics retrieved successfully' })
  async getProductivityMetrics(
    @Query('team') team: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getProductivityMetrics(tenantId, team, timeRange);
  }

  @Get('quality')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get quality metrics' })
  @ApiQuery({ name: 'process', required: false, description: 'Process filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Quality metrics retrieved successfully' })
  async getQualityMetrics(
    @Query('process') process: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getQualityMetrics(tenantId, process, timeRange);
  }

  @Get('cost')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get cost metrics' })
  @ApiQuery({ name: 'category', required: false, description: 'Cost category filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Cost metrics retrieved successfully' })
  async getCostMetrics(
    @Query('category') category: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getCostMetrics(tenantId, category, timeRange);
  }

  @Get('customer-satisfaction')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get customer satisfaction metrics' })
  @ApiQuery({ name: 'segment', required: false, description: 'Customer segment filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Customer satisfaction metrics retrieved successfully' })
  async getCustomerSatisfactionMetrics(
    @Query('segment') segment: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getCustomerSatisfactionMetrics(tenantId, segment, timeRange);
  }

  @Get('financial')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get financial performance metrics' })
  @ApiQuery({ name: 'metric', required: false, description: 'Financial metric filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Financial metrics retrieved successfully' })
  async getFinancialMetrics(
    @Query('metric') metric: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getFinancialMetrics(tenantId, metric, timeRange);
  }

  @Get('operational')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get operational performance metrics' })
  @ApiQuery({ name: 'operation', required: false, description: 'Operation filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Operational metrics retrieved successfully' })
  async getOperationalMetrics(
    @Query('operation') operation: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getOperationalMetrics(tenantId, operation, timeRange);
  }

  @Post('custom-metrics')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Create custom performance metrics' })
  @ApiResponse({ status: 201, description: 'Custom metrics created successfully' })
  async createCustomMetrics(
    @Body() metricsData: { name: string; description: string; formula: string; category: string },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.performanceMetricsService.createCustomMetrics(metricsData, tenantId, userId);
  }

  @Get('custom-metrics')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get custom performance metrics' })
  @ApiResponse({ status: 200, description: 'Custom metrics retrieved successfully' })
  async getCustomMetrics(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getCustomMetrics(tenantId);
  }

  @Put('custom-metrics/:metricId')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Update custom performance metrics' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiResponse({ status: 200, description: 'Custom metrics updated successfully' })
  async updateCustomMetrics(
    @Param('metricId') metricId: string,
    @Body() metricsData: { name: string; description: string; formula: string; category: string },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.performanceMetricsService.updateCustomMetrics(metricId, metricsData, tenantId, userId);
  }

  @Delete('custom-metrics/:metricId')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Delete custom performance metrics' })
  @ApiParam({ name: 'metricId', description: 'Metric ID' })
  @ApiResponse({ status: 200, description: 'Custom metrics deleted successfully' })
  async deleteCustomMetrics(
    @Param('metricId') metricId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.deleteCustomMetrics(metricId, tenantId);
  }

  @Get('export')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Export performance metrics data' })
  @ApiQuery({ name: 'format', required: false, description: 'Export format', example: 'csv' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Performance metrics exported successfully' })
  async exportMetrics(
    @Query('format') format: string = 'csv',
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.exportMetrics(tenantId, format, timeRange);
  }

  @Get('insights')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get performance insights and recommendations' })
  @ApiQuery({ name: 'category', required: false, description: 'Insight category filter' })
  @ApiResponse({ status: 200, description: 'Performance insights retrieved successfully' })
  async getInsights(
    @Query('category') category: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getInsights(tenantId, category);
  }

  @Get('recommendations')
  @Roles('admin', 'manager', 'analyst', 'executive')
  @ApiOperation({ summary: 'Get performance improvement recommendations' })
  @ApiQuery({ name: 'priority', required: false, description: 'Recommendation priority filter' })
  @ApiResponse({ status: 200, description: 'Performance recommendations retrieved successfully' })
  async getRecommendations(
    @Query('priority') priority: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.performanceMetricsService.getRecommendations(tenantId, priority);
  }
}
