import { Injectable, NestInterceptor, ExecutionContext, CallHandler, TooManyRequestsException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { EnhancedRateLimiterService } from '@/core/security/rate-limiter-enhanced.service';
import { RATE_LIMIT_KEY, RateLimitOptions } from '@/common/decorators/rate-limit.decorator';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: EnhancedRateLimiterService,
    private readonly config: ConfigService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<any>();

    const opts = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const def = this.config.get('ratelimit.default') as any;

    const config = {
      points: opts?.points ?? def.points,
      duration: opts?.duration ?? def.duration,
      blockDuration: opts?.blockDuration ?? def.blockDuration,
      keyPrefix: opts?.keyPrefix ?? def.keyPrefix,
    };

    const identifier = `${req.ip || 'unknown'}:${req.user?.id || 'anon'}:${req.method}:${req.path}`;

    const result = await this.limiter.consume(identifier, config as any);
    if (!result.allowed) {
      const err = new TooManyRequestsException('Too many requests');
      (err as any).retryAfter = result.retryAfter ?? 60;
      throw err;
    }

    return next.handle();
  }
}
