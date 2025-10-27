import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DatabaseMonitorService {
  private readonly logger = new Logger(DatabaseMonitorService.name);
  private metrics: any = {};

  constructor(private dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics() {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      
      try {
        // Connection stats
        const connections = await queryRunner.query(`
          SELECT count(*) as total_connections,
                 count(*) FILTER (WHERE state = 'active') as active_connections
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `);

        // Database size
        const dbSize = await queryRunner.query(`
          SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
        `);

        // Table sizes
        const tableSizes = await queryRunner.query(`
          SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
          LIMIT 10
        `);

        this.metrics = {
          timestamp: new Date(),
          connections: connections[0],
          databaseSize: dbSize[0],
          tableSizes,
        };

        this.logger.debug('Database metrics collected');
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error('Failed to collect database metrics:', error);
    }
  }

  getMetrics() {
    return this.metrics;
  }

  async getHealthStatus() {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      
      try {
        await queryRunner.query('SELECT 1');
        return { status: 'healthy', timestamp: new Date() };
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }
}