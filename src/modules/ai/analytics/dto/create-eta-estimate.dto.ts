import { IsString, IsDateString, IsNumber, IsArray, IsObject, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ETAFactorDto {
  @ApiProperty({ description: 'Factor type', example: 'traffic', enum: ['traffic', 'weather', 'route', 'vehicle', 'driver', 'historical'] })
  type: 'traffic' | 'weather' | 'route' | 'vehicle' | 'driver' | 'historical';

  @ApiProperty({ description: 'Impact value', example: 0.3, minimum: -1, maximum: 1 })
  @IsNumber()
  @Min(-1)
  @Max(1)
  impact: number;

  @ApiProperty({ description: 'Factor description', example: 'Heavy traffic on highway' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Factor value', example: 'high' })
  value: any;
}

export class CreateETAEstimateDto {
  @ApiProperty({ description: 'Shipment ID', example: 'SHIP-123' })
  @IsString()
  shipmentId: string;

  @ApiProperty({ description: 'Route ID', example: 'ROUTE-456' })
  @IsString()
  routeId: string;

  @ApiProperty({ description: 'Estimated arrival time', example: '2025-01-15T14:30:00Z' })
  @IsDateString()
  estimatedArrival: string;

  @ApiProperty({ description: 'Confidence level', example: 0.88, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'ETA factors' })
  @IsArray()
  @IsObject({ each: true })
  factors: ETAFactorDto[];

  @ApiProperty({ description: 'Actual arrival time', example: '2025-01-15T14:45:00Z', required: false })
  @IsOptional()
  @IsDateString()
  actualArrival?: string;

  @ApiProperty({ description: 'Estimate accuracy', example: 0.95, minimum: 0, maximum: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  accuracy?: number;
}
