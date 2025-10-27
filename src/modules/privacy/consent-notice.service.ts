import { Injectable, Logger } from '@nestjs/common';
import { StandardizedDatabaseService } from '../../core/database/database.service';
import { consentNotices } from '../../database/schema/privacy/consent-notices.schema';
import { userConsents } from '../../database/schema/privacy/user-consents.schema';
import { eq, and, gte, lte } from 'drizzle-orm';

@Injectable()
export class ConsentNoticeService {
  private readonly logger = new Logger(ConsentNoticeService.name);

  constructor(private readonly db: StandardizedDatabaseService) {}

  async createConsentNotice(noticeData: any) {
    try {
      const notice = await this.db.db.insert(consentNotices).values({
        ...noticeData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      this.logger.log(`Consent notice created: ${notice[0].id}`);
      return notice[0];
    } catch (error) {
      this.logger.error('Failed to create consent notice:', error);
      throw error;
    }
  }

  async getConsentNotice(id: string) {
    try {
      const notice = await this.db.query.consentNotices.findFirst({
        where: eq(consentNotices.id, id),
      });

      if (!notice) {
        throw new Error(`Consent notice with ID ${id} not found`);
      }

      return notice;
    } catch (error) {
      this.logger.error(`Failed to get consent notice ${id}:`, error);
      throw error;
    }
  }

  async updateConsentNotice(id: string, updateData: any) {
    try {
      const notice = await this.db.db.update(consentNotices)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(consentNotices.id, id))
        .returning();

      this.logger.log(`Consent notice updated: ${id}`);
      return notice[0];
    } catch (error) {
      this.logger.error(`Failed to update consent notice ${id}:`, error);
      throw error;
    }
  }

  async deleteConsentNotice(id: string) {
    try {
      await this.db.db.delete(consentNotices).where(eq(consentNotices.id, id));
      this.logger.log(`Consent notice deleted: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete consent notice ${id}:`, error);
      throw error;
    }
  }

  async getUserConsent(userId: string, noticeId: string) {
    try {
      const consent = await this.db.query.userConsents.findFirst({
        where: and(
          eq(userConsents.userId, userId),
          eq(userConsents.noticeId, noticeId)
        ),
      });

      return consent;
    } catch (error) {
      this.logger.error(`Failed to get user consent for user ${userId}, notice ${noticeId}:`, error);
      throw error;
    }
  }

  async recordUserConsent(userId: string, noticeId: string, consent: boolean) {
    try {
      const userConsent = await this.db.db.insert(userConsents).values({
        userId,
        noticeId,
        consent,
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      this.logger.log(`User consent recorded: user ${userId}, notice ${noticeId}, consent ${consent}`);
      return userConsent[0];
    } catch (error) {
      this.logger.error(`Failed to record user consent for user ${userId}, notice ${noticeId}:`, error);
      throw error;
    }
  }

  async updateUserConsent(userId: string, noticeId: string, consent: boolean) {
    try {
      const userConsent = await this.db.db.update(userConsents)
        .set({
          consent,
          timestamp: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(userConsents.userId, userId),
          eq(userConsents.noticeId, noticeId)
        ))
        .returning();

      this.logger.log(`User consent updated: user ${userId}, notice ${noticeId}, consent ${consent}`);
      return userConsent[0];
    } catch (error) {
      this.logger.error(`Failed to update user consent for user ${userId}, notice ${noticeId}:`, error);
      throw error;
    }
  }

  async getActiveConsentNotices() {
    try {
      const notices = await this.db.query.consentNotices.findMany({
        where: and(
          eq(consentNotices.isActive, true),
          gte(consentNotices.effectiveDate, new Date())
        ),
        orderBy: [consentNotices.priority, consentNotices.createdAt],
      });

      return notices;
    } catch (error) {
      this.logger.error('Failed to get active consent notices:', error);
      throw error;
    }
  }

  async getConsentStatistics(noticeId: string) {
    try {
      const consents = await this.db.query.userConsents.findMany({
        where: eq(userConsents.noticeId, noticeId),
      });

      const total = consents.length;
      const accepted = consents.filter(c => c.consent).length;
      const rejected = consents.filter(c => !c.consent).length;

      return {
        total,
        accepted,
        rejected,
        acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
      };
    } catch (error) {
      this.logger.error(`Failed to get consent statistics for notice ${noticeId}:`, error);
      throw error;
    }
  }
}
