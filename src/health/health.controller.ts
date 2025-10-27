import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { HealthCheckService as CustomHealthCheckService } from './health-check.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private customHealthCheck: CustomHealthCheckService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.customHealthCheck.checkDatabase(),
      () => this.customHealthCheck.checkRedis(),
      () => this.customHealthCheck.checkExternalServices(),
      () => this.customHealthCheck.checkSystemResources(),
    ]);
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed health status' })
  @ApiResponse({ status: 200, description: 'Detailed health status retrieved successfully' })
  getDetailedHealth() {
    return this.customHealthCheck.getDetailedHealth();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Kubernetes readiness check' })
  @ApiResponse({ status: 200, description: 'Service is ready to handle traffic' })
  @ApiResponse({ status: 503, description: 'Service not ready' })
  @HealthCheck()
  async readinessCheck() {
    const health = await this.health.check([
      () => this.customHealthCheck.checkDatabase(),
      () => this.customHealthCheck.checkRedis(),
      () => this.customHealthCheck.checkExternalServices(),
    ]);

    // Check if all critical services are healthy
    const isReady = Object.values(health.details).every(
      (detail: any) => detail.status === 'up'
    );

    if (!isReady) {
      throw new Error('Service not ready');
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Service is ready to handle traffic',
      details: health.details,
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get health metrics' })
  @ApiResponse({ status: 200, description: 'Health metrics retrieved successfully' })
  getHealthMetrics() {
    return this.customHealthCheck.getHealthMetrics();
  }
}