import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StandardizedDatabaseService } from '../../core/database/standardized-database.service';
import { createHmac, timingSafeEqual } from 'crypto';

export interface WebhookEvent {
  id: string;
  eventType: string;
  payload: any;
  headers: Record<string, string>;
  signature: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'delivered' | 'failed' | 'dead_letter';
  endpoint: string;
  tenantId?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  attempt: number;
  status: 'success' | 'failed' | 'timeout';
  responseCode?: number;
  responseBody?: string;
  duration: number;
  timestamp: Date;
  error?: string;
}

export interface DeadLetterQueue {
  id: string;
  webhookId: string;
  reason: string;
  originalPayload: any;
  failureCount: number;
  lastAttempt: Date;
  createdAt: Date;
}

@Injectable()
export class WebhookReliabilityService {
  private readonly logger = new Logger(WebhookReliabilityService.name);
  private readonly secretKey: string;
  private readonly maxRetries: number;
  private readonly retryDelays: number[];

  constructor(
    private configService: ConfigService,
    private databaseService: StandardizedDatabaseService
  ) {
    this.secretKey = this.configService.get<string>('WEBHOOK_SECRET_KEY', 'default-secret');
    this.maxRetries = this.configService.get<number>('WEBHOOK_MAX_RETRIES', 5);
    this.retryDelays = [1000, 5000, 15000, 60000, 300000]; // 1s, 5s, 15s, 1m, 5m
  }

