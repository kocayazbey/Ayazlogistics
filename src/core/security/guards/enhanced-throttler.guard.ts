import { Injectable, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { EnhancedRateLimiterService } from '../rate-limiter-enhanced.service';
import { IPFilterService } from '../ip-filter.service';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  points: number;
  duration: number;
  blockDuration?: number;
  keyGenerator?: (context: ExecutionContext) => string;
}

@Injectable()
export class EnhancedThrottlerGuard extends ThrottlerGuard {
  constructor(
    private readonly enhancedRateLimiter: EnhancedRateLimiterService,
    private readonly ipFilter: IPFilterService,
    protected readonly reflector: Reflector,
  ) {
    super({}, null, reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getIP(request);

    // Check IP filter first
    const ipCheck = await this.ipFilter.isAllowed(ip);
    if (!ipCheck.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.FORBIDDEN,
          message: ipCheck.reason,
          error: 'Forbidden',
        },
        HttpStatus.FORBIDDEN,
      );
    }

    // Get custom rate limit config from decorator
    const rateLimitConfig = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitConfig) {
      // Use default throttler behavior
      return super.canActivate(context);
    }

    // Generate rate limit key
    const key = rateLimitConfig.keyGenerator
      ? rateLimitConfig.keyGenerator(context)
      : this.generateKey(context, ip);

    // Check rate limit
    const result = await this.enhancedRateLimiter.consume(key, {
      points: rateLimitConfig.points,
      duration: rateLimitConfig.duration,
      blockDuration: rateLimitConfig.blockDuration,
    });

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimitConfig.points);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());

    if (!result.allowed) {
      response.setHeader('Retry-After', result.retryAfter);
      
      // Track suspicious activity if blocked
      await this.ipFilter.trackSuspiciousActivity(ip);

      throw new ThrottlerException(
        `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
      );
    }

    return true;
  }

  private getIP(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0].trim() ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      request.ip
    );
  }

  private generateKey(context: ExecutionContext, ip: string): string {
    const request = context.switchToHttp().getRequest();
    const route = `${request.method}:${request.route?.path || request.url}`;
    const user = request.user?.id || 'anonymous';
    return `${ip}:${user}:${route}`;
  }
}

