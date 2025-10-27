import { Injectable, Logger } from '@nestjs/common';

export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoffMultiplier: number;
  maxDelay: number;
  jitter: boolean;
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  private readonly defaultConfig: RetryConfig = {
    maxAttempts: 3,
    delay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000,
    jitter: true,
  };

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
    context?: string
  ): Promise<T> {
    const retryConfig = { ...this.defaultConfig, ...config };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Executing operation${context ? ` (${context})` : ''} - Attempt ${attempt}/${retryConfig.maxAttempts}`
        );
        
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.log(
            `Operation${context ? ` (${context})` : ''} succeeded on attempt ${attempt}`
          );
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.logger.warn(
          `Operation${context ? ` (${context})` : ''} failed on attempt ${attempt}/${retryConfig.maxAttempts}`,
          lastError.message
        );

        if (attempt === retryConfig.maxAttempts) {
          this.logger.error(
            `Operation${context ? ` (${context})` : ''} failed after ${retryConfig.maxAttempts} attempts`,
            lastError.stack
          );
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, retryConfig);
        this.logger.debug(
          `Waiting ${delay}ms before retry ${attempt + 1}/${retryConfig.maxAttempts}`
        );
        
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Retry failed');
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.delay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    if (config.jitter) {
      // Add jitter to prevent thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.min(delay, config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async executeWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 5,
    initialDelay: number = 1000,
    context?: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts,
      delay: initialDelay,
      backoffMultiplier: 2,
      maxDelay: 30000,
      jitter: true,
    }, context);
  }

  async executeWithLinearBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
    context?: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts,
      delay,
      backoffMultiplier: 1,
      maxDelay: delay * maxAttempts,
      jitter: false,
    }, context);
  }

  async executeWithFixedDelay<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
    context?: string
  ): Promise<T> {
    return this.executeWithRetry(operation, {
      maxAttempts,
      delay,
      backoffMultiplier: 1,
      maxDelay: delay,
      jitter: false,
    }, context);
  }
}