  async createWebhookEvent(event: Omit<WebhookEvent, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<WebhookEvent> {
    const webhookEvent: WebhookEvent = {
      id: this.generateWebhookId(),
      ...event,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending'
    };

    // Generate HMAC signature
    webhookEvent.signature = this.generateSignature(webhookEvent.payload);

    await this.databaseService.insert('webhook_events', webhookEvent);
    
    this.logger.log(`Webhook event created: ${webhookEvent.id} for ${webhookEvent.eventType}`);
    
    // Start delivery process
    this.deliverWebhook(webhookEvent.id);
    
    return webhookEvent;
  }

  async deliverWebhook(webhookId: string): Promise<void> {
    const webhook = await this.databaseService.findOne('webhook_events', { id: webhookId });
    if (!webhook) {
      this.logger.error(`Webhook not found: ${webhookId}`);
      return;
    }

    if (webhook.status === 'delivered' || webhook.status === 'dead_letter') {
      return;
    }

    await this.databaseService.update('webhook_events', 
      { id: webhookId }, 
      { status: 'processing' }
    );

    try {
      const delivery = await this.attemptDelivery(webhook);
      
      if (delivery.status === 'success') {
        await this.databaseService.update('webhook_events', 
          { id: webhookId }, 
          { status: 'delivered' }
        );
        this.logger.log(`Webhook delivered successfully: ${webhookId}`);
      } else {
        await this.handleDeliveryFailure(webhook, delivery);
      }
    } catch (error) {
      this.logger.error(`Webhook delivery failed: ${webhookId}`, error);
      await this.handleDeliveryFailure(webhook, { 
        status: 'failed', 
        error: error.message,
        duration: 0,
        timestamp: new Date()
      });
    }
  }

  private async attemptDelivery(webhook: WebhookEvent): Promise<WebhookDelivery> {
    const startTime = Date.now();
    const attempt = webhook.retryCount + 1;

    try {
      const response = await fetch(webhook.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': webhook.signature,
          'X-Webhook-Event': webhook.eventType,
          'X-Webhook-Id': webhook.id,
          'X-Webhook-Timestamp': webhook.timestamp.getTime().toString(),
          'User-Agent': 'AyazLogistics-Webhook/1.0',
          ...webhook.headers
        },
        body: JSON.stringify(webhook.payload),
        timeout: 30000 // 30 second timeout
      });

      const duration = Date.now() - startTime;
      const responseBody = await response.text();

      const delivery: WebhookDelivery = {
        id: this.generateDeliveryId(),
        webhookId: webhook.id,
        attempt,
        status: response.ok ? 'success' : 'failed',
        responseCode: response.status,
        responseBody,
        duration,
        timestamp: new Date()
      };

      await this.databaseService.insert('webhook_deliveries', delivery);

      return delivery;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const delivery: WebhookDelivery = {
        id: this.generateDeliveryId(),
        webhookId: webhook.id,
        attempt,
        status: 'failed',
        duration,
        timestamp: new Date(),
        error: error.message
      };

      await this.databaseService.insert('webhook_deliveries', delivery);
      return delivery;
    }
  }

  private async handleDeliveryFailure(webhook: WebhookEvent, delivery: WebhookDelivery): Promise<void> {
    const newRetryCount = webhook.retryCount + 1;

    if (newRetryCount >= webhook.maxRetries) {
      // Move to dead letter queue
      await this.moveToDeadLetterQueue(webhook, delivery.error || 'Max retries exceeded');
    } else {
      // Schedule retry
      await this.scheduleRetry(webhook, newRetryCount);
    }
  }

  private async moveToDeadLetterQueue(webhook: WebhookEvent, reason: string): Promise<void> {
    const dlq: DeadLetterQueue = {
      id: this.generateDLQId(),
      webhookId: webhook.id,
      reason,
      originalPayload: webhook.payload,
      failureCount: webhook.retryCount,
      lastAttempt: new Date(),
      createdAt: new Date()
    };

    await this.databaseService.insert('dead_letter_queue', dlq);
    
    await this.databaseService.update('webhook_events', 
      { id: webhook.id }, 
      { status: 'dead_letter' }
    );

    this.logger.warn(`Webhook moved to DLQ: ${webhook.id} - ${reason}`);
  }

  private async scheduleRetry(webhook: WebhookEvent, retryCount: number): Promise<void> {
    const delay = this.retryDelays[Math.min(retryCount - 1, this.retryDelays.length - 1)];
    
    await this.databaseService.update('webhook_events', 
      { id: webhook.id }, 
      { 
        retryCount,
        status: 'pending'
      }
    );

    // Schedule retry using setTimeout or a job queue
    setTimeout(() => {
      this.deliverWebhook(webhook.id);
    }, delay);

    this.logger.log(`Webhook retry scheduled: ${webhook.id} (attempt ${retryCount}, delay ${delay}ms)`);
  }

  async verifyWebhookSignature(payload: string, signature: string, timestamp: string): Promise<boolean> {
    try {
      const expectedSignature = this.generateSignature(payload);
      return timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  async processDeadLetterQueue(): Promise<void> {
    const dlqItems = await this.databaseService.find('dead_letter_queue', {
      failureCount: { $lt: 10 } // Only retry items that haven't failed too many times
    });

    for (const item of dlqItems) {
      try {
        // Attempt to reprocess the webhook
        const webhook = await this.databaseService.findOne('webhook_events', { id: item.webhookId });
        if (webhook) {
          await this.databaseService.update('webhook_events', 
            { id: webhook.id }, 
            { 
              status: 'pending',
              retryCount: 0
            }
          );
          
          this.deliverWebhook(webhook.id);
          
          // Remove from DLQ if successful
          await this.databaseService.delete('dead_letter_queue', { id: item.id });
        }
      } catch (error) {
        this.logger.error(`Failed to reprocess DLQ item: ${item.id}`, error);
      }
    }
  }

  async getWebhookStats(): Promise<any> {
    const stats = await this.databaseService.aggregate('webhook_events', [
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const deliveryStats = await this.databaseService.aggregate('webhook_deliveries', [
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    return {
      webhookStatus: stats,
      deliveryStats,
      dlqCount: await this.databaseService.count('dead_letter_queue', {}),
      lastUpdated: new Date()
    };
  }

  async implementOutboxPattern(event: any, eventType: string): Promise<void> {
    // Store event in outbox table for reliable delivery
    const outboxEvent = {
      id: this.generateOutboxId(),
      eventType,
      payload: event,
      status: 'pending',
      createdAt: new Date(),
      processedAt: null
    };

    await this.databaseService.insert('outbox_events', outboxEvent);
    
    // Process outbox events
    this.processOutboxEvents();
  }

  private async processOutboxEvents(): Promise<void> {
    const pendingEvents = await this.databaseService.find('outbox_events', {
      status: 'pending'
    });

    for (const event of pendingEvents) {
      try {
        // Mark as processing
        await this.databaseService.update('outbox_events', 
          { id: event.id }, 
          { status: 'processing' }
        );

        // Create webhook event
        await this.createWebhookEvent({
          eventType: event.eventType,
          payload: event.payload,
          headers: {},
          signature: '',
          maxRetries: this.maxRetries,
          endpoint: await this.getWebhookEndpoint(event.eventType)
        });

        // Mark as processed
        await this.databaseService.update('outbox_events', 
          { id: event.id }, 
          { 
            status: 'processed',
            processedAt: new Date()
          }
        );
      } catch (error) {
        this.logger.error(`Failed to process outbox event: ${event.id}`, error);
        
        await this.databaseService.update('outbox_events', 
          { id: event.id }, 
          { status: 'failed' }
        );
      }
    }
  }

  private generateSignature(payload: string): string {
    return createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');
  }

  private async getWebhookEndpoint(eventType: string): Promise<string> {
    // Implementation would fetch endpoint from configuration
    const endpoints = {
      'shipment.created': 'https://customer.example.com/webhooks/shipment',
      'delivery.completed': 'https://customer.example.com/webhooks/delivery',
      'inventory.updated': 'https://customer.example.com/webhooks/inventory'
    };
    
    return endpoints[eventType] || 'https://default.example.com/webhooks';
  }

  private generateWebhookId(): string {
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDeliveryId(): string {
    return `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDLQId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOutboxId(): string {
    return `outbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
