import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { EventBusService } from '../events/event-bus.service';

interface SecurityEvent {
  type: 'login_attempt' | 'suspicious_activity' | 'rate_limit_exceeded' | 'security_violation';
  userId?: string;
  ipAddress: string;
  userAgent?: string;
  details: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);
  private readonly saltRounds = 12;
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDuration = 15 * 60 * 1000; // 15 minutes
  private readonly suspiciousActivityThreshold = 10;
  
  private loginAttempts: Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }> = new Map();
  private suspiciousActivities: Map<string, { count: number; lastActivity: Date }> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Hash password with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate JWT secret
   */
  generateJWTSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Encrypt sensitive data
   */
  encryptSensitiveData(data: string, key?: string): string {
    const encryptionKey = key || this.configService.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decryptSensitiveData(encryptedData: string, key?: string): string {
    const encryptionKey = key || this.configService.get('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Check if user is locked out
   */
  isUserLockedOut(identifier: string): boolean {
    const attempt = this.loginAttempts.get(identifier);
    if (!attempt) return false;

    if (attempt.lockedUntil && new Date() < attempt.lockedUntil) {
      return true;
    }

    // Clear lockout if expired
    if (attempt.lockedUntil && new Date() >= attempt.lockedUntil) {
      this.loginAttempts.delete(identifier);
      return false;
    }

    return false;
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(identifier: string, ipAddress: string, userAgent?: string): Promise<void> {
    const attempt = this.loginAttempts.get(identifier) || { count: 0, lastAttempt: new Date() };
    attempt.count++;
    attempt.lastAttempt = new Date();

    if (attempt.count >= this.maxLoginAttempts) {
      attempt.lockedUntil = new Date(Date.now() + this.lockoutDuration);
      
      await this.logSecurityEvent({
        type: 'login_attempt',
        ipAddress,
        userAgent,
        details: { identifier, attempts: attempt.count, locked: true },
        timestamp: new Date(),
        severity: 'high',
      });
    }

    this.loginAttempts.set(identifier, attempt);

    await this.logSecurityEvent({
      type: 'login_attempt',
      ipAddress,
      userAgent,
      details: { identifier, attempts: attempt.count },
      timestamp: new Date(),
      severity: attempt.count >= this.maxLoginAttempts ? 'high' : 'medium',
    });
  }

  /**
   * Record successful login
   */
  async recordSuccessfulLogin(identifier: string, ipAddress: string, userAgent?: string): Promise<void> {
    this.loginAttempts.delete(identifier);

    await this.logSecurityEvent({
      type: 'login_attempt',
      ipAddress,
      userAgent,
      details: { identifier, success: true },
      timestamp: new Date(),
      severity: 'low',
    });
  }

  /**
   * Check for suspicious activity
   */
  async checkSuspiciousActivity(ipAddress: string, activity: string): Promise<boolean> {
    const key = `${ipAddress}:${activity}`;
    const activityData = this.suspiciousActivities.get(key) || { count: 0, lastActivity: new Date() };
    
    activityData.count++;
    activityData.lastActivity = new Date();
    this.suspiciousActivities.set(key, activityData);

    if (activityData.count >= this.suspiciousActivityThreshold) {
      await this.logSecurityEvent({
        type: 'suspicious_activity',
        ipAddress,
        details: { activity, count: activityData.count },
        timestamp: new Date(),
        severity: 'high',
      });

      return true;
    }

    return false;
  }

  /**
   * Validate input for security threats
   */
  validateInput(input: string): { isValid: boolean; threats: string[] } {
    const threats: string[] = [];
    
    // SQL Injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]\s*=\s*['"])/i,
      /(\b(OR|AND)\s+['"]\s*LIKE\s*['"])/i,
    ];

    // XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];

    // Path traversal patterns
    const pathTraversalPatterns = [
      /\.\.\//g,
      /\.\.\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,
    ];

    sqlPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('SQL Injection attempt detected');
      }
    });

    xssPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('XSS attempt detected');
      }
    });

    pathTraversalPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        threats.push('Path traversal attempt detected');
      }
    });

    return {
      isValid: threats.length === 0,
      threats,
    };
  }

  /**
   * Sanitize input
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/\.\.\//g, '')
      .replace(/\.\.\\/g, '')
      .trim();
  }

  /**
   * Generate secure session ID
   */
  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate session ID format
   */
  validateSessionId(sessionId: string): boolean {
    return /^[a-f0-9]{64}$/.test(sessionId);
  }

  /**
   * Check password strength
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    // Check for common patterns
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      score = Math.max(0, score - 2);
      feedback.push('Password contains common patterns');
    }

    return {
      score,
      feedback,
      isStrong: score >= 4,
    };
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    this.logger.warn('Security event detected', event);
    
    await this.eventBus.emit('security.event', event);

    // Store in security log for analysis
    // In production, this would be stored in a secure audit log
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    activeLockouts: number;
    suspiciousActivities: number;
    totalLoginAttempts: number;
  } {
    const activeLockouts = Array.from(this.loginAttempts.values())
      .filter(attempt => attempt.lockedUntil && new Date() < attempt.lockedUntil)
      .length;

    const suspiciousActivities = Array.from(this.suspiciousActivities.values())
      .filter(activity => activity.count >= this.suspiciousActivityThreshold)
      .length;

    const totalLoginAttempts = Array.from(this.loginAttempts.values())
      .reduce((sum, attempt) => sum + attempt.count, 0);

    return {
      activeLockouts,
      suspiciousActivities,
      totalLoginAttempts,
    };
  }

  /**
   * Clean up expired data
   */
  cleanup(): void {
    const now = new Date();
    
    // Clean up expired login attempts
    for (const [key, attempt] of this.loginAttempts.entries()) {
      if (attempt.lockedUntil && now >= attempt.lockedUntil) {
        this.loginAttempts.delete(key);
      }
    }

    // Clean up old suspicious activities (older than 1 hour)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    for (const [key, activity] of this.suspiciousActivities.entries()) {
      if (activity.lastActivity < oneHourAgo) {
        this.suspiciousActivities.delete(key);
      }
    }
  }
}
