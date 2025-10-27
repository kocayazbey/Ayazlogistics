import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum GeofenceType {
  CIRCULAR = 'circular',
  POLYGON = 'polygon',
  ROUTE_CORRIDOR = 'route_corridor',
}

export enum GeofenceEventType {
  ENTER = 'enter',
  EXIT = 'exit',
  BOTH = 'both',
}

export class CoordinateDto {
  @ApiProperty({ example: 41.0082 })
  @IsNumber()
  @Min(-90)
  latitude: number;

  @ApiProperty({ example: 28.9784 })
  @IsNumber()
  @Min(-180)
  longitude: number;
}

export class CreateGeofenceDto {
  @ApiProperty({ example: 'Istanbul Warehouse Zone' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: GeofenceType, example: GeofenceType.CIRCULAR })
  @IsEnum(GeofenceType)
  @IsNotEmpty()
  type: GeofenceType;

  @ApiProperty({ type: CoordinateDto, description: 'Center point (for circular) or first point (for polygon)' })
  @ValidateNested()
  @Type(() => CoordinateDto)
  @IsNotEmpty()
  centerPoint: CoordinateDto;

  @ApiProperty({ example: 500, description: 'Radius in meters (for circular geofence)', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  radius?: number;

  @ApiProperty({ type: [CoordinateDto], description: 'Polygon vertices (for polygon geofence)', required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoordinateDto)
  @IsOptional()
  vertices?: CoordinateDto[];

  @ApiProperty({ enum: GeofenceEventType, example: GeofenceEventType.BOTH })
  @IsEnum(GeofenceEventType)
  @IsNotEmpty()
  eventType: GeofenceEventType;

  @ApiProperty({ example: 'Warehouse security zone', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: true, description: 'Enable notifications', required: false })
  @IsOptional()
  notifyOnEvent?: boolean;
}

