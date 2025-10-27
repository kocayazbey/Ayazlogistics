import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as crypto from 'crypto';

interface BiometricTemplate {
  id: string;
  userId: string;
  type: 'fingerprint' | 'face' | 'iris' | 'voice';
  templateData: string;
  deviceId: string;
  enrolledAt: Date;
  lastUsed?: Date;
  isActive: boolean;
  quality: number;
}

interface BiometricVerification {
  userId: string;
  biometricType: string;
  sampleData: string;
  deviceId: string;
  timestamp: Date;
  matchScore: number;
  threshold: number;
  verified: boolean;
  attempt: number;
}

interface BiometricDevice {
  deviceId: string;
  type: 'fingerprint_scanner' | 'face_camera' | 'iris_scanner';
  manufacturer: string;
  model: string;
  locationId: string;
  isOnline: boolean;
  lastHeartbeat: Date;
  firmware: string;
}

@Injectable()
export class BiometricAuthService {
  private readonly logger = new Logger(BiometricAuthService.name);
  private readonly MATCH_THRESHOLD = 0.85;
  private readonly MAX_ATTEMPTS = 3;

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async enrollBiometric(
    userId: string,
    type: BiometricTemplate['type'],
    templateData: string,
    deviceId: string,
  ): Promise<BiometricTemplate> {
    this.logger.log(`Enrolling ${type} biometric for user ${userId}`);

    const quality = this.assessTemplateQuality(templateData, type);

    if (quality < 0.7) {
      throw new Error('Biometric template quality too low. Please retry enrollment.');
    }

    const existingTemplates = await this.db.execute(
      `SELECT COUNT(*) as count FROM biometric_templates 
       WHERE user_id = $1 AND type = $2 AND is_active = true`,
      [userId, type]
    );

    const count = parseInt(existingTemplates.rows[0].count);
    if (count >= 3) {
      throw new Error(`Maximum ${type} templates (3) already enrolled`);
    }

    const id = `bio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const encryptedTemplate = this.encryptTemplate(templateData);

    const template: BiometricTemplate = {
      id,
      userId,
      type,
      templateData: encryptedTemplate,
      deviceId,
      enrolledAt: new Date(),
      isActive: true,
      quality,
    };

    await this.db.execute(
      `INSERT INTO biometric_templates (id, user_id, type, template_data, device_id, enrolled_at, is_active, quality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [template.id, template.userId, template.type, template.templateData, template.deviceId, template.enrolledAt, template.isActive, template.quality]
    );

    await this.logBiometricEvent(userId, 'enrollment', type, true, deviceId);

    this.logger.log(`Biometric enrolled successfully: ${id} (quality: ${quality.toFixed(2)})`);

    return template;
  }

  private assessTemplateQuality(templateData: string, type: string): number {
    const dataLength = templateData.length;
    const expectedLengths: Record<string, number> = {
      fingerprint: 1000,
      face: 5000,
      iris: 3000,
      voice: 2000,
    };

    const expected = expectedLengths[type] || 1000;
    const lengthScore = Math.min(dataLength / expected, 1.0);

    const randomness = this.calculateEntropy(templateData);
    const randomnessScore = Math.min(randomness / 4.0, 1.0);

    return (lengthScore * 0.6 + randomnessScore * 0.4);
  }

  private calculateEntropy(data: string): number {
    const freq: Record<string, number> = {};
    for (const char of data) {
      freq[char] = (freq[char] || 0) + 1;
    }

    let entropy = 0;
    const len = data.length;

    Object.values(freq).forEach(count => {
      const p = count / len;
      entropy -= p * Math.log2(p);
    });

    return entropy;
  }

