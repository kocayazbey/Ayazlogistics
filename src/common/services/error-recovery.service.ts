import { Injectable, Logger } from '@nestjs/common';
import { ErrorMonitoringService } from './error-monitoring.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RetryService } from './retry.service';
import { TimeoutService } from './timeout.service';

export interface RecoveryStrategy {
  retry?: {
    maxAttempts: number;
    delay: number;
    backoffMultiplier: number;
  };
  circuitBreaker?: {
    failureThreshold: number;
    timeout: number;
    resetTimeout: number;
  };
  timeout?: {
    timeout: number;
  };
  fallback?: {
    method: string;
    data?: any;
  };
}

@Injectable()
export class ErrorRecoveryService {
  private readonly logger = new Logger(ErrorRecoveryService.name);
  private recoveryStrategies = new Map<string, RecoveryStrategy>();

  constructor(
    private errorMonitoringService: ErrorMonitoringService,
    private circuitBreakerService: CircuitBreakerService,
    private retryService: RetryService,
    private timeoutService: TimeoutService
  ) {}

  registerRecoveryStrategy(operationName: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(operationName, strategy);
    this.logger.log(`Registered recovery strategy for ${operationName}`);
  }

  async executeWithRecovery<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: { service: string; method: string; userId?: string; requestId?: string }
  ): Promise<T> {
    const strategy = this.recoveryStrategies.get(operationName);
    if (!strategy) {
      return this.executeWithBasicRecovery(operation, context);
    }

    try {
      // Apply timeout if configured
      if (strategy.timeout) {
        return await this.timeoutService.executeWithTimeout(
          () => this.executeWithStrategy(operationName, operation, strategy),
          strategy.timeout.timeout,
          operationName
        );
      }

      return await this.executeWithStrategy(operationName, operation, strategy);
    } catch (error) {
      this.errorMonitoringService.recordError(
        error instanceof Error ? error : new Error(String(error)),
        context || { service: 'Unknown', method: operationName }
      );

      // Execute fallback if configured
      if (strategy.fallback) {
        this.logger.warn(
          `Executing fallback for ${operationName}: ${strategy.fallback.method}`
        );
        return this.executeFallback(strategy.fallback);
      }

      throw error;
    }
  }

  private async executeWithStrategy<T>(
    operationName: string,
    operation: () => Promise<T>,
    strategy: RecoveryStrategy
  ): Promise<T> {
    // Apply circuit breaker if configured
    if (strategy.circuitBreaker) {
      return await this.circuitBreakerService.execute(
        operationName,
        () => this.executeWithRetry(operation, strategy),
        strategy.circuitBreaker
      );
    }

    return await this.executeWithRetry(operation, strategy);
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    strategy: RecoveryStrategy
  ): Promise<T> {
    if (strategy.retry) {
      return await this.retryService.executeWithRetry(
        operation,
        strategy.retry,
        'recovery'
      );
    }

    return await operation();
  }

  private async executeWithBasicRecovery<T>(
    operation: () => Promise<T>,
    context?: { service: string; method: string; userId?: string; requestId?: string }
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.errorMonitoringService.recordError(
        error instanceof Error ? error : new Error(String(error)),
        context || { service: 'Unknown', method: 'unknown' }
      );
      throw error;
    }
  }

  private async executeFallback<T>(fallback: { method: string; data?: any }): Promise<T> {
    // In a real implementation, you would call the actual fallback method
    this.logger.warn(`Fallback method ${fallback.method} not implemented`);
    throw new Error(`Fallback method ${fallback.method} not available`);
  }

  getRecoveryStrategies(): Record<string, RecoveryStrategy> {
    const result: Record<string, RecoveryStrategy> = {};
    for (const [name, strategy] of this.recoveryStrategies) {
      result[name] = strategy;
    }
    return result;
  }

  removeRecoveryStrategy(operationName: string): void {
    this.recoveryStrategies.delete(operationName);
    this.logger.log(`Removed recovery strategy for ${operationName}`);
  }

  clearAllStrategies(): void {
    this.recoveryStrategies.clear();
    this.logger.log('Cleared all recovery strategies');
  }
}
