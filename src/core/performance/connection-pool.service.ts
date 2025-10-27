import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolConfig } from 'pg';

@Injectable()
export class ConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private pool: Pool;

  async onModuleInit() {
    const poolConfig: PoolConfig = {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
      max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000'),
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on('connect', (client) => {
      this.logger.debug('New client connected to pool');
    });

    this.pool.on('remove', (client) => {
      this.logger.debug('Client removed from pool');
    });

    this.pool.on('error', (err, client) => {
      this.logger.error('Unexpected pool error:', err);
    });

    this.logger.log(`Connection pool initialized (min: ${poolConfig.min}, max: ${poolConfig.max})`);
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('Connection pool closed');
  }

  async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        this.logger.warn(`Slow query detected: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      this.logger.error('Query failed:', error);
      throw error;
    }
  }

  async getPoolStats(): Promise<any> {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

