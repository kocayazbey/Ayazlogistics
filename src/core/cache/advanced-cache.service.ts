import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventBusService } from '../events/event-bus.service';

interface CacheEntry<T = any> {
  value: T;
  expiresAt: Date;
  createdAt: Date;
  accessCount: number;
  lastAccessed: Date;
  tags?: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

@Injectable()
export class AdvancedCacheService {
  private readonly logger = new Logger(AdvancedCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
  };
  
  private readonly maxSize: number;
  private readonly defaultTTL: number;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventBus: EventBusService,
  ) {
    this.maxSize = this.configService.get('CACHE_MAX_SIZE', 10000);
    this.defaultTTL = this.configService.get('CACHE_DEFAULT_TTL', 3600) * 1000; // Convert to milliseconds
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.evictions++;
      this.updateHitRate();
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = new Date();
    this.stats.hits++;
    this.updateHitRate();

    return entry.value as T;
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string, 
    value: T, 
    ttl?: number, 
    tags?: string[]
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttl || this.defaultTTL));

    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      await this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now,
      tags,
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;

    // Emit cache event
    await this.eventBus.emit('cache.set', { key, ttl, tags });
  }

  /**
   * Get or set pattern
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    tags?: string[]
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl, tags);
    return value;
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
      await this.eventBus.emit('cache.delete', { key });
    }
    return deleted;
  }

  /**
   * Delete by tags
   */
  async deleteByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.stats.size = this.cache.size;
      await this.eventBus.emit('cache.deleteByTags', { tags, count: deletedCount });
    }

    return deletedCount;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    this.stats.evictions += size;
    
    await this.eventBus.emit('cache.clear', { clearedCount: size });
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      result.set(key, value);
    }
    
    return result;
  }

  /**
   * Set multiple keys
   */
  async mset<T>(
    entries: Array<{ key: string; value: T; ttl?: number; tags?: string[] }>
  ): Promise<void> {
    for (const { key, value, ttl, tags } of entries) {
      await this.set(key, value, ttl, tags);
    }
  }

  /**
   * Increment numeric value
   */
  async increment(key: string, amount = 1, ttl?: number): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + amount;
    await this.set(key, newValue, ttl);
    return newValue;
  }

  /**
   * Decrement numeric value
   */
  async decrement(key: string, amount = 1, ttl?: number): Promise<number> {
    return this.increment(key, -amount, ttl);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache keys by pattern
   */
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Warm up cache
   */
  async warmUp<T>(
    keys: string[],
    factory: (key: string) => Promise<T>,
    ttl?: number,
    tags?: string[]
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!(await this.exists(key))) {
        const value = await factory(key);
        await this.set(key, value, ttl, tags);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Evict least recently used items
   */
  private async evictLRU(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
    
    // Remove 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
      this.stats.evictions++;
    }
    
    this.stats.size = this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
        this.stats.evictions++;
      }
    }
    
    if (cleanedCount > 0) {
      this.stats.size = this.cache.size;
      this.logger.log(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Get cache entry info
   */
  getEntryInfo(key: string): {
    exists: boolean;
    expiresAt?: Date;
    accessCount?: number;
    lastAccessed?: Date;
    tags?: string[];
  } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return {
      exists: true,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed,
      tags: entry.tags,
    };
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
