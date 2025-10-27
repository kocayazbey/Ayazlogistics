import { Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';

export interface QueryOptimizationOptions {
  enableIndexHints?: boolean;
  enableQueryCaching?: boolean;
  maxExecutionTime?: number;
  enableParallelExecution?: boolean;
  batchSize?: number;
}

export interface QueryMetrics {
  executionTime: number;
  rowsReturned: number;
  cacheHit: boolean;
  indexUsed: string[];
  queryPlan?: any;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private readonly queryCache = new Map<string, { result: any; timestamp: number; ttl: number }>();
  private readonly queryMetrics = new Map<string, QueryMetrics[]>();

  /**
   * Optimize query with performance enhancements
   */
  optimizeQuery<T>(
    queryBuilder: () => Promise<T>,
    options: QueryOptimizationOptions = {}
  ): Promise<T> {
    const startTime = Date.now();
    const queryId = this.generateQueryId();

    this.logger.debug(`Optimizing query ${queryId}`);

    return this.executeWithOptimizations(queryBuilder, queryId, startTime, options);
  }

  /**
   * Execute batch operations with optimization
   */
  async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    options: QueryOptimizationOptions = {}
  ): Promise<T[]> {
    const batchSize = options.batchSize || 10;
    const results: T[] = [];

    // Process in batches to avoid memory issues
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      if (options.enableParallelExecution) {
        // Execute batch in parallel
        const batchResults = await Promise.all(
          batch.map(operation => this.optimizeQuery(operation, options))
        );
        results.push(...batchResults);
      } else {
        // Execute batch sequentially
        for (const operation of batch) {
          const result = await this.optimizeQuery(operation, options);
          results.push(result);
        }
      }
    }

    return results;
  }

  /**
   * Add query hints for better performance
   */
  addQueryHints(query: any, hints: {
    useIndex?: string[];
    avoidIndex?: string[];
    joinOrder?: string[];
    parallelWorkers?: number;
  }): any {
    let optimizedQuery = query;

    if (hints.useIndex && hints.useIndex.length > 0) {
      // Add index hints
      optimizedQuery = sql`${optimizedQuery} /*+ USE_INDEX(${hints.useIndex.join(', ')}) */`;
    }

    if (hints.avoidIndex && hints.avoidIndex.length > 0) {
      // Add index avoidance hints
      optimizedQuery = sql`${optimizedQuery} /*+ NO_INDEX(${hints.avoidIndex.join(', ')}) */`;
    }

    if (hints.parallelWorkers && hints.parallelWorkers > 1) {
      // Add parallel execution hint
      optimizedQuery = sql`${optimizedQuery} /*+ PARALLEL(${hints.parallelWorkers}) */`;
    }

    return optimizedQuery;
  }

  /**
   * Get query performance metrics
   */
  getQueryMetrics(queryId?: string): QueryMetrics[] | Map<string, QueryMetrics[]> {
    if (queryId) {
      return this.queryMetrics.get(queryId) || [];
    }
    return this.queryMetrics;
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
    this.logger.log('Query cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
  } {
    const cacheEntries = Array.from(this.queryCache.values());
    const now = Date.now();
    
    // Remove expired entries
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.queryCache.delete(key);
      }
    }

    const totalQueries = Array.from(this.queryMetrics.values())
      .reduce((sum, metrics) => sum + metrics.length, 0);
    
    const cacheHits = cacheEntries.filter(entry => 
      now - entry.timestamp < entry.ttl
    ).length;

    return {
      size: this.queryCache.size,
      hitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Execute query with optimizations
   */
  private async executeWithOptimizations<T>(
    queryBuilder: () => Promise<T>,
    queryId: string,
    startTime: number,
    options: QueryOptimizationOptions
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(queryBuilder);
    
    // Check cache first
    if (options.enableQueryCaching) {
      const cached = this.queryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        this.logger.debug(`Cache hit for query ${queryId}`);
        this.recordMetrics(queryId, {
          executionTime: 0,
          rowsReturned: 0,
          cacheHit: true,
          indexUsed: []
        });
        return cached.result;
      }
    }

    // Execute query with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), options.maxExecutionTime || 30000);
    });

    try {
      const result = await Promise.race([
        queryBuilder(),
        timeoutPromise
      ]);

      const executionTime = Date.now() - startTime;

      // Record metrics
      this.recordMetrics(queryId, {
        executionTime,
        rowsReturned: Array.isArray(result) ? result.length : 1,
        cacheHit: false,
        indexUsed: []
      });

      // Cache result
      if (options.enableQueryCaching) {
        this.queryCache.set(cacheKey, {
          result,
          timestamp: Date.now(),
          ttl: 300000 // 5 minutes
        });
      }

      this.logger.debug(`Query ${queryId} executed in ${executionTime}ms`);
      return result;

    } catch (error) {
      this.logger.error(`Query ${queryId} failed:`, error);
      throw error;
    }
  }

  /**
   * Record query metrics
   */
  private recordMetrics(queryId: string, metrics: QueryMetrics): void {
    if (!this.queryMetrics.has(queryId)) {
      this.queryMetrics.set(queryId, []);
    }
    
    this.queryMetrics.get(queryId)!.push(metrics);
    
    // Keep only last 100 metrics per query
    const queryMetrics = this.queryMetrics.get(queryId)!;
    if (queryMetrics.length > 100) {
      queryMetrics.splice(0, queryMetrics.length - 100);
    }
  }

  /**
   * Generate unique query ID
   */
  private generateQueryId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate cache key for query
   */
  private generateCacheKey(queryBuilder: () => Promise<any>): string {
    return queryBuilder.toString().slice(0, 100);
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const [key, value] of this.queryCache.entries()) {
      totalSize += key.length * 2; // String size
      totalSize += JSON.stringify(value).length * 2; // Object size
    }
    
    return totalSize;
  }
}
