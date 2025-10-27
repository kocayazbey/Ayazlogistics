import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('CSP Reports')
@Controller('csp-report')
export class CspReportController {
  private readonly logger = new Logger('CspReportController');

  @Post()
  @ApiOperation({ summary: 'Handle CSP violation reports' })
  async handleCspReport(@Body() report: any) {
    this.logger.warn('CSP violation reported', {
      documentUri: report['csp-report']?.documentUri,
      violatedDirective: report['csp-report']?.violatedDirective,
      blockedUri: report['csp-report']?.blockedUri,
      userAgent: report['csp-report']?.userAgent
    });

    // Store report in database or send to monitoring service
    // This helps identify potential security issues
    
    return { status: 'received' };
  }
}