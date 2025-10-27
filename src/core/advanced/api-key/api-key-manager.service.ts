import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as crypto from 'crypto';
import { apiKeys } from '@/database/schema/core/tenants.schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class APIKeyManagerService {
  private readonly logger = new Logger(APIKeyManagerService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async generateAPIKey(
    tenantId: string,
    userId: string,
    name: string,
    scopes: string[] = [],
    expiresInDays?: number,
  ): Promise<{ apiKey: string; keyId: string }> {
    const key = `alsk_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyPrefix = key.substring(0, 12);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const [result] = await this.db.insert(apiKeys).values({
      tenantId,
      userId,
      name,
      keyHash,
      keyPrefix,
      scopes,
      expiresAt,
      isActive: true,
    }).returning();

    this.logger.log(`API key generated: ${name} (${keyPrefix}...)`);

    return {
      apiKey: key,
      keyId: result.id,
    };
  }

  async validateAPIKey(key: string): Promise<any | null> {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    
    const [apiKey] = await this.db.select().from(apiKeys).where(eq(apiKeys.keyHash, keyHash)).limit(1);

    if (!apiKey || !apiKey.isActive) return null;
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) return null;

    await this.db.update(apiKeys).set({
      lastUsedAt: new Date(),
    }).where(eq(apiKeys.id, apiKey.id));

    return apiKey;
  }

  async revokeAPIKey(keyId: string, revokedBy: string): Promise<void> {
    await this.db.update(apiKeys).set({
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
    }).where(eq(apiKeys.id, keyId));

    this.logger.log(`API key revoked: ${keyId}`);
  }

  async listAPIKeys(tenantId: string): Promise<any[]> {
    return this.db.select().from(apiKeys).where(eq(apiKeys.tenantId, tenantId));
  }
}

