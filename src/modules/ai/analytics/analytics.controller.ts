import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';
import { CreateDemandForecastDto } from './dto/create-demand-forecast.dto';
import { CreateETAEstimateDto } from './dto/create-eta-estimate.dto';
import { CreateAnomalyDetectionDto } from './dto/create-anomaly-detection.dto';
import { CreateDynamicPricingDto } from './dto/create-dynamic-pricing.dto';
import { CreateMetricsLayerDto } from './dto/create-metrics-layer.dto';
import { CalculateDemandForecastDto } from './dto/calculate-demand-forecast.dto';

@ApiTags('AI Analytics')
@Controller({ path: 'ai/analytics', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('admin', 'analytics_manager', 'viewer')
  @ApiOperation({ summary: 'Get analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Analytics dashboard retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getAnalyticsDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { startDate: string; endDate: string }
  ) {
    const period = {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    };
    return this.analyticsService.getAnalyticsDashboard(tenantId, period);
  }

  @Post('demand-forecasts')
  @Roles('admin', 'analytics_manager')
  @ApiOperation({ summary: 'Create demand forecast' })
  @ApiResponse({ status: 201, description: 'Demand forecast created successfully' })
  async createDemandForecast(
    @Body() createDemandForecastDto: CreateDemandForecastDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.createDemandForecast({ ...createDemandForecastDto, tenantId });
  }

  @Get('demand-forecasts')
  @Roles('admin', 'analytics_manager', 'viewer')
  @ApiOperation({ summary: 'Get demand forecasts' })
  @ApiResponse({ status: 200, description: 'Demand forecasts retrieved successfully' })
  @ApiQuery({ name: 'productId', required: false, type: String })
  async getDemandForecasts(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { productId?: string }
  ) {
    return this.analyticsService.getDemandForecasts(tenantId, query.productId);
  }

  @Post('demand-forecasts/calculate')
  @Roles('admin', 'analytics_manager')
  @ApiOperation({ summary: 'Calculate demand forecast' })
  @ApiResponse({ status: 200, description: 'Demand forecast calculated successfully' })
  async calculateDemandForecast(
    @Body() calculateDemandForecastDto: CalculateDemandForecastDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.calculateDemandForecast(
      tenantId,
      calculateDemandForecastDto.productId,
      calculateDemandForecastDto.historicalData,
      calculateDemandForecastDto.factors
    );
  }

  @Post('eta-estimates')
  @Roles('admin', 'analytics_manager')
  @ApiOperation({ summary: 'Create ETA estimate' })
  @ApiResponse({ status: 201, description: 'ETA estimate created successfully' })
  async createETAEstimate(
    @Body() createETAEstimateDto: CreateETAEstimateDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.createETAEstimate({ ...createETAEstimateDto, tenantId });
  }

  @Put('eta-estimates/:id')
  @Roles('admin', 'analytics_manager')
  @ApiOperation({ summary: 'Update ETA estimate' })
  @ApiResponse({ status: 200, description: 'ETA estimate updated successfully' })
  async updateETAEstimate(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateETAEstimateDto>
  ) {
    return this.analyticsService.updateETAEstimate(id, updateData);
  }

  @Post('anomaly-detections')
  @Roles('admin', 'analytics_manager')
  @ApiOperation({ summary: 'Detect anomaly' })
  @ApiResponse({ status: 201, description: 'Anomaly detected successfully' })
  async detectAnomaly(
    @Body() createAnomalyDetectionDto: CreateAnomalyDetectionDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.detectAnomaly({ ...createAnomalyDetectionDto, tenantId });
  }

  @Get('anomaly-detections')
  @Roles('admin', 'analytics_manager', 'viewer')
  @ApiOperation({ summary: 'Get anomaly detections' })
  @ApiResponse({ status: 200, description: 'Anomaly detections retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getAnomalies(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { status?: string }
  ) {
    return this.analyticsService.getAnomalies(tenantId, query.status);
  }

  @Post('dynamic-pricing')
  @Roles('admin', 'analytics_manager')
  @ApiOperation({ summary: 'Create dynamic pricing' })
  @ApiResponse({ status: 201, description: 'Dynamic pricing created successfully' })
  async createDynamicPricing(
    @Body() createDynamicPricingDto: CreateDynamicPricingDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.createDynamicPricing({ ...createDynamicPricingDto, tenantId });
  }

  @Get('dynamic-pricing')
  @Roles('admin', 'analytics_manager', 'viewer')
  @ApiOperation({ summary: 'Get dynamic pricing' })
  @ApiResponse({ status: 200, description: 'Dynamic pricing retrieved successfully' })
  @ApiQuery({ name: 'routeId', required: false, type: String })
  async getDynamicPricing(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { routeId?: string }
  ) {
    return this.analyticsService.getDynamicPricing(tenantId, query.routeId);
  }

  @Post('metrics-layer')
  @Roles('admin', 'analytics_manager')
  @ApiOperation({ summary: 'Create metrics layer entry' })
  @ApiResponse({ status: 201, description: 'Metrics layer entry created successfully' })
  async createMetricsLayer(
    @Body() createMetricsLayerDto: CreateMetricsLayerDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.analyticsService.createMetricsLayer({ ...createMetricsLayerDto, tenantId });
  }
}
