import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import NodeCache from 'node-cache';

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  compress?: boolean;
  serialize?: boolean;
  fallback?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  memoryUsage?: number;
  redisInfo?: any;
}

@Injectable()
export class EnhancedCacheService {
  private readonly logger = new Logger(EnhancedCacheService.name);
  private redis: Redis;
  private memoryCache: NodeCache;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
  };

  constructor(private configService: ConfigService) {
    this.initializeCaches();
    this.startMonitoring();
  }

  private initializeCaches(): void {
    // Initialize Redis cache
    this.redis = new Redis({
      host: this.configService.get<string>('cache.redis.host', 'localhost'),
      port: this.configService.get<number>('cache.redis.port', 6379),
      password: this.configService.get<string>('cache.redis.password'),
      db: this.configService.get<number>('cache.redis.db', 0),
      keyPrefix: this.configService.get<string>('cache.redis.keyPrefix', 'ayazlogistics:'),
      retryDelayOnFailover: this.configService.get<number>('cache.redis.retryDelayOnFailover', 100),
      maxRetriesPerRequest: this.configService.get<number>('cache.redis.maxRetriesPerRequest', 3),
      lazyConnect: this.configService.get<boolean>('cache.redis.lazyConnect', false),
    });

    // Initialize memory cache as fallback
    this.memoryCache = new NodeCache({
      stdTTL: this.configService.get<number>('cache.strategies.memory.ttl', 3600),
      maxKeys: 1000,
      useClones: false,
    });

    // Redis event listeners
    this.redis.on('connect', () => {
      this.logger.log('Redis cache connected successfully');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis cache error:', error);
      this.stats.errors++;
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis cache ready for operations');
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis cache connection closed');
    });

    this.logger.log('Enhanced cache service initialized');
  }

  // Core cache operations
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      const redisValue = await this.redis.get(key);
      if (redisValue !== null) {
        this.stats.hits++;
        this.updateHitRate();
        return this.deserializeValue<T>(redisValue);
      }

      // Fallback to memory cache
      const memoryValue = this.memoryCache.get<T>(key);
      if (memoryValue !== undefined) {
        this.stats.hits++;
        this.updateHitRate();
        return memoryValue;
      }

      this.stats.misses++;
      this.updateHitRate();
      return null;

    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<boolean> {
    try {
      const serializedValue = this.serializeValue(value);
      const ttl = options.ttl || this.getDefaultTTL(key);

      // Set in Redis
      if (ttl > 0) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }

      // Also set in memory cache with shorter TTL
      const memoryTTL = Math.min(ttl, this.configService.get<number>('cache.strategies.memory.ttl', 3600));
      this.memoryCache.set(key, value, memoryTTL);

      // Set tags if provided
      if (options.tags && options.tags.length > 0) {
        await this.setTags(key, options.tags);
      }

      this.stats.sets++;
      return true;

    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      // Delete from both caches
      await this.redis.del(key);
      this.memoryCache.del(key);

      // Remove from tags
      await this.removeFromTags(key);

      this.stats.deletes++;
      return true;

    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      // Use Redis SCAN for pattern deletion
      const keys = await this.scanKeys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        keys.forEach(key => this.memoryCache.del(key));
      }

      this.stats.deletes += keys.length;
      return keys.length;

    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error deleting cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  async invalidateByTag(tag: string): Promise<number> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.redis.smembers(tagKey);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        keys.forEach(key => this.memoryCache.del(key));

        // Remove the tag itself
        await this.redis.del(tagKey);
      }

      this.stats.deletes += keys.length;
      return keys.length;

    } catch (error) {
      this.stats.errors++;
      this.logger.error(`Error invalidating cache tag ${tag}:`, error);
      return 0;
    }
  }

  // Advanced cache operations
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    // Generate value and cache it
    const value = await factory();
    await this.set(key, value, options);

    return value;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const redisValues = await this.redis.mget(keys);
      const results: (T | null)[] = [];

      for (let i = 0; i < keys.length; i++) {
        if (redisValues[i] !== null) {
          results.push(this.deserializeValue<T>(redisValues[i]!));
          this.stats.hits++;
        } else {
          const memoryValue = this.memoryCache.get<T>(keys[i]);
          if (memoryValue !== undefined) {
            results.push(memoryValue);
            this.stats.hits++;
          } else {
            results.push(null);
            this.stats.misses++;
          }
        }
      }

      this.updateHitRate();
      return results;

    } catch (error) {
      this.stats.errors++;
      this.logger.error('Error in mget operation:', error);
      return keys.map(() => null);
    }
  }

  async mset<T>(keyValuePairs: Array<[string, T]>, options: CacheOptions = {}): Promise<boolean> {
    try {
      const redisPairs: Array<[string, string]> = [];
      const memoryPairs: Array<[string, T]> = [];

      for (const [key, value] of keyValuePairs) {
        const serializedValue = this.serializeValue(value);
        redisPairs.push([key, serializedValue]);
        memoryPairs.push([key, value]);
      }

      // Set in Redis
      if (redisPairs.length > 0) {
        const ttl = options.ttl || this.getDefaultTTL(keyValuePairs[0][0]);
        const pipeline = this.redis.multi();

        redisPairs.forEach(([key, value]) => {
          if (ttl > 0) {
            pipeline.setex(key, ttl, value);
          } else {
            pipeline.set(key, value);
          }
        });

        await pipeline.exec();
      }

      // Set in memory cache
      const memoryTTL = options.ttl || this.configService.get<number>('cache.strategies.memory.ttl', 3600);
      memoryPairs.forEach(([key, value]) => {
        this.memoryCache.set(key, value, memoryTTL);
      });

      // Set tags if provided
      if (options.tags && options.tags.length > 0) {
        for (const [key] of keyValuePairs) {
          await this.setTags(key, options.tags!);
        }
      }

      this.stats.sets += keyValuePairs.length;
      return true;

    } catch (error) {
      this.stats.errors++;
      this.logger.error('Error in mset operation:', error);
      return false;
    }
  }

  // Cache warming and preloading
  async warmCache(keys: string[]): Promise<void> {
    this.logger.log(`Starting cache warming for ${keys.length} keys`);

    for (const key of keys) {
      try {
        // Check if key exists in Redis
        const exists = await this.redis.exists(key);
        if (exists === 0) {
          // Key doesn't exist, might need to generate it
          this.logger.debug(`Cache key ${key} not found during warming`);
        }
      } catch (error) {
        this.logger.error(`Error checking cache key ${key} during warming:`, error);
      }
    }

    this.logger.log('Cache warming completed');
  }

  // Cache analytics and monitoring
  async getStats(): Promise<CacheStats> {
    try {
      const redisInfo = await this.redis.info('memory');

      return {
        ...this.stats,
        memoryUsage: this.getMemoryUsage(),
        redisInfo: this.parseRedisInfo(redisInfo),
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return this.stats;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await this.redis.flushdb();
      this.memoryCache.flushAll();

      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
        hitRate: 0,
      };

      this.logger.log('All caches cleared');
    } catch (error) {
      this.logger.error('Error clearing caches:', error);
    }
  }

  // Private helper methods
  private serializeValue(value: any): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }

  private deserializeValue<T>(value: string): T {
    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  private getDefaultTTL(key: string): number {
    const ttlConfig = this.configService.get('cache.ttl', {});

    // Check for specific key patterns
    if (key.startsWith('user:profile:')) return ttlConfig.userProfile || 3600;
    if (key.startsWith('orders:')) return ttlConfig.businessData || 86400;
    if (key.startsWith('dashboard:metrics:')) return ttlConfig.dashboardMetrics || 3600;
    if (key.startsWith('ai:')) return ttlConfig.analytics || 604800;

    return ttlConfig.businessData || 3600;
  }

  private async setTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      await this.redis.sadd(tagKey, key);
    }
  }

  private async removeFromTags(key: string): Promise<void> {
    const pattern = 'tag:*';
    const tagKeys = await this.scanKeys(pattern);

    for (const tagKey of tagKeys) {
      await this.redis.srem(tagKey, key);
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const result = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    return keys;
  }

  private getMemoryUsage(): number {
    // Get memory usage from Node.js process
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024); // MB
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private startMonitoring(): void {
    // Monitor cache performance every 5 minutes
    setInterval(async () => {
      try {
        const stats = await this.getStats();
        this.logger.debug('Cache stats:', stats);

        // Log warnings for poor performance
        if (stats.hitRate < 50) {
          this.logger.warn(`Low cache hit rate: ${stats.hitRate.toFixed(2)}%`);
        }

        if (stats.errors > 0) {
          this.logger.warn(`Cache errors detected: ${stats.errors}`);
        }
      } catch (error) {
        this.logger.error('Error in cache monitoring:', error);
      }
    }, 300000);

    this.logger.log('Cache monitoring started');
  }

  // Health check
  async healthCheck(): Promise<{
    redis: boolean;
    memory: boolean;
    overall: boolean;
  }> {
    const redisHealthy = await this.checkRedisHealth();
    const memoryHealthy = this.memoryCache.getStats().keys > -1; // Always true for in-memory cache

    return {
      redis: redisHealthy,
      memory: memoryHealthy,
      overall: redisHealthy && memoryHealthy,
    };
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  // Graceful shutdown
  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log('Enhanced cache service shut down gracefully');
    } catch (error) {
      this.logger.error('Error shutting down cache service:', error);
    }
  }
}
