import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EnhancedCacheService } from '../../core/cache/enhanced-cache.service';
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_TAGS_METADATA,
  CACHE_CONDITION_METADATA,
  CacheKeyBuilder,
} from '../decorators/cache.decorator';
import { EventService } from '../../realtime/services/event.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private cacheService: EnhancedCacheService,
    private eventService: EventService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get cache configuration from metadata
    const cacheKeyTemplate = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    const cacheTTL = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );
    const cacheTags = this.reflector.get<string[]>(
      CACHE_TAGS_METADATA,
      context.getHandler(),
    );
    const cacheCondition = this.reflector.get<string>(
      CACHE_CONDITION_METADATA,
      context.getHandler(),
    );

    // Check if caching is enabled for this endpoint
    if (!cacheKeyTemplate) {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(cacheKeyTemplate, request);

    // Check cache condition
    if (cacheCondition && !this.evaluateCondition(cacheCondition, request)) {
      return next.handle();
    }

    try {
      // Try to get from cache first
      const cachedData = await this.cacheService.get(cacheKey);

      if (cachedData !== null) {
        // Add cache headers
        response.setHeader('X-Cache-Status', 'HIT');
        response.setHeader('X-Cache-Key', cacheKey);

        // Emit cache hit event
        this.eventService.emit('cache.hit', {
          key: cacheKey,
          endpoint: request.route?.path || request.url,
          method: request.method,
          userId: request.user?.id,
        });

        return of(cachedData);
      }

      // Cache miss - execute the handler
      response.setHeader('X-Cache-Status', 'MISS');
      response.setHeader('X-Cache-Key', cacheKey);

      return next.handle().pipe(
        tap(async (data) => {
          // Cache the response
          const cacheOptions = {
            ttl: cacheTTL,
            tags: cacheTags,
          };

          await this.cacheService.set(cacheKey, data, cacheOptions);

          // Emit cache miss event
          this.eventService.emit('cache.miss', {
            key: cacheKey,
            endpoint: request.route?.path || request.url,
            method: request.method,
            userId: request.user?.id,
          });
        }),
      );

    } catch (error) {
      // On cache error, continue without caching
      this.eventService.emit('cache.error', {
        error: error.message,
        key: cacheKey,
        endpoint: request.route?.path || request.url,
      });

      return next.handle();
    }
  }

  private generateCacheKey(template: string, request: any): string {
    let key = template;

    // Replace dynamic parts in template
    key = key.replace(':userId', request.user?.id || 'anonymous');
    key = key.replace(':tenantId', request.user?.tenantId || 'global');
    key = key.replace(':id', request.params?.id || 'all');

    // Add query parameters for GET requests
    if (request.method === 'GET' && request.query) {
      const queryString = Object.keys(request.query)
        .sort()
        .map(k => `${k}=${request.query[k]}`)
        .join('&');
      key += `?${queryString}`;
    }

    // Add request body hash for POST/PUT requests (simplified)
    if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.body) {
      const bodyHash = this.simpleHash(JSON.stringify(request.body));
      key += `:body:${bodyHash}`;
    }

    return key;
  }

  private evaluateCondition(condition: string, request: any): boolean {
    // Simple condition evaluation (e.g., "method=GET", "user.role=admin")
    const parts = condition.split('=');
    if (parts.length !== 2) return true;

    const [field, expectedValue] = parts;
    const actualValue = this.getNestedValue(request, field);

    return actualValue === expectedValue;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}