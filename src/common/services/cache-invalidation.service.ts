import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async invalidateCache(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.log(`Cache key invalidated: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache key ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = (this.cacheManager.store as any).getClient();
      if (client && typeof client.keys === 'function') {
        const keys = await client.keys(pattern);
        for (const key of keys) {
          await this.cacheManager.del(key);
          this.logger.log(`Cache key invalidated by pattern: ${key}`);
        }
      } else {
        this.logger.warn('Cache store does not support pattern invalidation');
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate cache pattern ${pattern}:`, error);
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.log('All cache cleared');
    } catch (error) {
      this.logger.error('Failed to clear all cache:', error);
    }
  }
}