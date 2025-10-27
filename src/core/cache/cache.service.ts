import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  namespace?: string; // Cache namespace
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTTL = 3600; // 1 hour

  constructor(private readonly redisService: RedisService) {}

  /**
   * Generate cache key with namespace
   */
  generateKey(namespace: string, ...parts: string[]): string {
    return `${namespace}:${parts.join(':')}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const value = await this.redisService.get(fullKey);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const ttl = options.ttl || this.defaultTTL;
      
      await this.redisService.setex(fullKey, ttl, JSON.stringify(value));
      
      // Store cache tags for invalidation
      if (options.tags && options.tags.length > 0) {
        await this.storeCacheTags(fullKey, options.tags);
      }

      return true;
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.redisService.del(fullKey);
      
      // Clean up cache tags
      await this.cleanupCacheTags(fullKey);
      
      return result > 0;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let invalidatedCount = 0;
      
      for (const tag of tags) {
        const tagKey = this.buildTagKey(tag);
        const keys = await this.redisService.smembers(tagKey);
        
        if (keys.length > 0) {
          await this.redisService.del(...keys);
          await this.redisService.del(tagKey);
          invalidatedCount += keys.length;
        }
      }

      this.logger.log(`Invalidated ${invalidatedCount} cache entries by tags: ${tags.join(', ')}`);
      return invalidatedCount;
    } catch (error) {
      this.logger.error(`Cache invalidation error for tags ${tags}:`, error);
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(namespace?: string): Promise<boolean> {
    try {
      const pattern = namespace ? `${namespace}:*` : '*';
      const keys = await this.redisService.keys(pattern);
      
      if (keys.length > 0) {
        await this.redisService.del(...keys);
      }

      this.logger.log(`Cleared ${keys.length} cache entries`);
      return true;
    } catch (error) {
      this.logger.error('Cache clear all error:', error);
      return false;
    }
  }

  /**
   * Get or set cache with fallback function
   */
  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key, options.namespace);
      if (cached !== null) {
        return cached;
      }

      // Execute fallback function
      const value = await fallback();
      
      // Store in cache
      await this.set(key, value, options);
      
      return value;
    } catch (error) {
      this.logger.error(`Cache getOrSet error for key ${key}:`, error);
      // Return fallback result even if caching fails
      return await fallback();
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[], namespace?: string): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, namespace));
      const values = await this.redisService.mget(...fullKeys);
      
      return values.map(value => 
        value ? JSON.parse(value) : null
      );
    } catch (error) {
      this.logger.error(`Cache mget error for keys ${keys}:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(
    keyValuePairs: Array<{ key: string; value: T; options?: CacheOptions }>,
    namespace?: string
  ): Promise<boolean> {
    try {
      const pipeline = this.redisService.pipeline();
      
      for (const { key, value, options = {} } of keyValuePairs) {
        const fullKey = this.buildKey(key, namespace || options.namespace);
        const ttl = options.ttl || this.defaultTTL;
        
        pipeline.setex(fullKey, ttl, JSON.stringify(value));
        
        if (options.tags && options.tags.length > 0) {
          this.storeCacheTags(fullKey, options.tags);
        }
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error(`Cache mset error:`, error);
      return false;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, namespace);
      const result = await this.redisService.exists(fullKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const info = await this.redisService.info('memory');
      const keys = await this.redisService.keys('*');
      
      return {
        totalKeys: keys.length,
        memoryUsage: info,
        hitRate: 0, // Would need to track this separately
      };
    } catch (error) {
      this.logger.error('Cache stats error:', error);
      return {
        totalKeys: 0,
        memoryUsage: '0',
        hitRate: 0,
      };
    }
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Build tag key
   */
  private buildTagKey(tag: string): string {
    return `cache:tags:${tag}`;
  }

  /**
   * Store cache tags
   */
  private async storeCacheTags(key: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        const tagKey = this.buildTagKey(tag);
        await this.redisService.sadd(tagKey, key);
        await this.redisService.expire(tagKey, this.defaultTTL);
      }
    } catch (error) {
      this.logger.error(`Store cache tags error:`, error);
    }
  }

  /**
   * Cleanup cache tags
   */
  private async cleanupCacheTags(key: string): Promise<void> {
    try {
      // This would need to be implemented based on how tags are stored
      // For now, we'll skip this optimization
    } catch (error) {
      this.logger.error(`Cleanup cache tags error:`, error);
    }
  }
}