import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);

  constructor(private dataSource: DataSource) {}

  async analyzeQuery(query: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const result = await queryRunner.query(`EXPLAIN ANALYZE ${query}`);
      return result;
    } finally {
      await queryRunner.release();
    }
  }

  async getQueryPlan(query: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const result = await queryRunner.query(`EXPLAIN (FORMAT JSON) ${query}`);
      return result[0]['QUERY PLAN'];
    } finally {
      await queryRunner.release();
    }
  }

  async suggestIndexes() {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const result = await queryRunner.query(`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        AND n_distinct > 100
        ORDER BY n_distinct DESC
      `);

      return result;
    } finally {
      await queryRunner.release();
    }
  }

  async getTableStats() {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      const result = await queryRunner.query(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `);

      return result;
    } finally {
      await queryRunner.release();
    }
  }
}