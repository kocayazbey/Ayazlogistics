import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from './database.provider';
import { sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';

export interface DatabaseHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  maxConnections: number;
  connectionUsage: number; // percentage
  lastError?: string;
  timestamp: Date;
}

export interface DatabaseMetrics {
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  connections: {
    created: number;
    destroyed: number;
    active: number;
    idle: number;
  };
  performance: {
    slowQueries: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);
  private metrics: DatabaseMetrics = {
    queries: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
    connections: { created: 0, destroyed: 0, active: 0, idle: 0 },
    performance: { slowQueries: 0, cacheHits: 0, cacheMisses: 0 },
  };
  private queryTimes: number[] = [];
  private readonly maxQueryHistory = 1000;

  constructor(
    @Inject(DRIZZLE_ORM) private db: any,
    private configService: ConfigService,
  ) {
    this.startMetricsCollection();
  }

  async healthCheck(): Promise<DatabaseHealthCheck> {
    const startTime = Date.now();

    try {
      // Test basic connectivity
      await this.db.execute(sql`SELECT 1`);

      // Get connection pool stats (this is postgres.js specific)
      const poolStats = this.getConnectionPoolStats();

      const responseTime = Date.now() - startTime;
      const connectionUsage = (poolStats.active / poolStats.max) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (connectionUsage > 90 || responseTime > 1000) {
        status = 'degraded';
      }

      if (connectionUsage > 95 || responseTime > 5000) {
        status = 'unhealthy';
      }

      const healthCheck: DatabaseHealthCheck = {
        status,
        responseTime,
        activeConnections: poolStats.active,
        idleConnections: poolStats.idle,
        waitingConnections: poolStats.waiting,
        maxConnections: poolStats.max,
        connectionUsage,
        timestamp: new Date(),
      };

      // Update metrics
      this.metrics.queries.total++;
      this.metrics.queries.successful++;

      if (responseTime > 1000) {
        this.metrics.performance.slowQueries++;
      }

      this.queryTimes.push(responseTime);
      if (this.queryTimes.length > this.maxQueryHistory) {
        this.queryTimes.shift();
      }

      this.metrics.queries.averageResponseTime =
        this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;

      this.logger.log(`Database health check: ${status} (${responseTime}ms)`);
      return healthCheck;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.metrics.queries.total++;
      this.metrics.queries.failed++;

      this.logger.error(`Database health check failed:`, error);

      return {
        status: 'unhealthy',
        responseTime,
        activeConnections: 0,
        idleConnections: 0,
        waitingConnections: 0,
        maxConnections: 0,
        connectionUsage: 0,
        lastError: error.message,
        timestamp: new Date(),
      };
    }
  }

  async getDetailedMetrics(): Promise<DatabaseMetrics> {
    const poolStats = this.getConnectionPoolStats();

    return {
      ...this.metrics,
      connections: {
        ...this.metrics.connections,
        active: poolStats.active,
        idle: poolStats.idle,
      },
    };
  }

  async resetMetrics(): Promise<void> {
    this.metrics = {
      queries: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
      connections: { created: 0, destroyed: 0, active: 0, idle: 0 },
      performance: { slowQueries: 0, cacheHits: 0, cacheMisses: 0 },
    };
    this.queryTimes = [];
    this.logger.log('Database metrics reset');
  }

  async optimizeConnections(): Promise<{
    recommendations: string[];
    actions: string[];
  }> {
    const health = await this.healthCheck();
    const recommendations: string[] = [];
    const actions: string[] = [];

    // Analyze connection usage
    if (health.connectionUsage > 90) {
      recommendations.push('High connection usage detected');
      actions.push('Consider increasing max_connections in PostgreSQL');
      actions.push('Review long-running queries');
    }

    if (health.connectionUsage < 20 && health.maxConnections > 10) {
      recommendations.push('Low connection usage with high max connections');
      actions.push('Consider reducing max_connections for better resource usage');
    }

    // Analyze response times
    if (health.responseTime > 1000) {
      recommendations.push('Slow database response times');
      actions.push('Check for missing indexes');
      actions.push('Review query complexity');
      actions.push('Consider query optimization');
    }

    // Check for too many waiting connections
    if (health.waitingConnections > 5) {
      recommendations.push('Many waiting connections');
      actions.push('Check for connection pool exhaustion');
      actions.push('Consider increasing connection pool size');
    }

    return { recommendations, actions };
  }

  private getConnectionPoolStats(): {
    active: number;
    idle: number;
    waiting: number;
    max: number;
  } {
    // Access postgres.js internal pool stats
    // Note: This is implementation specific and may need adjustment based on postgres.js version
    try {
      // This is a simplified version - in production you might need to access the actual pool
      return {
        active: 0, // Would be actual pool stats
        idle: 0,
        waiting: 0,
        max: this.configService.get<number>('DATABASE_MAX_CONNECTIONS', 20),
      };
    } catch (error) {
      this.logger.warn('Could not get connection pool stats:', error);
      return {
        active: 0,
        idle: 0,
        waiting: 0,
        max: this.configService.get<number>('DATABASE_MAX_CONNECTIONS', 20),
      };
    }
  }

  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(async () => {
      const health = await this.healthCheck();

      // Alert if unhealthy
      if (health.status === 'unhealthy') {
        this.logger.error('Database is unhealthy!', {
          responseTime: health.responseTime,
          connectionUsage: health.connectionUsage,
          error: health.lastError,
        });
      } else if (health.status === 'degraded') {
        this.logger.warn('Database performance degraded', {
          responseTime: health.responseTime,
          connectionUsage: health.connectionUsage,
        });
      }

      // Log metrics periodically
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug('Database metrics:', this.metrics);
      }
    }, 30000);

    this.logger.log('Database metrics collection started');
  }

  // Method to simulate load for testing
  async simulateLoad(duration: number = 5000): Promise<{
    queriesExecuted: number;
    averageResponseTime: number;
    errors: number;
  }> {
    const startTime = Date.now();
    let queriesExecuted = 0;
    let totalResponseTime = 0;
    let errors = 0;

    const endTime = startTime + duration;

    while (Date.now() < endTime) {
      try {
        const queryStart = Date.now();
        await this.db.execute(sql`SELECT 1`);
        const queryTime = Date.now() - queryStart;

        queriesExecuted++;
        totalResponseTime += queryTime;
      } catch (err) {
        errors++;
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return {
      queriesExecuted,
      averageResponseTime: totalResponseTime / queriesExecuted,
      errors,
    };
  }
}
