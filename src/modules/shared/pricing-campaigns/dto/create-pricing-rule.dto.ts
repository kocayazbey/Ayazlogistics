import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, Min, Max } from 'class-validator';

export enum PricingRuleType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
  VOLUME = 'volume',
  CUSTOMER_TIER = 'customer_tier',
  SEASONAL = 'seasonal',
  DYNAMIC = 'dynamic',
}

export enum PricingRuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

export class PricingRuleConditionDto {
  @ApiProperty({ description: 'Condition field', example: 'quantity' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Condition operator', example: 'gte' })
  @IsString()
  operator: string;

  @ApiProperty({ description: 'Condition value', example: 100 })
  @IsNumber()
  value: number;
}

export class CreatePricingRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'Volume Discount Rule' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule description', example: '10% discount for orders over 100 units' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Rule type', enum: PricingRuleType, example: PricingRuleType.VOLUME })
  @IsEnum(PricingRuleType)
  type: PricingRuleType;

  @ApiProperty({ description: 'Rule status', enum: PricingRuleStatus, example: PricingRuleStatus.ACTIVE })
  @IsEnum(PricingRuleStatus)
  @IsOptional()
  status?: PricingRuleStatus;

  @ApiProperty({ description: 'Product ID', example: 'PROD-001' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: 'Customer ID', example: 'CUST-001' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: 'Discount percentage', example: 10.0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercentage?: number;

  @ApiProperty({ description: 'Fixed discount amount', example: 50.0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  fixedDiscountAmount?: number;

  @ApiProperty({ description: 'Minimum quantity', example: 100 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minQuantity?: number;

  @ApiProperty({ description: 'Maximum quantity', example: 1000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxQuantity?: number;

  @ApiProperty({ description: 'Start date', example: '2024-01-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: 'End date', example: '2024-12-31' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Priority', example: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  priority?: number;

  @ApiProperty({ description: 'Is active', example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Rule conditions', type: [PricingRuleConditionDto] })
  @IsArray()
  @IsOptional()
  conditions?: PricingRuleConditionDto[];

  @ApiProperty({ description: 'Notes', example: 'Special pricing for VIP customers' })
  @IsString()
  @IsOptional()
  notes?: string;
}
