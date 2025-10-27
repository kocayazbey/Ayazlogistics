import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });
  }

  async checkRateLimit(
    identifier: string,
    limit: number = 100,
    windowSeconds: number = 60,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await this.redis.zcard(key);

    if (count >= limit) {
      const oldestTimestamp = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = new Date(parseInt(oldestTimestamp[1]) + windowSeconds * 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: new Date(now + windowSeconds * 1000),
    };
  }

  async resetLimit(identifier: string): Promise<void> {
    const key = `rate_limit:${identifier}`;
    await this.redis.del(key);
    this.logger.log(`Rate limit reset for ${identifier}`);
  }
}

