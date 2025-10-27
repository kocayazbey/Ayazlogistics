import { IsString, IsEnum, IsArray, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DataTransferDto {
  @ApiProperty({ description: 'Transfer destination', example: 'AWS EU-West-1' })
  @IsString()
  destination: string;

  @ApiProperty({ description: 'Destination country', example: 'Ireland' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Adequacy decision', example: true })
  adequacy: boolean;

  @ApiProperty({ description: 'Safeguards', example: ['Standard Contractual Clauses', 'Binding Corporate Rules'] })
  @IsArray()
  @IsString({ each: true })
  safeguards: string[];

  @ApiProperty({ description: 'Legal basis', example: 'Standard Contractual Clauses' })
  @IsString()
  legalBasis: string;
}

export class CreateDataProcessingActivityDto {
  @ApiProperty({ description: 'Activity name', example: 'Customer data processing for logistics services' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Activity description', example: 'Processing customer personal data for logistics and delivery services' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Processing purpose', example: 'Service delivery and logistics management' })
  @IsString()
  purpose: string;

  @ApiProperty({ description: 'Legal basis', example: 'contract', enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'] })
  @IsEnum(['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'])
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';

  @ApiProperty({ description: 'Data categories', example: ['personal_data', 'contact_information', 'location_data'] })
  @IsArray()
  @IsString({ each: true })
  dataCategories: string[];

  @ApiProperty({ description: 'Data subjects', example: ['customers', 'employees', 'suppliers'] })
  @IsArray()
  @IsString({ each: true })
  dataSubjects: string[];

  @ApiProperty({ description: 'Data recipients', example: ['logistics_partners', 'payment_processors', 'customer_service'] })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiProperty({ description: 'Data transfers' })
  @IsArray()
  @IsObject({ each: true })
  transfers: DataTransferDto[];

  @ApiProperty({ description: 'Retention period in months', example: 36, minimum: 1, maximum: 120 })
  @IsNumber()
  @Min(1)
  @Max(120)
  retentionPeriod: number;

  @ApiProperty({ description: 'Security measures', example: ['encryption', 'access_controls', 'audit_logging'] })
  @IsArray()
  @IsString({ each: true })
  securityMeasures: string[];

  @ApiProperty({ description: 'Activity status', example: 'active', enum: ['active', 'inactive', 'under_review'] })
  @IsEnum(['active', 'inactive', 'under_review'])
  status: 'active' | 'inactive' | 'under_review';
}
