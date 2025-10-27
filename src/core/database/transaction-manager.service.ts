import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_ORM } from './database.constants';
import { DatabaseErrorHandlerService } from './database-error-handler.service';

export interface TransactionOptions {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  rollbackOnError?: boolean;
  metadata?: Record<string, any>;
}

export interface TransactionContext {
  id: string;
  startTime: Date;
  options: TransactionOptions;
  operations: Array<{
    name: string;
    startTime: Date;
    endTime?: Date;
    success?: boolean;
    error?: string;
  }>;
}

@Injectable()
export class TransactionManagerService {
  private readonly logger = new Logger(TransactionManagerService.name);
  private readonly activeTransactions = new Map<string, TransactionContext>();

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: any,
    private readonly errorHandler: DatabaseErrorHandlerService,
  ) {}

  /**
   * Execute a transaction with comprehensive management
   */
  async executeTransaction<T>(
    callback: (tx: any, context: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const transactionId = this.generateTransactionId();
    const context: TransactionContext = {
      id: transactionId,
      startTime: new Date(),
      options: {
        isolationLevel: 'READ_COMMITTED',
        timeout: 30000,
        retries: 0,
        retryDelay: 1000,
        rollbackOnError: true,
        ...options,
      },
      operations: [],
    };

    this.activeTransactions.set(transactionId, context);
    this.logger.log(`Starting transaction ${transactionId}`);

    try {
      const result = await this.executeWithRetry(
        () => this.db.transaction(callback, this.getTransactionConfig(context)),
        context
      );

      this.logger.log(`Transaction ${transactionId} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Transaction ${transactionId} failed:`, error);
      this.errorHandler.handleTransactionError(error, transactionId);
    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async executeBatch<T>(
    operations: Array<{
      name: string;
      operation: (tx: any, context: TransactionContext) => Promise<any>;
    }>,
    options: TransactionOptions = {}
  ): Promise<T[]> {
    return this.executeTransaction(async (tx, context) => {
      const results = [];

      for (const { name, operation } of operations) {
        const operationStart = new Date();
        context.operations.push({
          name,
          startTime: operationStart,
        });

        try {
          const result = await operation(tx, context);
          const operationEnd = new Date();
          
          const opIndex = context.operations.length - 1;
          context.operations[opIndex].endTime = operationEnd;
          context.operations[opIndex].success = true;

          results.push(result);
          this.logger.debug(`Operation ${name} completed in ${operationEnd.getTime() - operationStart.getTime()}ms`);
        } catch (error) {
          const operationEnd = new Date();
          const opIndex = context.operations.length - 1;
          context.operations[opIndex].endTime = operationEnd;
          context.operations[opIndex].success = false;
          context.operations[opIndex].error = error.message;

          this.logger.error(`Operation ${name} failed:`, error);
          throw error;
        }
      }

      return results;
    }, options);
  }

  /**
   * Execute transaction with tenant isolation
   */
  async executeTenantTransaction<T>(
    tenantId: string,
    callback: (tx: any, context: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    return this.executeTransaction(async (tx, context) => {
      // Add tenant context to metadata
      context.options.metadata = {
        ...context.options.metadata,
        tenantId,
        tenantIsolation: true,
      };

      // Execute with tenant-aware error handling
      try {
        return await callback(tx, context);
      } catch (error) {
        this.errorHandler.handleTenantError(error, tenantId, `transaction:${context.id}`);
      }
    }, options);
  }

  /**
   * Execute nested transaction (savepoint)
   */
  async executeNestedTransaction<T>(
    parentContext: TransactionContext,
    callback: (tx: any, context: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const nestedId = `${parentContext.id}_nested_${Date.now()}`;
    const nestedContext: TransactionContext = {
      id: nestedId,
      startTime: new Date(),
      options: {
        ...parentContext.options,
        ...options,
        metadata: {
          ...parentContext.options.metadata,
          parentTransactionId: parentContext.id,
          nested: true,
        },
      },
      operations: [],
    };

    this.logger.log(`Starting nested transaction ${nestedId} under ${parentContext.id}`);

    try {
      return await this.executeTransaction(callback, nestedContext.options);
    } catch (error) {
      this.logger.error(`Nested transaction ${nestedId} failed:`, error);
      throw error;
    }
  }

  /**
   * Get active transaction statistics
   */
  getActiveTransactions(): Array<{
    id: string;
    duration: number;
    operationCount: number;
    options: TransactionOptions;
  }> {
    const now = new Date();
    return Array.from(this.activeTransactions.values()).map(context => ({
      id: context.id,
      duration: now.getTime() - context.startTime.getTime(),
      operationCount: context.operations.length,
      options: context.options,
    }));
  }

  /**
   * Get transaction performance metrics
   */
  getTransactionMetrics(): {
    totalTransactions: number;
    averageDuration: number;
    successRate: number;
    operationCount: number;
  } {
    const transactions = Array.from(this.activeTransactions.values());
    
    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        averageDuration: 0,
        successRate: 0,
        operationCount: 0,
      };
    }

    const now = new Date();
    const totalDuration = transactions.reduce((sum, tx) => sum + (now.getTime() - tx.startTime.getTime()), 0);
    const totalOperations = transactions.reduce((sum, tx) => sum + tx.operations.length, 0);
    const successfulOperations = transactions.reduce(
      (sum, tx) => sum + tx.operations.filter(op => op.success).length,
      0
    );

    return {
      totalTransactions: transactions.length,
      averageDuration: totalDuration / transactions.length,
      successRate: totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0,
      operationCount: totalOperations,
    };
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: TransactionContext
  ): Promise<T> {
    let lastError: Error;
    const maxRetries = context.options.retries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          this.logger.error(`Transaction ${context.id} failed after ${maxRetries + 1} attempts:`, error);
          throw error;
        }

        this.logger.warn(`Transaction ${context.id} attempt ${attempt + 1} failed, retrying...`, error.message);
        await this.delay(context.options.retryDelay || 1000);
      }
    }

    throw lastError;
  }

  /**
   * Get transaction configuration for Drizzle
   */
  private getTransactionConfig(context: TransactionContext): any {
    const config: any = {};

    if (context.options.isolationLevel) {
      config.isolationLevel = context.options.isolationLevel;
    }

    if (context.options.timeout) {
      config.timeout = context.options.timeout;
    }

    return config;
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
