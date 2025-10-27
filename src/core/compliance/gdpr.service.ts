import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { users } from '@/database/schema/core/users.schema';

interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'data_processing' | 'third_party_sharing';
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

interface DataExportRequest {
  userId: string;
  requestedBy: string;
  includeHistory: boolean;
  format: 'json' | 'csv' | 'pdf';
}

@Injectable()
export class GDPRService {
  private readonly logger = new Logger(GDPRService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async recordConsent(consent: ConsentRecord): Promise<void> {
    this.logger.log(`Recording ${consent.consentType} consent for user ${consent.userId}: ${consent.granted}`);
    
    await this.db.execute(
      `INSERT INTO user_consents (user_id, consent_type, granted, timestamp, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [consent.userId, consent.consentType, consent.granted, consent.timestamp, consent.ipAddress, consent.userAgent]
    );
  }

  async exportUserData(request: DataExportRequest): Promise<any> {
    this.logger.log(`Exporting data for user ${request.userId}`);

    const [user] = await this.db.select().from(users).where(eq(users.id, request.userId)).limit(1);
    
    const exportData = {
      personalInfo: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
      accountInfo: {
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        role: user.role,
      },
      consents: await this.getUserConsents(request.userId),
      metadata: user.metadata,
    };

    if (request.includeHistory) {
      exportData['activityHistory'] = await this.getUserActivityHistory(request.userId);
    }

    return exportData;
  }

  async deleteUserData(userId: string, reason: string): Promise<void> {
    this.logger.warn(`Initiating data deletion for user ${userId}: ${reason}`);

    await this.db.update(users).set({
      email: `deleted_${userId}@deleted.local`,
      firstName: 'Deleted',
      lastName: 'User',
      phone: null,
      isActive: false,
      deletedAt: new Date(),
      metadata: { deletionReason: reason } as any,
    }).where(eq(users.id, userId));

    this.logger.log(`User data anonymized: ${userId}`);
  }

  async anonymizeUserData(userId: string): Promise<void> {
    await this.db.update(users).set({
      email: `anon_${Date.now()}@anonymized.local`,
      firstName: 'Anonymous',
      lastName: 'User',
      phone: null,
      metadata: {} as any,
    }).where(eq(users.id, userId));

    this.logger.log(`User data anonymized: ${userId}`);
  }

  private async getUserConsents(userId: string): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT * FROM user_consents WHERE user_id = $1 ORDER BY timestamp DESC`,
      [userId]
    );
    return result.rows;
  }

  private async getUserActivityHistory(userId: string): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1000`,
      [userId]
    );
    return result.rows;
  }
}

