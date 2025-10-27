import { Controller, Get, Post, Delete } from '@nestjs/common';
import { DatabaseHealthService, DatabaseHealthCheck, DatabaseMetrics } from '../database-health.service';

@Controller('database')
export class DatabaseController {
  constructor(private readonly databaseHealth: DatabaseHealthService) {}

  @Get('health')
  async getHealth(): Promise<DatabaseHealthCheck> {
    return this.databaseHealth.healthCheck();
  }

  @Get('metrics')
  async getMetrics(): Promise<DatabaseMetrics> {
    return this.databaseHealth.getDetailedMetrics();
  }

  @Post('metrics/reset')
  async resetMetrics(): Promise<{ message: string }> {
    await this.databaseHealth.resetMetrics();
    return { message: 'Database metrics reset successfully' };
  }

  @Get('optimize')
  async getOptimizationRecommendations(): Promise<{
    recommendations: string[];
    actions: string[];
  }> {
    return this.databaseHealth.optimizeConnections();
  }

  @Post('load-test')
  async simulateLoad(): Promise<{
    queriesExecuted: number;
    averageResponseTime: number;
    errors: number;
    duration: number;
  }> {
    const startTime = Date.now();
    const result = await this.databaseHealth.simulateLoad(5000); // 5 second load test
    const duration = Date.now() - startTime;

    return {
      ...result,
      duration,
    };
  }
}
