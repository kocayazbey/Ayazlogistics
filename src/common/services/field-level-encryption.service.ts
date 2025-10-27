import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class FieldLevelEncryptionService {
  private readonly logger = new Logger('FieldLevelEncryptionService');
  private readonly algorithm = 'aes-256-gcm';
  private readonly key = process.env.FIELD_ENCRYPTION_KEY || randomBytes(32);
  private readonly encryptedFields = new Map<string, string>();

  async encryptField(value: string, fieldName: string): Promise<string> {
    this.logger.debug(`Encrypting field: ${fieldName}`);
    
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    const result = Buffer.concat([iv, authTag, encrypted]).toString('base64');
    this.encryptedFields.set(fieldName, result);
    
    this.logger.debug(`Field ${fieldName} encrypted successfully`);
    return result;
  }

  async decryptField(encryptedValue: string, fieldName: string): Promise<string> {
    this.logger.debug(`Decrypting field: ${fieldName}`);
    
    const data = Buffer.from(encryptedValue, 'base64');
    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const encrypted = data.subarray(32);
    
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    this.logger.debug(`Field ${fieldName} decrypted successfully`);
    return decrypted.toString('utf8');
  }

  async encryptObject(obj: any, fieldsToEncrypt: string[]): Promise<any> {
    this.logger.debug(`Encrypting object with ${fieldsToEncrypt.length} fields`);
    
    const encrypted = { ...obj };
    
    for (const field of fieldsToEncrypt) {
      if (encrypted[field]) {
        encrypted[field] = await this.encryptField(encrypted[field], field);
      }
    }
    
    this.logger.debug('Object encryption completed');
    return encrypted;
  }

  async decryptObject(obj: any, fieldsToDecrypt: string[]): Promise<any> {
    this.logger.debug(`Decrypting object with ${fieldsToDecrypt.length} fields`);
    
    const decrypted = { ...obj };
    
    for (const field of fieldsToDecrypt) {
      if (decrypted[field]) {
        decrypted[field] = await this.decryptField(decrypted[field], field);
      }
    }
    
    this.logger.debug('Object decryption completed');
    return decrypted;
  }

  async testEncryption(): Promise<any> {
    this.logger.debug('Testing field-level encryption');
    
    const testData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      ssn: '123-45-6789'
    };
    
    const fieldsToEncrypt = ['email', 'phone', 'ssn'];
    
    // Encrypt
    const encrypted = await this.encryptObject(testData, fieldsToEncrypt);
    
    // Decrypt
    const decrypted = await this.decryptObject(encrypted, fieldsToEncrypt);
    
    // Verify
    const verification = {
      original: testData,
      encrypted,
      decrypted,
      fieldsMatch: fieldsToEncrypt.every(field => 
        testData[field] === decrypted[field]
      )
    };
    
    this.logger.debug(`Encryption test ${verification.fieldsMatch ? 'PASSED' : 'FAILED'}`);
    return verification;
  }

  getEncryptedFields(): Map<string, string> {
    return new Map(this.encryptedFields);
  }
}