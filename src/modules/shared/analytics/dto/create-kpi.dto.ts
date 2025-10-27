import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, Min } from 'class-validator';

export enum KPICategory {
  FINANCIAL = 'financial',
  OPERATIONAL = 'operational',
  CUSTOMER = 'customer',
  QUALITY = 'quality',
  SAFETY = 'safety',
  HR = 'hr',
  LOGISTICS = 'logistics',
}

export enum KPIFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

export enum KPIStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export class CreateKPIDto {
  @ApiProperty({ example: 'On-Time Delivery Rate' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'KPI-OTD-001' })
  @IsString()
  @IsNotEmpty()
  kpiCode: string;

  @ApiProperty({ enum: KPICategory, example: KPICategory.OPERATIONAL })
  @IsEnum(KPICategory)
  @IsNotEmpty()
  category: KPICategory;

  @ApiProperty({ example: 'Percentage of deliveries made on or before scheduled time', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '(On-time Deliveries / Total Deliveries) * 100', description: 'Calculation formula', required: false })
  @IsString()
  @IsOptional()
  formula?: string;

  @ApiProperty({ example: '%', description: 'Unit of measurement' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: 95, description: 'Target value' })
  @IsNumber()
  @Min(0)
  targetValue: number;

  @ApiProperty({ example: 90, description: 'Warning threshold', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  warningThreshold?: number;

  @ApiProperty({ example: 85, description: 'Critical threshold', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  criticalThreshold?: number;

  @ApiProperty({ enum: KPIFrequency, example: KPIFrequency.MONTHLY })
  @IsEnum(KPIFrequency)
  @IsNotEmpty()
  frequency: KPIFrequency;

  @ApiProperty({ example: '2025-01-01', description: 'KPI start date', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: '2025-12-31', description: 'KPI end date', required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ example: 'John Doe', description: 'KPI owner/responsible person', required: false })
  @IsString()
  @IsOptional()
  owner?: string;

  @ApiProperty({ enum: KPIStatus, example: KPIStatus.ACTIVE, required: false })
  @IsEnum(KPIStatus)
  @IsOptional()
  status?: KPIStatus;

  @ApiProperty({ example: 'Critical for customer satisfaction', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

