import { Injectable, Logger, Inject, UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export interface ApiKeyRecord {
  id: string;
  keyHash: string;
  label?: string;
  tenantId?: string;
  revoked: boolean;
  expiresAt?: Date | null;
  createdAt: Date;
  lastUsedAt?: Date | null;
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createKey(label?: string, tenantId?: string, ttlDays?: number): Promise<{ id: string; plainKey: string; expiresAt?: Date }> {
    const id = `key_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const plainKey = randomBytes(24).toString('hex');
    const keyHash = this.hash(plainKey);

    const expiresAt = ttlDays ? new Date(Date.now() + ttlDays * 86400000) : null;

    await this.db.execute(
      `INSERT INTO api_keys (id, key_hash, label, tenant_id, revoked, expires_at, created_at) VALUES ($1, $2, $3, $4, false, $5, NOW())`,
      [id, keyHash, label ?? null, tenantId ?? null, expiresAt],
    );

    return { id, plainKey, expiresAt: expiresAt ?? undefined };
  }

  async rotateKey(id: string): Promise<{ plainKey: string }> {
    const plainKey = randomBytes(24).toString('hex');
    const keyHash = this.hash(plainKey);
    await this.db.execute(`UPDATE api_keys SET key_hash = $2, created_at = NOW() WHERE id = $1`, [id, keyHash]);
    return { plainKey };
  }

  async revokeKey(id: string): Promise<void> {
    await this.db.execute(`UPDATE api_keys SET revoked = true WHERE id = $1`, [id]);
  }

  async expireKeys(): Promise<number> {
    const res = await this.db.execute(`UPDATE api_keys SET revoked = true WHERE expires_at IS NOT NULL AND expires_at < NOW() AND revoked = false`);
    return (res as any).rowCount ?? 0;
  }

  async validate(plainKey: string): Promise<ApiKeyRecord> {
    const keyHash = this.hash(plainKey);
    const rows = await this.db.execute(`SELECT * FROM api_keys WHERE key_hash = $1 AND revoked = false LIMIT 1`, [keyHash]);
    const key = (rows as any[])[0];
    if (!key) {
      throw new UnauthorizedException('Invalid API key');
    }
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      throw new UnauthorizedException('API key expired');
    }
    await this.db.execute(`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, [key.id]);
    return key as ApiKeyRecord;
  }

  private hash(v: string): string {
    return createHash('sha256').update(v).digest('hex');
  }
}
