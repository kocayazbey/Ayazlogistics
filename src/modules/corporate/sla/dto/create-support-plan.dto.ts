import { IsString, IsNumber, IsBoolean, IsEnum, IsArray, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseTimeDto {
  @ApiProperty({ description: 'Critical priority response time in minutes', example: 15 })
  @IsNumber()
  @Min(0)
  critical: number;

  @ApiProperty({ description: 'High priority response time in minutes', example: 60 })
  @IsNumber()
  @Min(0)
  high: number;

  @ApiProperty({ description: 'Medium priority response time in minutes', example: 240 })
  @IsNumber()
  @Min(0)
  medium: number;

  @ApiProperty({ description: 'Low priority response time in minutes', example: 480 })
  @IsNumber()
  @Min(0)
  low: number;
}

export class PricingDto {
  @ApiProperty({ description: 'Monthly price', example: 99.99 })
  @IsNumber()
  @Min(0)
  monthly: number;

  @ApiProperty({ description: 'Annual price', example: 999.99 })
  @IsNumber()
  @Min(0)
  annual: number;

  @ApiProperty({ description: 'Setup fee', example: 0 })
  @IsNumber()
  @Min(0)
  setup: number;
}

export class CreateSupportPlanDto {
  @ApiProperty({ description: 'Support plan name', example: 'Enterprise Support' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Support plan description', example: '24/7 enterprise support with dedicated account manager' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Support tier', example: 'enterprise', enum: ['basic', 'standard', 'premium', 'enterprise'] })
  @IsEnum(['basic', 'standard', 'premium', 'enterprise'])
  tier: 'basic' | 'standard' | 'premium' | 'enterprise';

  @ApiProperty({ description: 'Response time targets by priority' })
  @IsObject()
  responseTime: ResponseTimeDto;

  @ApiProperty({ description: 'Availability percentage', example: 99.9 })
  @IsNumber()
  @Min(0)
  @Max(100)
  availability: number;

  @ApiProperty({ description: 'Support features', example: ['24/7 support', 'dedicated account manager', 'phone support'] })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ description: 'Pricing structure' })
  @IsObject()
  pricing: PricingDto;

  @ApiProperty({ description: 'Is support plan active', example: true })
  @IsBoolean()
  isActive: boolean;
}
