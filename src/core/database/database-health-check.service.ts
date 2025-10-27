import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from './database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    connection: boolean;
    queryPerformance: boolean;
    transactionSupport: boolean;
    indexUsage: boolean;
    connectionPool: boolean;
  };
  metrics: {
    responseTime: number;
    activeConnections: number;
    queryCount: number;
    errorRate: number;
  };
  recommendations: string[];
}

@Injectable()
export class DatabaseHealthCheckService {
  private readonly logger = new Logger(DatabaseHealthCheckService.name);
  private healthMetrics = {
    queryCount: 0,
    errorCount: 0,
    totalResponseTime: 0,
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {}

  /**
   * Perform comprehensive database health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const checks = {
      connection: false,
      queryPerformance: false,
      transactionSupport: false,
      indexUsage: false,
      connectionPool: false,
    };
    const recommendations: string[] = [];

    try {
      // 1. Connection Check
      checks.connection = await this.checkConnection();
      
      // 2. Query Performance Check
      checks.queryPerformance = await this.checkQueryPerformance();
      
      // 3. Transaction Support Check
      checks.transactionSupport = await this.checkTransactionSupport();
      
      // 4. Index Usage Check
      const indexResult = await this.checkIndexUsage();
      checks.indexUsage = indexResult.healthy;
      if (!indexResult.healthy) {
        recommendations.push(...indexResult.recommendations);
      }
      
      // 5. Connection Pool Check
      checks.connectionPool = await this.checkConnectionPool();

      const responseTime = Date.now() - startTime;
      const errorRate = this.healthMetrics.errorCount / Math.max(this.healthMetrics.queryCount, 1) * 100;

      // Determine overall status
      const healthyChecks = Object.values(checks).filter(Boolean).length;
      const totalChecks = Object.keys(checks).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyChecks === totalChecks) {
        status = 'healthy';
      } else if (healthyChecks >= totalChecks * 0.7) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      // Add performance recommendations
      if (responseTime > 1000) {
        recommendations.push('Database response time is high. Consider query optimization.');
      }
      
      if (errorRate > 5) {
        recommendations.push('Error rate is high. Check database logs for issues.');
      }

      return {
        status,
        timestamp: new Date(),
        checks,
        metrics: {
          responseTime,
          activeConnections: await this.getActiveConnections(),
          queryCount: this.healthMetrics.queryCount,
          errorRate,
        },
        recommendations,
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        checks,
        metrics: {
          responseTime: Date.now() - startTime,
          activeConnections: 0,
          queryCount: this.healthMetrics.queryCount,
          errorRate: 100,
        },
        recommendations: ['Database health check failed. Check database connectivity.'],
      };
    }
  }

  /**
   * Check database connection
   */
  private async checkConnection(): Promise<boolean> {
    try {
      const startTime = Date.now();
      await this.db.execute(sql`SELECT 1`);
      const responseTime = Date.now() - startTime;
      
      this.healthMetrics.queryCount++;
      this.healthMetrics.totalResponseTime += responseTime;
      
      return responseTime < 1000; // Connection should respond within 1 second
    } catch (error) {
      this.healthMetrics.errorCount++;
      this.logger.error('Connection check failed:', error);
      return false;
    }
  }

  /**
   * Check query performance
   */
  private async checkQueryPerformance(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Execute a simple query to test performance
      await this.db.execute(sql`
        SELECT 
          schemaname, 
          tablename, 
          attname, 
          n_distinct, 
          correlation 
        FROM pg_stats 
        LIMIT 10
      `);
      
      const responseTime = Date.now() - startTime;
      this.healthMetrics.queryCount++;
      this.healthMetrics.totalResponseTime += responseTime;
      
      return responseTime < 2000; // Query should complete within 2 seconds
    } catch (error) {
      this.healthMetrics.errorCount++;
      this.logger.error('Query performance check failed:', error);
      return false;
    }
  }

