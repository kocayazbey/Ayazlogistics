import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';

export enum LocationType {
  PICK = 'pick',
  RESERVE = 'reserve',
  STAGING = 'staging',
  DOCK = 'dock',
  HAZMAT = 'hazmat',
  COLD_STORAGE = 'cold_storage',
  RETURNS = 'returns',
}

export class LocationFilterDto {
  @ApiProperty({ example: 'A', description: 'Zone filter', required: false })
  @IsString()
  @IsOptional()
  zone?: string;

  @ApiProperty({ example: '5', description: 'Aisle filter', required: false })
  @IsString()
  @IsOptional()
  aisle?: string;

  @ApiProperty({ example: '10', description: 'Rack filter', required: false })
  @IsString()
  @IsOptional()
  rack?: string;

  @ApiProperty({ enum: LocationType, description: 'Location type', required: false })
  @IsEnum(LocationType)
  @IsOptional()
  locationType?: LocationType;

  @ApiProperty({ example: false, description: 'Show only available locations', required: false })
  @IsBoolean()
  @IsOptional()
  availableOnly?: boolean;

  @ApiProperty({ example: false, description: 'Show only occupied locations', required: false })
  @IsBoolean()
  @IsOptional()
  occupiedOnly?: boolean;

  @ApiProperty({ example: true, description: 'Exclude locked locations', required: false })
  @IsBoolean()
  @IsOptional()
  excludeLocked?: boolean;
}
