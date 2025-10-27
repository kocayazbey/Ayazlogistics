import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Put } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { StandardRateLimit } from '../../core/security/decorators/rate-limit.decorator';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { WebhookService } from './webhook.service';

@ApiTags('Webhooks')
@Controller({ path: 'webhooks', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Get()
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get all webhooks' })
  @ApiResponse({ status: 200, description: 'List of webhooks' })
  async getWebhooks(@CurrentUser('tenantId') tenantId: string) {
    return await this.webhookService.getWebhooks(tenantId);
  }

  @Get(':id')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get webhook by ID' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  async getWebhookById(
    @Param('id') webhookId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.webhookService.getWebhookById(webhookId, tenantId);
  }

  @Post()
  @StandardRateLimit()
  @ApiOperation({ summary: 'Create webhook' })
  @ApiResponse({ status: 201, description: 'Webhook created' })
  async createWebhook(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: { url: string; events: string[]; isActive?: boolean },
  ) {
    return await this.webhookService.createWebhook(data, tenantId, userId);
  }

  @Put(':id')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Update webhook' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  async updateWebhook(
    @Param('id') webhookId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: { url?: string; events?: string[]; isActive?: boolean },
  ) {
    return await this.webhookService.updateWebhook(webhookId, data, tenantId);
  }

  @Delete(':id')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Delete webhook' })
  @ApiResponse({ status: 204, description: 'Webhook deleted' })
  async deleteWebhook(
    @Param('id') webhookId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.webhookService.deleteWebhook(webhookId, tenantId);
  }

  @Post(':id/enable')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Enable webhook' })
  @ApiResponse({ status: 200, description: 'Webhook enabled' })
  async enableWebhook(
    @Param('id') webhookId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.webhookService.enableWebhook(webhookId, tenantId);
  }

  @Post(':id/disable')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Disable webhook' })
  @ApiResponse({ status: 200, description: 'Webhook disabled' })
  async disableWebhook(
    @Param('id') webhookId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.webhookService.disableWebhook(webhookId, tenantId);
  }

  @Post(':id/test')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Test webhook' })
  @ApiResponse({ status: 200, description: 'Webhook test result' })
  async testWebhook(
    @Param('id') webhookId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.webhookService.testWebhook(webhookId, tenantId);
  }

  @Get(':id/logs')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get webhook logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Webhook logs' })
  async getWebhookLogs(
    @Param('id') webhookId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.webhookService.getWebhookLogs(webhookId, tenantId, limit, offset);
  }

  @Post(':id/regenerate-secret')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Regenerate webhook secret' })
  @ApiResponse({ status: 200, description: 'Webhook secret regenerated' })
  async regenerateSecret(
    @Param('id') webhookId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.webhookService.regenerateSecret(webhookId, tenantId);
  }

  @Post('trigger/:event')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Trigger webhook for event' })
  @ApiResponse({ status: 200, description: 'Webhooks triggered' })
  async triggerWebhook(
    @Param('event') event: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: any,
  ) {
    return await this.webhookService.triggerWebhook(event, data, tenantId);
  }
}