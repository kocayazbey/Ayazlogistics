import { IsString, IsEnum, IsNumber, IsBoolean, IsDateString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaxRuleDto {
  @ApiProperty({ description: 'Country code', example: 'TR' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Region/State', example: 'Istanbul', required: false })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ description: 'Tax type', example: 'VAT', enum: ['VAT', 'GST', 'Sales', 'Service'] })
  @IsEnum(['VAT', 'GST', 'Sales', 'Service'])
  taxType: 'VAT' | 'GST' | 'Sales' | 'Service';

  @ApiProperty({ description: 'Tax rate percentage', example: 18.0, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @ApiProperty({ description: 'Is tax rule active', example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Effective from date', example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ description: 'Effective to date', example: '2025-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
