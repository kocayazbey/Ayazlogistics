import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { CacheService } from '../../common/services/cache.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly cacheService: CacheService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();
      const redis = this.cacheService.getClient();

      // Ping Redis
      const pong = await redis.ping();

      if (pong !== 'PONG') {
        throw new Error('Redis ping failed');
      }

      const responseTime = Date.now() - startTime;

      // Get Redis info
      const info = await redis.info('server');
      const lines = info.split('\r\n');
      const versionLine = lines.find((line) => line.startsWith('redis_version:'));
      const version = versionLine ? versionLine.split(':')[1] : 'unknown';

      // Get memory usage
      const memoryInfo = await redis.info('memory');
      const usedMemoryLine = memoryInfo.split('\r\n').find((line) => line.startsWith('used_memory_human:'));
      const usedMemory = usedMemoryLine ? usedMemoryLine.split(':')[1] : 'unknown';

      // Get connected clients
      const clientsInfo = await redis.info('clients');
      const connectedClientsLine = clientsInfo.split('\r\n').find((line) => line.startsWith('connected_clients:'));
      const connectedClients = connectedClientsLine ? parseInt(connectedClientsLine.split(':')[1]) : 0;

      const isHealthy = responseTime < 100;

      const result = this.getStatus(key, isHealthy, {
        responseTime: `${responseTime}ms`,
        version,
        usedMemory,
        connectedClients,
        status: redis.status,
      });

      if (!isHealthy) {
        throw new HealthCheckError('Redis health check failed', result);
      }

      return result;
    } catch (error) {
      throw new HealthCheckError('Redis connection failed', {
        [key]: {
          status: 'down',
          message: error.message,
        },
      });
    }
  }
}