  /**
   * Check transaction support
   */
  private async checkTransactionSupport(): Promise<boolean> {
    try {
      return await this.db.transaction(async (tx) => {
        await tx.execute(sql`SELECT 1`);
        return true;
      });
    } catch (error) {
      this.logger.error('Transaction support check failed:', error);
      return false;
    }
  }

  /**
   * Check index usage and performance
   */
  private async checkIndexUsage(): Promise<{ healthy: boolean; recommendations: string[] }> {
    try {
      const recommendations: string[] = [];
      
      // Check for unused indexes
      const unusedIndexes = await this.db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 
        AND schemaname NOT IN ('information_schema', 'pg_catalog')
        LIMIT 10
      `);

      if (unusedIndexes.length > 0) {
        recommendations.push(`Found ${unusedIndexes.length} unused indexes. Consider removing them.`);
      }

      // Check for missing indexes on foreign keys
      const missingIndexes = await this.db.execute(sql`
        SELECT 
          t.table_name,
          k.column_name
        FROM information_schema.table_constraints t
        JOIN information_schema.key_column_usage k
        ON t.constraint_name = k.constraint_name
        WHERE t.constraint_type = 'FOREIGN KEY'
        AND NOT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE tablename = t.table_name 
          AND indexdef LIKE '%' || k.column_name || '%'
        )
        LIMIT 10
      `);

      if (missingIndexes.length > 0) {
        recommendations.push(`Found ${missingIndexes.length} foreign keys without indexes. Consider adding them.`);
      }

      return {
        healthy: recommendations.length === 0,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Index usage check failed:', error);
      return { healthy: false, recommendations: ['Unable to check index usage.'] };
    }
  }

  /**
   * Check connection pool status
   */
  private async checkConnectionPool(): Promise<boolean> {
    try {
      const poolStats = await this.db.execute(sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      const stats = poolStats[0];
      const activeConnections = parseInt(stats.active_connections);
      const totalConnections = parseInt(stats.total_connections);

      // Connection pool is healthy if we have reasonable connection usage
      return totalConnections > 0 && activeConnections / totalConnections < 0.9;
    } catch (error) {
      this.logger.error('Connection pool check failed:', error);
      return false;
    }
  }

  /**
   * Get active connections count
   */
  private async getActiveConnections(): Promise<number> {
    try {
      const result = await this.db.execute(sql`
        SELECT count(*) as active_connections
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND datname = current_database()
      `);
      
      return parseInt(result[0].active_connections);
    } catch (error) {
      this.logger.error('Failed to get active connections:', error);
      return 0;
    }
  }

  /**
   * Get database performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    averageResponseTime: number;
    queryCount: number;
    errorRate: number;
    cacheHitRatio: number;
  }> {
    try {
      const cacheStats = await this.db.execute(sql`
        SELECT 
          sum(blks_hit) as cache_hits,
          sum(blks_read) as disk_reads
        FROM pg_stat_database 
        WHERE datname = current_database()
      `);

      const cacheHits = parseInt(cacheStats[0].cache_hits);
      const diskReads = parseInt(cacheStats[0].disk_reads);
      const totalReads = cacheHits + diskReads;
      const cacheHitRatio = totalReads > 0 ? (cacheHits / totalReads) * 100 : 0;

      return {
        averageResponseTime: this.healthMetrics.queryCount > 0 
          ? this.healthMetrics.totalResponseTime / this.healthMetrics.queryCount 
          : 0,
        queryCount: this.healthMetrics.queryCount,
        errorRate: this.healthMetrics.queryCount > 0 
          ? (this.healthMetrics.errorCount / this.healthMetrics.queryCount) * 100 
          : 0,
        cacheHitRatio,
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      return {
        averageResponseTime: 0,
        queryCount: 0,
        errorRate: 0,
        cacheHitRatio: 0,
      };
    }
  }

  /**
   * Reset health metrics
   */
  resetMetrics(): void {
    this.healthMetrics = {
      queryCount: 0,
      errorCount: 0,
      totalResponseTime: 0,
    };
    this.logger.log('Health metrics reset');
  }
}
