import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseHealthCheckService } from '../database/database-health-check.service';
import { QueryOptimizerService } from '../database/query-optimizer.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthCheckService: DatabaseHealthCheckService,
    private readonly queryOptimizer: QueryOptimizerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealth() {
    const [dbHealth, performanceMetrics, cacheStats] = await Promise.all([
      this.healthCheckService.performHealthCheck(),
      this.healthCheckService.getPerformanceMetrics(),
      this.queryOptimizer.getCacheStats(),
    ]);

    return {
      status: dbHealth.status,
      timestamp: dbHealth.timestamp,
      database: {
        status: dbHealth.status,
        checks: dbHealth.checks,
        metrics: dbHealth.metrics,
        recommendations: dbHealth.recommendations,
      },
      performance: {
        averageResponseTime: performanceMetrics.averageResponseTime,
        queryCount: performanceMetrics.queryCount,
        errorRate: performanceMetrics.errorRate,
        cacheHitRatio: performanceMetrics.cacheHitRatio,
      },
      cache: {
        size: cacheStats.size,
        hitRate: cacheStats.hitRate,
        memoryUsage: cacheStats.memoryUsage,
      },
    };
  }

  @Get('database')
  @ApiOperation({ summary: 'Get database health status' })
  @ApiResponse({ status: 200, description: 'Database health status retrieved successfully' })
  async getDatabaseHealth() {
    return this.healthCheckService.performHealthCheck();
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics() {
    return this.healthCheckService.getPerformanceMetrics();
  }

  @Get('cache')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({ status: 200, description: 'Cache statistics retrieved successfully' })
  async getCacheStats() {
    return this.queryOptimizer.getCacheStats();
  }

  @Get('cache/clear')
  @ApiOperation({ summary: 'Clear query cache' })
  @ApiResponse({ status: 200, description: 'Cache cleared successfully' })
  async clearCache() {
    this.queryOptimizer.clearCache();
    return { message: 'Cache cleared successfully' };
  }
}