  private encryptTemplate(templateData: string): string {
    const key = Buffer.from(process.env.BIOMETRIC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(templateData, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decryptTemplate(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const key = Buffer.from(process.env.BIOMETRIC_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async verifyBiometric(
    userId: string,
    type: BiometricTemplate['type'],
    sampleData: string,
    deviceId: string,
  ): Promise<BiometricVerification> {
    this.logger.log(`Verifying ${type} biometric for user ${userId}`);

    const templates = await this.db.execute(
      `SELECT * FROM biometric_templates 
       WHERE user_id = $1 AND type = $2 AND is_active = true
       ORDER BY quality DESC`,
      [userId, type]
    );

    if (templates.rows.length === 0) {
      throw new Error('No biometric templates enrolled for this user');
    }

    const attempts = await this.getRecentAttempts(userId, type);

    if (attempts >= this.MAX_ATTEMPTS) {
      await this.lockAccount(userId, 'Too many failed biometric attempts');
      throw new Error('Account locked due to too many failed attempts');
    }

    let bestMatchScore = 0;
    let verified = false;

    for (const template of templates.rows) {
      const decryptedTemplate = this.decryptTemplate(template.template_data);
      const matchScore = this.calculateMatchScore(sampleData, decryptedTemplate, type);

      if (matchScore > bestMatchScore) {
        bestMatchScore = matchScore;
      }

      if (matchScore >= this.MATCH_THRESHOLD) {
        verified = true;
        
        await this.db.execute(
          `UPDATE biometric_templates SET last_used = NOW() WHERE id = $1`,
          [template.id]
        );

        break;
      }
    }

    const verification: BiometricVerification = {
      userId,
      biometricType: type,
      sampleData: '',
      deviceId,
      timestamp: new Date(),
      matchScore: bestMatchScore,
      threshold: this.MATCH_THRESHOLD,
      verified,
      attempt: attempts + 1,
    };

    await this.logBiometricEvent(userId, 'verification', type, verified, deviceId, bestMatchScore);

    if (!verified) {
      this.logger.warn(`Biometric verification failed for user ${userId}: match score ${bestMatchScore.toFixed(3)}`);
    }

    return verification;
  }

  private calculateMatchScore(sample: string, template: string, type: string): number {
    if (sample === template) return 1.0;

    let matches = 0;
    const minLength = Math.min(sample.length, template.length);

    for (let i = 0; i < minLength; i++) {
      if (sample[i] === template[i]) {
        matches++;
      }
    }

    const baseScore = matches / minLength;

    const typeFactor: Record<string, number> = {
      fingerprint: 1.0,
      face: 0.95,
      iris: 0.98,
      voice: 0.90,
    };

    return baseScore * (typeFactor[type] || 1.0);
  }

  private async getRecentAttempts(userId: string, type: string): Promise<number> {
    const result = await this.db.execute(
      `SELECT COUNT(*) as count FROM biometric_logs 
       WHERE user_id = $1 AND biometric_type = $2 
       AND event_type = 'verification' AND verified = false
       AND created_at > NOW() - INTERVAL '15 minutes'`,
      [userId, type]
    );

    return parseInt(result.rows[0].count);
  }

  private async lockAccount(userId: string, reason: string): Promise<void> {
    await this.db.execute(
      `UPDATE users SET 
       is_active = false,
       locked_at = NOW(),
       lock_reason = $2
       WHERE id = $1`,
      [userId, reason]
    );

    this.logger.error(`Account locked: ${userId} - ${reason}`);
  }

  private async logBiometricEvent(
    userId: string,
    eventType: 'enrollment' | 'verification' | 'update' | 'deletion',
    biometricType: string,
    verified: boolean,
    deviceId: string,
    matchScore?: number,
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO biometric_logs 
       (user_id, event_type, biometric_type, verified, device_id, match_score, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, eventType, biometricType, verified, deviceId, matchScore]
    );
  }

  async deleteBiometric(userId: string, templateId: string): Promise<void> {
    await this.db.execute(
      `UPDATE biometric_templates SET is_active = false, deleted_at = NOW() WHERE id = $1 AND user_id = $2`,
      [templateId, userId]
    );

    await this.logBiometricEvent(userId, 'deletion', 'unknown', true, 'system');

    this.logger.log(`Biometric template deleted: ${templateId}`);
  }

  async registerDevice(device: Omit<BiometricDevice, 'lastHeartbeat'>): Promise<void> {
    await this.db.execute(
      `INSERT INTO biometric_devices (device_id, type, manufacturer, model, location_id, is_online, firmware, last_heartbeat)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (device_id) DO UPDATE SET
         is_online = $6,
         last_heartbeat = NOW()`,
      [device.deviceId, device.type, device.manufacturer, device.model, device.locationId, device.isOnline, device.firmware]
    );
  }

  async checkDeviceHealth(): Promise<any[]> {
    const result = await this.db.execute(
      `SELECT 
        device_id,
        type,
        is_online,
        EXTRACT(EPOCH FROM (NOW() - last_heartbeat)) as seconds_since_heartbeat
       FROM biometric_devices
       ORDER BY last_heartbeat DESC`
    );

    return result.rows.map(row => ({
      deviceId: row.device_id,
      type: row.type,
      status: row.is_online && parseInt(row.seconds_since_heartbeat) < 300 ? 'healthy' : 'offline',
      lastSeen: parseInt(row.seconds_since_heartbeat),
    }));
  }
}

