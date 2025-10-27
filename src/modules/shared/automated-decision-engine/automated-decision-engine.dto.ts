import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean, IsObject, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Enums
export enum RuleCategory {
  OPERATIONAL = 'operational',
  FINANCIAL = 'financial',
  RISK = 'risk',
  CUSTOMER = 'customer',
  LOGISTICS = 'logistics',
  COMPLIANCE = 'compliance',
}

export enum RulePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum RuleStatus {
  DRAFT = 'draft',
  TESTING = 'testing',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null',
  REGEX = 'regex',
}

export enum ActionType {
  SEND_NOTIFICATION = 'send_notification',
  UPDATE_STATUS = 'update_status',
  CREATE_TASK = 'create_task',
  ASSIGN_USER = 'assign_user',
  UPDATE_RECORD = 'update_record',
  TRIGGER_WORKFLOW = 'trigger_workflow',
  SEND_EMAIL = 'send_email',
  CREATE_ALERT = 'create_alert',
  CALCULATE_VALUE = 'calculate_value',
  EXECUTE_SCRIPT = 'execute_script',
}

// DTOs
export class ConditionDto {
  @ApiProperty({ description: 'Field name to evaluate' })
  @IsString()
  field: string;

  @ApiProperty({ enum: ConditionOperator, description: 'Comparison operator' })
  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @ApiProperty({ description: 'Value to compare against' })
  value: any;

  @ApiProperty({ description: 'Logical operator for combining conditions', enum: ['AND', 'OR'] })
  @IsString()
  logic: 'AND' | 'OR';
}

export class ActionDto {
  @ApiProperty({ enum: ActionType, description: 'Type of action to execute' })
  @IsEnum(ActionType)
  type: ActionType;

  @ApiProperty({ description: 'Action parameters' })
  @IsObject()
  parameters: any;

  @ApiProperty({ description: 'Action description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Action priority', required: false })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiProperty({ description: 'Action timeout in seconds', required: false })
  @IsOptional()
  @IsNumber()
  timeout?: number;
}

export class CreateDecisionRuleDto {
  @ApiProperty({ description: 'Rule name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule description' })
  @IsString()
  description: string;

  @ApiProperty({ enum: RuleCategory, description: 'Rule category' })
  @IsEnum(RuleCategory)
  category: RuleCategory;

  @ApiProperty({ enum: RulePriority, description: 'Rule priority' })
  @IsEnum(RulePriority)
  priority: RulePriority;

