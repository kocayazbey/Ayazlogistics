import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitConfig {
  points: number;
  duration: number;
  blockDuration?: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

@Injectable()
export class EnhancedRateLimiterService {
  private readonly logger = new Logger(EnhancedRateLimiterService.name);
  private redis: Redis;

  constructor(private configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 1),
    });
  }

  async consume(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const fullKey = `${config.keyPrefix || 'ratelimit'}:${key}`;
    const blockKey = `${fullKey}:blocked`;

    // Check if blocked
    const blocked = await this.redis.get(blockKey);
    if (blocked) {
      const ttl = await this.redis.ttl(blockKey);
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + ttl * 1000),
        retryAfter: ttl,
      };
    }

    const multi = this.redis.multi();
    multi.incr(fullKey);
    multi.ttl(fullKey);
    multi.pttl(fullKey);

    const results = await multi.exec();
    const count = results[0][1] as number;
    const ttl = results[1][1] as number;

    if (ttl === -1) {
      await this.redis.expire(fullKey, config.duration);
    }

    const allowed = count <= config.points;
    const remaining = Math.max(0, config.points - count);

    if (!allowed && config.blockDuration) {
      await this.redis.setex(blockKey, config.blockDuration, '1');
      this.logger.warn(`Rate limit exceeded and blocked: ${key}`);
    }

    const resetTime = new Date(
      Date.now() + (ttl > 0 ? ttl * 1000 : config.duration * 1000),
    );

    return {
      allowed,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : ttl > 0 ? ttl : config.duration,
    };
  }

  async reset(key: string, prefix?: string): Promise<void> {
    const fullKey = `${prefix || 'ratelimit'}:${key}`;
    await this.redis.del(fullKey, `${fullKey}:blocked`);
  }

  async getStatus(key: string, prefix?: string): Promise<{
    count: number;
    ttl: number;
    blocked: boolean;
  }> {
    const fullKey = `${prefix || 'ratelimit'}:${key}`;
    const blockKey = `${fullKey}:blocked`;

    const [count, ttl, blocked] = await Promise.all([
      this.redis.get(fullKey),
      this.redis.ttl(fullKey),
      this.redis.exists(blockKey),
    ]);

    return {
      count: parseInt(count || '0'),
      ttl: ttl || 0,
      blocked: blocked === 1,
    };
  }
}

