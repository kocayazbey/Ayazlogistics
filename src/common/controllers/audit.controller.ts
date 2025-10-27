import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLoggingService } from '../services/audit-logging.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditLoggingService: AuditLoggingService) {}

  @Get('user/:userId')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get audit logs for a user' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserAuditLogs(
    @Param('userId') userId: string,
    @Query('limit') limit?: number
  ) {
    return this.auditLoggingService.getUserAuditLogs(userId, limit);
  }

  @Get('resource/:resource')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get audit logs for a resource' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiQuery({ name: 'resourceId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getResourceAuditLogs(
    @Param('resource') resource: string,
    @Query('resourceId') resourceId?: string,
    @Query('limit') limit?: number
  ) {
    return this.auditLoggingService.getResourceAuditLogs(resource, resourceId, limit);
  }

  @Get('security')
  @Roles('admin')
  @ApiOperation({ summary: 'Get security events' })
  @ApiResponse({ status: 200, description: 'Security events retrieved successfully' })
  @ApiQuery({ name: 'severity', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSecurityEvents(
    @Query('severity') severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    @Query('limit') limit?: number
  ) {
    return this.auditLoggingService.getSecurityEvents(severity, limit);
  }

  @Get('statistics')
  @Roles('admin')
  @ApiOperation({ summary: 'Get audit statistics' })
  @ApiResponse({ status: 200, description: 'Audit statistics retrieved successfully' })
  async getAuditStatistics() {
    return this.auditLoggingService.getAuditStatistics();
  }

  @Get('export')
  @Roles('admin')
  @ApiOperation({ summary: 'Export audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs exported successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  async exportAuditLogs(
    @Query('startDate') startDate?: Date,
    @Query('endDate') endDate?: Date
  ) {
    return this.auditLoggingService.exportAuditLogs(startDate, endDate);
  }
}
