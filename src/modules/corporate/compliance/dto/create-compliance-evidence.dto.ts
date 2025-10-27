import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateComplianceEvidenceDto {
  @ApiProperty({ description: 'Requirement ID', example: 'CR-1234567890' })
  @IsString()
  requirementId: string;

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
  @IsOptional()
  @IsString()
  filePath?: string;

  @ApiProperty({ description: 'URL', example: 'https://example.com/policy', required: false })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({ description: 'Content', example: 'Policy content here', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: 'Uploaded by user ID', example: 'user-123' })
  @IsString()
  uploadedBy: string;

  @ApiProperty({ description: 'Verified by user ID', example: 'auditor-456', required: false })
  @IsOptional()
  @IsString()
  verifiedBy?: string;

  @ApiProperty({ description: 'Verified at date', example: '2025-01-15T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  verifiedAt?: string;
}
