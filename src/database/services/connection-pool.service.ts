import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class ConnectionPoolService {
  private readonly logger = new Logger(ConnectionPoolService.name);

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {}

  async getConnectionStats() {
    const manager = this.dataSource.manager;
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const result = await queryRunner.query(`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections,
          count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      return result[0];
    } finally {
      await queryRunner.release();
    }
  }

  async optimizeConnections() {
    this.logger.log('Optimizing database connections...');
    
    // Close idle connections
    await this.dataSource.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \'idle\' AND state_change < now() - interval \'5 minutes\'');
    
    this.logger.log('Database connections optimized');
  }

  async getSlowQueries() {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const result = await queryRunner.query(`
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

      return result;
    } finally {
      await queryRunner.release();
    }
  }
}