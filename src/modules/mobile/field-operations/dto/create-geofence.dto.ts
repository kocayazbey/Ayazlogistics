import { IsString, IsEnum, IsArray, IsObject, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GeofenceCoordinateDto {
  @ApiProperty({ description: 'Latitude', example: 41.0082 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 28.9784 })
  @IsNumber()
  longitude: number;
}

export class GeofenceRuleDto {
  @ApiProperty({ description: 'Rule trigger', example: 'enter', enum: ['enter', 'exit', 'dwell'] })
  @IsEnum(['enter', 'exit', 'dwell'])
  trigger: 'enter' | 'exit' | 'dwell';

  @ApiProperty({ description: 'Rule action', example: 'notify', enum: ['notify', 'log', 'restrict', 'allow'] })
  @IsEnum(['notify', 'log', 'restrict', 'allow'])
  action: 'notify' | 'log' | 'restrict' | 'allow';

  @ApiProperty({ description: 'Rule conditions', example: ['time_based', 'vehicle_type'] })
  @IsArray()
  @IsString({ each: true })
  conditions: string[];

  @ApiProperty({ description: 'Is rule active', example: true })
  @IsBoolean()
  isActive: boolean;
}

export class CreateGeofenceDto {
  @ApiProperty({ description: 'Geofence name', example: 'Warehouse Zone A' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Geofence description', example: 'Main warehouse delivery zone' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Geofence type', example: 'warehouse', enum: ['warehouse', 'delivery_zone', 'restricted_area', 'pickup_zone'] })
  @IsEnum(['warehouse', 'delivery_zone', 'restricted_area', 'pickup_zone'])
  type: 'warehouse' | 'delivery_zone' | 'restricted_area' | 'pickup_zone';

  @ApiProperty({ description: 'Geofence coordinates' })
  @IsArray()
  @IsObject({ each: true })
  coordinates: GeofenceCoordinateDto[];

  @ApiProperty({ description: 'Geofence radius in meters', example: 100, required: false })
  @IsOptional()
  @IsNumber()
  radius?: number;

  @ApiProperty({ description: 'Is geofence active', example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Geofence rules' })
  @IsArray()
  @IsObject({ each: true })
  rules: GeofenceRuleDto[];
}
