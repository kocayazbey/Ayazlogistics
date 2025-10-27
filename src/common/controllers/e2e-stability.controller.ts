import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { E2eStabilityService } from '../services/e2e-stability.service';

@ApiTags('E2E Stability')
@Controller('e2e-stability')
export class E2eStabilityController {
  constructor(private readonly e2eStabilityService: E2eStabilityService) {}

  @Post('run-test')
  @ApiOperation({ summary: 'Run E2E stability test' })
  @ApiResponse({ status: 200, description: 'E2E stability test completed' })
  async runStabilityTest(@Body() body: { testName: string }) {
    return await this.e2eStabilityService.runStabilityTest(body.testName);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get all E2E stability test results' })
  @ApiResponse({ status: 200, description: 'Test results retrieved successfully' })
  getAllResults() {
    return this.e2eStabilityService.getTestResults();
  }

  @Get('results/:testName')
  @ApiOperation({ summary: 'Get specific E2E stability test results' })
  @ApiResponse({ status: 200, description: 'Test results retrieved successfully' })
  getTestResults(@Param('testName') testName: string) {
    return this.e2eStabilityService.getTestResults(testName);
  }

  @Get('report')
  @ApiOperation({ summary: 'Get E2E stability report' })
  @ApiResponse({ status: 200, description: 'Stability report generated successfully' })
  async getStabilityReport() {
    return await this.e2eStabilityService.getStabilityReport();
  }

  @Get('report/:testName')
  @ApiOperation({ summary: 'Get specific E2E stability report' })
  @ApiResponse({ status: 200, description: 'Stability report generated successfully' })
  async getSpecificStabilityReport(@Param('testName') testName: string) {
    return await this.e2eStabilityService.getStabilityReport(testName);
  }
}