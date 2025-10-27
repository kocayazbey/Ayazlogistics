import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class ImmutableAuditService {
  private readonly logger = new Logger(ImmutableAuditService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  private hash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  async append(record: any): Promise<string> {
    const last = await this.db.execute("SELECT id, record_hash FROM audit_immutable ORDER BY created_at DESC LIMIT 1");
    const prevHash = (last as any[])[0]?.record_hash || '';
    const body = JSON.stringify(record);
    const recordHash = this.hash(prevHash + body);
    const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
    await this.db.execute(
      `INSERT INTO audit_immutable (id, prev_hash, record, record_hash, created_at) VALUES ($1,$2,$3,$4,NOW())`,
      [id, prevHash || null, record, recordHash]
    );
    return id;
  }

  async verify(): Promise<{ valid: boolean; brokenAt?: string }> {
    const rows = await this.db.execute("SELECT id, prev_hash, record, record_hash FROM audit_immutable ORDER BY created_at ASC");
    let prev = '';
    for (const row of rows as any[]) {
      const computed = this.hash((row.prev_hash || '') + JSON.stringify(row.record));
      if (computed !== row.record_hash) {
        this.logger.error(`Hash chain broken at ${row.id}`);
        return { valid: false, brokenAt: row.id };
      }
      prev = row.record_hash;
    }
    return { valid: true };
  }
}
