import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataQualityLineageService } from '../services/data-quality-lineage.service';

@ApiTags('Data Quality & Lineage')
@Controller('data-quality')
export class DataQualityLineageController {
  constructor(private readonly dataQualityLineageService: DataQualityLineageService) {}

  @Post('mask-pii')
  @ApiOperation({ summary: 'Mask PII in data' })
  @ApiResponse({ status: 200, description: 'PII masked successfully' })
  async maskPii(@Body() body: { data: any }) {
    const maskedData = await this.dataQualityLineageService.maskPii(body.data);
    return { maskedData };
  }

  @Post('track-lineage')
  @ApiOperation({ summary: 'Track data lineage' })
  @ApiResponse({ status: 200, description: 'Data lineage tracked successfully' })
  async trackLineage(@Body() body: { source: string; destination: string; transformation: string }) {
    await this.dataQualityLineageService.trackDataLineage(body.source, body.destination, body.transformation);
    return { status: 'Data lineage tracked successfully' };
  }

  @Post('validate-quality')
  @ApiOperation({ summary: 'Validate data quality' })
  @ApiResponse({ status: 200, description: 'Data quality validation completed' })
  async validateQuality(@Body() body: { data: any; rules: any[] }) {
    const isValid = await this.dataQualityLineageService.validateDataQuality(body.data, body.rules);
    return { valid: isValid };
  }

  @Post('add-rule')
  @ApiOperation({ summary: 'Add data quality rule' })
  @ApiResponse({ status: 201, description: 'Data quality rule added successfully' })
  async addQualityRule(@Body() body: { ruleName: string; rule: any }) {
    await this.dataQualityLineageService.addQualityRule(body.ruleName, body.rule);
    return { status: 'Data quality rule added successfully' };
  }

  @Post('check')
  @ApiOperation({ summary: 'Run data quality check' })
  @ApiResponse({ status: 200, description: 'Data quality check completed' })
  async runQualityCheck(@Body() body: { data: any }) {
    return await this.dataQualityLineageService.runDataQualityCheck(body.data);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Get all data quality rules' })
  @ApiResponse({ status: 200, description: 'Data quality rules retrieved successfully' })
  getAllQualityRules() {
    return Array.from(this.dataQualityLineageService.getAllQualityRules().entries()).map(([name, rule]) => ({
      name,
      rule
    }));
  }

  @Get('lineage')
  @ApiOperation({ summary: 'Get all data lineage information' })
  @ApiResponse({ status: 200, description: 'Data lineage information retrieved successfully' })
  getAllLineageData() {
    return this.dataQualityLineageService.getAllLineageData();
  }
}