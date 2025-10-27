import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';

interface CacheWarming {
  key: string;
  loader: () => Promise<any>;
  ttl: number;
  priority: number;
}

@Injectable()
export class CacheWarmerService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmerService.name);
  private redis: Redis;
  private warmingJobs: CacheWarming[] = [];

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  async onModuleInit() {
    this.setupWarmingJobs();
    await this.warmCache();
    setInterval(() => this.warmCache(), 30 * 60 * 1000);
  }

  private setupWarmingJobs(): void {
    this.warmingJobs = [
      {
        key: 'warehouses:active',
        loader: async () => ({ data: 'warehouses' }),
        ttl: 3600,
        priority: 1,
      },
      {
        key: 'vehicles:active',
        loader: async () => ({ data: 'vehicles' }),
        ttl: 1800,
        priority: 2,
      },
      {
        key: 'customers:top',
        loader: async () => ({ data: 'top_customers' }),
        ttl: 7200,
        priority: 3,
      },
    ];
  }

  private async warmCache(): Promise<void> {
    this.logger.log('Starting cache warming...');

    const sorted = this.warmingJobs.sort((a, b) => a.priority - b.priority);

    for (const job of sorted) {
      try {
        const exists = await this.redis.exists(job.key);
        
        if (!exists) {
          const data = await job.loader();
          await this.redis.setex(job.key, job.ttl, JSON.stringify(data));
          this.logger.debug(`Warmed cache: ${job.key}`);
        }
      } catch (error) {
        this.logger.error(`Cache warming failed for ${job.key}:`, error);
      }
    }

    this.logger.log('Cache warming completed');
  }

  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await this.redis.del(...keys);
      this.logger.log(`Invalidated ${keys.length} cache keys matching ${pattern}`);
    }

    return keys.length;
  }

  async getCacheStats(): Promise<any> {
    const info = await this.redis.info('stats');
    const lines = info.split('\r\n');
    const stats: any = {};

    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) stats[key] = value;
    });

    return {
      hits: parseInt(stats.keyspace_hits || '0'),
      misses: parseInt(stats.keyspace_misses || '0'),
      hitRate: stats.keyspace_hits && stats.keyspace_misses
        ? (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses))) * 100
        : 0,
    };
  }
}

