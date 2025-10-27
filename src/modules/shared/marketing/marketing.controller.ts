import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { MarketingService } from './marketing.service';

@ApiTags('Marketing')
@Controller({ path: 'marketing', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // ========== CAMPAIGNS ==========
  @Get('campaigns')
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Get all campaigns' })
  async getCampaigns(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.marketingService.getCampaigns(tenantId, { page, limit, search });
  }

  @Post('campaigns')
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Create new campaign' })
  async createCampaign(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.marketingService.createCampaign(tenantId, data);
  }

  // ========== DISCOUNTS ==========
  @Get('discounts')
  @Roles('admin', 'marketing', 'sales')
  @ApiOperation({ summary: 'Get all discounts' })
  async getDiscounts(@CurrentUser('tenantId') tenantId: string) {
    return this.marketingService.getDiscounts(tenantId);
  }

  @Post('discounts')
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Create new discount' })
  async createDiscount(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.marketingService.createDiscount(tenantId, data);
  }

  // ========== NEWSLETTER ==========
  @Get('newsletter/subscribers')
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Get all subscribers' })
  async getSubscribers(@CurrentUser('tenantId') tenantId: string) {
    return this.marketingService.getSubscribers(tenantId);
  }

  @Post('newsletter/send')
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Send newsletter' })
  async sendNewsletter(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.marketingService.sendNewsletter(tenantId, data);
  }

  // ========== SEO ==========
  @Get('seo')
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Get SEO data' })
  async getSEOData(@CurrentUser('tenantId') tenantId: string) {
    return this.marketingService.getSEOData(tenantId);
  }

  @Put('seo')
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Update SEO data' })
  async updateSEO(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.marketingService.updateSEO(tenantId, data);
  }

  // ========== ADS ==========
  @Get('ads')
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Get all ads' })
  async getAds(@CurrentUser('tenantId') tenantId: string) {
    return this.marketingService.getAds(tenantId);
  }

  @Post('ads')
  @Roles('admin', 'marketing')
  @ApiOperation({ summary: 'Create new ad campaign' })
  async createAd(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.marketingService.createAd(tenantId, data);
  }
}
