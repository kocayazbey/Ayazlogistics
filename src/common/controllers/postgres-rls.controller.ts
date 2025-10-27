import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PostgresRlsService } from '../services/postgres-rls.service';

@ApiTags('PostgreSQL RLS')
@Controller('postgres-rls')
export class PostgresRlsController {
  constructor(private readonly postgresRlsService: PostgresRlsService) {}

  @Post('policy')
  @ApiOperation({ summary: 'Create RLS policy' })
  @ApiResponse({ status: 201, description: 'RLS policy created successfully' })
  async createPolicy(@Body() body: { tableName: string; policyName: string; policyDefinition: string }) {
    await this.postgresRlsService.createRlsPolicy(body.tableName, body.policyName, body.policyDefinition);
    return { status: 'RLS policy created successfully' };
  }

  @Post('enable')
  @ApiOperation({ summary: 'Enable RLS for table' })
  @ApiResponse({ status: 200, description: 'RLS enabled successfully' })
  async enableRls(@Body() body: { tableName: string }) {
    await this.postgresRlsService.enableRls(body.tableName);
    return { status: 'RLS enabled successfully' };
  }

  @Post('disable')
  @ApiOperation({ summary: 'Disable RLS for table' })
  @ApiResponse({ status: 200, description: 'RLS disabled successfully' })
  async disableRls(@Body() body: { tableName: string }) {
    await this.postgresRlsService.disableRls(body.tableName);
    return { status: 'RLS disabled successfully' };
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate RLS policy' })
  @ApiResponse({ status: 200, description: 'RLS policy evaluation completed' })
  async evaluatePolicy(@Body() body: { tableName: string; userId: string; tenantId: string }) {
    const isValid = await this.postgresRlsService.evaluatePolicy(body.tableName, body.userId, body.tenantId);
    return { valid: isValid };
  }

  @Post('test')
  @ApiOperation({ summary: 'Test RLS policies' })
  @ApiResponse({ status: 200, description: 'RLS policy tests completed' })
  async testPolicies() {
    return await this.postgresRlsService.testRlsPolicies();
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get all RLS policies' })
  @ApiResponse({ status: 200, description: 'RLS policies retrieved successfully' })
  getAllPolicies() {
    return this.postgresRlsService.getAllPolicies();
  }

  @Get('policies/:tableName/:policyName')
  @ApiOperation({ summary: 'Get specific RLS policy' })
  @ApiResponse({ status: 200, description: 'RLS policy retrieved successfully' })
  getPolicy(@Param('tableName') tableName: string, @Param('policyName') policyName: string) {
    return this.postgresRlsService.getPolicy(tableName, policyName);
  }
}