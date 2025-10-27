import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  async getMetrics() {
    return this.metricsService.getMetrics();
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

