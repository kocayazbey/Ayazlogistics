import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DastSecurityService } from '../services/dast-security.service';

@ApiTags('DAST Security')
@Controller('dast')
export class DastSecurityController {
  constructor(private readonly dastSecurityService: DastSecurityService) {}

  @Post('scan')
  @ApiOperation({ summary: 'Run DAST security scan' })
  @ApiResponse({ status: 200, description: 'DAST security scan completed' })
  async runScan(@Body() body: { url: string; scanType?: 'baseline' | 'full' }) {
    return await this.dastSecurityService.runSecurityScan(body.url, body.scanType);
  }

  @Get('results')
  @ApiOperation({ summary: 'Get all scan results' })
  @ApiResponse({ status: 200, description: 'Scan results retrieved successfully' })
  getAllResults() {
    return this.dastSecurityService.getScanResults();
  }

  @Get('results/:url')
  @ApiOperation({ summary: 'Get scan results for specific URL' })
  @ApiResponse({ status: 200, description: 'Scan results retrieved successfully' })
  getResultsForUrl(@Param('url') url: string) {
    return this.dastSecurityService.getScanResults(url);
  }

  @Get('report/:url')
  @ApiOperation({ summary: 'Generate security report for URL' })
  @ApiResponse({ status: 200, description: 'Security report generated successfully' })
  async generateReport(@Param('url') url: string) {
    const report = await this.dastSecurityService.generateSecurityReport(url);
    return { report };
  }
}