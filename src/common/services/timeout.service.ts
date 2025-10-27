import { Injectable, Logger } from '@nestjs/common';

export interface TimeoutConfig {
  timeout: number;
  errorMessage?: string;
  cleanup?: () => Promise<void> | void;
}

@Injectable()
export class TimeoutService {
  private readonly logger = new Logger(TimeoutService.name);

  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    context?: string,
    cleanup?: () => Promise<void> | void
  ): Promise<T> {
    const timeoutId = setTimeout(() => {
      this.logger.warn(
        `Operation${context ? ` (${context})` : ''} timed out after ${timeoutMs}ms`
      );
    }, timeoutMs);

    try {
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(timeoutMs, context)
      ]);

      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (cleanup) {
        try {
          await cleanup();
        } catch (cleanupError) {
          this.logger.error(
            `Cleanup failed for timed out operation${context ? ` (${context})` : ''}`,
            cleanupError
          );
        }
      }
      
      throw error;
    }
  }

  private createTimeoutPromise<T>(timeoutMs: number, context?: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(
          `Operation${context ? ` (${context})` : ''} timed out after ${timeoutMs}ms`
        ));
      }, timeoutMs);
    });
  }

  async executeWithTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    maxRetries: number = 3,
    context?: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.debug(
          `Executing operation${context ? ` (${context})` : ''} with timeout - Attempt ${attempt}/${maxRetries}`
        );
        
        const result = await this.executeWithTimeout(operation, timeoutMs, context);
        
        if (attempt > 1) {
          this.logger.log(
            `Operation${context ? ` (${context})` : ''} succeeded on attempt ${attempt}`
          );
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        this.logger.warn(
          `Operation${context ? ` (${context})` : ''} failed on attempt ${attempt}/${maxRetries}`,
          lastError.message
        );

        if (attempt === maxRetries) {
          this.logger.error(
            `Operation${context ? ` (${context})` : ''} failed after ${maxRetries} attempts`,
            lastError.stack
          );
          throw lastError;
        }

        // Wait before retry
        await this.sleep(1000 * attempt);
      }
    }

    throw lastError || new Error('Timeout with retry failed');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  createTimeoutAbortController(timeoutMs: number): AbortController {
    const controller = new AbortController();
    
    setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    
    return controller;
  }

  async executeWithAbortSignal<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    context?: string
  ): Promise<T> {
    const controller = this.createTimeoutAbortController(timeoutMs);
    
    try {
      return await operation(controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(
          `Operation${context ? ` (${context})` : ''} was aborted after ${timeoutMs}ms`
        );
      }
      throw error;
    }
  }
}
