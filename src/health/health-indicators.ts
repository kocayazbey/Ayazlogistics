import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Add database health check logic here
      return this.getStatus(key, true, { message: 'Database is healthy' });
    } catch (error) {
      throw new HealthCheckError('Database check failed', this.getStatus(key, false, { message: error.message }));
    }
  }
}

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Add Redis health check logic here
      return this.getStatus(key, true, { message: 'Redis is healthy' });
    } catch (error) {
      throw new HealthCheckError('Redis check failed', this.getStatus(key, false, { message: error.message }));
    }
  }
}

@Injectable()
export class ExternalServicesHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Add external services health check logic here
      return this.getStatus(key, true, { message: 'External services are healthy' });
    } catch (error) {
      throw new HealthCheckError('External services check failed', this.getStatus(key, false, { message: error.message }));
    }
  }
}

@Injectable()
export class SystemResourcesHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      return this.getStatus(key, true, {
        message: 'System resources are healthy',
        memory: memoryUsage,
        cpu: cpuUsage,
      });
    } catch (error) {
      throw new HealthCheckError('System resources check failed', this.getStatus(key, false, { message: error.message }));
    }
  }
}
