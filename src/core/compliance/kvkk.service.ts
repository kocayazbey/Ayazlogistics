import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { users } from '../../database/schema/core/users.schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class KVKKService {
  private readonly logger = new Logger(KVKKService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async recordConsent(
    userId: string,
    consentType: string,
    granted: boolean,
    ipAddress?: string,
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO user_consents (user_id, consent_type, granted, timestamp, ip_address)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [userId, consentType, granted, ipAddress]
    );

    this.logger.log(`KVKK consent recorded for user ${userId}: ${consentType}=${granted}`);
  }

  async getConsentHistory(userId: string): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT * FROM user_consents WHERE user_id = $1 ORDER BY timestamp DESC`,
      [userId]
    );
    return result.rows;
  }

  async exportPersonalData(userId: string): Promise<any> {
    this.logger.log(`Exporting personal data for user ${userId} (KVKK Article 11)`);
    
    const userResult = await this.db
      .select({
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      personalInfo: userResult[0],
      consents: await this.getConsentHistory(userId),
      exportDate: new Date(),
      regulation: 'KVKK (Kişisel Verilerin Korunması Kanunu)',
    };
  }

  async anonymizeData(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        email: sql`'anonymized_' || ${userId} || '@kvkk.local'`,
        name: 'Anonim Kullanıcı',
        metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ anonymized: true, date: new Date() })}::jsonb`,
      })
      .where(eq(users.id, userId));

    this.logger.log(`User data anonymized per KVKK request: ${userId}`);
  }

  async deletePersonalData(userId: string, reason: string): Promise<void> {
    await this.db
      .update(users)
      .set({
        isActive: false,
        metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{deletion}', ${JSON.stringify({ reason, date: new Date(), regulation: 'KVKK' })}::jsonb)`,
      })
      .where(eq(users.id, userId));

    this.logger.warn(`Personal data deletion initiated for user ${userId}: ${reason}`);
  }
}

