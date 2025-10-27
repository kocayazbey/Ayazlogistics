import { IsString, IsEnum, IsArray, IsObject, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ComplianceRequirementDto {
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
}

export class CreateComplianceFrameworkDto {
  @ApiProperty({ description: 'Framework name', example: 'ISO 27001:2022' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Framework type', example: 'ISO27001', enum: ['ISO27001', 'SOC2', 'GDPR', 'KVKK', 'HIPAA', 'PCI-DSS'] })
  @IsEnum(['ISO27001', 'SOC2', 'GDPR', 'KVKK', 'HIPAA', 'PCI-DSS'])
  type: 'ISO27001' | 'SOC2' | 'GDPR' | 'KVKK' | 'HIPAA' | 'PCI-DSS';

  @ApiProperty({ description: 'Framework version', example: '2022' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Framework description', example: 'Information security management system standard' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Framework requirements' })
  @IsArray()
  @IsObject({ each: true })
  requirements: ComplianceRequirementDto[];

  @ApiProperty({ description: 'Framework status', example: 'active', enum: ['draft', 'active', 'suspended', 'expired'] })
  @IsEnum(['draft', 'active', 'suspended', 'expired'])
  status: 'draft' | 'active' | 'suspended' | 'expired';

  @ApiProperty({ description: 'Valid from date', example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  validFrom: string;

  @ApiProperty({ description: 'Valid to date', example: '2025-12-31T23:59:59Z' })
  @IsDateString()
  validTo: string;
}
