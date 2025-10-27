import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { APIAccessService } from '../../../../modules/logistics/ayaz-user-portal/api-access/api-access.service';
import { CreateAPIKeyDto } from '../dto/create-api-key.dto';
import { UpdateAPIKeyDto } from '../dto/update-api-key.dto';
import { GetAPIKeysDto } from '../dto/get-api-keys.dto';

@ApiTags('API Keys')
@Controller({ path: 'api-keys', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class APIKeysController {
  constructor(private readonly apiAccessService: APIAccessService) {}

  @Get()
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Get all API keys' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  async getAPIKeys(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: GetAPIKeysDto
  ) {
    return this.apiAccessService.getAPIKeys(tenantId, query);
  }

  @Get(':id')
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Get API key by ID' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async getAPIKeyById(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.apiAccessService.getAPIKeyById(id, tenantId);
  }

  @Post()
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createAPIKey(
    @Body() createAPIKeyDto: CreateAPIKeyDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.apiAccessService.createAPIKey(createAPIKeyDto, tenantId, userId);
  }

  @Put(':id')
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async updateAPIKey(
    @Param('id') id: string,
    @Body() updateAPIKeyDto: UpdateAPIKeyDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.apiAccessService.updateAPIKey(id, updateAPIKeyDto, tenantId);
  }

  @Delete(':id')
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 200, description: 'API key deleted successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async deleteAPIKey(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.apiAccessService.deleteAPIKey(id, tenantId);
  }

  @Post(':id/regenerate')
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Regenerate API key secret' })
  @ApiResponse({ status: 200, description: 'API key secret regenerated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async regenerateAPIKeySecret(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.apiAccessService.regenerateAPIKeySecret(id, tenantId);
  }

  @Post(':id/activate')
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Activate API key' })
  @ApiResponse({ status: 200, description: 'API key activated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async activateAPIKey(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.apiAccessService.activateAPIKey(id, tenantId);
  }

  @Post(':id/deactivate')
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Deactivate API key' })
  @ApiResponse({ status: 200, description: 'API key deactivated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async deactivateAPIKey(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.apiAccessService.deactivateAPIKey(id, tenantId);
  }

  @Get(':id/usage')
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Get API key usage statistics' })
  @ApiResponse({ status: 200, description: 'Usage statistics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'period', required: false, type: String, description: 'hourly, daily, weekly, monthly' })
  async getAPIKeyUsage(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { startDate?: string; endDate?: string; period?: string }
  ) {
    return this.apiAccessService.getAPIKeyUsage(id, tenantId, query);
  }

  @Get(':id/audit')
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Get API key audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getAPIKeyAudit(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { page?: number; limit?: number; action?: string; startDate?: string; endDate?: string }
  ) {
    return this.apiAccessService.getAPIKeyAudit(id, tenantId, query);
  }

  @Get('rate-limits')
  @Roles('admin', 'api_manager')
  @ApiOperation({ summary: 'Get rate limit statistics' })
  @ApiResponse({ status: 200, description: 'Rate limit statistics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, type: String, description: 'hourly, daily, weekly, monthly' })
  async getRateLimitStats(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { period?: string }
  ) {
    return this.apiAccessService.getRateLimitStats(tenantId, query);
  }
}
