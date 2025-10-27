import { SetMetadata } from '@nestjs/common';
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export const CACHE_KEY_METADATA = 'cache_key';
export const CACHE_TTL_METADATA = 'cache_ttl';
export const CACHE_TAGS_METADATA = 'cache_tags';
export const CACHE_CONDITION_METADATA = 'cache_condition';

// Cache decorator for methods
export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  namespace?: string;
  key?: string;
}

export const Cache = (options: CacheOptions | number = {}) => {
  const opts = typeof options === 'number' ? { ttl: options } : options;
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (opts.ttl) SetMetadata(CACHE_TTL_METADATA, opts.ttl)(target, propertyKey, descriptor);
    if (opts.tags && opts.tags.length > 0) SetMetadata(CACHE_TAGS_METADATA, opts.tags)(target, propertyKey, descriptor);
    if (opts.key) SetMetadata(CACHE_KEY_METADATA, opts.key)(target, propertyKey, descriptor);
  };
};

export const CacheInvalidate = (...tags: string[]) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    SetMetadata('cache_invalidate', tags)(target, propertyKey, descriptor);
  };
};

export const CacheKey = (key: string) => SetMetadata(CACHE_KEY_METADATA, key);
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL_METADATA, ttl);
export const CacheTags = (...tags: string[]) => SetMetadata(CACHE_TAGS_METADATA, tags);

// Conditional caching
export const CacheCondition = (condition: string) => SetMetadata(CACHE_CONDITION_METADATA, condition);

// Cache invalidation decorators
export const InvalidateCache = (...tags: string[]) => SetMetadata('cache_invalidate', tags);
export const InvalidateCacheKey = (key: string) => SetMetadata('cache_invalidate_key', key);
export const InvalidateCachePattern = (pattern: string) => SetMetadata('cache_invalidate_pattern', pattern);

// Cache warming decorator
export const WarmCache = (...keys: string[]) => SetMetadata('cache_warm', keys);

// Common cache configurations
export const CacheConfig = {
  // Short-lived cache (5 minutes)
  TEMPORARY: { ttl: 300 },

  // Session data (30 minutes)
  SESSION: { ttl: 1800 },

  // User data (1 hour)
  USER: { ttl: 3600 },

  // Business data (24 hours)
  BUSINESS: { ttl: 86400 },

  // Analytics data (7 days)
  ANALYTICS: { ttl: 604800 },

  // Static data (no expiration)
  STATIC: { ttl: -1 },
} as const;

// Enhanced Cache key builders with more comprehensive patterns
export class CacheKeyBuilder {
  static userProfile(userId: string): string {
    return `user:profile:${userId}`;
  }

  static userPermissions(userId: string): string {
    return `user:permissions:${userId}`;
  }

  static userSessions(userId: string): string {
    return `user:sessions:${userId}`;
  }

  static userTenantData(userId: string, tenantId: string): string {
    return `user:tenant:${tenantId}:${userId}`;
  }

  static order(orderId: string): string {
    return `order:${orderId}`;
  }

  static ordersByUser(userId: string): string {
    return `orders:user:${userId}`;
  }

  static ordersByStatus(status: string): string {
    return `orders:status:${status}`;
  }

  static ordersByDateRange(startDate: string, endDate: string): string {
    return `orders:range:${startDate}:${endDate}`;
  }

  static ordersByTenant(tenantId: string): string {
    return `orders:tenant:${tenantId}`;
  }

  static shipment(shipmentId: string): string {
    return `shipment:${shipmentId}`;
  }

  static shipmentsByOrder(orderId: string): string {
    return `shipments:order:${orderId}`;
  }

  static shipmentsByDriver(driverId: string): string {
    return `shipments:driver:${driverId}`;
  }

  static shipmentsByStatus(status: string): string {
    return `shipments:status:${status}`;
  }

  static shipmentsByDateRange(startDate: string, endDate: string): string {
    return `shipments:range:${startDate}:${endDate}`;
  }

  static inventory(itemId: string): string {
    return `inventory:${itemId}`;
  }

  static inventoryByWarehouse(warehouseId: string): string {
    return `inventory:warehouse:${warehouseId}`;
  }

  static inventoryByCategory(category: string): string {
    return `inventory:category:${category}`;
  }

  static inventoryLowStock(tenantId: string): string {
    return `inventory:lowstock:tenant:${tenantId}`;
  }

  static inventorySearch(query: string): string {
    return `inventory:search:${Buffer.from(query).toString('base64')}`;
  }

  static customer(customerId: string): string {
    return `customer:${customerId}`;
  }

  static customersByTenant(tenantId: string): string {
    return `customers:tenant:${tenantId}`;
  }

  static customersSearch(query: string): string {
    return `customers:search:${Buffer.from(query).toString('base64')}`;
  }

  static vehicle(vehicleId: string): string {
    return `vehicle:${vehicleId}`;
  }

  static vehiclesByTenant(tenantId: string): string {
    return `vehicles:tenant:${tenantId}`;
  }

  static vehiclesByStatus(status: string): string {
    return `vehicles:status:${status}`;
  }

  static vehiclesByDriver(driverId: string): string {
    return `vehicles:driver:${driverId}`;
  }

  static dashboardMetrics(category: string, timeRange: string): string {
    return `dashboard:metrics:${category}:${timeRange}`;
  }

  static dashboardMetricsTenant(tenantId: string, category: string, timeRange: string): string {
    return `dashboard:metrics:tenant:${tenantId}:${category}:${timeRange}`;
  }

  static aiModel(modelId: string): string {
    return `ai:model:${modelId}`;
  }

  static aiPrediction(modelId: string, inputHash: string): string {
    return `ai:prediction:${modelId}:${inputHash}`;
  }

  static aiTrainingJob(jobId: string): string {
    return `ai:training:${jobId}`;
  }

  static aiInsight(insightId: string): string {
    return `ai:insight:${insightId}`;
  }

  static systemHealth(): string {
    return 'system:health';
  }

  static systemMetrics(): string {
    return 'system:metrics';
  }

  static systemPerformance(): string {
    return 'system:performance';
  }

  static reportsByType(type: string): string {
    return `reports:type:${type}`;
  }

  static reportsByUser(userId: string): string {
    return `reports:user:${userId}`;
  }

  static reportsByDateRange(startDate: string, endDate: string): string {
    return `reports:range:${startDate}:${endDate}`;
  }

  // Generic pattern builder
  static buildPattern(namespace: string, ...params: (string | number)[]): string {
    return `${namespace}:${params.join(':')}`;
  }

  // Hash-based key generation for complex data
  static hashKey(namespace: string, data: any): string {
    const hash = require('crypto').createHash('md5').update(JSON.stringify(data)).digest('hex');
    return `${namespace}:hash:${hash}`;
  }
}

// Validation decorators for cache-related fields
export function IsValidCacheTTL(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidCacheTTL',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          const num = parseInt(value);
          return !isNaN(num) && num >= -1 && num <= 2592000; // Max 30 days
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid TTL value between -1 and 2592000 seconds`;
        }
      }
    });
  };
}

export function IsValidCacheKey(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidCacheKey',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value) return false;
          // Cache keys should not contain special characters that could cause issues
          const invalidChars = /[<>:"|?*\x00-\x1f]/;
          return typeof value === 'string' && !invalidChars.test(value) && value.length <= 250;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid cache key (no special characters, max 250 chars)`;
        }
      }
    });
  };
}