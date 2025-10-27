import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, switchMap, retryWhen, delay, take } from 'rxjs/operators';
import { BusinessException, ServiceUnavailableException } from '../exceptions/business.exception';

@Injectable()
export class ErrorRecoveryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorRecoveryInterceptor.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      retryWhen(errors =>
        errors.pipe(
          switchMap((error, index) => {
            if (index >= this.maxRetries) {
              this.logger.error(
                `Max retries exceeded for ${context.getClass().name}.${context.getHandler().name}`,
                error.stack
              );
              return throwError(() => error);
            }

            this.logger.warn(
              `Retry attempt ${index + 1}/${this.maxRetries} for ${context.getClass().name}.${context.getHandler().name}`,
              error.message
            );

            return timer(this.retryDelay * Math.pow(2, index));
          }),
          take(this.maxRetries + 1)
        )
      ),
      catchError(error => {
        this.logger.error(
          `Final error after retries for ${context.getClass().name}.${context.getHandler().name}`,
          error.stack
        );

        // Transform specific errors
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          return throwError(() => new ServiceUnavailableException('Database'));
        }

        if (error.name === 'ValidationError') {
          return throwError(() => new BusinessException(
            'Validation failed',
            'VALIDATION_ERROR',
            400,
            error.details
          ));
        }

        return throwError(() => error);
      })
    );
  }
}
