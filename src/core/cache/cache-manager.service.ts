import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { CacheService } from './cache.service';

@Injectable()
export class CacheManagerService {
  private readonly logger = new Logger(CacheManagerService.name);
  private readonly defaultTTL = 3600; // 1 hour

  constructor(private readonly cacheService: CacheService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cacheService.get(key);
      if (cached) {
        this.logger.debug(`Cache hit: ${key}`);
        return JSON.parse(cached) as T;
      }
      this.logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await this.cacheService.set(key, JSON.stringify(value), ttl);
      this.logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Cache set error for ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheService.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Cache delete error for ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.cacheService.keys(pattern);
      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.cacheService.del(key)));
        this.logger.debug(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
      }
    } catch (error) {
      this.logger.error(`Cache pattern delete error for ${pattern}:`, error);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  getCacheKey(parts: string[]): string {
    return parts.join(':');
  }

  getTenantKey(tenantId: string, ...parts: string[]): string {
    return this.getCacheKey(['tenant', tenantId, ...parts]);
  }

  async invalidateTenant(tenantId: string): Promise<void> {
    await this.delPattern(`tenant:${tenantId}:*`);
    this.logger.log(`Invalidated all cache for tenant: ${tenantId}`);
  }

  async invalidateInvoices(tenantId: string): Promise<void> {
    await this.delPattern(`tenant:${tenantId}:invoices:*`);
    await this.delPattern(`tenant:${tenantId}:billing:*`);
    this.logger.log(`Invalidated invoice cache for tenant: ${tenantId}`);
  }

  async invalidateCustomers(tenantId: string): Promise<void> {
    await this.delPattern(`tenant:${tenantId}:customers:*`);
    await this.delPattern(`tenant:${tenantId}:crm:*`);
    this.logger.log(`Invalidated customer cache for tenant: ${tenantId}`);
  }

  async invalidateRoutes(tenantId: string): Promise<void> {
    await this.delPattern(`tenant:${tenantId}:routes:*`);
    await this.delPattern(`tenant:${tenantId}:tms:*`);
    this.logger.log(`Invalidated routes cache for tenant: ${tenantId}`);
  }

  async invalidateAnalytics(tenantId: string): Promise<void> {
    await this.delPattern(`tenant:${tenantId}:analytics:*`);
    await this.delPattern(`tenant:${tenantId}:kpi:*`);
    this.logger.log(`Invalidated analytics cache for tenant: ${tenantId}`);
  }

  async getCacheStats(): Promise<any> {
    try {
      const info = await this.cacheService.getClient().info('stats');
      const keyspace = await this.cacheService.getClient().info('keyspace');
      
      return {
        info,
        keyspace,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Cache stats retrieval failed', error);
      return null;
    }
  }
}

