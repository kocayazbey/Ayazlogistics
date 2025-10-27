import { IsString, IsNumber, IsArray, IsObject, IsBoolean, IsEnum, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UsageTierDto {
  @ApiProperty({ description: 'Minimum quantity', example: 0 })
  @IsNumber()
  @Min(0)
  min: number;

  @ApiProperty({ description: 'Maximum quantity', example: 1000, required: false })
  @IsNumber()
  @Min(0)
  max?: number;

  @ApiProperty({ description: 'Price per unit', example: 0.01 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Pricing type', example: 'per_unit', enum: ['per_unit', 'flat_rate'] })
  @IsEnum(['per_unit', 'flat_rate'])
  type: 'per_unit' | 'flat_rate';
}

export class CreateUsageBasedPricingDto {
  @ApiProperty({ description: 'Metric name', example: 'api_calls' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Unit of measurement', example: 'calls' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Base price', example: 0.01 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Usage tiers' })
  @IsArray()
  @IsObject({ each: true })
  tiers: UsageTierDto[];

  @ApiProperty({ description: 'Is pricing active', example: true })
  @IsBoolean()
  isActive: boolean;
}
