import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class BackupEncryptionService {
  private readonly logger = new Logger('BackupEncryptionService');
  private readonly algorithm = 'aes-256-gcm';
  private readonly key = process.env.BACKUP_ENCRYPTION_KEY || randomBytes(32);

  async encryptBackup(data: Buffer): Promise<Buffer> {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    this.logger.debug('Backup encrypted successfully');
    return Buffer.concat([iv, authTag, encrypted]);
  }

  async decryptBackup(encryptedData: Buffer): Promise<Buffer> {
    const iv = encryptedData.subarray(0, 16);
    const authTag = encryptedData.subarray(16, 32);
    const encrypted = encryptedData.subarray(32);
    
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    this.logger.debug('Backup decrypted successfully');
    return decrypted;
  }
}
