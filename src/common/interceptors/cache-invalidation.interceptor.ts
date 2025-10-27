import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const invalidateTags = this.reflector.get<string[]>('cache_invalidate', context.getHandler());

    return next.handle().pipe(
      tap(async (data) => {
        if (invalidateTags && invalidateTags.length > 0) {
          await this.cacheService.invalidateByTags(invalidateTags);
        }
      }),
    );
  }
}
