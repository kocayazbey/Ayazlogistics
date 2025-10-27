import { Injectable, Logger, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export interface N1QueryIssue {
  id: string;
  query: string;
  count: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  solution: string;
  impact: string;
}

export interface QueryOptimization {
  originalQuery: string;
  optimizedQuery: string;
  improvement: number;
  description: string;
}

@Injectable()
export class N1QueryOptimizerService {
  private readonly logger = new Logger(N1QueryOptimizerService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {}

  async detectN1Queries(): Promise<N1QueryIssue[]> {
    const issues: N1QueryIssue[] = [];

    try {
      // Analyze query patterns that might indicate N+1 problems
      const queryPatterns = await this.analyzeQueryPatterns();
      
      queryPatterns.forEach(pattern => {
        if (pattern.count > 10) { // Threshold for N+1 detection
          issues.push({
            id: this.generateIssueId(),
            query: pattern.query,
            count: pattern.count,
            severity: this.determineSeverity(pattern.count),
            description: `Potential N+1 query detected: ${pattern.query}`,
            solution: this.getSolution(pattern.query),
            impact: `Executes ${pattern.count} times, causing performance issues`,
          });
        }
      });

    } catch (error) {
      this.logger.error('Failed to detect N+1 queries', error.stack);
    }

    return issues;
  }

  async optimizeQueries(): Promise<QueryOptimization[]> {
    const optimizations: QueryOptimization[] = [];

    try {
      // Get common query patterns
      const commonQueries = await this.getCommonQueries();
      
      for (const query of commonQueries) {
        const optimization = await this.optimizeQuery(query);
        if (optimization) {
          optimizations.push(optimization);
        }
      }

    } catch (error) {
      this.logger.error('Failed to optimize queries', error.stack);
    }

    return optimizations;
  }

  async getQueryPerformance(): Promise<any> {
    try {
      const performance = await this.dataSource.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          shared_blks_hit,
          shared_blks_read
        FROM pg_stat_statements 
        ORDER BY mean_time DESC
        LIMIT 20
      `);

      return performance;
    } catch (error) {
      this.logger.error('Failed to get query performance', error.stack);
      return [];
    }
  }

  async getSlowQueries(): Promise<any> {
    try {
      const slowQueries = await this.dataSource.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE mean_time > 1000
        ORDER BY mean_time DESC
        LIMIT 10
      `);

      return slowQueries;
    } catch (error) {
      this.logger.error('Failed to get slow queries', error.stack);
      return [];
    }
  }

  async getQueryStats(): Promise<any> {
    try {
      const stats = await this.dataSource.query(`
        SELECT 
          COUNT(*) as total_queries,
          AVG(mean_time) as avg_time,
          MAX(mean_time) as max_time,
          MIN(mean_time) as min_time,
          SUM(calls) as total_calls
        FROM pg_stat_statements
      `);

      return stats[0];
    } catch (error) {
      this.logger.error('Failed to get query stats', error.stack);
      return null;
    }
  }

  private async analyzeQueryPatterns(): Promise<{ query: string; count: number }[]> {
    try {
      const patterns = await this.dataSource.query(`
        SELECT 
          query,
          COUNT(*) as count
        FROM pg_stat_statements 
        WHERE query LIKE '%SELECT%'
        GROUP BY query
        ORDER BY count DESC
        LIMIT 50
      `);

      return patterns;
    } catch (error) {
      this.logger.error('Failed to analyze query patterns', error.stack);
      return [];
    }
  }

  private async getCommonQueries(): Promise<string[]> {
    try {
      const queries = await this.dataSource.query(`
        SELECT query
        FROM pg_stat_statements 
        WHERE calls > 100
        ORDER BY calls DESC
        LIMIT 20
      `);

      return queries.map(q => q.query);
    } catch (error) {
      this.logger.error('Failed to get common queries', error.stack);
      return [];
    }
  }

  private async optimizeQuery(query: string): Promise<QueryOptimization | null> {
    try {
      // Analyze query execution plan
      const plan = await this.dataSource.query(`EXPLAIN ANALYZE ${query}`);
      
      // Check for potential optimizations
      if (this.hasN1Pattern(query)) {
        const optimizedQuery = this.optimizeN1Query(query);
        const improvement = this.calculateImprovement(query, optimizedQuery);
        
        return {
          originalQuery: query,
          optimizedQuery,
          improvement,
          description: 'Optimized N+1 query pattern',
        };
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to optimize query', error.stack);
      return null;
    }
  }

  private hasN1Pattern(query: string): boolean {
    // Simple pattern detection for N+1 queries
    const n1Patterns = [
      /SELECT.*FROM.*WHERE.*IN\s*\(\s*SELECT/,
      /SELECT.*FROM.*WHERE.*EXISTS\s*\(\s*SELECT/,
      /SELECT.*FROM.*WHERE.*=.*SELECT/,
    ];

    return n1Patterns.some(pattern => pattern.test(query));
  }

  private optimizeN1Query(query: string): string {
    // Basic N+1 query optimization
    // In a real implementation, you would have more sophisticated optimization logic
    
    // Example: Convert IN (SELECT ...) to JOIN
    if (query.includes('IN (SELECT')) {
      return query.replace(
        /WHERE\s+(\w+)\s+IN\s*\(\s*SELECT\s+(\w+)\s+FROM\s+(\w+)\s+WHERE\s+(.+?)\s*\)/,
        'JOIN $3 ON $1.$2 = $3.$2 WHERE $4'
      );
    }

    // Example: Convert EXISTS to JOIN
    if (query.includes('EXISTS')) {
      return query.replace(
        /WHERE\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+(\w+)\s+WHERE\s+(.+?)\s*\)/,
        'JOIN $1 ON $2'
      );
    }

    return query;
  }

  private calculateImprovement(originalQuery: string, optimizedQuery: string): number {
    // Simple improvement calculation based on query complexity
    const originalComplexity = this.calculateQueryComplexity(originalQuery);
    const optimizedComplexity = this.calculateQueryComplexity(optimizedQuery);
    
    return ((originalComplexity - optimizedComplexity) / originalComplexity) * 100;
  }

  private calculateQueryComplexity(query: string): number {
    // Simple complexity calculation based on query structure
    const joins = (query.match(/JOIN/gi) || []).length;
    const subqueries = (query.match(/SELECT/gi) || []).length - 1;
    const conditions = (query.match(/WHERE/gi) || []).length;
    
    return joins + subqueries + conditions;
  }

  private determineSeverity(count: number): 'low' | 'medium' | 'high' | 'critical' {
    if (count > 100) return 'critical';
    if (count > 50) return 'high';
    if (count > 20) return 'medium';
    return 'low';
  }

  private getSolution(query: string): string {
    if (query.includes('IN (SELECT')) {
      return 'Convert IN (SELECT ...) to JOIN for better performance';
    }
    
    if (query.includes('EXISTS')) {
      return 'Convert EXISTS to JOIN for better performance';
    }
    
    if (query.includes('WHERE')) {
      return 'Add appropriate indexes and optimize WHERE conditions';
    }
    
    return 'Consider using JOINs instead of subqueries';
  }

  private generateIssueId(): string {
    return `n1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
