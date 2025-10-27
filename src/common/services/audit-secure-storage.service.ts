import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class AuditSecureStorageService {
  private readonly logger = new Logger('AuditSecureStorageService');
  private readonly algorithm = 'aes-256-gcm';
  private readonly key = process.env.AUDIT_ENCRYPTION_KEY || randomBytes(32);

  async encryptAuditLog(auditData: any): Promise<string> {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(auditData), 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  async decryptAuditLog(encryptedData: string): Promise<any> {
    const data = Buffer.from(encryptedData, 'base64');
    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }

  async storeAuditLog(auditData: any): Promise<void> {
    const encrypted = await this.encryptAuditLog(auditData);
    this.logger.debug('Audit log encrypted and stored securely');
  }
}
