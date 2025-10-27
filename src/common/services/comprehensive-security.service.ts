import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ComprehensiveSecurityService {
  private readonly logger = new Logger(ComprehensiveSecurityService.name);

  /**
   * Sanitize input to prevent XSS attacks
   */
  sanitizeInput(input: string): string {
    if (!input) return input;
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
      .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '');
  }

  /**
   * Sanitize JSON object recursively
   */
  sanitizeJSON(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeInput(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeJSON(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = this.sanitizeJSON(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Detect SQL injection attempts
   */
  detectSQLInjection(input: string): boolean {
    if (!input) return false;
    
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\b.*\b(OR|AND)\b)/gi,
      /(\b(OR|AND)\b.*=.*\b(OR|AND)\b)/gi,
      /(\b(OR|AND)\b.*'.*'.*)/gi,
      /(\b(OR|AND)\b.*".*".*)/gi,
      /(\b(OR|AND)\b.*\d+.*\d+)/gi,
      /(\b(OR|AND)\b.*\d+.*=.*\d+)/gi,
      /(\b(OR|AND)\b.*\d+.*'.*')/gi,
      /(\b(OR|AND)\b.*\d+.*".*")/gi,
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect XSS attacks
   */
  detectXSS(input: string): boolean {
    if (!input) return false;
    
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
      /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
      /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validate input length
   */
  validateInputLength(input: string, maxLength: number = 1000): boolean {
    return input.length <= maxLength;
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone number format
   */
  validatePhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash sensitive data
   */
  hashSensitiveData(data: string): string {
    // This would typically use a proper hashing algorithm like bcrypt
    // For now, using a simple hash for demonstration
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Validate JWT token format
   */
  validateJWTFormat(token: string): boolean {
    if (!token) return false;
    
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Check if IP is in whitelist
   */
  isIPWhitelisted(ip: string, whitelist: string[]): boolean {
    return whitelist.includes(ip);
  }

  /**
   * Check if IP is in blacklist
   */
  isIPBlacklisted(ip: string, blacklist: string[]): boolean {
    return blacklist.includes(ip);
  }

  /**
   * Validate request headers
   */
  validateHeaders(headers: any): boolean {
    const requiredHeaders = ['user-agent', 'accept'];
    return requiredHeaders.every(header => headers[header]);
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, details: any) {
    this.logger.warn(`[SECURITY EVENT] ${event}: ${JSON.stringify(details)}`);
  }
}