import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  private redis: Redis | null = null;

  constructor(
    private readonly configService: ConfigService,
  ) {
    // Redis will be initialized if available
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (redisUrl) {
        this.redis = new Redis(redisUrl);
      }
    } catch (error) {
      // Redis is optional
      console.warn('Redis not available for rate limiting');
    }
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // If Redis is not available, skip rate limiting
    if (!this.redis) {
      return next();
    }

    const config = this.getConfigForRoute(req);
    const key = this.generateKey(req, config);

    try {
      // Use sliding window with Redis sorted sets for more accurate rate limiting
      const result = await this.checkSlidingWindowRateLimit(key, config);

      if (!result.allowed) {
        res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', result.resetTime.toString());
        res.setHeader('Retry-After', Math.ceil(result.retryAfter / 1000).toString());

        return res.status(429).json({
          statusCode: 429,
          message: 'Too many requests, please try again later.',
          error: 'Too Many Requests',
          retryAfter: Math.ceil(result.retryAfter / 1000),
          limit: config.maxRequests,
          resetTime: result.resetTime,
        });
      }

      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', result.resetTime.toString());

      next();
    } catch (error) {
      // If Redis fails, allow the request to proceed
      console.error('Rate limit middleware error:', error);
      next();
    }
  }

  private async checkSlidingWindowRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    retryAfter: number;
  }> {
    if (!this.redis) {
      // If Redis is not available, allow all requests
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: new Date(Date.now() + config.windowMs),
        retryAfter: 0,
      };
    }

    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Lua script for atomic operations
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local maxRequests = tonumber(ARGV[3])
      local windowMs = tonumber(ARGV[4])

      -- Remove old entries outside the window
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

      -- Count current requests in window
      local currentCount = redis.call('ZCARD', key)

      if currentCount >= maxRequests then
        -- Get the oldest timestamp to calculate reset time
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local resetTime = oldest[2] and (tonumber(oldest[2]) + windowMs) or (now + windowMs)
        return {0, 0, resetTime, resetTime - now}
      else
        -- Add current request
        redis.call('ZADD', key, now, now .. ':' .. math.random())
        redis.call('EXPIRE', key, math.ceil(windowMs / 1000))
        return {1, maxRequests - currentCount - 1, now + windowMs, 0}
      end
    `;

    const result = await this.redis.eval(
      luaScript,
      1,
      key,
      now.toString(),
      windowStart.toString(),
      config.maxRequests.toString(),
      config.windowMs.toString(),
    ) as [number, number, number, number];

    return {
      allowed: result[0] === 1,
      remaining: result[1],
      resetTime: new Date(result[2]),
      retryAfter: result[3],
    };
  }

  private getConfigForRoute(req: Request): RateLimitConfig {
    const path = req.path;
    
    // Auth endpoints - stricter limits
    if (path.includes('/auth/login') || path.includes('/auth/register')) {
      return {
        ...this.defaultConfig,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
      };
    }

    // Password reset - very strict
    if (path.includes('/auth/forgot-password')) {
      return {
        ...this.defaultConfig,
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3,
      };
    }

    // API endpoints - moderate limits
    if (path.includes('/api/')) {
      return {
        ...this.defaultConfig,
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
      };
    }

    // Public endpoints - generous limits
    if (path.includes('/public/')) {
      return {
        ...this.defaultConfig,
        windowMs: 60 * 1000,
        maxRequests: 200,
      };
    }

    // File uploads - restrictive
    if (req.method === 'POST' && path.includes('/upload')) {
      return {
        ...this.defaultConfig,
        windowMs: 60 * 1000,
        maxRequests: 10,
      };
    }

    // Admin endpoints - moderate
    if (path.includes('/admin/')) {
      return {
        ...this.defaultConfig,
        windowMs: 60 * 1000,
        maxRequests: 50,
      };
    }

    return this.defaultConfig;
  }

  private generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Use IP + User ID (if authenticated) for more granular rate limiting
    const ip = this.getClientIp(req);
    const userId = (req as any).user?.id || 'anonymous';
    const path = req.path;

    return `rate-limit:${path}:${ip}:${userId}`;
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}

// Decorator for applying rate limits to specific routes
export function RateLimit(config: Partial<RateLimitConfig>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store rate limit config in metadata
    Reflect.defineMetadata('rateLimit', config, target, propertyKey);
    return descriptor;
  };
}

