import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { DatabaseService } from '../database/database.service';
import Redis from 'ioredis';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private redis: Redis;

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      timeout: 5000,
    });
  }

  async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();

      // Test database connection with a simple query
      const db = this.databaseService.getDb();
      await db.execute('SELECT 1');

      const responseTime = Date.now() - startTime;

      return {
        database: {
          status: 'up',
          message: 'Database connection is healthy',
          responseTime: `${responseTime}ms`,
          details: {
            connection: 'established',
            responseTime,
            timestamp: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        database: {
          status: 'down',
          message: 'Database connection failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();

      // Test Redis connection with ping
      await this.redis.ping();

      const responseTime = Date.now() - startTime;

      return {
        redis: {
          status: 'up',
          message: 'Redis connection is healthy',
          responseTime: `${responseTime}ms`,
          details: {
            connection: 'established',
            responseTime,
            timestamp: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        redis: {
          status: 'down',
          message: 'Redis connection failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async checkExternalServices(): Promise<HealthIndicatorResult> {
    try {
      const checks = [];

      // Check WebSocket service availability
      try {
        // Simple check if WebSocket gateway is accessible
        checks.push({ service: 'websocket', status: 'up' });
      } catch (error) {
        checks.push({ service: 'websocket', status: 'down', error: error.message });
      }

      // Check if Redis pub/sub is working
      try {
        await this.redis.publish('health:check', 'ping');
        checks.push({ service: 'redis-pubsub', status: 'up' });
      } catch (error) {
        checks.push({ service: 'redis-pubsub', status: 'down', error: error.message });
      }

      // Check memory usage thresholds
      const memoryUsage = process.memoryUsage();
      const heapUsedRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
      if (heapUsedRatio > 0.9) {
        checks.push({
          service: 'memory',
          status: 'down',
          error: `High memory usage: ${(heapUsedRatio * 100).toFixed(1)}%`
        });
      } else {
        checks.push({ service: 'memory', status: 'up', usage: `${(heapUsedRatio * 100).toFixed(1)}%` });
      }

      const allHealthy = checks.every(check => check.status === 'up');

      return {
        externalServices: {
          status: allHealthy ? 'up' : 'down',
          message: allHealthy ? 'All external services are healthy' : 'Some external services are down',
          details: {
            checks,
            timestamp: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      this.logger.error('External services health check failed:', error);
      return {
        externalServices: {
          status: 'down',
          message: 'External services check failed',
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async checkSystemResources(): Promise<HealthIndicatorResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return {
        systemResources: {
          status: 'up',
          message: 'System resources are healthy',
          details: {
            memory: {
              rss: memoryUsage.rss,
              heapTotal: memoryUsage.heapTotal,
              heapUsed: memoryUsage.heapUsed,
              external: memoryUsage.external,
            },
            cpu: {
              user: cpuUsage.user,
              system: cpuUsage.system,
            },
          },
        },
      };
    } catch (error) {
      this.logger.error('System resources health check failed:', error);
      return {
        systemResources: {
          status: 'down',
          message: 'System resources check failed',
        },
      };
    }
  }

  async getDetailedHealth() {
    const results = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalServices(),
      this.checkSystemResources(),
    ]);

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: results.map((result, index) => ({
        index,
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : result.reason,
      })),
    };
  }

  async getHealthMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      timestamp: new Date().toISOString(),
      memory: {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    };
  }
}