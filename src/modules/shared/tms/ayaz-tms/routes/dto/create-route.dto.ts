import { IsString, IsOptional, IsNumber, IsUUID, IsArray, ValidateNested, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRouteStopDto {
  @ApiProperty({ description: 'Stop name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Stop description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Stop latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Stop longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'Stop address' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Stop metadata' })
  @IsOptional()
  metadata?: any;
}

export class CreateRouteDto {
  @ApiProperty({ description: 'Route name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Route description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Vehicle ID' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ description: 'Driver ID' })
  @IsUUID()
  driverId: string;

  @ApiProperty({ description: 'Start latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  startLatitude: number;

  @ApiProperty({ description: 'Start longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  startLongitude: number;

  @ApiProperty({ description: 'End latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  endLatitude: number;

  @ApiProperty({ description: 'End longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  endLongitude: number;

  @ApiPropertyOptional({ description: 'Route priority', enum: ['low', 'medium', 'high', 'urgent'] })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiPropertyOptional({ description: 'Planned duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedDuration?: number;

  @ApiPropertyOptional({ description: 'Route stops' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStopDto)
  stops?: CreateRouteStopDto[];

  @ApiPropertyOptional({ description: 'Route metadata' })
  @IsOptional()
  metadata?: any;
}
