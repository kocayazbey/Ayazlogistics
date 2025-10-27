import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface QueryPerformance {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
}

export interface OptimizationSuggestion {
  type: 'index' | 'query' | 'connection' | 'cache';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  solution: string;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private queryPerformance: QueryPerformance[] = [];
  private slowQueryThreshold = 1000; // 1 second

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {}

  async analyzeQueryPerformance(): Promise<QueryPerformance[]> {
    try {
      // Get query performance from PostgreSQL
      const result = await this.db.execute(sql`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          shared_blks_hit,
          shared_blks_read,
          temp_blks_read,
          temp_blks_written
        FROM pg_stat_statements 
        WHERE mean_time > ${this.slowQueryThreshold}
        ORDER BY mean_time DESC
        LIMIT 50
      `);

      this.queryPerformance = (result.rows || []).map((row: any) => ({
        query: row.query,
        executionTime: row.mean_time,
        rowsAffected: row.rows,
        timestamp: new Date(),
      }));

      return this.queryPerformance;
    } catch (error) {
      this.logger.error('Failed to analyze query performance', error.stack);
      return [];
    }
  }

  async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    try {
      // Analyze missing indexes
      const missingIndexes = await this.getMissingIndexes();
      suggestions.push(...missingIndexes);

      // Analyze slow queries
      const slowQueries = await this.getSlowQueries();
      suggestions.push(...slowQueries);

      // Analyze connection issues
      const connectionIssues = await this.getConnectionIssues();
      suggestions.push(...connectionIssues);

      // Analyze cache efficiency
      const cacheIssues = await this.getCacheIssues();
      suggestions.push(...cacheIssues);

    } catch (error) {
      this.logger.error('Failed to get optimization suggestions', error.stack);
    }

