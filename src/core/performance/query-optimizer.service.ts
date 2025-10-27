import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface QueryAnalysis {
  query: string;
  executionTime: number;
  planningTime: number;
  totalCost: number;
  slowQuery: boolean;
  recommendations: string[];
  indexes: string[];
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private readonly SLOW_QUERY_THRESHOLD = 1000;

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async analyzeQuery(query: string): Promise<QueryAnalysis> {
    try {
      const explainResult = await this.db.execute(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
      const plan = explainResult.rows[0]['QUERY PLAN'][0];

      const executionTime = plan['Execution Time'];
      const planningTime = plan['Planning Time'];
      const totalCost = plan.Plan['Total Cost'];

      const slowQuery = executionTime > this.SLOW_QUERY_THRESHOLD;
      const recommendations: string[] = [];
      const suggestedIndexes: string[] = [];

      if (plan.Plan['Node Type'] === 'Seq Scan') {
        recommendations.push('Sequential scan detected - consider adding index');
        suggestedIndexes.push(this.suggestIndexForSeqScan(plan));
      }

      if (plan.Plan['Shared Hit Blocks'] / plan.Plan['Shared Read Blocks'] < 0.8) {
        recommendations.push('Low cache hit ratio - consider increasing shared_buffers');
      }

      if (totalCost > 10000) {
        recommendations.push('High query cost - consider query rewrite or partitioning');
      }

      this.logger.log(`Query analysis: ${executionTime.toFixed(2)}ms (${slowQuery ? 'SLOW' : 'OK'})`);

      return {
        query,
        executionTime,
        planningTime,
        totalCost,
        slowQuery,
        recommendations,
        indexes: suggestedIndexes,
      };
    } catch (error) {
      this.logger.error('Query analysis failed:', error);
      throw error;
    }
  }

  private suggestIndexForSeqScan(plan: any): string {
    const tableName = plan.Plan['Relation Name'];
    const filterColumn = this.extractFilterColumn(plan.Plan['Filter']);
    
    if (tableName && filterColumn) {
      return `CREATE INDEX idx_${tableName}_${filterColumn} ON ${tableName}(${filterColumn});`;
    }
    
    return '';
  }

  private extractFilterColumn(filter: string): string {
    if (!filter) return '';
    const match = filter.match(/\((\w+)\s*=/);
    return match ? match[1] : '';
  }

  async createRecommendedIndexes(tableName: string): Promise<string[]> {
    const createdIndexes: string[] = [];
    
    // Analyze table usage patterns
    const stats = await this.db.execute(
      `SELECT * FROM pg_stat_user_tables WHERE relname = $1`,
      [tableName]
    );

    if (stats.rows.length > 0) {
      const tableStats = stats.rows[0];
      const seqScans = tableStats['seq_scan'];
      const indexScans = tableStats['idx_scan'];

      if (seqScans > indexScans * 10) {
        this.logger.warn(`Table ${tableName} heavily relies on seq scans`);
      }
    }

    return createdIndexes;
  }

  async optimizeTable(tableName: string): Promise<void> {
    await this.db.execute(`VACUUM ANALYZE ${tableName}`);
    this.logger.log(`Table ${tableName} optimized`);
  }
}

