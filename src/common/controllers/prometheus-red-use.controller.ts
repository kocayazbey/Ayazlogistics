import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrometheusRedUseService } from '../services/prometheus-red-use.service';

@ApiTags('Prometheus RED/USE')
@Controller('prometheus-red-use')
export class PrometheusRedUseController {
  constructor(private readonly prometheusRedUseService: PrometheusRedUseService) {}

  @Post('setup')
  @ApiOperation({ summary: 'Setup RED/USE alert rules' })
  @ApiResponse({ status: 200, description: 'RED/USE alert rules configured successfully' })
  async setupAlerts() {
    await this.prometheusRedUseService.setupRedUseAlerts();
    return { status: 'RED/USE alert rules configured successfully' };
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Evaluate RED/USE alerts' })
  @ApiResponse({ status: 200, description: 'Alerts evaluated successfully' })
  async evaluateAlerts() {
    return await this.prometheusRedUseService.evaluateAlerts();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get alert history' })
  @ApiResponse({ status: 200, description: 'Alert history retrieved successfully' })
  async getAlertHistory() {
    return await this.prometheusRedUseService.getAlertHistory();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get RED/USE metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics() {
    return await this.prometheusRedUseService.getMetrics();
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get all alert rules' })
  @ApiResponse({ status: 200, description: 'Alert rules retrieved successfully' })
  getAllAlertRules() {
    return Array.from(this.prometheusRedUseService.getAllAlertRules().entries()).map(([name, rule]) => ({
      name,
      rule
    }));
  }
}