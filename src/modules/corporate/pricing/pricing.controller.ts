import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { PricingService } from './pricing.service';
import { CreatePricingTierDto } from './dto/create-pricing-tier.dto';
import { CreateUsageBasedPricingDto } from './dto/create-usage-based-pricing.dto';
import { CreateOverageRuleDto } from './dto/create-overage-rule.dto';
import { CalculatePricingDto } from './dto/calculate-pricing.dto';

@ApiTags('Corporate Pricing')
@Controller({ path: 'corporate/pricing', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('tiers')
  @Roles('admin', 'pricing_manager')
  @ApiOperation({ summary: 'Create pricing tier' })
  @ApiResponse({ status: 201, description: 'Pricing tier created successfully' })
  async createPricingTier(
    @Body() createPricingTierDto: CreatePricingTierDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.pricingService.createPricingTier({ ...createPricingTierDto, tenantId });
  }

  @Get('tiers')
  @Roles('admin', 'pricing_manager', 'viewer')
  @ApiOperation({ summary: 'Get pricing tiers' })
  @ApiResponse({ status: 200, description: 'Pricing tiers retrieved successfully' })
  async getPricingTiers(@CurrentUser('tenantId') tenantId: string) {
    return this.pricingService.getPricingTiers(tenantId);
  }

  @Post('usage-based')
  @Roles('admin', 'pricing_manager')
  @ApiOperation({ summary: 'Create usage-based pricing' })
  @ApiResponse({ status: 201, description: 'Usage-based pricing created successfully' })
  async createUsageBasedPricing(
    @Body() createUsageBasedPricingDto: CreateUsageBasedPricingDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.pricingService.createUsageBasedPricing({ ...createUsageBasedPricingDto, tenantId });
  }

  @Post('overage-rules')
  @Roles('admin', 'pricing_manager')
  @ApiOperation({ summary: 'Create overage rule' })
  @ApiResponse({ status: 201, description: 'Overage rule created successfully' })
  async createOverageRule(
    @Body() createOverageRuleDto: CreateOverageRuleDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.pricingService.createOverageRule({ ...createOverageRuleDto, tenantId });
  }

  @Post('calculate')
  @Roles('admin', 'pricing_manager', 'viewer')
  @ApiOperation({ summary: 'Calculate pricing' })
  @ApiResponse({ status: 200, description: 'Pricing calculated successfully' })
  async calculatePricing(
    @Body() calculatePricingDto: CalculatePricingDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.pricingService.calculatePricing(
      tenantId,
      calculatePricingDto.tierId,
      calculatePricingDto.usage,
      calculatePricingDto.period
    );
  }

  @Get('analytics')
  @Roles('admin', 'pricing_manager', 'viewer')
  @ApiOperation({ summary: 'Get pricing analytics' })
  @ApiResponse({ status: 200, description: 'Pricing analytics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getPricingAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { startDate: string; endDate: string }
  ) {
    const period = {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    };
    return this.pricingService.getPricingAnalytics(tenantId, period);
  }
}
