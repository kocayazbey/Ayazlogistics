import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, retry, delay, switchMap } from 'rxjs/operators';
import { ERROR_HANDLING_KEY, ErrorHandlingOptions } from '../decorators/error-handling.decorator';
import { ErrorMonitoringService } from '../services/error-monitoring.service';
import { BusinessException } from '../exceptions/business.exception';

@Injectable()
export class ErrorRecoveryGuard implements CanActivate {
  private readonly logger = new Logger(ErrorRecoveryGuard.name);

  constructor(
    private reflector: Reflector,
    private errorMonitoringService: ErrorMonitoringService
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const errorHandlingOptions = this.reflector.getAllAndOverride<ErrorHandlingOptions>(
      ERROR_HANDLING_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!errorHandlingOptions) {
      return true;
    }

    return this.executeWithErrorHandling(context, errorHandlingOptions);
  }

  private executeWithErrorHandling(
    context: ExecutionContext,
    options: ErrorHandlingOptions
  ): Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const service = context.getClass().name;
    const method = context.getHandler().name;

    return of(true).pipe(
      retry({
        count: options.retryAttempts || 0,
        delay: (error, retryCount) => {
          this.logger.warn(
            `Retry attempt ${retryCount} for ${service}.${method}`,
            error.message
          );
          return timer((options.retryDelay || 1000) * retryCount);
        },
      }),
      catchError(error => {
        this.errorMonitoringService.recordError(error, {
          service,
          method,
          userId: request.user?.id,
          requestId: request.headers['x-request-id'],
        });

        if (options.fallbackMethod) {
          this.logger.warn(
            `Executing fallback method ${options.fallbackMethod} for ${service}.${method}`
          );
          return this.executeFallbackMethod(context, options.fallbackMethod);
        }

        if (options.notifyAdmins) {
          this.notifyAdministrators(error, { service, method, request });
        }

        return throwError(() => this.transformError(error, options));
      })
    );
  }

  private executeFallbackMethod(
    context: ExecutionContext,
    fallbackMethod: string
  ): Observable<boolean> {
    try {
      const instance = context.getClass();
      const fallbackHandler = instance.prototype[fallbackMethod];
      
      if (typeof fallbackHandler === 'function') {
        const result = fallbackHandler.call(instance, context);
        return result instanceof Promise ? result : of(result);
      }
    } catch (fallbackError) {
      this.logger.error(
        `Fallback method ${fallbackMethod} failed`,
        fallbackError.stack
      );
    }

    return of(false);
  }

  private notifyAdministrators(
    error: Error,
    context: { service: string; method: string; request: any }
  ): void {
    this.logger.error(
      `Critical error requiring admin notification: ${error.message}`,
      error.stack,
      {
        service: context.service,
        method: context.method,
        url: context.request.url,
        userId: context.request.user?.id,
        timestamp: new Date().toISOString(),
      }
    );
  }

  private transformError(error: Error, options: ErrorHandlingOptions): Error {
    if (options.logLevel === 'silent') {
      return new BusinessException(
        'An error occurred',
        'SILENT_ERROR',
        500
      );
    }

    return error;
  }
}
