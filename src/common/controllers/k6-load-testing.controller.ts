import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { K6LoadTestingService } from '../services/k6-load-testing.service';

@ApiTags('K6 Load Testing')
@Controller('k6')
export class K6LoadTestingController {
  constructor(private readonly k6LoadTestingService: K6LoadTestingService) {}

  @Post('scenario')
  @ApiOperation({ summary: 'Create K6 test scenario' })
  @ApiResponse({ status: 201, description: 'K6 test scenario created successfully' })
  createScenario(@Body() body: { name: string; config: any }) {
    this.k6LoadTestingService.createScenario(body.name, body.config);
    return { status: 'K6 test scenario created successfully' };
  }

  @Post('run')
  @ApiOperation({ summary: 'Run K6 load test' })
  @ApiResponse({ status: 200, description: 'K6 load test completed' })
  async runLoadTest(@Body() body: { scenarioName: string }) {
    return await this.k6LoadTestingService.runLoadTest(body.scenarioName);
  }

  @Get('scenarios')
  @ApiOperation({ summary: 'Get all K6 test scenarios' })
  @ApiResponse({ status: 200, description: 'K6 test scenarios retrieved successfully' })
  getAllScenarios() {
    return Array.from(this.k6LoadTestingService.getAllScenarios().entries()).map(([name, config]) => ({
      name,
      config
    }));
  }
}