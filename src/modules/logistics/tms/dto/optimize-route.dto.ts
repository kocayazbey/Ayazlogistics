import { IsArray, IsUUID, IsOptional, IsString, IsNumber, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StopDto {
  @ApiProperty({ description: 'Stop ID' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;

  @ApiProperty({ description: 'Address' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Stop type', enum: ['pickup', 'delivery', 'service'] })
  @IsEnum(['pickup', 'delivery', 'service'])
  stopType: string;

  @ApiProperty({ description: 'Estimated arrival time', required: false })
  @IsOptional()
  @IsDateString()
  estimatedArrival?: string;

  @ApiProperty({ description: 'Time window start', required: false })
  @IsOptional()
  @IsDateString()
  timeWindowStart?: string;

  @ApiProperty({ description: 'Time window end', required: false })
  @IsOptional()
  @IsDateString()
  timeWindowEnd?: string;

  @ApiProperty({ description: 'Service duration in minutes', required: false })
  @IsOptional()
  @IsNumber()
  serviceDuration?: number;

  @ApiProperty({ description: 'Priority level', enum: ['low', 'normal', 'high', 'urgent'] })
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority: string;

  @ApiProperty({ description: 'Weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiProperty({ description: 'Volume in cubic meters', required: false })
  @IsOptional()
  @IsNumber()
  volume?: number;
}

export class OptimizeRouteDto {
  @ApiProperty({ description: 'Array of stops to optimize', type: [StopDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StopDto)
  stops: StopDto[];

  @ApiProperty({ description: 'Vehicle ID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ description: 'Driver ID' })
  @IsUUID()
  driverId: string;

  @ApiProperty({ description: 'Optimization algorithm', enum: ['genetic', 'nearest_neighbor', 'simulated_annealing'], required: false })
  @IsOptional()
  @IsEnum(['genetic', 'nearest_neighbor', 'simulated_annealing'])
  algorithm?: string;

  @ApiProperty({ description: 'Maximum route duration in minutes', required: false })
  @IsOptional()
  @IsNumber()
  maxDuration?: number;

  @ApiProperty({ description: 'Maximum distance in km', required: false })
  @IsOptional()
  @IsNumber()
  maxDistance?: number;

  @ApiProperty({ description: 'Consider time windows', required: false })
  @IsOptional()
  considerTimeWindows?: boolean;

  @ApiProperty({ description: 'Consider vehicle capacity', required: false })
  @IsOptional()
  considerCapacity?: boolean;

  @ApiProperty({ description: 'Optimization preferences', required: false })
  @IsOptional()
  preferences?: {
    minimizeDistance?: boolean;
    minimizeTime?: boolean;
    balanceLoad?: boolean;
  };
}