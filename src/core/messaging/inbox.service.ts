import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async hasProcessed(messageId: string): Promise<boolean> {
    const res = await this.db.execute(`SELECT 1 FROM inbox WHERE id = $1 LIMIT 1`, [messageId]);
    return (res as any[]).length > 0;
  }

  async markProcessed(messageId: string, metadata?: any): Promise<void> {
    await this.db.execute(
      `INSERT INTO inbox (id, metadata, processed_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO NOTHING`,
      [messageId, JSON.stringify(metadata ?? {})],
    );
    this.logger.debug(`Inbox marked processed: ${messageId}`);
  }
}
