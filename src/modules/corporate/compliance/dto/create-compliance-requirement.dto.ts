import { IsString, IsEnum, IsArray, IsObject, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ComplianceEvidenceDto {
  @ApiProperty({ description: 'Evidence type', example: 'document', enum: ['document', 'screenshot', 'log', 'test_result', 'policy', 'procedure'] })
  @IsEnum(['document', 'screenshot', 'log', 'test_result', 'policy', 'procedure'])
  type: 'document' | 'screenshot' | 'log' | 'test_result' | 'policy' | 'procedure';

  @ApiProperty({ description: 'Evidence title', example: 'Security Policy Document' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Evidence description', example: 'Information security policy document' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'File path', example: '/documents/security-policy.pdf', required: false })
  @IsString()
  filePath?: string;

  @ApiProperty({ description: 'URL', example: 'https://example.com/policy', required: false })
  @IsString()
  url?: string;

  @ApiProperty({ description: 'Content', example: 'Policy content here', required: false })
  @IsString()
  content?: string;
}

export class CreateComplianceRequirementDto {
  @ApiProperty({ description: 'Framework ID', example: 'CF-1234567890' })
  @IsString()
  frameworkId: string;

  @ApiProperty({ description: 'Requirement code', example: 'A.5.1.1' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Requirement title', example: 'Information security policies' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Requirement description', example: 'Management shall provide direction and support for information security' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Requirement category', example: 'Information Security Management' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Requirement priority', example: 'high', enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Requirement status', example: 'not_implemented', enum: ['not_applicable', 'not_implemented', 'partially_implemented', 'fully_implemented'] })
  @IsEnum(['not_applicable', 'not_implemented', 'partially_implemented', 'fully_implemented'])
  status: 'not_applicable' | 'not_implemented' | 'partially_implemented' | 'fully_implemented';

  @ApiProperty({ description: 'Compliance evidence' })
  @IsArray()
  @IsObject({ each: true })
  evidence: ComplianceEvidenceDto[];

  @ApiProperty({ description: 'Last reviewed date', example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  lastReviewed: string;

  @ApiProperty({ description: 'Next review date', example: '2025-07-01T00:00:00Z' })
  @IsDateString()
  nextReview: string;
}
