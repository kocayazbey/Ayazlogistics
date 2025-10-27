import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApiPortalService } from './api-portal.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

// DTOs
class CreateApiKeyDto {
  name: string;
  description?: string;
  permissions: string[];
  expiresAt?: Date;
  rateLimit?: number;
}

class UpdateApiKeyDto {
  name?: string;
  description?: string;
  permissions?: string[];
  expiresAt?: Date;
  rateLimit?: number;
  isActive?: boolean;
}

class ApiUsageQueryDto {
  @Query('startDate') startDate?: string;
  @Query('endDate') endDate?: string;
  @Query('apiKeyId') apiKeyId?: string;
  @Query('endpoint') endpoint?: string;
  @Query('page') page?: number;
  @Query('limit') limit?: number;
}

@ApiTags('API Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api-portal')
export class ApiPortalController {
  constructor(private readonly apiPortalService: ApiPortalService) {}

  @Get('keys')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all API keys' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully.' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  async getApiKeys(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string
  ) {
    return this.apiPortalService.getApiKeys(page, limit, search);
  }

  @Post('keys')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async createApiKey(@Body() createApiKeyDto: CreateApiKeyDto) {
    return this.apiPortalService.createApiKey(createApiKeyDto);
  }

  @Get('keys/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get API key by ID' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  async getApiKey(@Param('id') id: string) {
    return this.apiPortalService.getApiKey(id);
  }

  @Put('keys/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key updated successfully.' })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  async updateApiKey(@Param('id') id: string, @Body() updateApiKeyDto: UpdateApiKeyDto) {
    return this.apiPortalService.updateApiKey(id, updateApiKeyDto);
  }

  @Delete('keys/:id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 204, description: 'API key deleted successfully.' })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  async deleteApiKey(@Param('id') id: string) {
    return this.apiPortalService.deleteApiKey(id);
  }

  @Post('keys/:id/regenerate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key regenerated successfully.' })
  @ApiResponse({ status: 404, description: 'API key not found.' })
  async regenerateApiKey(@Param('id') id: string) {
    return this.apiPortalService.regenerateApiKey(id);
  }

  @Get('usage')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get API usage analytics' })
  @ApiResponse({ status: 200, description: 'API usage analytics retrieved successfully.' })
  async getApiUsage(@Query() query: ApiUsageQueryDto) {
    return this.apiPortalService.getApiUsage(query);
  }

  @Get('usage/summary')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get API usage summary' })
  @ApiResponse({ status: 200, description: 'API usage summary retrieved successfully.' })
  async getApiUsageSummary(@Query() query: ApiUsageQueryDto) {
    return this.apiPortalService.getApiUsageSummary(query);
  }

  @Get('usage/endpoints')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get endpoint usage statistics' })
  @ApiResponse({ status: 200, description: 'Endpoint usage statistics retrieved successfully.' })
  async getEndpointUsage(@Query() query: ApiUsageQueryDto) {
    return this.apiPortalService.getEndpointUsage(query);
  }

  @Get('usage/errors')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get API error statistics' })
  @ApiResponse({ status: 200, description: 'API error statistics retrieved successfully.' })
  async getApiErrors(@Query() query: ApiUsageQueryDto) {
    return this.apiPortalService.getApiErrors(query);
  }

  @Get('documentation')
  @ApiOperation({ summary: 'Get API documentation' })
  @ApiResponse({ status: 200, description: 'API documentation retrieved successfully.' })
  async getApiDocumentation() {
    return this.apiPortalService.getApiDocumentation();
  }

  @Get('documentation/endpoints')
  @ApiOperation({ summary: 'Get API endpoints documentation' })
  @ApiResponse({ status: 200, description: 'API endpoints documentation retrieved successfully.' })
  async getApiEndpoints() {
    return this.apiPortalService.getApiEndpoints();
  }

  @Get('documentation/schemas')
  @ApiOperation({ summary: 'Get API schemas documentation' })
  @ApiResponse({ status: 200, description: 'API schemas documentation retrieved successfully.' })
  async getApiSchemas() {
    return this.apiPortalService.getApiSchemas();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get API status' })
  @ApiResponse({ status: 200, description: 'API status retrieved successfully.' })
  async getApiStatus() {
    return this.apiPortalService.getApiStatus();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get API health check' })
  @ApiResponse({ status: 200, description: 'API health check completed successfully.' })
  async getApiHealth() {
    return this.apiPortalService.getApiHealth();
  }
}
