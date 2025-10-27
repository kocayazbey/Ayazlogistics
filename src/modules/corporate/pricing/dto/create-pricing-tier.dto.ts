import { IsString, IsNumber, IsEnum, IsArray, IsObject, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PricingLimitsDto {
  @ApiProperty({ description: 'API calls limit', example: 10000 })
  @IsNumber()
  @Min(0)
  apiCalls: number;

  @ApiProperty({ description: 'Storage limit in GB', example: 100 })
  @IsNumber()
  @Min(0)
  storage: number;

  @ApiProperty({ description: 'Users limit', example: 50 })
  @IsNumber()
  @Min(0)
  users: number;

  @ApiProperty({ description: 'Integrations limit', example: 10 })
  @IsNumber()
  @Min(0)
  integrations: number;

  @ApiProperty({ description: 'Custom fields limit', example: 20 })
  @IsNumber()
  @Min(0)
  customFields: number;

  @ApiProperty({ description: 'Reports limit', example: 100 })
  @IsNumber()
  @Min(0)
  reports: number;

  @ApiProperty({ description: 'Support level', example: 'standard', enum: ['basic', 'standard', 'premium', 'enterprise'] })
  @IsEnum(['basic', 'standard', 'premium', 'enterprise'])
  supportLevel: 'basic' | 'standard' | 'premium' | 'enterprise';
}

export class CreatePricingTierDto {
  @ApiProperty({ description: 'Tier name', example: 'Professional' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tier description', example: 'Professional plan for growing businesses' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Tier level', example: 'standard', enum: ['basic', 'standard', 'premium', 'enterprise'] })
  @IsEnum(['basic', 'standard', 'premium', 'enterprise'])
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';

  @ApiProperty({ description: 'Base price', example: 99.99 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Billing cycle', example: 'monthly', enum: ['monthly', 'quarterly', 'annually'] })
  @IsEnum(['monthly', 'quarterly', 'annually'])
  billingCycle: 'monthly' | 'quarterly' | 'annually';

  @ApiProperty({ description: 'Tier features', example: ['API access', 'Dashboard', 'Reports'] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'Tier limits' })
  @IsObject()
  limits: PricingLimitsDto;

  @ApiProperty({ description: 'Is tier active', example: true })
  @IsBoolean()
  isActive: boolean;
}
