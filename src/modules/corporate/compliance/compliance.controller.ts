import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { ComplianceService } from './compliance.service';
import { CreateComplianceFrameworkDto } from './dto/create-compliance-framework.dto';
import { CreateComplianceRequirementDto } from './dto/create-compliance-requirement.dto';
import { CreateComplianceEvidenceDto } from './dto/create-compliance-evidence.dto';
import { CreateComplianceAuditDto } from './dto/create-compliance-audit.dto';
import { CreateDataProcessingActivityDto } from './dto/create-data-processing-activity.dto';

@ApiTags('Corporate Compliance')
@Controller({ path: 'corporate/compliance', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('dashboard')
  @Roles('admin', 'compliance_manager', 'viewer')
  @ApiOperation({ summary: 'Get compliance dashboard' })
  @ApiResponse({ status: 200, description: 'Compliance dashboard retrieved successfully' })
  async getComplianceDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.complianceService.getComplianceDashboard(tenantId);
  }

  @Post('frameworks')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create compliance framework' })
  @ApiResponse({ status: 201, description: 'Compliance framework created successfully' })
  async createComplianceFramework(
    @Body() createComplianceFrameworkDto: CreateComplianceFrameworkDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.complianceService.createComplianceFramework({ ...createComplianceFrameworkDto, tenantId });
  }

  @Get('frameworks')
  @Roles('admin', 'compliance_manager', 'viewer')
  @ApiOperation({ summary: 'Get compliance frameworks' })
  @ApiResponse({ status: 200, description: 'Compliance frameworks retrieved successfully' })
  async getComplianceFrameworks(@CurrentUser('tenantId') tenantId: string) {
    return this.complianceService.getComplianceFrameworks(tenantId);
  }

  @Post('requirements')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create compliance requirement' })
  @ApiResponse({ status: 201, description: 'Compliance requirement created successfully' })
  async createComplianceRequirement(@Body() createComplianceRequirementDto: CreateComplianceRequirementDto) {
    return this.complianceService.createComplianceRequirement(createComplianceRequirementDto);
  }

  @Put('requirements/:id/status')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Update compliance requirement status' })
  @ApiResponse({ status: 200, description: 'Compliance requirement status updated successfully' })
  async updateRequirementStatus(
    @Param('id') id: string,
    @Body() body: { status: 'not_applicable' | 'not_implemented' | 'partially_implemented' | 'fully_implemented' }
  ) {
    return this.complianceService.updateRequirementStatus(id, body.status);
  }

  @Post('evidence')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create compliance evidence' })
  @ApiResponse({ status: 201, description: 'Compliance evidence created successfully' })
  async createComplianceEvidence(@Body() createComplianceEvidenceDto: CreateComplianceEvidenceDto) {
    return this.complianceService.createComplianceEvidence(createComplianceEvidenceDto);
  }

  @Post('audits')
  @Roles('admin', 'compliance_manager')
  @ApiOperation({ summary: 'Create compliance audit' })
  @ApiResponse({ status: 201, description: 'Compliance audit created successfully' })
  async createComplianceAudit(
    @Body() createComplianceAuditDto: CreateComplianceAuditDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.complianceService.createComplianceAudit({ ...createComplianceAuditDto, tenantId });
  }

  @Get('audits')
  @Roles('admin', 'compliance_manager', 'viewer')
  @ApiOperation({ summary: 'Get compliance audits' })
  @ApiResponse({ status: 200, description: 'Compliance audits retrieved successfully' })
  @ApiQuery({ name: 'frameworkId', required: false, type: String })
  async getComplianceAudits(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { frameworkId?: string }
  ) {
    return this.complianceService.getComplianceAudits(tenantId, query.frameworkId);
  }

  @Post('data-processing-activities')
  @Roles('admin', 'compliance_manager', 'data_protection_officer')
  @ApiOperation({ summary: 'Create data processing activity' })
  @ApiResponse({ status: 201, description: 'Data processing activity created successfully' })
  async createDataProcessingActivity(
    @Body() createDataProcessingActivityDto: CreateDataProcessingActivityDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.complianceService.createDataProcessingActivity({ ...createDataProcessingActivityDto, tenantId });
  }

  @Get('data-processing-activities')
  @Roles('admin', 'compliance_manager', 'data_protection_officer', 'viewer')
  @ApiOperation({ summary: 'Get data processing activities' })
  @ApiResponse({ status: 200, description: 'Data processing activities retrieved successfully' })
  async getDataProcessingActivities(@CurrentUser('tenantId') tenantId: string) {
    return this.complianceService.getDataProcessingActivities(tenantId);
  }
}
