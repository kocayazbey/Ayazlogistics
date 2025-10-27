import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { users, twoFactorBackups } from '@/database/schema/core/users.schema';

@Injectable()
export class MFAService {
  private readonly logger = new Logger(MFAService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {}

  async enableMFA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new BadRequestException('User not found');

    const secret = speakeasy.generateSecret({
      name: `AyazLogistics (${user.email})`,
      issuer: 'AyazLogistics',
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
    const backupCodes = this.generateBackupCodes(10);

    await this.db.update(users).set({
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
    }).where(eq(users.id, userId));

    for (const code of backupCodes) {
      const hash = crypto.createHash('sha256').update(code).digest('hex');
      await this.db.insert(twoFactorBackups).values({
        userId,
        codeHash: hash,
      });
    }

    this.logger.log(`MFA setup initiated for user ${userId}`);
    return { secret: secret.base32, qrCode, backupCodes };
  }

  async verifyMFA(userId: string, token: string): Promise<boolean> {
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || !user.twoFactorSecret) throw new BadRequestException('MFA not configured');

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (verified && !user.twoFactorEnabled) {
      await this.db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, userId));
      this.logger.log(`MFA enabled for user ${userId}`);
    }

    return verified;
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    const backups = await this.db.select().from(twoFactorBackups).where(
      eq(twoFactorBackups.userId, userId)
    );

    const backup = backups.find(b => b.codeHash === hash && !b.usedAt);
    if (!backup) return false;

    await this.db.update(twoFactorBackups).set({ usedAt: new Date() }).where(eq(twoFactorBackups.id, backup.id));
    this.logger.log(`Backup code used for user ${userId}`);
    return true;
  }

  async disableMFA(userId: string): Promise<void> {
    await this.db.update(users).set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
    }).where(eq(users.id, userId));
    this.logger.log(`MFA disabled for user ${userId}`);
  }

  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }
}

