import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

/**
 * Sentry Error Tracking Interceptor
 * Captures and sends errors to Sentry for monitoring
 */

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  constructor() {
    // Initialize Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 1.0,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Express({ app: undefined }),
        ],
      });
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;

    // Set Sentry context
    Sentry.setContext('request', {
      method,
      url,
      userId: user?.id,
      tenantId: request['tenantId'],
    });

    return next.handle().pipe(
      tap(() => {
        // Log successful requests (optional, for performance monitoring)
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - request['startTime'];
        
        if (duration > 1000) {
          // Log slow requests
          Sentry.captureMessage(`Slow request: ${method} ${url} took ${duration}ms`, 'warning');
        }
      }),
      catchError((error) => {
        // Capture exception in Sentry
        Sentry.withScope((scope) => {
          scope.setTag('method', method);
          scope.setTag('url', url);
          scope.setUser({
            id: user?.id,
            username: user?.username,
            email: user?.email,
          });
          scope.setExtra('requestBody', request.body);
          scope.setExtra('requestParams', request.params);
          scope.setExtra('requestQuery', request.query);
          scope.setExtra('tenantId', request['tenantId']);

          Sentry.captureException(error);
        });

        return throwError(() => error);
      }),
    );
  }
}

/**
 * Sentry Service for manual error tracking
 */
@Injectable()
export class SentryService {
  captureException(error: Error, context?: Record<string, any>): void {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: Record<string, any>): void {
    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      Sentry.captureMessage(message, level);
    });
  }

  setUser(user: { id: string; username?: string; email?: string }): void {
    Sentry.setUser(user);
  }

  clearUser(): void {
    Sentry.setUser(null);
  }

  addBreadcrumb(breadcrumb: { message: string; category?: string; level?: Sentry.SeverityLevel; data?: any }): void {
    Sentry.addBreadcrumb(breadcrumb);
  }

  capturePerformanceIssue(operation: string, duration: number, threshold: number): void {
    if (duration > threshold) {
      this.captureMessage(
        `Performance issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
        'warning',
        { operation, duration, threshold },
      );
    }
  }
}

