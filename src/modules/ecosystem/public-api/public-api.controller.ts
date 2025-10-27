import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { PublicAPIService } from './public-api.service';
import { CreatePublicAPIDto } from './dto/create-public-api.dto';
import { CreateSDKDto } from './dto/create-sdk.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { CreatePluginDto } from './dto/create-plugin.dto';
import { CreatePartnerProgramDto } from './dto/create-partner-program.dto';

@ApiTags('Ecosystem')
@Controller({ path: 'ecosystem', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PublicAPIController {
  constructor(private readonly publicAPIService: PublicAPIService) {}

  @Get('dashboard')
  @Roles('admin', 'ecosystem_manager', 'viewer')
  @ApiOperation({ summary: 'Get ecosystem dashboard' })
  @ApiResponse({ status: 200, description: 'Ecosystem dashboard retrieved successfully' })
  async getEcosystemDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.publicAPIService.getEcosystemDashboard(tenantId);
  }

  @Post('apis')
  @Roles('admin', 'ecosystem_manager')
  @ApiOperation({ summary: 'Create public API' })
  @ApiResponse({ status: 201, description: 'Public API created successfully' })
  async createPublicAPI(
    @Body() createPublicAPIDto: CreatePublicAPIDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.publicAPIService.createPublicAPI({ ...createPublicAPIDto, tenantId });
  }

  @Get('apis')
  @Roles('admin', 'ecosystem_manager', 'viewer')
  @ApiOperation({ summary: 'Get public APIs' })
  @ApiResponse({ status: 200, description: 'Public APIs retrieved successfully' })
  async getPublicAPIs(@CurrentUser('tenantId') tenantId: string) {
    return this.publicAPIService.getPublicAPIs(tenantId);
  }

  @Post('sdks')
  @Roles('admin', 'ecosystem_manager')
  @ApiOperation({ summary: 'Create SDK' })
  @ApiResponse({ status: 201, description: 'SDK created successfully' })
  async createSDK(
    @Body() createSDKDto: CreateSDKDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.publicAPIService.createSDK({ ...createSDKDto, tenantId });
  }

  @Post('webhooks')
  @Roles('admin', 'ecosystem_manager')
  @ApiOperation({ summary: 'Create webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created successfully' })
  async createWebhook(
    @Body() createWebhookDto: CreateWebhookDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.publicAPIService.createWebhook({ ...createWebhookDto, tenantId });
  }

  @Post('plugins')
  @Roles('admin', 'ecosystem_manager')
  @ApiOperation({ summary: 'Create plugin' })
  @ApiResponse({ status: 201, description: 'Plugin created successfully' })
  async createPlugin(
    @Body() createPluginDto: CreatePluginDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.publicAPIService.createPlugin({ ...createPluginDto, tenantId });
  }

  @Post('partner-programs')
  @Roles('admin', 'ecosystem_manager')
  @ApiOperation({ summary: 'Create partner program' })
  @ApiResponse({ status: 201, description: 'Partner program created successfully' })
  async createPartnerProgram(
    @Body() createPartnerProgramDto: CreatePartnerProgramDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.publicAPIService.createPartnerProgram({ ...createPartnerProgramDto, tenantId });
  }
}
