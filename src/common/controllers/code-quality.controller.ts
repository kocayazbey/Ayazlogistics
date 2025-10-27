import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CodeQualityService } from '../services/code-quality.service';

@ApiTags('Code Quality')
@Controller('code-quality')
export class CodeQualityController {
  constructor(private readonly codeQualityService: CodeQualityService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get code quality metrics' })
  @ApiResponse({ status: 200, description: 'Code quality metrics retrieved successfully' })
  getMetrics() {
    return this.codeQualityService.getCodeQualityMetrics();
  }

  @Get('report')
  @ApiOperation({ summary: 'Get comprehensive quality report' })
  @ApiResponse({ status: 200, description: 'Quality report retrieved successfully' })
  getReport() {
    return this.codeQualityService.getQualityReport();
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get refactoring suggestions' })
  @ApiResponse({ status: 200, description: 'Refactoring suggestions retrieved successfully' })
  @ApiQuery({ name: 'priority', required: false, enum: ['low', 'medium', 'high'] })
  getSuggestions(@Query('priority') priority?: string) {
    if (priority === 'high') {
      return this.codeQualityService.getHighPrioritySuggestions();
    }
    return this.codeQualityService.getRefactoringSuggestions();
  }

  @Get('dead-code')
  @ApiOperation({ summary: 'Get dead code report' })
  @ApiResponse({ status: 200, description: 'Dead code report retrieved successfully' })
  getDeadCode() {
    return this.codeQualityService.getDeadCodeReport();
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'Get code duplication report' })
  @ApiResponse({ status: 200, description: 'Duplication report retrieved successfully' })
  getDuplicates() {
    return this.codeQualityService.getDuplicationReport();
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze a function' })
  @ApiResponse({ status: 200, description: 'Function analyzed successfully' })
  analyzeFunction(
    @Body() body: { functionName: string; functionBody: string }
  ) {
    return this.codeQualityService.analyzeFunction(
      body.functionName,
      body.functionBody
    );
  }

  @Post('clear')
  @ApiOperation({ summary: 'Clear all analysis data' })
  @ApiResponse({ status: 200, description: 'Analysis data cleared successfully' })
  clearAnalysis() {
    this.codeQualityService.clearAnalysis();
    return { message: 'Analysis data cleared successfully' };
  }
}
