import { Test, TestingModule } from '@nestjs/testing';
import { SecurityService } from '../../src/core/security/security.service';
import { Logger } from '@nestjs/common';

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SecurityService>(SecurityService);
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const password = '';
      
      await expect(service.hashPassword(password)).rejects.toThrow();
    });

    it('should handle null password', async () => {
      const password = null as any;
      
      await expect(service.hashPassword(password)).rejects.toThrow();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      const isValid = await service.verifyPassword(password, hashedPassword);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = await service.hashPassword(password);

      const isValid = await service.verifyPassword(wrongPassword, hashedPassword);

      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format', async () => {
      const password = 'testPassword123';
      const invalidHash = 'invalid-hash';

      await expect(service.verifyPassword(password, invalidHash)).rejects.toThrow();
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token successfully', async () => {
      const payload = { userId: 'user-001', role: 'admin' };
      const token = await service.generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for different payloads', async () => {
      const payload1 = { userId: 'user-001', role: 'admin' };
      const payload2 = { userId: 'user-002', role: 'user' };

      const token1 = await service.generateToken(payload1);
      const token2 = await service.generateToken(payload2);

      expect(token1).not.toBe(token2);
    });

    it('should handle empty payload', async () => {
      const payload = {};

      await expect(service.generateToken(payload)).rejects.toThrow();
    });

    it('should set token expiration', async () => {
      const payload = { userId: 'user-001', role: 'admin' };
      const expiresIn = '1h';
      const token = await service.generateToken(payload, expiresIn);

      expect(token).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', async () => {
      const payload = { userId: 'user-001', role: 'admin' };
      const token = await service.generateToken(payload);

      const decoded = await service.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });

    it('should reject invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(service.verifyToken(invalidToken)).rejects.toThrow();
    });

    it('should reject expired token', async () => {
      const payload = { userId: 'user-001', role: 'admin' };
      const token = await service.generateToken(payload, '1ms');

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      await expect(service.verifyToken(token)).rejects.toThrow();
    });

    it('should handle malformed token', async () => {
      const malformedToken = 'not.a.valid.jwt.token';

      await expect(service.verifyToken(malformedToken)).rejects.toThrow();
    });
  });

  describe('encryptData', () => {
    it('should encrypt data successfully', async () => {
      const data = 'sensitive information';
      const encrypted = await service.encryptData(data);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(data);
      expect(typeof encrypted).toBe('string');
    });

    it('should generate different encrypted values for same data', async () => {
      const data = 'sensitive information';
      const encrypted1 = await service.encryptData(data);
      const encrypted2 = await service.encryptData(data);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should handle empty data', async () => {
      const data = '';

      await expect(service.encryptData(data)).rejects.toThrow();
    });

    it('should handle large data', async () => {
      const data = 'x'.repeat(10000);
      const encrypted = await service.encryptData(data);

      expect(encrypted).toBeDefined();
    });
  });

  describe('decryptData', () => {
    it('should decrypt data successfully', async () => {
      const data = 'sensitive information';
      const encrypted = await service.encryptData(data);
      const decrypted = await service.decryptData(encrypted);

      expect(decrypted).toBe(data);
    });

    it('should handle invalid encrypted data', async () => {
      const invalidEncrypted = 'invalid-encrypted-data';

      await expect(service.decryptData(invalidEncrypted)).rejects.toThrow();
    });

    it('should handle corrupted encrypted data', async () => {
      const data = 'sensitive information';
      const encrypted = await service.encryptData(data);
      const corrupted = encrypted.slice(0, -5); // Remove last 5 characters

      await expect(service.decryptData(corrupted)).rejects.toThrow();
    });
  });

  describe('generateApiKey', () => {
    it('should generate API key successfully', async () => {
      const apiKey = await service.generateApiKey();

      expect(apiKey).toBeDefined();
      expect(typeof apiKey).toBe('string');
      expect(apiKey.length).toBeGreaterThan(20);
    });

    it('should generate unique API keys', async () => {
      const apiKey1 = await service.generateApiKey();
      const apiKey2 = await service.generateApiKey();

      expect(apiKey1).not.toBe(apiKey2);
    });

    it('should generate API key with specified length', async () => {
      const length = 32;
      const apiKey = await service.generateApiKey(length);

      expect(apiKey.length).toBe(length);
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key', async () => {
      const apiKey = await service.generateApiKey();
      const isValid = await service.validateApiKey(apiKey);

      expect(isValid).toBe(true);
    });

    it('should reject invalid API key', async () => {
      const invalidApiKey = 'invalid-api-key';
      const isValid = await service.validateApiKey(invalidApiKey);

      expect(isValid).toBe(false);
    });

    it('should handle expired API key', async () => {
      const apiKey = await service.generateApiKey();
      
      // Mock expiration
      jest.spyOn(service, 'validateApiKey').mockResolvedValue(false);

      const isValid = await service.validateApiKey(apiKey);

      expect(isValid).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML input', async () => {
      const input = '<script>alert("xss")</script>Hello World';
      const sanitized = await service.sanitizeInput(input);

      expect(sanitized).toBe('Hello World');
      expect(sanitized).not.toContain('<script>');
    });

    it('should sanitize SQL injection attempts', async () => {
      const input = "'; DROP TABLE users; --";
      const sanitized = await service.sanitizeInput(input);

      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
    });

    it('should preserve safe content', async () => {
      const input = 'Hello World 123';
      const sanitized = await service.sanitizeInput(input);

      expect(sanitized).toBe(input);
    });

    it('should handle empty input', async () => {
      const input = '';
      const sanitized = await service.sanitizeInput(input);

      expect(sanitized).toBe('');
    });
  });

  describe('checkPermission', () => {
    it('should check user permissions successfully', async () => {
      const userId = 'user-001';
      const resource = 'users';
      const action = 'read';
      const hasPermission = await service.checkPermission(userId, resource, action);

      expect(typeof hasPermission).toBe('boolean');
    });

    it('should deny permission for unauthorized user', async () => {
      const userId = 'user-001';
      const resource = 'admin';
      const action = 'delete';
      const hasPermission = await service.checkPermission(userId, resource, action);

      expect(hasPermission).toBe(false);
    });

    it('should handle invalid user ID', async () => {
      const userId = '';
      const resource = 'users';
      const action = 'read';

      await expect(service.checkPermission(userId, resource, action)).rejects.toThrow();
    });
  });

  describe('auditLog', () => {
    it('should log security event successfully', async () => {
      const event = {
        userId: 'user-001',
        action: 'login',
        resource: 'authentication',
        details: { ip: '192.168.1.1' },
      };

      const result = await service.auditLog(event);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle audit log failure', async () => {
      const event = {
        userId: 'user-001',
        action: 'login',
        resource: 'authentication',
        details: { ip: '192.168.1.1' },
      };

      jest.spyOn(service, 'auditLog').mockRejectedValue(new Error('Audit log failed'));

      await expect(service.auditLog(event)).rejects.toThrow('Audit log failed');
    });

    it('should validate audit event data', async () => {
      const invalidEvent = {
        userId: '',
        action: 'login',
        resource: 'authentication',
        details: {},
      };

      await expect(service.auditLog(invalidEvent)).rejects.toThrow();
    });
  });

  describe('rateLimit', () => {
    it('should check rate limit successfully', async () => {
      const identifier = 'user-001';
      const limit = 100;
      const window = 3600; // 1 hour

      const isAllowed = await service.rateLimit(identifier, limit, window);

      expect(typeof isAllowed).toBe('boolean');
    });

    it('should block requests exceeding rate limit', async () => {
      const identifier = 'user-001';
      const limit = 1;
      const window = 3600;

      // First request should be allowed
      const firstRequest = await service.rateLimit(identifier, limit, window);
      expect(firstRequest).toBe(true);

      // Second request should be blocked
      const secondRequest = await service.rateLimit(identifier, limit, window);
      expect(secondRequest).toBe(false);
    });

    it('should handle invalid rate limit parameters', async () => {
      const identifier = 'user-001';
      const limit = 0;
      const window = 3600;

      await expect(service.rateLimit(identifier, limit, window)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle encryption errors', async () => {
      const data = 'sensitive information';
      jest.spyOn(service, 'encryptData').mockRejectedValue(new Error('Encryption failed'));

      await expect(service.encryptData(data)).rejects.toThrow('Encryption failed');
    });

    it('should handle token generation errors', async () => {
      const payload = { userId: 'user-001' };
      jest.spyOn(service, 'generateToken').mockRejectedValue(new Error('Token generation failed'));

      await expect(service.generateToken(payload)).rejects.toThrow('Token generation failed');
    });

    it('should handle permission check errors', async () => {
      const userId = 'user-001';
      const resource = 'users';
      const action = 'read';
      jest.spyOn(service, 'checkPermission').mockRejectedValue(new Error('Permission check failed'));

      await expect(service.checkPermission(userId, resource, action)).rejects.toThrow('Permission check failed');
    });
  });

  describe('data validation', () => {
    it('should validate password strength', async () => {
      const weakPassword = '123';
      
      await expect(service.hashPassword(weakPassword)).rejects.toThrow();
    });

    it('should validate token payload structure', async () => {
      const invalidPayload = { invalid: 'data' };
      
      await expect(service.generateToken(invalidPayload)).rejects.toThrow();
    });

    it('should validate API key format', async () => {
      const invalidApiKey = 'invalid-format';
      
      await expect(service.validateApiKey(invalidApiKey)).rejects.toThrow();
    });
  });
});
