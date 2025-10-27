import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  maxSize?: number; // Maximum number of items
  refreshAhead?: boolean; // Refresh cache before expiration
  serialize?: boolean; // Serialize/deserialize values
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private cache = new Map<string, { value: any; expires: number; hits: number }>();
  private stats = { hits: 0, misses: 0 };
  private defaultOptions: CacheOptions = {
    ttl: 3600, // 1 hour
    maxSize: 1000,
    refreshAhead: false,
    serialize: true,
  };

  constructor(private configService: ConfigService) {
    this.startCleanupInterval();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = this.cache.get(key);
      
      if (!item) {
        this.stats.misses++;
        return null;
      }

      if (Date.now() > item.expires) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }

      item.hits++;
      this.stats.hits++;
      return item.value;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}`, error.stack);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const expires = Date.now() + (opts.ttl! * 1000);
      
      // Check cache size limit
      if (this.cache.size >= opts.maxSize!) {
        this.evictLeastUsed();
      }

      this.cache.set(key, {
        value: opts.serialize ? JSON.stringify(value) : value,
        expires,
        hits: 0,
      });

      this.logger.debug(`Cached key ${key} with TTL ${opts.ttl}s`);
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}`, error.stack);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      return this.cache.delete(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}`, error.stack);
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      this.cache.clear();
      this.stats = { hits: 0, misses: 0 };
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear error', error.stack);
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const item = this.cache.get(key);
      return item ? Date.now() <= item.expires : false;
    } catch (error) {
      this.logger.error(`Cache has error for key ${key}`, error.stack);
      return false;
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    try {
      let value = await this.get<T>(key);
      
      if (value === null) {
        value = await factory();
        await this.set(key, value, options);
      }
      
      return value;
    } catch (error) {
      this.logger.error(`Cache getOrSet error for key ${key}`, error.stack);
      throw error;
    }
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    
    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }
    
    return result;
  }

  async setMany<T>(entries: Map<string, T>, options?: CacheOptions): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
  }

  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const regex = new RegExp(pattern);
      let invalidatedCount = 0;
      
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          invalidatedCount++;
        }
      }
      
      this.logger.log(`Invalidated ${invalidatedCount} cache entries matching pattern ${pattern}`);
      return invalidatedCount;
    } catch (error) {
      this.logger.error(`Cache invalidate pattern error for pattern ${pattern}`, error.stack);
      return 0;
    }
  }

  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  async getKeys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async getSize(): Promise<number> {
    return this.cache.size;
  }

  async getMemoryUsage(): Promise<number> {
    try {
      const usage = process.memoryUsage();
      return usage.heapUsed;
    } catch (error) {
      this.logger.error('Failed to get memory usage', error.stack);
      return 0;
    }
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastHits = Infinity;
    
    for (const [key, item] of this.cache) {
      if (item.hits < leastHits) {
        leastHits = item.hits;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
      this.logger.debug(`Evicted least used cache key: ${leastUsedKey}`);
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Cleanup every minute
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }
}
