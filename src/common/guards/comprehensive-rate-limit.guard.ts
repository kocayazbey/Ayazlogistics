import { Injectable, CanActivate, ExecutionContext, TooManyRequestsException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RATE_LIMIT_OPTIONS_KEY } from '../decorators/rate-limit.decorator';
import { Logger } from '@nestjs/common';

@Injectable()
export class ComprehensiveRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(ComprehensiveRateLimitGuard.name);
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    const isRateLimited = this.reflector.get<boolean>(RATE_LIMIT_KEY, context.getHandler());
    const options = this.reflector.get<any>(RATE_LIMIT_OPTIONS_KEY, context.getHandler());
    
    if (!isRateLimited || !options) {
      return true; // No rate limiting required
    }

    const key = this.generateRateLimitKey(request, user, options);
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanupExpiredEntries(now);
    
    // Check current rate limit
    const current = this.requestCounts.get(key);
    
    if (!current) {
      // First request
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return true;
    }
    
    if (now > current.resetTime) {
      // Reset window
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return true;
    }
    
    if (current.count >= options.requests) {
      // Rate limit exceeded
      this.logger.warn(`Rate limit exceeded for key: ${key}`);
      throw new TooManyRequestsException(options.message || 'Too many requests');
    }
    
    // Increment counter
    current.count++;
    this.requestCounts.set(key, current);
    
    // Log rate limit check
    this.logger.log(`Rate limit check passed for key: ${key} (${current.count}/${options.requests})`);
    
    return true;
  }

  private generateRateLimitKey(request: any, user: any, options: any): string {
    if (options.keyGenerator) {
      return options.keyGenerator(request);
    }
    
    // Default key generation
    const ip = request.ip;
    const userId = user?.id || 'anonymous';
    const tenantId = user?.tenantId || 'default';
    const endpoint = `${request.method}:${request.url}`;
    
    return `${tenantId}:${userId}:${ip}:${endpoint}`;
  }

  private cleanupExpiredEntries(now: number) {
    for (const [key, value] of this.requestCounts.entries()) {
      if (now > value.resetTime) {
        this.requestCounts.delete(key);
      }
    }
  }
}
