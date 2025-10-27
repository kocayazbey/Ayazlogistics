import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionRotationService {
  private readonly logger = new Logger(EncryptionRotationService.name);
  private readonly encryptionKeys = new Map<string, string>();
  private readonly keyRotationSchedule = new Map<string, Date>();

  constructor() {
    this.initializeEncryptionKeys();
  }

  private initializeEncryptionKeys() {
    // Initialize with current encryption keys
    this.encryptionKeys.set('current', process.env.ENCRYPTION_KEY || this.generateKey());
    this.encryptionKeys.set('previous', process.env.PREVIOUS_ENCRYPTION_KEY || '');
    
    // Schedule key rotation
    this.scheduleKeyRotation();
  }

  private generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private scheduleKeyRotation() {
    // Schedule key rotation every 90 days
    const rotationDate = new Date();
    rotationDate.setDate(rotationDate.getDate() + 90);
    this.keyRotationSchedule.set('next', rotationDate);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkKeyRotation() {
    const nextRotation = this.keyRotationSchedule.get('next');
    if (nextRotation && new Date() >= nextRotation) {
      await this.rotateEncryptionKeys();
    }
  }

  async rotateEncryptionKeys() {
    try {
      this.logger.log('Starting encryption key rotation...');
      
      // Generate new key
      const newKey = this.generateKey();
      
      // Update key mapping
      this.encryptionKeys.set('previous', this.encryptionKeys.get('current') || '');
      this.encryptionKeys.set('current', newKey);
      
      // Schedule next rotation
      this.scheduleKeyRotation();
      
      this.logger.log('Encryption key rotation completed successfully');
    } catch (error) {
      this.logger.error('Encryption key rotation failed:', error);
    }
  }

  getCurrentKey(): string {
    return this.encryptionKeys.get('current') || '';
  }

  getPreviousKey(): string {
    return this.encryptionKeys.get('previous') || '';
  }

  async encryptData(data: string, keyId: string = 'current'): Promise<string> {
    try {
      const key = this.encryptionKeys.get(keyId);
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }

      const cipher = crypto.createCipher('aes-256-cbc', key);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return encrypted;
    } catch (error) {
      this.logger.error('Data encryption failed:', error);
      throw error;
    }
  }

  async decryptData(encryptedData: string, keyId: string = 'current'): Promise<string> {
    try {
      const key = this.encryptionKeys.get(keyId);
      if (!key) {
        throw new Error(`Encryption key not found: ${keyId}`);
      }

      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this.logger.error('Data decryption failed:', error);
      throw error;
    }
  }

  async reencryptData(encryptedData: string, fromKeyId: string, toKeyId: string): Promise<string> {
    try {
      // Decrypt with old key
      const decryptedData = await this.decryptData(encryptedData, fromKeyId);
      
      // Encrypt with new key
      const reencryptedData = await this.encryptData(decryptedData, toKeyId);
      
      return reencryptedData;
    } catch (error) {
      this.logger.error('Data re-encryption failed:', error);
      throw error;
    }
  }

  async getKeyRotationStatus() {
    return {
      currentKey: this.encryptionKeys.get('current') ? '***' : 'Not set',
      previousKey: this.encryptionKeys.get('previous') ? '***' : 'Not set',
      nextRotation: this.keyRotationSchedule.get('next'),
      keyCount: this.encryptionKeys.size,
    };
  }
}
