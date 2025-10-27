import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as amqp from 'amqplib';

interface FailedMessage {
  id: string;
  originalQueue: string;
  payload: any;
  error: string;
  failureCount: number;
  firstFailedAt: Date;
  lastFailedAt: Date;
  headers: Record<string, any>;
  retryable: boolean;
}

interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly DLQ_EXCHANGE = 'dlq_exchange';
  private readonly RETRY_EXCHANGE = 'retry_exchange';

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async initialize(): Promise<void> {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(this.DLQ_EXCHANGE, 'topic', { durable: true });
      await this.channel.assertExchange(this.RETRY_EXCHANGE, 'topic', { durable: true });

      await this.channel.assertQueue('dlq_main', {
        durable: true,
        arguments: {
          'x-message-ttl': 7 * 24 * 60 * 60 * 1000,
        },
      });

      await this.channel.bindQueue('dlq_main', this.DLQ_EXCHANGE, '#');

      this.logger.log('Dead Letter Queue initialized');
    } catch (error) {
      this.logger.error('DLQ initialization failed:', error);
      throw error;
    }
  }

  async sendToDeadLetter(
    message: any,
    originalQueue: string,
    error: Error,
    headers: Record<string, any> = {},
  ): Promise<void> {
    const failureCount = (headers['x-failure-count'] || 0) + 1;

    const failedMessage: FailedMessage = {
      id: headers['x-message-id'] || this.generateMessageId(),
      originalQueue,
      payload: message,
      error: error.message,
      failureCount,
      firstFailedAt: headers['x-first-failed-at'] ? new Date(headers['x-first-failed-at']) : new Date(),
      lastFailedAt: new Date(),
      headers,
      retryable: this.isRetryable(error),
    };

    await this.channel.publish(
      this.DLQ_EXCHANGE,
      originalQueue,
      Buffer.from(JSON.stringify(failedMessage)),
      {
        persistent: true,
        headers: {
          'x-message-id': failedMessage.id,
          'x-failure-count': failureCount,
          'x-first-failed-at': failedMessage.firstFailedAt.toISOString(),
          'x-original-queue': originalQueue,
          'x-error': error.message,
        },
      },
    );

    await this.persistFailedMessage(failedMessage);

    this.logger.warn(`Message sent to DLQ: ${failedMessage.id} (failure count: ${failureCount})`);
  }

  private async persistFailedMessage(message: FailedMessage): Promise<void> {
    await this.db.execute(
      `INSERT INTO dead_letter_messages 
       (id, original_queue, payload, error, failure_count, first_failed_at, last_failed_at, headers, retryable)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         failure_count = $5,
         last_failed_at = $7,
         error = $4`,
      [
        message.id,
        message.originalQueue,
        JSON.stringify(message.payload),
        message.error,
        message.failureCount,
        message.firstFailedAt,
        message.lastFailedAt,
        JSON.stringify(message.headers),
        message.retryable,
      ]
    );
  }

  async retryFailedMessages(
    queue: string,
    policy: RetryPolicy = this.getDefaultRetryPolicy(),
  ): Promise<{ retried: number; failed: number; skipped: number }> {
    this.logger.log(`Retrying failed messages from queue: ${queue}`);

    const messages = await this.db.execute(
      `SELECT * FROM dead_letter_messages 
       WHERE original_queue = $1 
       AND retryable = true 
       AND failure_count < $2
       ORDER BY first_failed_at ASC
       LIMIT 100`,
      [queue, policy.maxRetries]
    );

    let retried = 0;
    let failed = 0;
    let skipped = 0;

    for (const msg of messages.rows) {
      const delay = this.calculateRetryDelay(msg.failure_count, policy);
      const nextRetryTime = new Date(msg.last_failed_at).getTime() + delay;

      if (Date.now() < nextRetryTime) {
        skipped++;
        continue;
      }

      try {
        await this.channel.publish(
          this.RETRY_EXCHANGE,
          queue,
          Buffer.from(msg.payload),
          {
            headers: {
              'x-retry-count': msg.failure_count,
              'x-original-message-id': msg.id,
            },
          },
        );

        await this.db.execute(
          `UPDATE dead_letter_messages SET retry_attempted_at = NOW() WHERE id = $1`,
          [msg.id]
        );

        retried++;
      } catch (error) {
        this.logger.error(`Retry failed for message ${msg.id}:`, error);
        failed++;
      }
    }

    this.logger.log(`Retry complete: ${retried} retried, ${failed} failed, ${skipped} skipped`);
    return { retried, failed, skipped };
  }

  private calculateRetryDelay(failureCount: number, policy: RetryPolicy): number {
    const delay = Math.min(
      policy.initialDelayMs * Math.pow(policy.backoffMultiplier, failureCount - 1),
      policy.maxDelayMs
    );
    return delay;
  }

  private getDefaultRetryPolicy(): RetryPolicy {
    return {
      maxRetries: 5,
      initialDelayMs: 1000,
      maxDelayMs: 60000,
      backoffMultiplier: 2,
      retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
    };
  }

  private isRetryable(error: Error): boolean {
    const retryableErrors = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'Network error'];
    return retryableErrors.some(e => error.message.includes(e));
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getDeadLetterStats(queue: string): Promise<any> {
    const result = await this.db.execute(
      `SELECT 
        COUNT(*) as total_messages,
        COUNT(CASE WHEN retryable = true THEN 1 END) as retryable,
        COUNT(CASE WHEN retryable = false THEN 1 END) as non_retryable,
        AVG(failure_count) as avg_failure_count,
        MAX(failure_count) as max_failure_count,
        MIN(first_failed_at) as oldest_message,
        MAX(last_failed_at) as newest_message
       FROM dead_letter_messages
       WHERE original_queue = $1`,
      [queue]
    );

    return result.rows[0];
  }

  async purgeOldMessages(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.db.execute(
      `DELETE FROM dead_letter_messages WHERE first_failed_at < $1`,
      [cutoffDate]
    );

    this.logger.log(`Purged ${result.rowCount} old DLQ messages`);
    return result.rowCount || 0;
  }

  async replayMessage(messageId: string, targetQueue: string): Promise<void> {
    const result = await this.db.execute(
      `SELECT * FROM dead_letter_messages WHERE id = $1`,
      [messageId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Message not found: ${messageId}`);
    }

    const message = result.rows[0];

    await this.channel.sendToQueue(
      targetQueue,
      Buffer.from(message.payload),
      {
        persistent: true,
        headers: {
          'x-replayed': 'true',
          'x-original-message-id': messageId,
        },
      },
    );

    await this.db.execute(
      `UPDATE dead_letter_messages SET replayed_at = NOW() WHERE id = $1`,
      [messageId]
    );

    this.logger.log(`Message replayed: ${messageId} -> ${targetQueue}`);
  }

  async bulkReplay(queue: string, limit: number = 100): Promise<number> {
    const messages = await this.db.execute(
      `SELECT * FROM dead_letter_messages 
       WHERE original_queue = $1 AND retryable = true AND replayed_at IS NULL
       ORDER BY first_failed_at ASC
       LIMIT $2`,
      [queue, limit]
    );

    let replayed = 0;

    for (const msg of messages.rows) {
      try {
        await this.replayMessage(msg.id, queue);
        replayed++;
      } catch (error) {
        this.logger.error(`Bulk replay failed for ${msg.id}:`, error);
      }
    }

    return replayed;
  }

  async analyzeFailurePatterns(queue: string): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT 
        error,
        COUNT(*) as occurrence_count,
        AVG(failure_count) as avg_retries,
        MIN(first_failed_at) as first_seen,
        MAX(last_failed_at) as last_seen
       FROM dead_letter_messages
       WHERE original_queue = $1
       GROUP BY error
       ORDER BY occurrence_count DESC
       LIMIT 10`,
      [queue]
    );

    return result.rows;
  }
}

