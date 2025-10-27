import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createHash } from 'crypto';
import { RedisService } from '@/core/cache/redis.service';
import { ConfigService } from '@nestjs/config';

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: any;
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly headerName: string;
  private readonly ttlSeconds: number;
  private readonly enabled: boolean;

  constructor(private readonly redisService: RedisService, private readonly config: ConfigService) {
    this.headerName = this.config.get<string>('IDEMPOTENCY_HEADER', 'Idempotency-Key');
    this.ttlSeconds = this.config.get<number>('IDEMPOTENCY_TTL', 600);
    this.enabled = this.config.get<string>('IDEMPOTENCY_ENABLED', 'true') === 'true';
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    if (!this.enabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request & { headers: Record<string, string>; method: string; url: string; body: any }>();
    const response = http.getResponse<any>();

    const headerKey = request.headers[this.headerName.toLowerCase()];
    const key = headerKey || this.computeRequestHash(request);
    const redisKey = `idem:${key}`;

    // If cached response exists, return it
    const cached = await this.redisService.get(redisKey);
    if (cached) {
      const cachedResponse: CachedResponse = JSON.parse(cached);
      Object.entries(cachedResponse.headers || {}).forEach(([k, v]) => response.setHeader(k, v));
      response.status(cachedResponse.status || 200);
      return of(cachedResponse.body);
    }

    // Use a lock to avoid duplicate in-flight processing
    const lockKey = `${redisKey}:lock`;
    const acquired = await this.redisService.setex(lockKey, this.ttlSeconds, '1');
    if (!acquired) {
      // Another request is processing the same key
      throw new HttpException('Duplicate request in progress', HttpStatus.CONFLICT);
    }

    return next.handle().pipe(
      tap(async (data) => {
        // Cache response
        const payload: CachedResponse = {
          status: (response.statusCode as number) || 200,
          headers: { 'X-Idempotency': 'hit' },
          body: data,
        };
        await this.redisService.setex(redisKey, this.ttlSeconds, JSON.stringify(payload));
        await this.redisService.del(lockKey);
      }),
    );
  }

  private computeRequestHash(req: { method: string; url: string; body: any }): string {
    const hash = createHash('sha256');
    hash.update(req.method);
    hash.update('|');
    hash.update(req.url);
    hash.update('|');
    try {
      hash.update(JSON.stringify(req.body || {}));
    } catch {
      // ignore
    }
    return hash.digest('hex');
  }
}
