import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError, timer } from 'rxjs';
import { retry, catchError, retryWhen, delay, take, concatMap } from 'rxjs/operators';

interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

@Injectable()
export class RetryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RetryInterceptor.name);
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    retryableErrors: ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'],
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    
    this.logger.debug(`Retry interceptor processing ${method} ${url}`);

    return next.handle().pipe(
      retryWhen(errors =>
        errors.pipe(
          concatMap((error, index) => {
            const attempt = index + 1;
            
            if (attempt >= this.retryConfig.maxAttempts) {
              this.logger.error(`Max retry attempts (${this.retryConfig.maxAttempts}) reached for ${method} ${url}`);
              return throwError(() => error);
            }

            if (this.shouldRetry(error)) {
              const delayTime = this.calculateDelay(attempt);
              this.logger.warn(`Retrying ${method} ${url} (attempt ${attempt}/${this.retryConfig.maxAttempts}) after ${delayTime}ms`);
              
              return timer(delayTime);
            }

            this.logger.error(`Non-retryable error for ${method} ${url}:`, error.message);
            return throwError(() => error);
          }),
          take(this.retryConfig.maxAttempts)
        )
      ),
      catchError(error => {
        this.logger.error(`Final error for ${method} ${url} after all retries:`, error.message);
        return throwError(() => this.transformError(error));
      })
    );
  }

  private shouldRetry(error: any): boolean {
    // Check HTTP status codes
    if (error.status && this.retryConfig.retryableStatusCodes.includes(error.status)) {
      return true;
    }

    // Check error codes
    if (error.code && this.retryConfig.retryableErrors.includes(error.code)) {
      return true;
    }

    // Check for network errors
    if (error.message && this.isNetworkError(error.message)) {
      return true;
    }

    // Check for timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return true;
    }

    return false;
  }

  private isNetworkError(message: string): boolean {
    const networkErrorPatterns = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'network error',
      'connection refused',
      'connection reset',
      'timeout',
    ];

    return networkErrorPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private calculateDelay(attempt: number): number {
    return this.retryConfig.delay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
  }

  private transformError(error: any): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    // Transform network errors
    if (this.isNetworkError(error.message)) {
      return new HttpException(
        {
          message: 'Service temporarily unavailable',
          error: 'SERVICE_UNAVAILABLE',
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        },
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    // Transform timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return new HttpException(
        {
          message: 'Request timeout',
          error: 'REQUEST_TIMEOUT',
          statusCode: HttpStatus.REQUEST_TIMEOUT,
        },
        HttpStatus.REQUEST_TIMEOUT
      );
    }

    // Default error transformation
    return new HttpException(
      {
        message: error.message || 'Internal server error',
        error: 'INTERNAL_SERVER_ERROR',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}