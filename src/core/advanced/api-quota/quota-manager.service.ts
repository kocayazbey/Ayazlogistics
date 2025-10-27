import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

interface QuotaLimit {
  perMinute: number;
  perHour: number;
  perDay: number;
  perMonth: number;
}

@Injectable()
export class QuotaManagerService {
  private readonly logger = new Logger(QuotaManagerService.name);
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async checkQuota(
    tenantId: string,
    limits: QuotaLimit,
  ): Promise<{ allowed: boolean; remaining: Record<string, number>; resetAt: Record<string, Date> }> {
    const now = Date.now();
    const periods = {
      minute: { key: `quota:${tenantId}:minute:${Math.floor(now / 60000)}`, limit: limits.perMinute, ttl: 60 },
      hour: { key: `quota:${tenantId}:hour:${Math.floor(now / 3600000)}`, limit: limits.perHour, ttl: 3600 },
      day: { key: `quota:${tenantId}:day:${Math.floor(now / 86400000)}`, limit: limits.perDay, ttl: 86400 },
      month: { key: `quota:${tenantId}:month:${new Date().toISOString().slice(0, 7)}`, limit: limits.perMonth, ttl: 2592000 },
    };

    const counts = await Promise.all(
      Object.values(periods).map(async p => {
        const count = parseInt(await this.redis.get(p.key) || '0');
        return { ...p, count };
      })
    );

    const exceeded = counts.some(p => p.count >= p.limit);

    if (!exceeded) {
      await Promise.all(
        Object.values(periods).map(async p => {
          const count = await this.redis.incr(p.key);
          if (count === 1) {
            await this.redis.expire(p.key, p.ttl);
          }
        })
      );
    }

    const remaining: Record<string, number> = {};
    const resetAt: Record<string, Date> = {};

    counts.forEach((p, idx) => {
      const period = Object.keys(periods)[idx];
      remaining[period] = Math.max(0, p.limit - p.count);
      const ttl = this.redis.ttl(p.key);
      resetAt[period] = new Date(now + ((ttl as any) || p.ttl) * 1000);
    });

    return {
      allowed: !exceeded,
      remaining,
      resetAt,
    };
  }

  async resetQuota(tenantId: string): Promise<void> {
    const pattern = `quota:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`Quota reset for tenant ${tenantId}`);
    }
  }

  async getQuotaUsage(tenantId: string): Promise<Record<string, number>> {
    const now = Date.now();
    const keys = {
      minute: `quota:${tenantId}:minute:${Math.floor(now / 60000)}`,
      hour: `quota:${tenantId}:hour:${Math.floor(now / 3600000)}`,
      day: `quota:${tenantId}:day:${Math.floor(now / 86400000)}`,
      month: `quota:${tenantId}:month:${new Date().toISOString().slice(0, 7)}`,
    };

    const usage: Record<string, number> = {};
    for (const [period, key] of Object.entries(keys)) {
      usage[period] = parseInt(await this.redis.get(key) || '0');
    }

    return usage;
  }
}

