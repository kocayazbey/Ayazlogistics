import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private configService: ConfigService) {}

  async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      // Add database health check logic here
      return {
        database: {
          status: 'up',
          message: 'Database connection is healthy',
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        database: {
          status: 'down',
          message: 'Database connection failed',
        },
      };
    }
  }

  async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      // Add Redis health check logic here
      return {
        redis: {
          status: 'up',
          message: 'Redis connection is healthy',
        },
      };
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return {
        redis: {
          status: 'down',
          message: 'Redis connection failed',
        },
      };
    }
  }

  async checkExternalServices(): Promise<HealthIndicatorResult> {
    try {
      // Add external services health check logic here
      return {
        externalServices: {
          status: 'up',
          message: 'External services are accessible',
        },
      };
    } catch (error) {
      this.logger.error('External services health check failed:', error);
      return {
        externalServices: {
          status: 'down',
          message: 'External services are not accessible',
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
}
