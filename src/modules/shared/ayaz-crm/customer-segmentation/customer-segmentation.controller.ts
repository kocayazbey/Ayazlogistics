import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { CustomerSegmentationService } from './customer-segmentation.service';
import {
  CustomerSegmentationRequestDto,
  CustomerSegmentationResponseDto,
  CustomerProfileDto,
  CustomerSegmentDto,
  PersonalizationEngineDto,
  CustomerAnalyticsDto,
  SegmentDefinitionDto,
  CustomerInsightsDto,
  SegmentPerformanceDto,
  CustomerJourneyDto,
} from './customer-segmentation.dto';

@ApiTags('Customer Segmentation & Personalization')
@Controller({ path: 'crm/customer-segmentation', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomerSegmentationController {
  constructor(private readonly customerSegmentationService: CustomerSegmentationService) {}

  @Post('analyze')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Perform comprehensive customer segmentation analysis' })
  @ApiResponse({ status: 200, description: 'Customer segmentation analysis completed successfully', type: CustomerSegmentationResponseDto })
  async analyzeCustomerSegmentation(
    @Body() request: CustomerSegmentationRequestDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.analyzeCustomerSegmentation(tenantId, request);
  }

  @Get('segments')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get all customer segments' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter active segments only' })
  @ApiResponse({ status: 200, description: 'Customer segments retrieved successfully', type: [CustomerSegmentDto] })
  async getCustomerSegments(
    @Query('active') active: boolean,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getCustomerSegments(tenantId, active);
  }

  @Get('segments/:segmentId')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get specific customer segment details' })
  @ApiParam({ name: 'segmentId', description: 'Segment ID' })
  @ApiResponse({ status: 200, description: 'Customer segment retrieved successfully', type: CustomerSegmentDto })
  async getCustomerSegment(
    @Param('segmentId') segmentId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getCustomerSegment(segmentId, tenantId);
  }

  @Get('profiles')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get customer profiles with segmentation data' })
  @ApiQuery({ name: 'segmentId', required: false, description: 'Filter by segment ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results', example: 100 })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination', example: 0 })
  @ApiResponse({ status: 200, description: 'Customer profiles retrieved successfully', type: [CustomerProfileDto] })
  async getCustomerProfiles(
    @Query('segmentId') segmentId: string,
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getCustomerProfiles(tenantId, segmentId, limit, offset);
  }

  @Get('profiles/:customerId')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get specific customer profile with segmentation data' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer profile retrieved successfully', type: CustomerProfileDto })
  async getCustomerProfile(
    @Param('customerId') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getCustomerProfile(customerId, tenantId);
  }

  @Get('personalization/:customerId')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get personalized content and recommendations for customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Personalization data retrieved successfully', type: PersonalizationEngineDto })
  async getPersonalizationEngine(
    @Param('customerId') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getPersonalizationEngine(customerId, tenantId);
  }

  @Get('analytics')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get customer segmentation analytics and insights' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Customer analytics retrieved successfully', type: CustomerAnalyticsDto })
  async getCustomerAnalytics(
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getCustomerAnalytics(tenantId, timeRange);
  }

  @Get('insights/:customerId')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get AI-powered insights for specific customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({ status: 200, description: 'Customer insights retrieved successfully', type: CustomerInsightsDto })
  async getCustomerInsights(
    @Param('customerId') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getCustomerInsights(customerId, tenantId);
  }

  @Get('journey/:customerId')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get customer journey and touchpoints' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 90 })
  @ApiResponse({ status: 200, description: 'Customer journey retrieved successfully', type: CustomerJourneyDto })
  async getCustomerJourney(
    @Param('customerId') customerId: string,
    @Query('timeRange') timeRange: number = 90,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getCustomerJourney(customerId, tenantId, timeRange);
  }

  @Get('segment-performance')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get segment performance metrics' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Segment performance retrieved successfully', type: [SegmentPerformanceDto] })
  async getSegmentPerformance(
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getSegmentPerformance(tenantId, timeRange);
  }

  @Post('segments')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create new customer segment definition' })
  @ApiResponse({ status: 201, description: 'Customer segment created successfully', type: CustomerSegmentDto })
  async createSegment(
    @Body() segmentDefinition: SegmentDefinitionDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customerSegmentationService.createSegment(segmentDefinition, tenantId, userId);
  }

  @Put('segments/:segmentId')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update customer segment definition' })
  @ApiParam({ name: 'segmentId', description: 'Segment ID' })
  @ApiResponse({ status: 200, description: 'Customer segment updated successfully', type: CustomerSegmentDto })
  async updateSegment(
    @Param('segmentId') segmentId: string,
    @Body() segmentDefinition: SegmentDefinitionDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customerSegmentationService.updateSegment(segmentId, segmentDefinition, tenantId, userId);
  }

  @Delete('segments/:segmentId')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Delete customer segment definition' })
  @ApiParam({ name: 'segmentId', description: 'Segment ID' })
  @ApiResponse({ status: 200, description: 'Customer segment deleted successfully' })
  async deleteSegment(
    @Param('segmentId') segmentId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.deleteSegment(segmentId, tenantId);
  }

  @Post('reassign-customers')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Reassign customers to segments based on updated criteria' })
  @ApiResponse({ status: 200, description: 'Customer reassignment completed successfully' })
  async reassignCustomers(
    @Body() reassignmentRequest: { segmentId: string; customerIds: string[] },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.customerSegmentationService.reassignCustomers(
      reassignmentRequest.segmentId,
      reassignmentRequest.customerIds,
      tenantId,
      userId,
    );
  }

  @Get('segment-distribution')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get customer distribution across segments' })
  @ApiResponse({ status: 200, description: 'Segment distribution retrieved successfully' })
  async getSegmentDistribution(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getSegmentDistribution(tenantId);
  }

  @Get('churn-analysis')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get customer churn analysis by segment' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 90 })
  @ApiResponse({ status: 200, description: 'Churn analysis retrieved successfully' })
  async getChurnAnalysis(
    @Query('timeRange') timeRange: number = 90,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getChurnAnalysis(tenantId, timeRange);
  }

  @Get('lifetime-value')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get customer lifetime value analysis by segment' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 365 })
  @ApiResponse({ status: 200, description: 'Lifetime value analysis retrieved successfully' })
  async getLifetimeValueAnalysis(
    @Query('timeRange') timeRange: number = 365,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getLifetimeValueAnalysis(tenantId, timeRange);
  }

  @Post('export-segments')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Export customer segments data' })
  @ApiResponse({ status: 200, description: 'Segment data exported successfully' })
  async exportSegments(
    @Body() exportRequest: { format: 'csv' | 'excel' | 'json'; segmentIds?: string[] },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.exportSegments(
      exportRequest.format,
      exportRequest.segmentIds,
      tenantId,
    );
  }

  @Get('recommendations/:customerId')
  @Roles('admin', 'manager', 'analyst', 'marketing')
  @ApiOperation({ summary: 'Get personalized recommendations for customer' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiQuery({ name: 'type', required: false, description: 'Recommendation type', example: 'products' })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved successfully' })
  async getRecommendations(
    @Param('customerId') customerId: string,
    @Query('type') type: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.customerSegmentationService.getRecommendations(customerId, type, tenantId);
  }
}
