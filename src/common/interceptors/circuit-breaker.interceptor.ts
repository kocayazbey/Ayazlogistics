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
import { catchError, switchMap } from 'rxjs/operators';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CircuitBreakerInterceptor.name);
  private readonly config: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeout: 60000, // 1 minute
    resetTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
  };

  private circuitStates = new Map<string, {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
    lastSuccessTime: number;
  }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const circuitKey = `${method}:${url}`;

    const circuitState = this.getCircuitState(circuitKey);

    // Check if circuit is open
    if (circuitState.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(circuitState)) {
        this.logger.log(`Circuit breaker attempting reset for ${circuitKey}`);
        circuitState.state = CircuitState.HALF_OPEN;
        circuitState.successCount = 0;
      } else {
        this.logger.warn(`Circuit breaker is OPEN for ${circuitKey}, rejecting request`);
        return throwError(() => new HttpException(
          {
            message: 'Service temporarily unavailable',
            error: 'CIRCUIT_BREAKER_OPEN',
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          },
          HttpStatus.SERVICE_UNAVAILABLE
        ));
      }
    }

    return next.handle().pipe(
      catchError(error => {
        this.recordFailure(circuitKey, circuitState);
        return throwError(() => error);
      }),
      switchMap(response => {
        this.recordSuccess(circuitKey, circuitState);
        return new Observable(observer => {
          observer.next(response);
          observer.complete();
        });
      })
    );
  }

  private getCircuitState(circuitKey: string) {
    if (!this.circuitStates.has(circuitKey)) {
      this.circuitStates.set(circuitKey, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
        lastSuccessTime: 0,
      });
    }
    return this.circuitStates.get(circuitKey)!;
  }

  private recordFailure(circuitKey: string, circuitState: any) {
    circuitState.failureCount++;
    circuitState.lastFailureTime = Date.now();

    this.logger.warn(`Circuit breaker recorded failure for ${circuitKey} (${circuitState.failureCount}/${this.config.failureThreshold})`);

    if (circuitState.failureCount >= this.config.failureThreshold) {
      circuitState.state = CircuitState.OPEN;
      this.logger.error(`Circuit breaker opened for ${circuitKey} due to ${circuitState.failureCount} failures`);
    }
  }

  private recordSuccess(circuitKey: string, circuitState: any) {
    circuitState.successCount++;
    circuitState.lastSuccessTime = Date.now();

    if (circuitState.state === CircuitState.HALF_OPEN) {
      if (circuitState.successCount >= 3) { // Require 3 successes to close
        circuitState.state = CircuitState.CLOSED;
        circuitState.failureCount = 0;
        this.logger.log(`Circuit breaker closed for ${circuitKey} after successful recovery`);
      }
    } else if (circuitState.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      circuitState.failureCount = Math.max(0, circuitState.failureCount - 1);
    }
  }

  private shouldAttemptReset(circuitState: any): boolean {
    const timeSinceLastFailure = Date.now() - circuitState.lastFailureTime;
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  // Get circuit breaker status for monitoring
  getCircuitStatus(circuitKey?: string) {
    if (circuitKey) {
      const state = this.circuitStates.get(circuitKey);
      return state ? {
        circuitKey,
        state: state.state,
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailureTime: state.lastFailureTime,
        lastSuccessTime: state.lastSuccessTime,
      } : null;
    }

    return Array.from(this.circuitStates.entries()).map(([key, state]) => ({
      circuitKey: key,
      state: state.state,
      failureCount: state.failureCount,
      successCount: state.successCount,
      lastFailureTime: state.lastFailureTime,
      lastSuccessTime: state.lastSuccessTime,
    }));
  }

  // Reset circuit breaker manually
  resetCircuit(circuitKey: string) {
    const state = this.circuitStates.get(circuitKey);
    if (state) {
      state.state = CircuitState.CLOSED;
      state.failureCount = 0;
      state.successCount = 0;
      this.logger.log(`Circuit breaker manually reset for ${circuitKey}`);
    }
  }

  // Get all circuit breaker states
  getAllCircuitStates() {
    return this.getCircuitStatus();
  }
}