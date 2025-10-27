import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { AutomatedDecisionEngineService } from './automated-decision-engine.service';
import {
  CreateDecisionRuleDto,
  UpdateDecisionRuleDto,
  ExecuteDecisionRuleDto,
  DecisionRuleResponseDto,
  DecisionExecutionDto,
  DecisionAnalyticsDto,
  TestDecisionRuleDto,
  DecisionRuleValidationDto,
} from './automated-decision-engine.dto';

@ApiTags('Automated Decision Engine')
@Controller({ path: 'decision-engine', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AutomatedDecisionEngineController {
  constructor(private readonly decisionEngineService: AutomatedDecisionEngineService) {}

  @Post('rules')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Create a new decision rule' })
  @ApiResponse({ status: 201, description: 'Decision rule created successfully', type: DecisionRuleResponseDto })
  async createDecisionRule(
    @Body() createRuleDto: CreateDecisionRuleDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionEngineService.createDecisionRule(createRuleDto, tenantId, userId);
  }

  @Get('rules')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get all decision rules' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by rule category' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by rule status' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by rule priority' })
  @ApiResponse({ status: 200, description: 'Decision rules retrieved successfully', type: [DecisionRuleResponseDto] })
  async getDecisionRules(
    @Query('category') category: string,
    @Query('status') status: string,
    @Query('priority') priority: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getDecisionRules(tenantId, category, status, priority);
  }

  @Get('rules/:ruleId')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get specific decision rule' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiResponse({ status: 200, description: 'Decision rule retrieved successfully', type: DecisionRuleResponseDto })
  async getDecisionRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getDecisionRule(ruleId, tenantId);
  }

  @Put('rules/:ruleId')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Update decision rule' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiResponse({ status: 200, description: 'Decision rule updated successfully', type: DecisionRuleResponseDto })
  async updateDecisionRule(
    @Param('ruleId') ruleId: string,
    @Body() updateRuleDto: UpdateDecisionRuleDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionEngineService.updateDecisionRule(ruleId, updateRuleDto, tenantId, userId);
  }

  @Delete('rules/:ruleId')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Delete decision rule' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiResponse({ status: 200, description: 'Decision rule deleted successfully' })
  async deleteDecisionRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.deleteDecisionRule(ruleId, tenantId);
  }

  @Post('rules/:ruleId/execute')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Execute decision rule' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiResponse({ status: 200, description: 'Decision rule executed successfully', type: DecisionExecutionDto })
  async executeDecisionRule(
    @Param('ruleId') ruleId: string,
    @Body() executeDto: ExecuteDecisionRuleDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.executeDecisionRule(ruleId, executeDto, tenantId);
  }

  @Post('rules/:ruleId/test')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Test decision rule with sample data' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiResponse({ status: 200, description: 'Decision rule tested successfully', type: DecisionExecutionDto })
  async testDecisionRule(
    @Param('ruleId') ruleId: string,
    @Body() testDto: TestDecisionRuleDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.testDecisionRule(ruleId, testDto, tenantId);
  }

  @Get('executions')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get decision rule executions' })
  @ApiQuery({ name: 'ruleId', required: false, description: 'Filter by rule ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by execution status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results', example: 20 })
  @ApiResponse({ status: 200, description: 'Decision executions retrieved successfully', type: [DecisionExecutionDto] })
  async getDecisionExecutions(
    @Query('ruleId') ruleId: string,
    @Query('status') status: string,
    @Query('limit') limit: number = 20,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getDecisionExecutions(tenantId, ruleId, status, limit);
  }

  @Get('executions/:executionId')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get specific decision execution' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ status: 200, description: 'Decision execution retrieved successfully', type: DecisionExecutionDto })
  async getDecisionExecution(
    @Param('executionId') executionId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getDecisionExecution(executionId, tenantId);
  }

  @Get('analytics')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get decision engine analytics' })
  @ApiQuery({ name: 'timeRange', required: false, description: 'Time range in days', example: 30 })
  @ApiResponse({ status: 200, description: 'Decision analytics retrieved successfully', type: DecisionAnalyticsDto })
  async getDecisionAnalytics(
    @Query('timeRange') timeRange: number = 30,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getDecisionAnalytics(tenantId, timeRange);
  }

  @Post('validate')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Validate decision rule logic' })
  @ApiResponse({ status: 200, description: 'Decision rule validated successfully', type: DecisionRuleValidationDto })
  async validateDecisionRule(
    @Body() validationDto: { conditions: any[]; actions: any[] },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.validateDecisionRule(validationDto, tenantId);
  }

  @Post('rules/:ruleId/activate')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Activate decision rule' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiResponse({ status: 200, description: 'Decision rule activated successfully' })
  async activateDecisionRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionEngineService.activateDecisionRule(ruleId, tenantId, userId);
  }

  @Post('rules/:ruleId/deactivate')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Deactivate decision rule' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiResponse({ status: 200, description: 'Decision rule deactivated successfully' })
  async deactivateDecisionRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionEngineService.deactivateDecisionRule(ruleId, tenantId, userId);
  }

  @Get('rules/:ruleId/performance')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get decision rule performance metrics' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiResponse({ status: 200, description: 'Rule performance metrics retrieved successfully' })
  async getRulePerformance(
    @Param('ruleId') ruleId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getRulePerformance(ruleId, tenantId);
  }

  @Get('categories')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get available rule categories' })
  @ApiResponse({ status: 200, description: 'Rule categories retrieved successfully' })
  async getRuleCategories(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getRuleCategories(tenantId);
  }

  @Get('templates')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get decision rule templates' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'Rule templates retrieved successfully' })
  async getRuleTemplates(
    @Query('category') category: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getRuleTemplates(tenantId, category);
  }

  @Post('rules/:ruleId/duplicate')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Duplicate decision rule' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiResponse({ status: 201, description: 'Decision rule duplicated successfully', type: DecisionRuleResponseDto })
  async duplicateDecisionRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.decisionEngineService.duplicateDecisionRule(ruleId, tenantId, userId);
  }

  @Get('rules/:ruleId/executions')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get executions for specific rule' })
  @ApiParam({ name: 'ruleId', description: 'Decision rule ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results', example: 50 })
  @ApiResponse({ status: 200, description: 'Rule executions retrieved successfully', type: [DecisionExecutionDto] })
  async getRuleExecutions(
    @Param('ruleId') ruleId: string,
    @Query('limit') limit: number = 50,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getRuleExecutions(ruleId, tenantId, limit);
  }

  @Post('bulk-execute')
  @Roles('admin', 'manager', 'analyst')
  @ApiOperation({ summary: 'Execute multiple decision rules' })
  @ApiResponse({ status: 200, description: 'Bulk execution completed successfully' })
  async bulkExecuteRules(
    @Body() bulkExecuteDto: { ruleIds: string[]; input: any },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.bulkExecuteRules(bulkExecuteDto, tenantId);
  }

  @Get('dashboard')
  @Roles('admin', 'manager', 'analyst', 'viewer')
  @ApiOperation({ summary: 'Get decision engine dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDecisionDashboard(
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.decisionEngineService.getDecisionDashboard(tenantId);
  }
}
