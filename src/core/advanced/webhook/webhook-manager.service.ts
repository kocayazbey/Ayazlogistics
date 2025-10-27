import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import axios from 'axios';
import * as crypto from 'crypto';
import { webhooks, webhookDeliveries } from '@/database/schema/core/tenants.schema';
import { eq } from 'drizzle-orm';

interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  webhookId: string;
}

@Injectable()
export class WebhookManagerService {
  private readonly logger = new Logger(WebhookManagerService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async deliverWebhook(webhookId: string, event: string, payload: any): Promise<void> {
    const [webhook] = await this.db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
    
    if (!webhook || !webhook.isActive) {
      this.logger.warn(`Webhook ${webhookId} not found or inactive`);
      return;
    }

    const events = webhook.events as string[];
    if (!events.includes(event) && !events.includes('*')) {
      this.logger.debug(`Webhook ${webhookId} not subscribed to event ${event}`);
      return;
    }

    const webhookPayload: WebhookPayload = {
      event,
      data: payload,
      timestamp: new Date(),
      webhookId,
    };

    const signature = this.generateSignature(webhookPayload, webhook.secret);
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event,
      'X-Webhook-ID': webhookId,
      ...(webhook.headers as any || {}),
    };

    let attempt = 0;
    const maxRetries = webhook.retryCount || 3;
    const retryDelay = (webhook.retryDelaySeconds || 60) * 1000;

    while (attempt <= maxRetries) {
      try {
        const startTime = Date.now();
        const response = await axios.post(webhook.url, webhookPayload, {
          headers,
          timeout: (webhook.timeoutSeconds || 30) * 1000,
          validateStatus: () => true,
        });

        const responseTime = Date.now() - startTime;

        await this.db.insert(webhookDeliveries).values({
          webhookId,
          eventType: event,
          payload: webhookPayload as any,
          requestHeaders: headers as any,
          responseStatus: response.status,
          responseBody: JSON.stringify(response.data),
          responseTimeMs: responseTime,
          retryCount: attempt,
          deliveredAt: new Date(),
        });

        if (response.status >= 200 && response.status < 300) {
          this.logger.log(`Webhook delivered successfully to ${webhook.url}`);
          await this.db.update(webhooks).set({
            lastSuccessAt: new Date(),
            failureCount: 0,
          }).where(eq(webhooks.id, webhookId));
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        await this.db.insert(webhookDeliveries).values({
          webhookId,
          eventType: event,
          payload: webhookPayload as any,
          requestHeaders: headers as any,
          errorMessage,
          retryCount: attempt - 1,
        });

        if (attempt <= maxRetries) {
          this.logger.warn(`Webhook delivery failed (attempt ${attempt}/${maxRetries + 1}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        } else {
          this.logger.error(`Webhook delivery failed after ${maxRetries + 1} attempts`);
          await this.db.update(webhooks).set({
            lastFailureAt: new Date(),
            failureCount: (webhook.failureCount || 0) + 1,
          }).where(eq(webhooks.id, webhookId));
        }
      }
    }
  }

  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }

  async verifySignature(payload: any, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  async retryFailedDeliveries(webhookId: string): Promise<number> {
    const failedDeliveries = await this.db.execute(
      `SELECT * FROM webhook_deliveries WHERE webhook_id = $1 AND response_status IS NULL ORDER BY created_at DESC LIMIT 100`,
      [webhookId]
    );

    let retried = 0;
    for (const delivery of failedDeliveries.rows) {
      await this.deliverWebhook(webhookId, delivery.event_type, delivery.payload);
      retried++;
    }

    this.logger.log(`Retried ${retried} failed webhook deliveries`);
    return retried;
  }
}