  @ApiProperty({ description: 'Rule conditions', type: [ConditionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions: ConditionDto[];

  @ApiProperty({ description: 'Rule actions', type: [ActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions: ActionDto[];

  @ApiProperty({ description: 'Rule tags', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Rule is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateDecisionRuleDto {
  @ApiProperty({ description: 'Rule name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Rule description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: RuleCategory, description: 'Rule category', required: false })
  @IsOptional()
  @IsEnum(RuleCategory)
  category?: RuleCategory;

  @ApiProperty({ enum: RulePriority, description: 'Rule priority', required: false })
  @IsOptional()
  @IsEnum(RulePriority)
  priority?: RulePriority;

  @ApiProperty({ description: 'Rule conditions', type: [ConditionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionDto)
  conditions?: ConditionDto[];

  @ApiProperty({ description: 'Rule actions', type: [ActionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionDto)
  actions?: ActionDto[];

  @ApiProperty({ description: 'Rule tags', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Rule is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ExecuteDecisionRuleDto {
  @ApiProperty({ description: 'Input data for rule execution' })
  @IsObject()
  input: any;

  @ApiProperty({ description: 'Execution context', required: false })
  @IsOptional()
  @IsObject()
  context?: any;

  @ApiProperty({ description: 'Execution timeout in seconds', required: false })
  @IsOptional()
  @IsNumber()
  timeout?: number = 30;
}

export class TestDecisionRuleDto {
  @ApiProperty({ description: 'Test input data' })
  @IsObject()
  input: any;

  @ApiProperty({ description: 'Test context', required: false })
  @IsOptional()
  @IsObject()
  context?: any;

  @ApiProperty({ description: 'Expected output for validation', required: false })
  @IsOptional()
  @IsObject()
  expectedOutput?: any;
}

export class DecisionRuleResponseDto {
  @ApiProperty({ description: 'Rule ID' })
  id: string;

  @ApiProperty({ description: 'Rule name' })
  name: string;

  @ApiProperty({ description: 'Rule description' })
  description: string;

  @ApiProperty({ enum: RuleCategory, description: 'Rule category' })
  category: RuleCategory;

  @ApiProperty({ enum: RulePriority, description: 'Rule priority' })
  priority: RulePriority;

  @ApiProperty({ enum: RuleStatus, description: 'Rule status' })
  status: RuleStatus;

  @ApiProperty({ description: 'Rule conditions', type: [ConditionDto] })
  conditions: ConditionDto[];

  @ApiProperty({ description: 'Rule actions', type: [ActionDto] })
  actions: ActionDto[];

  @ApiProperty({ description: 'Rule tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Rule is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Execution count' })
  executionCount: number;

  @ApiProperty({ description: 'Success rate' })
  successRate: number;

  @ApiProperty({ description: 'Last executed at' })
  lastExecuted: Date;

  @ApiProperty({ description: 'Created by' })
  createdBy: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

export class DecisionExecutionDto {
  @ApiProperty({ description: 'Execution ID' })
  id: string;

  @ApiProperty({ description: 'Rule ID' })
  ruleId: string;

  @ApiProperty({ description: 'Rule name' })
  ruleName: string;

  @ApiProperty({ description: 'Execution trigger' })
  trigger: string;

  @ApiProperty({ description: 'Input data' })
  input: any;

  @ApiProperty({ description: 'Output data' })
  output: any;

  @ApiProperty({ enum: ExecutionStatus, description: 'Execution status' })
  status: ExecutionStatus;

  @ApiProperty({ description: 'Execution time in milliseconds' })
  executionTime: number;

  @ApiProperty({ description: 'Execution timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Error message if failed', required: false })
  errorMessage?: string;

  @ApiProperty({ description: 'Execution confidence score' })
  confidence: number;

  @ApiProperty({ description: 'Generated recommendations', type: [String] })
  recommendations: string[];

  @ApiProperty({ description: 'Executed by' })
  executedBy: string;
}

export class DecisionAnalyticsDto {
  @ApiProperty({ description: 'Total rules count' })
  totalRules: number;

  @ApiProperty({ description: 'Active rules count' })
  activeRules: number;

  @ApiProperty({ description: 'Total executions count' })
  totalExecutions: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ description: 'Average execution time in milliseconds' })
  averageExecutionTime: number;

  @ApiProperty({ description: 'Top performing rules', type: [Object] })
  topPerformingRules: Array<{
    ruleId: string;
    ruleName: string;
    executions: number;
    successRate: number;
  }>;

  @ApiProperty({ description: 'Category distribution', type: [Object] })
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Performance metrics', type: Object })
  performanceMetrics: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };

  @ApiProperty({ description: 'Execution trends', type: [Object] })
  executionTrends: Array<{
    date: string;
    executions: number;
    successRate: number;
  }>;
}

export class DecisionRuleValidationDto {
  @ApiProperty({ description: 'Validation result' })
  isValid: boolean;

  @ApiProperty({ description: 'Validation errors', type: [String] })
  errors: string[];

  @ApiProperty({ description: 'Validation warnings', type: [String] })
  warnings: string[];

  @ApiProperty({ description: 'Rule complexity score' })
  complexityScore: number;

  @ApiProperty({ description: 'Performance impact score' })
  performanceImpact: number;

  @ApiProperty({ description: 'Recommended optimizations', type: [String] })
  recommendations: string[];
}

export class RulePerformanceDto {
  @ApiProperty({ description: 'Rule ID' })
  ruleId: string;

  @ApiProperty({ description: 'Rule name' })
  ruleName: string;

  @ApiProperty({ description: 'Total executions' })
  totalExecutions: number;

  @ApiProperty({ description: 'Successful executions' })
  successfulExecutions: number;

  @ApiProperty({ description: 'Failed executions' })
  failedExecutions: number;

  @ApiProperty({ description: 'Success rate percentage' })
  successRate: number;

  @ApiProperty({ description: 'Average execution time in milliseconds' })
  averageExecutionTime: number;

  @ApiProperty({ description: 'Last execution time' })
  lastExecution: Date;

  @ApiProperty({ description: 'Performance trend' })
  trend: 'improving' | 'declining' | 'stable';

  @ApiProperty({ description: 'Execution frequency per day' })
  dailyFrequency: number;

  @ApiProperty({ description: 'Peak execution time' })
  peakExecutionTime: Date;

  @ApiProperty({ description: 'Resource usage' })
  resourceUsage: {
    cpu: number;
    memory: number;
    storage: number;
  };
}

export class RuleTemplateDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiProperty({ description: 'Template description' })
  description: string;

  @ApiProperty({ enum: RuleCategory, description: 'Template category' })
  category: RuleCategory;

  @ApiProperty({ description: 'Template conditions', type: [ConditionDto] })
  conditions: ConditionDto[];

  @ApiProperty({ description: 'Template actions', type: [ActionDto] })
  actions: ActionDto[];

  @ApiProperty({ description: 'Template tags', type: [String] })
  tags: string[];

  @ApiProperty({ description: 'Template usage count' })
  usageCount: number;

  @ApiProperty({ description: 'Template rating' })
  rating: number;
}

export class BulkExecuteDto {
  @ApiProperty({ description: 'Rule IDs to execute', type: [String] })
  @IsArray()
  @IsString({ each: true })
  ruleIds: string[];

  @ApiProperty({ description: 'Input data for execution' })
  @IsObject()
  input: any;

  @ApiProperty({ description: 'Execution context', required: false })
  @IsOptional()
  @IsObject()
  context?: any;

  @ApiProperty({ description: 'Execution timeout in seconds', required: false })
  @IsOptional()
  @IsNumber()
  timeout?: number = 60;
}

export class DecisionDashboardDto {
  @ApiProperty({ description: 'Dashboard overview' })
  overview: {
    totalRules: number;
    activeRules: number;
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
  };

  @ApiProperty({ description: 'Recent executions', type: [DecisionExecutionDto] })
  recentExecutions: DecisionExecutionDto[];

  @ApiProperty({ description: 'Top performing rules', type: [Object] })
  topPerformingRules: Array<{
    ruleId: string;
    ruleName: string;
    executions: number;
    successRate: number;
  }>;

  @ApiProperty({ description: 'Execution trends', type: [Object] })
  executionTrends: Array<{
    date: string;
    executions: number;
    successRate: number;
  }>;

  @ApiProperty({ description: 'Category distribution', type: [Object] })
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'System health' })
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}
