import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * WMS Logging Interceptor
 * Logs all WMS API requests and responses with timing
 */
@Injectable()
export class WmsLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('WMS-API');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;

    const now = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - User: ${user?.id || 'anonymous'} - IP: ${ip}`
    );

    if (body && Object.keys(body).length > 0) {
      this.logger.debug(`Request Body: ${JSON.stringify(this.sanitizeBody(body))}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `Completed: ${method} ${url} - ${responseTime}ms - User: ${user?.id || 'anonymous'}`
          );
          
          if (responseTime > 1000) {
            this.logger.warn(`Slow request detected: ${method} ${url} took ${responseTime}ms`);
          }
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `Failed: ${method} ${url} - ${responseTime}ms - Error: ${error.message}`,
            error.stack
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}