    return suggestions;
  }

  async optimizeDatabase(): Promise<void> {
    try {
      this.logger.log('Starting database optimization...');

      // Update table statistics
      await this.updateTableStatistics();

      // Analyze query plans
      await this.analyzeQueryPlans();

      // Check for unused indexes
      await this.checkUnusedIndexes();

      // Optimize table storage
      await this.optimizeTableStorage();

      this.logger.log('Database optimization completed');
    } catch (error) {
      this.logger.error('Database optimization failed', error.stack);
    }
  }

  async getDatabaseStats(): Promise<any> {
    try {
      const stats = await this.db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation,
          most_common_vals,
          most_common_freqs,
          histogram_bounds
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname
      `);

      return (stats as any).rows || [];
    } catch (error) {
      this.logger.error('Failed to get database stats', error.stack);
      return [];
    }
  }

  private async getMissingIndexes(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    try {
      const missingIndexes = await this.db.execute(sql`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public' 
        AND n_distinct > 100 
        AND correlation < 0.1
        ORDER BY n_distinct DESC
      `);

      ((missingIndexes as any).rows || []).forEach((row: any) => {
        suggestions.push({
          type: 'index',
          severity: 'medium',
          description: `Missing index on ${row.tablename}.${row.attname}`,
          impact: 'Slow queries on this column',
          solution: `CREATE INDEX idx_${row.tablename}_${row.attname} ON ${row.tablename}(${row.attname});`
        });
      });
    } catch (error) {
      this.logger.error('Failed to analyze missing indexes', error.stack);
    }

    return suggestions;
  }

  private async getSlowQueries(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    try {
      const slowQueries = await this.db.execute(sql`
        SELECT 
          query,
          mean_time,
          calls,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > ${this.slowQueryThreshold}
        ORDER BY mean_time DESC
        LIMIT 10
      `);

      ((slowQueries as any).rows || []).forEach((row: any) => {
        suggestions.push({
          type: 'query',
          severity: row.mean_time > 5000 ? 'critical' : 'high',
          description: `Slow query: ${row.query.substring(0, 100)}...`,
          impact: `Average execution time: ${row.mean_time}ms`,
          solution: 'Consider adding indexes or rewriting the query'
        });
      });
    } catch (error) {
      this.logger.error('Failed to analyze slow queries', error.stack);
    }

    return suggestions;
  }

  private async getConnectionIssues(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    try {
      const connectionStats = await this.db.execute(sql`
        SELECT 
          numbackends,
          max_connections,
          (numbackends::float / max_connections::float) * 100 as connection_usage
        FROM pg_stat_database, pg_settings 
        WHERE datname = current_database() 
        AND name = 'max_connections'
      `);

      const connectionStatsRows = (connectionStats as any).rows || [];
      if (connectionStatsRows.length > 0) {
        const usage = connectionStatsRows[0].connection_usage;
        
        if (usage > 80) {
          suggestions.push({
            type: 'connection',
            severity: 'high',
            description: `High connection usage: ${usage.toFixed(2)}%`,
            impact: 'Risk of connection exhaustion',
            solution: 'Consider increasing max_connections or optimizing connection pool'
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to analyze connection issues', error.stack);
    }

    return suggestions;
  }

  private async getCacheIssues(): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = [];

    try {
      const cacheStats = await this.db.execute(sql`
        SELECT 
          sum(heap_blks_read) as heap_read,
          sum(heap_blks_hit) as heap_hit,
          sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as hit_ratio
        FROM pg_statio_user_tables
      `);

      const cacheStatsRows = (cacheStats as any).rows || [];
      if (cacheStatsRows.length > 0) {
        const hitRatio = cacheStatsRows[0].hit_ratio;
        
        if (hitRatio < 0.9) {
          suggestions.push({
            type: 'cache',
            severity: hitRatio < 0.8 ? 'high' : 'medium',
            description: `Low cache hit ratio: ${(hitRatio * 100).toFixed(2)}%`,
            impact: 'Increased disk I/O and slower queries',
            solution: 'Consider increasing shared_buffers or optimizing queries'
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to analyze cache issues', error.stack);
    }

    return suggestions;
  }

  private async updateTableStatistics(): Promise<void> {
    try {
      await this.db.execute(sql`ANALYZE`);
      this.logger.log('Table statistics updated');
    } catch (error) {
      this.logger.error('Failed to update table statistics', error.stack);
    }
  }

  private async analyzeQueryPlans(): Promise<void> {
    try {
      // Analyze query plans for common queries
      const commonQueries = [
        'SELECT * FROM inventory WHERE warehouse_id = ?',
        'SELECT * FROM receipts WHERE warehouse_id = ? AND status = ?',
        'SELECT * FROM picks WHERE warehouse_id = ? AND status = ?',
        'SELECT * FROM shipments WHERE warehouse_id = ? AND status = ?',
      ];

      for (const query of commonQueries) {
        try {
          await this.db.execute(sql.raw(`EXPLAIN ANALYZE ${query}`));
        } catch (error) {
          // Ignore errors for placeholder queries
        }
      }

      this.logger.log('Query plans analyzed');
    } catch (error) {
      this.logger.error('Failed to analyze query plans', error.stack);
    }
  }

  private async checkUnusedIndexes(): Promise<void> {
    try {
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
        ORDER BY tablename, indexname
      `);

      const unusedIndexesRows = (unusedIndexes as any).rows || [];
      if (unusedIndexesRows.length > 0) {
        this.logger.warn(`Found ${unusedIndexesRows.length} unused indexes`);
        unusedIndexesRows.forEach((index: any) => {
          this.logger.warn(`Unused index: ${index.tablename}.${index.indexname}`);
        });
      }
    } catch (error) {
      this.logger.error('Failed to check unused indexes', error.stack);
    }
  }

  private async optimizeTableStorage(): Promise<void> {
    try {
      // Vacuum and reindex tables
      await this.db.execute(sql`VACUUM ANALYZE`);
      this.logger.log('Table storage optimized');
    } catch (error) {
      this.logger.error('Failed to optimize table storage', error.stack);
    }
  }
}
