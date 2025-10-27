import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ActiveActiveTestingService } from '../services/active-active-testing.service';

@ApiTags('Active-Active Testing')
@Controller('active-active-test')
export class ActiveActiveTestingController {
  constructor(private readonly activeActiveTestingService: ActiveActiveTestingService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run active-active test' })
  @ApiResponse({ status: 200, description: 'Active-active test completed' })
  async runTest(@Body() body: { testName: string }) {
    return await this.activeActiveTestingService.runActiveActiveTest(body.testName);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get all test results' })
  @ApiResponse({ status: 200, description: 'Test results retrieved successfully' })
  getAllResults() {
    return this.activeActiveTestingService.getTestResults();
  }

  @Get('results/:testName')
  @ApiOperation({ summary: 'Get specific test results' })
  @ApiResponse({ status: 200, description: 'Test results retrieved successfully' })
  getTestResults(@Param('testName') testName: string) {
    return this.activeActiveTestingService.getTestResults(testName);
  }
}