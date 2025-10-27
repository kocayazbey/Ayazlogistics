import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE_ORM } from './database.constants';
import { sql } from 'drizzle-orm';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: any,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get the Drizzle database instance
   */
  getDb() {
    return this.db;
  }

  /**
   * Execute raw SQL query
   */
  async query(text: string, params?: any[]) {
    return this.db.execute(sql.raw(text, params));
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: string; latency?: number }> {
    try {
      const startTime = Date.now();
      await this.db.execute(sql`SELECT 1`);
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
      };
    }
  }
}

