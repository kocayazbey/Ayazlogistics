import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TimeoutService } from '../services/timeout.service';
import { TIMEOUT_KEY } from '../decorators/timeout.decorator';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);

  constructor(
    private timeoutService: TimeoutService,
    private reflector: Reflector
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const timeoutConfig = this.reflector.getAllAndOverride(
      TIMEOUT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!timeoutConfig) {
      return next.handle();
    }

    const serviceName = context.getClass().name;
    const methodName = context.getHandler().name;
    const contextString = `${serviceName}.${methodName}`;

    return new Observable(subscriber => {
      this.timeoutService
        .executeWithTimeout(
          () => this.executeHandler(next),
          timeoutConfig.timeout,
          contextString
        )
        .then(result => {
          subscriber.next(result);
          subscriber.complete();
        })
        .catch(error => {
          this.logger.error(
            `Timeout error for ${contextString}`,
            error.stack
          );
          subscriber.error(error);
        });
    }).pipe(
      catchError(error => {
        this.logger.warn(
          `Timeout interceptor caught error for ${contextString}`,
          error.message
        );
        return throwError(() => error);
      })
    );
  }

  private async executeHandler(next: CallHandler): Promise<any> {
    return new Promise((resolve, reject) => {
      const subscription = next.handle().subscribe({
        next: (value) => {
          subscription.unsubscribe();
          resolve(value);
        },
        error: (error) => {
          subscription.unsubscribe();
          reject(error);
        },
        complete: () => {
          subscription.unsubscribe();
          resolve(undefined);
        },
      });
    });
  }
}