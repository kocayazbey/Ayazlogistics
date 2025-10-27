import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StrykerMutationService } from '../services/stryker-mutation.service';

@ApiTags('Stryker Mutation Testing')
@Controller('stryker')
export class StrykerMutationController {
  constructor(private readonly strykerMutationService: StrykerMutationService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run Stryker mutation test' })
  @ApiResponse({ status: 200, description: 'Stryker mutation test completed' })
  async runMutationTest(@Body() body: { testName: string }) {
    return await this.strykerMutationService.runMutationTest(body.testName);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get all mutation test results' })
  @ApiResponse({ status: 200, description: 'Mutation test results retrieved successfully' })
  getAllResults() {
    return this.strykerMutationService.getMutationResults();
  }

  @Get('results/:testName')
  @ApiOperation({ summary: 'Get specific mutation test results' })
  @ApiResponse({ status: 200, description: 'Mutation test results retrieved successfully' })
  getTestResults(@Param('testName') testName: string) {
    return this.strykerMutationService.getMutationResults(testName);
  }

  @Post('threshold')
  @ApiOperation({ summary: 'Check mutation test threshold' })
  @ApiResponse({ status: 200, description: 'Threshold check completed' })
  async checkThreshold(@Body() body: { testName: string; threshold: number }) {
    const passed = await this.strykerMutationService.checkThreshold(body.testName, body.threshold);
    return { passed, threshold: body.threshold };
  }
}