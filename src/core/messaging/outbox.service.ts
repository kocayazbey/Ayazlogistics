import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export interface OutboxMessage {
  id: string;
  eventName: string;
  aggregateId?: string;
  payload: any;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  createdAt: Date;
  sentAt?: Date | null;
  lastError?: string | null;
}

export type Publisher = (eventName: string, payload: any) => Promise<void>;

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private publisher: Publisher | null = null;

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  setPublisher(publisher: Publisher): void {
    this.publisher = publisher;
  }

  async addMessage(eventName: string, payload: any, aggregateId?: string): Promise<string> {
    const id = `out_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await this.db.execute(
      `INSERT INTO outbox (id, event_name, aggregate_id, payload, status, attempts, created_at)
       VALUES ($1, $2, $3, $4, 'pending', 0, NOW())`,
      [id, eventName, aggregateId ?? null, JSON.stringify(payload)],
    );

    this.logger.debug(`Outbox message queued: ${id} (${eventName})`);
    return id;
  }

  async processPending(batchSize: number = 100): Promise<{ sent: number; failed: number }> {
    if (!this.publisher) {
      this.logger.warn('No publisher configured for OutboxService');
      return { sent: 0, failed: 0 };
    }

    const rows = await this.db.execute(
      `SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT $1`,
      [batchSize],
    );

    let sent = 0;
    let failed = 0;

    for (const row of rows as any[]) {
      try {
        await this.publisher(row.event_name, JSON.parse(row.payload));
        await this.db.execute(
          `UPDATE outbox SET status = 'sent', attempts = attempts + 1, sent_at = NOW(), last_error = NULL WHERE id = $1`,
          [row.id],
        );
        sent++;
      } catch (err: any) {
        await this.db.execute(
          `UPDATE outbox SET status = 'failed', attempts = attempts + 1, last_error = $2 WHERE id = $1`,
          [row.id, err?.message || 'unknown error'],
        );
        failed++;
      }
    }

    this.logger.log(`Outbox processed: sent=${sent}, failed=${failed}`);
    return { sent, failed };
  }
}
