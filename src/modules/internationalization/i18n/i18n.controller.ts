import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { I18nService } from './i18n.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { CreateTaxRuleDto } from './dto/create-tax-rule.dto';
import { CreateDataResidencyDto } from './dto/create-data-residency.dto';

@ApiTags('Internationalization')
@Controller({ path: 'i18n', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  @Get('dashboard')
  @Roles('admin', 'i18n_manager', 'viewer')
  @ApiOperation({ summary: 'Get internationalization dashboard' })
  @ApiResponse({ status: 200, description: 'Internationalization dashboard retrieved successfully' })
  async getInternationalizationDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.i18nService.getInternationalizationDashboard(tenantId);
  }

  @Post('languages')
  @Roles('admin', 'i18n_manager')
  @ApiOperation({ summary: 'Create language' })
  @ApiResponse({ status: 201, description: 'Language created successfully' })
  async createLanguage(
    @Body() createLanguageDto: CreateLanguageDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.i18nService.createLanguage({ ...createLanguageDto, tenantId });
  }

  @Get('languages')
  @Roles('admin', 'i18n_manager', 'viewer')
  @ApiOperation({ summary: 'Get languages' })
  @ApiResponse({ status: 200, description: 'Languages retrieved successfully' })
  async getLanguages(@CurrentUser('tenantId') tenantId: string) {
    return this.i18nService.getLanguages(tenantId);
  }

  @Post('currencies')
  @Roles('admin', 'i18n_manager')
  @ApiOperation({ summary: 'Create currency' })
  @ApiResponse({ status: 201, description: 'Currency created successfully' })
  async createCurrency(
    @Body() createCurrencyDto: CreateCurrencyDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.i18nService.createCurrency({ ...createCurrencyDto, tenantId });
  }

  @Get('currencies')
  @Roles('admin', 'i18n_manager', 'viewer')
  @ApiOperation({ summary: 'Get currencies' })
  @ApiResponse({ status: 200, description: 'Currencies retrieved successfully' })
  async getCurrencies(@CurrentUser('tenantId') tenantId: string) {
    return this.i18nService.getCurrencies(tenantId);
  }

  @Post('tax-rules')
  @Roles('admin', 'i18n_manager')
  @ApiOperation({ summary: 'Create tax rule' })
  @ApiResponse({ status: 201, description: 'Tax rule created successfully' })
  async createTaxRule(
    @Body() createTaxRuleDto: CreateTaxRuleDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.i18nService.createTaxRule({ ...createTaxRuleDto, tenantId });
  }

  @Get('tax-rules')
  @Roles('admin', 'i18n_manager', 'viewer')
  @ApiOperation({ summary: 'Get tax rules' })
  @ApiResponse({ status: 200, description: 'Tax rules retrieved successfully' })
  @ApiQuery({ name: 'country', required: false, type: String })
  async getTaxRules(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { country?: string }
  ) {
    return this.i18nService.getTaxRules(tenantId, query.country);
  }

  @Post('data-residency')
  @Roles('admin', 'i18n_manager')
  @ApiOperation({ summary: 'Create data residency' })
  @ApiResponse({ status: 201, description: 'Data residency created successfully' })
  async createDataResidency(
    @Body() createDataResidencyDto: CreateDataResidencyDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.i18nService.createDataResidency({ ...createDataResidencyDto, tenantId });
  }

  @Get('data-residency')
  @Roles('admin', 'i18n_manager', 'viewer')
  @ApiOperation({ summary: 'Get data residency' })
  @ApiResponse({ status: 200, description: 'Data residency retrieved successfully' })
  async getDataResidency(@CurrentUser('tenantId') tenantId: string) {
    return this.i18nService.getDataResidency(tenantId);
  }
}
