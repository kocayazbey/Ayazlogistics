import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { IntegrationService } from './integration.service';

@ApiTags('Integration')
@Controller({ path: 'integrations', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all integrations' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async getIntegrations(
    @CurrentUser('tenantId') tenantId: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return await this.integrationService.getIntegrations(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get integration by ID' })
  async getIntegrationById(
    @Param('id') integrationId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.integrationService.getIntegrationById(integrationId, tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create integration' })
  @HttpCode(HttpStatus.CREATED)
  async createIntegration(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return await this.integrationService.createIntegration(data, tenantId, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update integration' })
  async updateIntegration(
    @Param('id') integrationId: string,
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.integrationService.updateIntegration(integrationId, data, tenantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete integration' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIntegration(
    @Param('id') integrationId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.integrationService.deleteIntegration(integrationId, tenantId);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable integration' })
  async enableIntegration(
    @Param('id') integrationId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.integrationService.enableIntegration(integrationId, tenantId);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable integration' })
  async disableIntegration(
    @Param('id') integrationId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.integrationService.disableIntegration(integrationId, tenantId);
  }

  @Get(':id/logs')
  @ApiOperation({ summary: 'Get integration logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getIntegrationLogs(
    @Param('id') integrationId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.integrationService.getIntegrationLogs(
      integrationId,
      tenantId,
      limit,
      offset,
    );
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test integration connection' })
  async testIntegration(
    @Param('id') integrationId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.integrationService.testIntegration(integrationId, tenantId);
  }

  @Get('marketplace/available')
  @ApiOperation({ summary: 'Get available integrations from marketplace' })
  @ApiQuery({ name: 'category', required: false })
  async getMarketplaceIntegrations(@Query('category') category?: string) {
    return await this.integrationService.getMarketplaceIntegrations(category);
  }

  @Post('marketplace/:integrationId/install')
  @ApiOperation({ summary: 'Install integration from marketplace' })
  @HttpCode(HttpStatus.CREATED)
  async installMarketplaceIntegration(
    @Param('integrationId') integrationId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return await this.integrationService.installMarketplaceIntegration(
      integrationId,
      tenantId,
      userId,
    );
  }
}