import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY } from '../decorators/rate-limit.decorator';

interface RateLimitConfig {
  ttl: number; // Time to live in milliseconds
  limit: number; // Maximum number of requests
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requests: Map<string, number[]> = new Map();

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rateLimitConfig = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!rateLimitConfig) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request);

    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Remove expired timestamps
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < rateLimitConfig.ttl
    );

    if (validTimestamps.length >= rateLimitConfig.limit) {
      const oldestTimestamp = Math.min(...validTimestamps);
      const resetTime = oldestTimestamp + rateLimitConfig.ttl;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Add current timestamp
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitConfig.limit);
    response.setHeader('X-RateLimit-Remaining', rateLimitConfig.limit - validTimestamps.length);
    response.setHeader('X-RateLimit-Reset', Math.ceil((now + rateLimitConfig.ttl) / 1000));

    return true;
  }

  private generateKey(request: any): string {
    // Generate key based on IP and user ID (if authenticated)
    const ip = request.ip || request.connection.remoteAddress;
    const userId = request.user?.id || 'anonymous';
    const path = request.path;
    return `${ip}:${userId}:${path}`;
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    this.requests.forEach((timestamps, key) => {
      const validTimestamps = timestamps.filter(
        (timestamp) => now - timestamp < maxAge
      );
      
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    });
  }
}