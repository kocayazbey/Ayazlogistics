import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsBoolean, IsArray, ValidateNested, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export enum ZoneType {
  PICK = 'pick',
  STORAGE = 'storage',
  RESERVE = 'reserve',
  STAGING = 'staging',
  SHIPPING = 'shipping',
  RECEIVING = 'receiving',
}

export enum VelocityClass {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum AccessType {
  VNA = 'VNA',
  RT = 'RT',
  TT = 'TT',
  STANDARD = 'standard',
}

export class CreateZoneDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Zone A - High Velocity' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ enum: ZoneType })
  @IsEnum(ZoneType)
  @IsNotEmpty()
  type: ZoneType;

  @ApiPropertyOptional({ example: 90 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ enum: VelocityClass })
  @IsEnum(VelocityClass)
  @IsOptional()
  velocityClass?: VelocityClass;

  @ApiPropertyOptional({ enum: AccessType })
  @IsEnum(AccessType)
  @IsOptional()
  accessType?: AccessType;

  @ApiPropertyOptional({ example: 12 })
  @IsNumber()
  @IsOptional()
  maxHeight?: number;

  @ApiPropertyOptional({ example: 2.5 })
  @IsNumber()
  @IsOptional()
  aisleWidth?: number;
}

export class BulkCreateLocationsDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 'LOC' })
  @IsString()
  @IsNotEmpty()
  prefix: string;

  @ApiProperty({ example: 'A' })
  @IsString()
  @IsNotEmpty()
  startZone: string;

  @ApiProperty({ example: 'D' })
  @IsString()
  @IsNotEmpty()
  endZone: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  aislesPerZone: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(1)
  racksPerAisle: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(1)
  levelsPerRack: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  positionsPerLevel: number;

  @ApiProperty({ example: 'pick' })
  @IsString()
  @IsNotEmpty()
  locationType: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(1)
  maxWeight: number;

  @ApiProperty({ example: 6 })
  @IsNumber()
  @Min(0)
  height: number;
}

export class ToggleLocationsDto {
  @ApiPropertyOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  locationIds?: string[];

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  groupId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  zoneCode?: string;

  @ApiProperty({ enum: ['open', 'close'] })
  @IsEnum(['open', 'close'])
  @IsNotEmpty()
  action: 'open' | 'close';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;
}

