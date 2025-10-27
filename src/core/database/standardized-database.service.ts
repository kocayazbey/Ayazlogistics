import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_ORM } from './database.constants';
import { DatabaseErrorHandlerService } from './database-error-handler.service';
import { sql, eq, and, or, desc, asc } from 'drizzle-orm';
import { Logger as DrizzleLogger } from 'drizzle-orm';

@Injectable()
export class StandardizedDatabaseService {
  private readonly logger = new Logger(StandardizedDatabaseService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: any,
    private readonly configService: ConfigService,
    private readonly errorHandler: DatabaseErrorHandlerService,
  ) {}

  /**
   * Get the Drizzle database instance
   */
  getDb() {
    return this.db;
  }

  /**
   * Execute raw SQL query with error handling
   */
  async execute<T = any>(query: any): Promise<T> {
    try {
      return await this.db.execute(query);
    } catch (error) {
      this.errorHandler.handleQueryError(error, query.toString());
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    try {
      return await this.db.transaction(callback);
    } catch (error) {
      this.errorHandler.handleTransactionError(error, 'default_transaction');
    }
  }

  /**
   * Execute multiple operations in a transaction
   */
  async batchTransaction<T>(operations: Array<(tx: any) => Promise<any>>): Promise<T[]> {
    return this.transaction(async (tx) => {
      const results = [];
      for (const operation of operations) {
        try {
          const result = await operation(tx);
        results.push(result);
        } catch (error) {
          this.errorHandler.handleTransactionError(error, 'batch_operation');
        }
      }
      return results;
    });
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: string; latency?: number; details?: any }> {
    try {
      const startTime = Date.now();
      await this.db.execute(sql`SELECT 1`);
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
        details: {
          connectionPool: this.configService.get('DATABASE_POOL_MAX', 10),
          timeout: this.configService.get('DATABASE_STATEMENT_TIMEOUT', 30000),
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    try {
      const [connections, tables, size] = await Promise.all([
        this.db.execute(sql`SELECT count(*) as connections FROM pg_stat_activity`),
        this.db.execute(sql`SELECT count(*) as tables FROM information_schema.tables WHERE table_schema = 'public'`),
        this.db.execute(sql`SELECT pg_size_pretty(pg_database_size(current_database())) as size`),
      ]);

      return {
        connections: connections.rows[0]?.connections || 0,
        tables: tables.rows[0]?.tables || 0,
        size: size.rows[0]?.size || '0 bytes',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get database stats:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Tenant-aware query execution
   */
  async executeWithTenant<T>(
    tenantId: string,
    query: (db: any) => Promise<T>,
    options?: { skipTenantCheck?: boolean }
  ): Promise<T> {
    if (!options?.skipTenantCheck && !tenantId) {
      throw new Error('Tenant ID is required for tenant-aware queries');
    }

    try {
      return await query(this.db);
    } catch (error) {
      this.errorHandler.handleTenantError(error, tenantId, 'tenant_query');
    }
  }

  /**
   * Safe query execution with retry logic
   */
  async executeWithRetry<T>(
    query: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await query();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          this.logger.error(`Query failed after ${maxRetries} attempts:`, error);
          throw error;
        }

        this.logger.warn(`Query attempt ${attempt} failed, retrying in ${delayMs}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }

    throw lastError;
  }
}