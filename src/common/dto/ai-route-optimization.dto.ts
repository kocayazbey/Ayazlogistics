import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, ValidateNested, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiProperty({ description: 'Latitude', example: 40.7128 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude', example: -74.0060 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class DestinationDto {
  @ApiProperty({ description: 'Destination location' })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ description: 'Priority level (1-10)', example: 5 })
  @IsNumber()
  @Min(1)
  @Max(10)
  priority: number;

  @ApiProperty({ description: 'Destination name', example: 'Warehouse A' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Required delivery time window', required: false })
  @IsOptional()
  @IsString()
  timeWindow?: string;
}

export class RouteConstraintsDto {
  @ApiProperty({ description: 'Maximum distance in kilometers', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistance?: number;

  @ApiProperty({ description: 'Maximum time in hours', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTime?: number;

  @ApiProperty({ description: 'Vehicle capacity in cubic meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  vehicleCapacity?: number;

  @ApiProperty({ description: 'Driver working hours limit', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  maxWorkingHours?: number;
}

export class RouteOptimizationRequestDto {
  @ApiProperty({ description: 'Origin location' })
  @ValidateNested()
  @Type(() => LocationDto)
  origin: LocationDto;

  @ApiProperty({ description: 'List of destinations', type: [DestinationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DestinationDto)
  destinations: DestinationDto[];

  @ApiProperty({ description: 'Route constraints' })
  @ValidateNested()
  @Type(() => RouteConstraintsDto)
  constraints: RouteConstraintsDto;

  @ApiProperty({ description: 'Optimization algorithm', enum: ['genetic', 'simulated_annealing', 'linear_programming', 'hybrid'], required: false })
  @IsOptional()
  @IsEnum(['genetic', 'simulated_annealing', 'linear_programming', 'hybrid'])
  algorithm?: string;

  @ApiProperty({ description: 'Include real-time traffic data', required: false })
  @IsOptional()
  @IsNumber()
  includeTraffic?: boolean;

  @ApiProperty({ description: 'Include weather conditions', required: false })
  @IsOptional()
  @IsNumber()
  includeWeather?: boolean;
}

export class RouteOptimizationResponseDto {
  @ApiProperty({ description: 'Optimized route with waypoints' })
  @IsArray()
  optimizedRoute: Array<{
    lat: number;
    lng: number;
    order: number;
    name?: string;
    estimatedArrival?: string;
  }>;

  @ApiProperty({ description: 'Total distance in kilometers' })
  @IsNumber()
  totalDistance: number;

  @ApiProperty({ description: 'Total time in hours' })
  @IsNumber()
  totalTime: number;

  @ApiProperty({ description: 'Route efficiency score (0-1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  efficiency: number;

  @ApiProperty({ description: 'Optimization recommendations' })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiProperty({ description: 'Processing metadata' })
  @IsObject()
  metadata: {
    algorithm: string;
    processingTime: number;
    timestamp: string;
    confidence: number;
  };
}
