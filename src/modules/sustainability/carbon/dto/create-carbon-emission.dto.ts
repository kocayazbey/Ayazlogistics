import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCarbonEmissionDto {
  @ApiProperty({ description: 'Emission source', example: 'Delivery Vehicle ABC-123' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'Emission category', example: 'transport', enum: ['transport', 'warehouse', 'packaging', 'energy', 'other'] })
  @IsEnum(['transport', 'warehouse', 'packaging', 'energy', 'other'])
  category: 'transport' | 'warehouse' | 'packaging' | 'energy' | 'other';

  @ApiProperty({ description: 'Emission amount in kg CO2', example: 15.5 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Emission unit', example: 'kg CO2' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Emission date', example: '2025-01-15T10:00:00Z' })
  @IsDateString()
  date: string;

  @ApiProperty({ description: 'Emission location', example: 'Istanbul, Turkey', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Vehicle ID', example: 'VEH-123', required: false })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiProperty({ description: 'Route ID', example: 'ROUTE-456', required: false })
  @IsOptional()
  @IsString()
  routeId?: string;
}
