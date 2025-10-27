import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SloMonitoringService } from '../services/slo-monitoring.service';

@ApiTags('SLO Monitoring')
@Controller('slo')
export class SloMonitoringController {
  constructor(private readonly sloMonitoringService: SloMonitoringService) {}

  @Get()
  @ApiOperation({ summary: 'Get all SLO statuses' })
  @ApiResponse({ status: 200, description: 'SLO statuses retrieved successfully' })
  getAllSlos() {
    return this.sloMonitoringService.getAllSlos();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get specific SLO status' })
  @ApiResponse({ status: 200, description: 'SLO status retrieved successfully' })
  getSloStatus(@Param('name') name: string) {
    return this.sloMonitoringService.getSloStatus(name);
  }

  @Post('define')
  @ApiOperation({ summary: 'Define new SLO' })
  @ApiResponse({ status: 201, description: 'SLO defined successfully' })
  defineSlo(@Body() body: { name: string; target: number; window: number }) {
    this.sloMonitoringService.defineSlo(body.name, body.target, body.window);
    return { status: 'SLO defined successfully' };
  }

  @Post('record')
  @ApiOperation({ summary: 'Record SLO metric' })
  @ApiResponse({ status: 200, description: 'Metric recorded successfully' })
  recordMetric(@Body() body: { sloName: string; success: boolean; duration: number }) {
    this.sloMonitoringService.recordRequest(body.sloName, body.success, body.duration);
    return { status: 'Metric recorded successfully' };
  }
}