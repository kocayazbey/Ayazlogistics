import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../core/database/drizzle-orm.provider';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { webhooks, webhookLogs } from '../../core/database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface CreateWebhookDto {
  url: string;
  events: string[];
  isActive?: boolean;
  secret?: string;
}

export interface UpdateWebhookDto {
  url?: string;
  events?: string[];
  isActive?: boolean;
  secret?: string;
}

export interface WebhookExecutionResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  retryCount?: number;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {}

  async getWebhooks(tenantId: string) {
    try {
      const webhooksData = await this.db
        .select()
        .from(webhooks)
        .where(eq(webhooks.tenantId, tenantId))
        .orderBy(desc(webhooks.createdAt));

      return {
        success: true,
        data: webhooksData,
        count: webhooksData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get webhooks: ${error.message}`);
      throw new BadRequestException('Failed to retrieve webhooks');
    }
  }

  async getWebhookById(id: string, tenantId: string) {
    try {
      const webhook = await this.db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.id, id),
            eq(webhooks.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!webhook.length) {
        throw new NotFoundException('Webhook not found');
      }

      return {
        success: true,
        data: webhook[0],
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get webhook: ${error.message}`);
      throw new BadRequestException('Failed to retrieve webhook');
    }
  }

  async createWebhook(
    data: CreateWebhookDto,
    tenantId: string,
    userId: string,
  ) {
    try {
      const webhookId = uuidv4();
      const secret = data.secret || this.generateSecret();
      
      const newWebhook = {
        id: webhookId,
        tenantId,
        url: data.url,
        events: data.events,
        isActive: data.isActive ?? true,
        secret,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.db.insert(webhooks).values(newWebhook);

      this.logger.log(`Webhook created: ${webhookId}`);

      return {
        success: true,
        message: 'Webhook created successfully',
        data: newWebhook,
      };
    } catch (error) {
      this.logger.error(`Failed to create webhook: ${error.message}`);
      throw new BadRequestException('Failed to create webhook');
    }
  }

  async updateWebhook(
    id: string,
    data: UpdateWebhookDto,
    tenantId: string,
  ) {
    try {
      const existingWebhook = await this.getWebhookById(id, tenantId);
      
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await this.db
        .update(webhooks)
        .set(updateData)
        .where(
          and(
            eq(webhooks.id, id),
            eq(webhooks.tenantId, tenantId),
          ),
        );

      this.logger.log(`Webhook updated: ${id}`);

      return {
        success: true,
        message: 'Webhook updated successfully',
        data: { ...existingWebhook.data, ...updateData },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update webhook: ${error.message}`);
      throw new BadRequestException('Failed to update webhook');
    }
  }

  async deleteWebhook(id: string, tenantId: string) {
    try {
      await this.getWebhookById(id, tenantId); // Check if exists

      await this.db
        .delete(webhooks)
        .where(
          and(
            eq(webhooks.id, id),
            eq(webhooks.tenantId, tenantId),
          ),
        );

      this.logger.log(`Webhook deleted: ${id}`);

      return {
        success: true,
        message: 'Webhook deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete webhook: ${error.message}`);
      throw new BadRequestException('Failed to delete webhook');
    }
  }

  async enableWebhook(id: string, tenantId: string) {
    try {
      await this.updateWebhook(id, { isActive: true }, tenantId);

      return {
        success: true,
        message: 'Webhook enabled',
        data: { isActive: true },
      };
    } catch (error) {
      this.logger.error(`Failed to enable webhook: ${error.message}`);
      throw new BadRequestException('Failed to enable webhook');
    }
  }

  async disableWebhook(id: string, tenantId: string) {
    try {
      await this.updateWebhook(id, { isActive: false }, tenantId);

      return {
        success: true,
        message: 'Webhook disabled',
        data: { isActive: false },
      };
    } catch (error) {
      this.logger.error(`Failed to disable webhook: ${error.message}`);
      throw new BadRequestException('Failed to disable webhook');
    }
  }

  async getWebhookLogs(
    id: string,
    tenantId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      const logs = await this.db
        .select()
        .from(webhookLogs)
        .where(
          and(
            eq(webhookLogs.webhookId, id),
            eq(webhookLogs.tenantId, tenantId),
          ),
        )
        .orderBy(desc(webhookLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: logs,
        count: logs.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get webhook logs: ${error.message}`);
      throw new BadRequestException('Failed to retrieve webhook logs');
    }
  }

  async testWebhook(id: string, tenantId: string): Promise<WebhookExecutionResult> {
    try {
      const webhook = await this.getWebhookById(id, tenantId);
      const startTime = Date.now();

      // Create test payload
      const testPayload = {
        event: 'webhook.test',
        data: {
          message: 'This is a test webhook',
          timestamp: new Date().toISOString(),
        },
        webhookId: id,
      };

      // Simulate webhook execution
      const result = await this.executeWebhook(webhook.data, testPayload);

      const responseTime = Date.now() - startTime;
      result.responseTime = responseTime;

      // Log the test result
      await this.logWebhookEvent(
        id,
        tenantId,
        'test',
        result.success ? 'success' : 'error',
        result.success ? 'Test webhook executed successfully' : result.error || 'Test webhook failed',
        result,
      );

      return result;
    } catch (error) {
      this.logger.error(`Webhook test failed: ${error.message}`);
      return {
        success: false,
        error: `Test failed: ${error.message}`,
      };
    }
  }

  async executeWebhook(webhook: any, payload: any): Promise<WebhookExecutionResult> {
    try {
      const startTime = Date.now();
      
      // Simulate HTTP request to webhook URL
      const response = await this.sendWebhookRequest(webhook.url, payload, webhook.secret);
      
      const responseTime = Date.now() - startTime;

      return {
        success: response.statusCode >= 200 && response.statusCode < 300,
        statusCode: response.statusCode,
        responseTime,
        error: response.error,
      };
    } catch (error) {
      this.logger.error(`Webhook execution failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async sendWebhookRequest(url: string, payload: any, secret: string) {
    // Simulate webhook request
    const signature = this.generateSignature(JSON.stringify(payload), secret);
    
    // Mock response - in real implementation, use axios or fetch
    return {
      statusCode: 200,
      error: null,
    };
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async logWebhookEvent(
    webhookId: string,
    tenantId: string,
    event: string,
    status: string,
    message: string,
    data?: any,
  ) {
    try {
      await this.db.insert(webhookLogs).values({
        id: uuidv4(),
        webhookId,
        tenantId,
        event,
        status,
        message,
        data,
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to log webhook event: ${error.message}`);
    }
  }

  async triggerWebhook(event: string, data: any, tenantId: string) {
    try {
      // Find all active webhooks for this tenant that listen to this event
      const webhooks = await this.db
        .select()
        .from(webhooks)
        .where(
          and(
            eq(webhooks.tenantId, tenantId),
            eq(webhooks.isActive, true),
          ),
        );

      const relevantWebhooks = webhooks.filter(webhook => 
        webhook.events.includes(event)
      );

      // Execute all relevant webhooks
      const results = await Promise.allSettled(
        relevantWebhooks.map(webhook => 
          this.executeWebhook(webhook, { event, data })
        )
      );

      const successful = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;

      this.logger.log(`Triggered ${relevantWebhooks.length} webhooks for event ${event}, ${successful} successful`);

      return {
        success: true,
        message: `Triggered ${relevantWebhooks.length} webhooks`,
        data: {
          event,
          webhookCount: relevantWebhooks.length,
          successfulCount: successful,
          results: results.map(result => 
            result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
          ),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to trigger webhooks: ${error.message}`);
      throw new BadRequestException('Failed to trigger webhooks');
    }
  }

  async regenerateSecret(id: string, tenantId: string) {
    try {
      const newSecret = this.generateSecret();
      await this.updateWebhook(id, { secret: newSecret }, tenantId);

      return {
        success: true,
        message: 'Webhook secret regenerated successfully',
        data: { secret: newSecret },
      };
    } catch (error) {
      this.logger.error(`Failed to regenerate webhook secret: ${error.message}`);
      throw new BadRequestException('Failed to regenerate webhook secret');
    }
  }
}
