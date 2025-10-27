import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, IsDateString, Min, Max } from 'class-validator';

export enum CampaignType {
  DISCOUNT = 'discount',
  PROMOTION = 'promotion',
  BUNDLE = 'bundle',
  LOYALTY = 'loyalty',
  SEASONAL = 'seasonal',
  REFERRAL = 'referral',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CampaignTargetDto {
  @ApiProperty({ description: 'Target type', example: 'customer_segment' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Target value', example: 'premium_customers' })
  @IsString()
  value: string;
}

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name', example: 'Summer Sale 2024' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Campaign description', example: '20% off on all logistics services' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Campaign type', enum: CampaignType, example: CampaignType.DISCOUNT })
  @IsEnum(CampaignType)
  type: CampaignType;

  @ApiProperty({ description: 'Campaign status', enum: CampaignStatus, example: CampaignStatus.DRAFT })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiProperty({ description: 'Discount percentage', example: 20.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @ApiProperty({ description: 'Fixed discount amount', example: 100.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fixedDiscountAmount?: number;

  @ApiProperty({ description: 'Minimum order amount', example: 500.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minOrderAmount?: number;

  @ApiProperty({ description: 'Maximum discount amount', example: 1000.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxDiscountAmount?: number;

  @ApiProperty({ description: 'Start date', example: '2024-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date', example: '2024-08-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ description: 'Is active', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Campaign targets', type: [CampaignTargetDto] })
  @IsArray()
  @IsOptional()
  targets?: CampaignTargetDto[];

  @ApiProperty({ description: 'Product IDs', example: ['PROD-001', 'PROD-002'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @ApiProperty({ description: 'Customer IDs', example: ['CUST-001', 'CUST-002'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  customerIds?: string[];

  @ApiProperty({ description: 'Usage limit per customer', example: 5 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  usageLimitPerCustomer?: number;

  @ApiProperty({ description: 'Total usage limit', example: 1000 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  totalUsageLimit?: number;

  @ApiProperty({ description: 'Campaign code', example: 'SUMMER2024' })
  @IsString()
  @IsOptional()
  campaignCode?: string;

  @ApiProperty({ description: 'Notes', example: 'Summer promotion for all customers' })
  @IsString()
  @IsOptional()
  notes?: string;
}
