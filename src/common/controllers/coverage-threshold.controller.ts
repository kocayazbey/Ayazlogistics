import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CoverageThresholdService } from '../services/coverage-threshold.service';

@ApiTags('Coverage Thresholds')
@Controller('coverage')
export class CoverageThresholdController {
  constructor(private readonly coverageThresholdService: CoverageThresholdService) {}

  @Get()
  @ApiOperation({ summary: 'Get all coverage thresholds' })
  @ApiResponse({ status: 200, description: 'Coverage thresholds retrieved successfully' })
  getAllThresholds() {
    return Array.from(this.coverageThresholdService.getAllThresholds().entries()).map(([metric, threshold]) => ({
      metric,
      threshold
    }));
  }

  @Post('threshold')
  @ApiOperation({ summary: 'Set coverage threshold' })
  @ApiResponse({ status: 201, description: 'Coverage threshold set successfully' })
  setThreshold(@Body() body: { metric: string; threshold: number }) {
    this.coverageThresholdService.setThreshold(body.metric, body.threshold);
    return { status: 'Coverage threshold set successfully' };
  }

  @Get('check')
  @ApiOperation({ summary: 'Run coverage check' })
  @ApiResponse({ status: 200, description: 'Coverage check completed' })
  async runCoverageCheck() {
    return await this.coverageThresholdService.runCoverageCheck();
  }

  @Get('check/:metric')
  @ApiOperation({ summary: 'Check specific coverage metric' })
  @ApiResponse({ status: 200, description: 'Coverage metric checked' })
  async checkMetric(@Param('metric') metric: string) {
    // Simulate getting current value
    const currentValue = Math.random() * 100;
    const passed = this.coverageThresholdService.checkThreshold(metric, currentValue);
    
    return {
      metric,
      currentValue,
      passed
    };
  }
}