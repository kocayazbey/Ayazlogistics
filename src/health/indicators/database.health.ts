import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DRIZZLE_ORM } from '../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();

      // Simple ping query
      await this.db.execute(sql`SELECT 1`);

      const responseTime = Date.now() - startTime;

      // Get connection pool status
      const poolStatus = await this.getPoolStatus();

      const isHealthy = responseTime < 1000 && poolStatus.available > 0;

      const result = this.getStatus(key, isHealthy, {
        responseTime: `${responseTime}ms`,
        ...poolStatus,
      });

      if (!isHealthy) {
        throw new HealthCheckError('Database health check failed', result);
      }

      return result;
    } catch (error) {
      throw new HealthCheckError('Database connection failed', {
        [key]: {
          status: 'down',
          message: error.message,
        },
      });
    }
  }

  private async getPoolStatus() {
    try {
      // PostgreSQL connection pool info
      const result = await this.db.execute(sql`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity
        WHERE datname = current_database()
      `);

      const row = result.rows[0] as any;

      return {
        totalConnections: parseInt(row.total_connections),
        active: parseInt(row.active_connections),
        idle: parseInt(row.idle_connections),
        available: parseInt(row.idle_connections),
      };
    } catch (error) {
      return {
        totalConnections: 0,
        active: 0,
        idle: 0,
        available: 0,
      };
    }
  }
}

