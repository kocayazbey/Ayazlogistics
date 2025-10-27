import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { PricingCampaignsService } from './pricing-campaigns.service';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@ApiTags('Pricing & Campaigns')
@Controller({ path: 'pricing-campaigns', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PricingCampaignsController {
  constructor(private readonly pricingCampaignsService: PricingCampaignsService) {}

  @Get('pricing-rules')
  @Roles('admin', 'sales_manager', 'pricing_manager')
  @ApiOperation({ summary: 'Get all pricing rules' })
  @ApiResponse({ status: 200, description: 'Pricing rules retrieved successfully' })
  async getPricingRules(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.pricingCampaignsService.getPricingRules(tenantId, { page, limit, type, status });
  }

  @Get('pricing-rules/:id')
  @Roles('admin', 'sales_manager', 'pricing_manager')
  @ApiOperation({ summary: 'Get pricing rule by ID' })
  @ApiResponse({ status: 200, description: 'Pricing rule retrieved successfully' })
  async getPricingRuleById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.pricingCampaignsService.getPricingRuleById(id, tenantId);
  }

  @Post('pricing-rules')
  @Roles('admin', 'pricing_manager')
  @ApiOperation({ summary: 'Create new pricing rule' })
  @ApiResponse({ status: 201, description: 'Pricing rule created successfully' })
  async createPricingRule(
    @Body() createPricingRuleDto: CreatePricingRuleDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pricingCampaignsService.createPricingRule(createPricingRuleDto, tenantId, userId);
  }

  @Put('pricing-rules/:id')
  @Roles('admin', 'pricing_manager')
  @ApiOperation({ summary: 'Update pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule updated successfully' })
  async updatePricingRule(
    @Param('id') id: string,
    @Body() updatePricingRuleDto: UpdatePricingRuleDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pricingCampaignsService.updatePricingRule(id, updatePricingRuleDto, tenantId);
  }

  @Post('pricing-rules/:id/activate')
  @Roles('admin', 'pricing_manager')
  @ApiOperation({ summary: 'Activate pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule activated successfully' })
  async activatePricingRule(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pricingCampaignsService.activatePricingRule(id, tenantId, userId);
  }

  @Post('pricing-rules/:id/deactivate')
  @Roles('admin', 'pricing_manager')
  @ApiOperation({ summary: 'Deactivate pricing rule' })
  @ApiResponse({ status: 200, description: 'Pricing rule deactivated successfully' })
  async deactivatePricingRule(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pricingCampaignsService.deactivatePricingRule(id, tenantId, userId);
  }

  @Get('pricing-rules/calculate')
  @Roles('admin', 'sales_manager', 'pricing_manager')
  @ApiOperation({ summary: 'Calculate price for product' })
  @ApiResponse({ status: 200, description: 'Price calculated successfully' })
  async calculatePrice(
    @Query('productId') productId: string,
    @Query('quantity') quantity: number,
    @Query('customerId') customerId?: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pricingCampaignsService.calculatePrice(productId, quantity, customerId, tenantId);
  }

  @Get('campaigns')
  @Roles('admin', 'sales_manager', 'marketing_manager')
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  async getCampaigns(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.pricingCampaignsService.getCampaigns(tenantId, { page, limit, type, status });
  }

  @Get('campaigns/:id')
  @Roles('admin', 'sales_manager', 'marketing_manager')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  async getCampaignById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.pricingCampaignsService.getCampaignById(id, tenantId);
  }

  @Post('campaigns')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Create new campaign' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  async createCampaign(
    @Body() createCampaignDto: CreateCampaignDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pricingCampaignsService.createCampaign(createCampaignDto, tenantId, userId);
  }

  @Put('campaigns/:id')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  async updateCampaign(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pricingCampaignsService.updateCampaign(id, updateCampaignDto, tenantId);
  }

  @Post('campaigns/:id/activate')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Activate campaign' })
  @ApiResponse({ status: 200, description: 'Campaign activated successfully' })
  async activateCampaign(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pricingCampaignsService.activateCampaign(id, tenantId, userId);
  }

  @Post('campaigns/:id/deactivate')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Deactivate campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deactivated successfully' })
  async deactivateCampaign(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pricingCampaignsService.deactivateCampaign(id, tenantId, userId);
  }

  @Get('campaigns/:id/performance')
  @Roles('admin', 'sales_manager', 'marketing_manager')
  @ApiOperation({ summary: 'Get campaign performance metrics' })
  @ApiResponse({ status: 200, description: 'Campaign performance retrieved successfully' })
  async getCampaignPerformance(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pricingCampaignsService.getCampaignPerformance(id, tenantId);
  }

  @Get('discounts')
  @Roles('admin', 'sales_manager', 'pricing_manager')
  @ApiOperation({ summary: 'Get all discounts' })
  @ApiResponse({ status: 200, description: 'Discounts retrieved successfully' })
  async getDiscounts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.pricingCampaignsService.getDiscounts(tenantId, { page, limit, type, status });
  }

  @Get('discounts/:id')
  @Roles('admin', 'sales_manager', 'pricing_manager')
  @ApiOperation({ summary: 'Get discount by ID' })
  @ApiResponse({ status: 200, description: 'Discount retrieved successfully' })
  async getDiscountById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.pricingCampaignsService.getDiscountById(id, tenantId);
  }

  @Post('discounts')
  @Roles('admin', 'pricing_manager')
  @ApiOperation({ summary: 'Create new discount' })
  @ApiResponse({ status: 201, description: 'Discount created successfully' })
  async createDiscount(
    @Body() discountData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pricingCampaignsService.createDiscount(discountData, tenantId, userId);
  }

  @Put('discounts/:id')
  @Roles('admin', 'pricing_manager')
  @ApiOperation({ summary: 'Update discount' })
  @ApiResponse({ status: 200, description: 'Discount updated successfully' })
  async updateDiscount(
    @Param('id') id: string,
    @Body() discountData: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pricingCampaignsService.updateDiscount(id, discountData, tenantId);
  }

  @Get('promotions')
  @Roles('admin', 'sales_manager', 'marketing_manager')
  @ApiOperation({ summary: 'Get all promotions' })
  @ApiResponse({ status: 200, description: 'Promotions retrieved successfully' })
  async getPromotions(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.pricingCampaignsService.getPromotions(tenantId, { page, limit, type, status });
  }

  @Get('promotions/:id')
  @Roles('admin', 'sales_manager', 'marketing_manager')
  @ApiOperation({ summary: 'Get promotion by ID' })
  @ApiResponse({ status: 200, description: 'Promotion retrieved successfully' })
  async getPromotionById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.pricingCampaignsService.getPromotionById(id, tenantId);
  }

  @Post('promotions')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Create new promotion' })
  @ApiResponse({ status: 201, description: 'Promotion created successfully' })
  async createPromotion(
    @Body() promotionData: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.pricingCampaignsService.createPromotion(promotionData, tenantId, userId);
  }

  @Put('promotions/:id')
  @Roles('admin', 'marketing_manager')
  @ApiOperation({ summary: 'Update promotion' })
  @ApiResponse({ status: 200, description: 'Promotion updated successfully' })
  async updatePromotion(
    @Param('id') id: string,
    @Body() promotionData: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pricingCampaignsService.updatePromotion(id, promotionData, tenantId);
  }

  @Get('analytics/pricing-performance')
  @Roles('admin', 'sales_manager', 'pricing_manager')
  @ApiOperation({ summary: 'Get pricing performance analytics' })
  @ApiResponse({ status: 200, description: 'Pricing performance analytics retrieved successfully' })
  async getPricingPerformanceAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.pricingCampaignsService.getPricingPerformanceAnalytics(tenantId, dateFrom, dateTo);
  }

  @Get('analytics/campaign-performance')
  @Roles('admin', 'sales_manager', 'marketing_manager')
  @ApiOperation({ summary: 'Get campaign performance analytics' })
  @ApiResponse({ status: 200, description: 'Campaign performance analytics retrieved successfully' })
  async getCampaignPerformanceAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.pricingCampaignsService.getCampaignPerformanceAnalytics(tenantId, dateFrom, dateTo);
  }

  @Get('analytics/revenue-impact')
  @Roles('admin', 'sales_manager', 'pricing_manager')
  @ApiOperation({ summary: 'Get revenue impact analysis' })
  @ApiResponse({ status: 200, description: 'Revenue impact analysis retrieved successfully' })
  async getRevenueImpactAnalysis(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.pricingCampaignsService.getRevenueImpactAnalysis(tenantId, dateFrom, dateTo);
  }

  @Get('reports/pricing-summary')
  @Roles('admin', 'sales_manager', 'pricing_manager')
  @ApiOperation({ summary: 'Get pricing summary report' })
  @ApiResponse({ status: 200, description: 'Pricing summary report retrieved successfully' })
  async getPricingSummaryReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.pricingCampaignsService.getPricingSummaryReport(tenantId, dateFrom, dateTo);
  }

  @Get('reports/campaign-summary')
  @Roles('admin', 'sales_manager', 'marketing_manager')
  @ApiOperation({ summary: 'Get campaign summary report' })
  @ApiResponse({ status: 200, description: 'Campaign summary report retrieved successfully' })
  async getCampaignSummaryReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.pricingCampaignsService.getCampaignSummaryReport(tenantId, dateFrom, dateTo);
  }

  @Post('reports/export')
  @Roles('admin', 'sales_manager', 'pricing_manager', 'marketing_manager')
  @ApiOperation({ summary: 'Export pricing and campaigns report' })
  @ApiResponse({ status: 200, description: 'Report exported successfully' })
  async exportPricingReport(
    @Body() exportRequest: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.pricingCampaignsService.exportPricingReport(exportRequest, tenantId);
  }
}
