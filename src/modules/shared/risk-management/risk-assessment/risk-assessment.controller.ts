import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { RiskAssessmentService } from './risk-assessment.service';
import {
  RiskAssessmentRequestDto,
  RiskAssessmentResponseDto,
  RiskProfileDto,
  RiskMitigationDto,
  RiskMonitoringDto,
  RiskReportDto,
  RiskAlertDto,
  RiskPolicyDto,
  RiskScenarioDto,
  RiskMetricsDto,
} from './risk-assessment.dto';

@ApiTags('Risk Assessment & Management')
@Controller({ path: 'risk/assessment', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RiskAssessmentController {
  constructor(private readonly riskAssessmentService: RiskAssessmentService) {}

  @Post('assess')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Perform comprehensive risk assessment' })
  @ApiResponse({ status: 200, description: 'Risk assessment completed successfully', type: RiskAssessmentResponseDto })
  async assessRisk(
    @Body() request: RiskAssessmentRequestDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.assessRisk(request, tenantId);
  }

  @Get('profiles')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get all risk profiles' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter active profiles only' })
  @ApiResponse({ status: 200, description: 'Risk profiles retrieved successfully', type: [RiskProfileDto] })
  async getRiskProfiles(
    @Query('active') active: boolean,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskProfiles(tenantId, active);
  }

  @Get('profiles/:profileId')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get specific risk profile details' })
  @ApiParam({ name: 'profileId', description: 'Risk profile ID' })
  @ApiResponse({ status: 200, description: 'Risk profile retrieved successfully', type: RiskProfileDto })
  async getRiskProfile(
    @Param('profileId') profileId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskProfile(profileId, tenantId);
  }

  @Get('mitigation')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get risk mitigation strategies' })
  @ApiQuery({ name: 'riskType', required: false, description: 'Filter by risk type' })
  @ApiResponse({ status: 200, description: 'Risk mitigation strategies retrieved successfully', type: [RiskMitigationDto] })
  async getRiskMitigation(
    @Query('riskType') riskType: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskMitigation(tenantId, riskType);
  }

  @Get('monitoring')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get risk monitoring dashboard' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Risk monitoring data retrieved successfully', type: RiskMonitoringDto })
  async getRiskMonitoring(
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskMonitoring(tenantId, timeRange);
  }

  @Get('reports')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get risk assessment reports' })
  @ApiQuery({ name: 'reportType', required: false, description: 'Report type filter' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Risk reports retrieved successfully', type: [RiskReportDto] })
  async getRiskReports(
    @Query('reportType') reportType: string,
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskReports(tenantId, reportType, timeRange);
  }

  @Get('alerts')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get risk alerts and warnings' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity level' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by alert status' })
  @ApiResponse({ status: 200, description: 'Risk alerts retrieved successfully', type: [RiskAlertDto] })
  async getRiskAlerts(
    @Query('severity') severity: string,
    @Query('status') status: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskAlerts(tenantId, severity, status);
  }

  @Get('policies')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get risk management policies' })
  @ApiQuery({ name: 'active', required: false, description: 'Filter active policies only' })
  @ApiResponse({ status: 200, description: 'Risk policies retrieved successfully', type: [RiskPolicyDto] })
  async getRiskPolicies(
    @Query('active') active: boolean,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskPolicies(tenantId, active);
  }

  @Get('scenarios')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get risk scenarios and stress tests' })
  @ApiQuery({ name: 'scenarioType', required: false, description: 'Filter by scenario type' })
  @ApiResponse({ status: 200, description: 'Risk scenarios retrieved successfully', type: [RiskScenarioDto] })
  async getRiskScenarios(
    @Query('scenarioType') scenarioType: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskScenarios(tenantId, scenarioType);
  }

  @Get('metrics')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get risk metrics and KPIs' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Risk metrics retrieved successfully', type: RiskMetricsDto })
  async getRiskMetrics(
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskMetrics(tenantId, timeRange);
  }

  @Post('policies')
  @Roles('admin', 'manager', 'risk_officer')
  @ApiOperation({ summary: 'Create new risk management policy' })
  @ApiResponse({ status: 201, description: 'Risk policy created successfully', type: RiskPolicyDto })
  async createRiskPolicy(
    @Body() policyData: RiskPolicyDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.riskAssessmentService.createRiskPolicy(policyData, tenantId, userId);
  }

  @Put('policies/:policyId')
  @Roles('admin', 'manager', 'risk_officer')
  @ApiOperation({ summary: 'Update risk management policy' })
  @ApiParam({ name: 'policyId', description: 'Policy ID' })
  @ApiResponse({ status: 200, description: 'Risk policy updated successfully', type: RiskPolicyDto })
  async updateRiskPolicy(
    @Param('policyId') policyId: string,
    @Body() policyData: RiskPolicyDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.riskAssessmentService.updateRiskPolicy(policyId, policyData, tenantId, userId);
  }

  @Delete('policies/:policyId')
  @Roles('admin', 'manager', 'risk_officer')
  @ApiOperation({ summary: 'Delete risk management policy' })
  @ApiParam({ name: 'policyId', description: 'Policy ID' })
  @ApiResponse({ status: 200, description: 'Risk policy deleted successfully' })
  async deleteRiskPolicy(
    @Param('policyId') policyId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.deleteRiskPolicy(policyId, tenantId);
  }

  @Post('scenarios')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Create new risk scenario' })
  @ApiResponse({ status: 201, description: 'Risk scenario created successfully', type: RiskScenarioDto })
  async createRiskScenario(
    @Body() scenarioData: RiskScenarioDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.riskAssessmentService.createRiskScenario(scenarioData, tenantId, userId);
  }

  @Post('scenarios/:scenarioId/execute')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Execute risk scenario stress test' })
  @ApiParam({ name: 'scenarioId', description: 'Scenario ID' })
  @ApiResponse({ status: 200, description: 'Risk scenario executed successfully' })
  async executeRiskScenario(
    @Param('scenarioId') scenarioId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.executeRiskScenario(scenarioId, tenantId);
  }

  @Get('insurance-calculations')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get insurance calculations and recommendations' })
  @ApiQuery({ name: 'coverageType', required: false, description: 'Coverage type filter' })
  @ApiResponse({ status: 200, description: 'Insurance calculations retrieved successfully' })
  async getInsuranceCalculations(
    @Query('coverageType') coverageType: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getInsuranceCalculations(tenantId, coverageType);
  }

  @Post('insurance-calculations')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Calculate insurance premiums and coverage' })
  @ApiResponse({ status: 200, description: 'Insurance calculations completed successfully' })
  async calculateInsurance(
    @Body() calculationRequest: { coverageType: string; amount: number; riskFactors: any[] },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.calculateInsurance(
      calculationRequest.coverageType,
      calculationRequest.amount,
      calculationRequest.riskFactors,
      tenantId,
    );
  }

  @Get('compliance-check')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Check compliance with risk management regulations' })
  @ApiQuery({ name: 'regulation', required: false, description: 'Regulation filter' })
  @ApiResponse({ status: 200, description: 'Compliance check completed successfully' })
  async checkCompliance(
    @Query('regulation') regulation: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.checkCompliance(tenantId, regulation);
  }

  @Get('risk-dashboard')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get comprehensive risk dashboard' })
  @ApiResponse({ status: 200, description: 'Risk dashboard retrieved successfully' })
  async getRiskDashboard(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskDashboard(tenantId);
  }

  @Post('alerts/:alertId/acknowledge')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Acknowledge risk alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Risk alert acknowledged successfully' })
  async acknowledgeRiskAlert(
    @Param('alertId') alertId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.riskAssessmentService.acknowledgeRiskAlert(alertId, tenantId, userId);
  }

  @Post('alerts/:alertId/resolve')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Resolve risk alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Risk alert resolved successfully' })
  async resolveRiskAlert(
    @Param('alertId') alertId: string,
    @Body() resolutionData: { resolution: string; actions: string[] },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.riskAssessmentService.resolveRiskAlert(
      alertId,
      resolutionData.resolution,
      resolutionData.actions,
      tenantId,
      userId,
    );
  }

  @Get('risk-trends')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get risk trends and patterns' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 90 })
  @ApiResponse({ status: 200, description: 'Risk trends retrieved successfully' })
  async getRiskTrends(
    @Query('timeRange') timeRange: number = 90,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskTrends(tenantId, timeRange);
  }

  @Get('risk-heatmap')
  @Roles('admin', 'manager', 'analyst', 'risk_officer')
  @ApiOperation({ summary: 'Get risk heatmap visualization' })
  @ApiResponse({ status: 200, description: 'Risk heatmap retrieved successfully' })
  async getRiskHeatmap(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.riskAssessmentService.getRiskHeatmap(tenantId);
  }
}
