import { Controller, Get, Post, Query, Param, Body, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { EnhancedAuditService, AuditAction, AuditQueryFilter } from './audit-enhanced.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StandardRateLimit } from '../security/decorators/rate-limit.decorator';

@ApiTags('Audit')
@Controller({ path: 'audit', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: EnhancedAuditService) {}

  @Get('logs')
  @Roles('admin', 'auditor')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLogs(@Query() filter: AuditQueryFilter) {
    return this.auditService.query(filter);
  }

  @Get('entity/:entity/:entityId')
  @Roles('admin', 'auditor', 'user')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get entity history' })
  async getEntityHistory(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(entity, entityId);
  }

  @Get('user/:userId')
  @Roles('admin', 'auditor')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Get user activity' })
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getUserActivity(userId, limit);
  }

  @Get('compliance-report')
  @Roles('admin', 'auditor', 'compliance_officer')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Generate compliance report' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getComplianceReport(
    @Query('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.auditService.getComplianceReport(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Delete('cleanup')
  @Roles('admin')
  @StandardRateLimit()
  @ApiOperation({ summary: 'Cleanup old audit logs' })
  @ApiQuery({ name: 'retentionDays', required: false })
  async cleanupOldLogs(@Query('retentionDays') retentionDays?: number) {
    const deleted = await this.auditService.cleanupOldLogs(retentionDays);
    return { message: `Deleted ${deleted} old audit logs` };
  }
}

