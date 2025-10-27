import { IsArray, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptimizeRouteDto {
  @ApiProperty({ description: 'Route IDs to optimize', type: [String] })
  @IsArray()
  @IsString({ each: true })
  routeIds: string[];

  @ApiProperty({ description: 'Optimization type', enum: ['distance', 'time', 'fuel', 'balanced'] })
  @IsEnum(['distance', 'time', 'fuel', 'balanced'])
  optimizationType: string;

  @ApiPropertyOptional({ description: 'Optimization constraints' })
  @IsOptional()
  @IsObject()
  constraints?: {
    maxDistance?: number;
    maxDuration?: number;
    maxStops?: number;
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    vehicleType?: string;
  };

  @ApiPropertyOptional({ description: 'Optimization metadata' })
  @IsOptional()
  metadata?: any;
}
