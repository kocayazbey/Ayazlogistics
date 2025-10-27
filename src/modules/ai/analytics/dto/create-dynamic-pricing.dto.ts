import { IsString, IsNumber, IsArray, IsObject, IsEnum, IsDateString, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PricingFactorDto {
  @ApiProperty({ description: 'Factor type', example: 'demand', enum: ['demand', 'capacity', 'weather', 'fuel', 'competition', 'seasonal'] })
  type: 'demand' | 'capacity' | 'weather' | 'fuel' | 'competition' | 'seasonal';

  @ApiProperty({ description: 'Impact percentage', example: 15.5, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  impact: number;

  @ApiProperty({ description: 'Factor description', example: 'High demand due to holiday season' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Factor value', example: 'peak' })
  value: any;
}

export class CreateDynamicPricingDto {
  @ApiProperty({ description: 'Route ID', example: 'ROUTE-123' })
  @IsString()
  routeId: string;

  @ApiProperty({ description: 'Base price', example: 150.00 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Adjusted price', example: 172.50 })
  @IsNumber()
  @Min(0)
  adjustedPrice: number;

  @ApiProperty({ description: 'Pricing factors' })
  @IsArray()
  @IsObject({ each: true })
  factors: PricingFactorDto[];

  @ApiProperty({ description: 'Demand level', example: 'high', enum: ['low', 'medium', 'high', 'peak'] })
  @IsEnum(['low', 'medium', 'high', 'peak'])
  demandLevel: 'low' | 'medium' | 'high' | 'peak';

  @ApiProperty({ description: 'Capacity utilization percentage', example: 85.5, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  capacityUtilization: number;

  @ApiProperty({ description: 'Competitor pricing', example: 165.00, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  competitorPricing?: number;

  @ApiProperty({ description: 'Effective from date', example: '2025-01-15T00:00:00Z' })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ description: 'Effective to date', example: '2025-01-15T23:59:59Z' })
  @IsDateString()
  effectiveTo: string;

  @ApiProperty({ description: 'Is pricing active', example: true })
  @IsBoolean()
  isActive: boolean;
}
