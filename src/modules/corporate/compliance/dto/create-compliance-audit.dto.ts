import { IsString, IsEnum, IsArray, IsNumber, IsDateString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ComplianceFindingDto {
  @ApiProperty({ description: 'Requirement ID', example: 'CR-1234567890' })
  @IsString()
  requirementId: string;

  @ApiProperty({ description: 'Finding severity', example: 'medium', enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Finding title', example: 'Missing access control documentation' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Finding description', example: 'Access control procedures are not documented' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Evidence references', example: ['doc1.pdf', 'screenshot1.png'] })
  @IsArray()
  @IsString({ each: true })
  evidence: string[];

  @ApiProperty({ description: 'Remediation steps', example: 'Create and implement access control procedures' })
  @IsString()
  remediation: string;

  @ApiProperty({ description: 'Due date', example: '2025-03-01T00:00:00Z' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ description: 'Assigned to user ID', example: 'user-123' })
  @IsString()
  assignedTo: string;
}

export class CreateComplianceAuditDto {
  @ApiProperty({ description: 'Framework ID', example: 'CF-1234567890' })
  @IsString()
  frameworkId: string;

  @ApiProperty({ description: 'Auditor ID', example: 'auditor-123' })
  @IsString()
  auditorId: string;

  @ApiProperty({ description: 'Audit type', example: 'internal', enum: ['internal', 'external', 'self_assessment'] })
  @IsEnum(['internal', 'external', 'self_assessment'])
  auditType: 'internal' | 'external' | 'self_assessment';

  @ApiProperty({ description: 'Start date', example: '2025-01-15T09:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date', example: '2025-01-17T17:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Audit status', example: 'planned', enum: ['planned', 'in_progress', 'completed', 'cancelled'] })
  @IsEnum(['planned', 'in_progress', 'completed', 'cancelled'])
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';

  @ApiProperty({ description: 'Audit findings' })
  @IsArray()
  @IsObject({ each: true })
  findings: ComplianceFindingDto[];

  @ApiProperty({ description: 'Audit score', example: 85, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ description: 'Recommendations', example: ['Improve documentation', 'Enhance training'] })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiProperty({ description: 'Report file path', example: '/reports/audit-2025-01.pdf', required: false })
  @IsOptional()
  @IsString()
  reportPath?: string;
}
