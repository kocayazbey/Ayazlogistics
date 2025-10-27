import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
} from 'class-validator';

export enum WarehouseStatusFilter {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  ALL = 'all',
}

export class WarehouseFilterDto {
  @ApiProperty({ example: 'Istanbul', description: 'City filter', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Turkey', description: 'Country filter', required: false })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ enum: WarehouseStatusFilter, description: 'Status filter', required: false })
  @IsEnum(WarehouseStatusFilter)
  @IsOptional()
  status?: WarehouseStatusFilter;

  @ApiProperty({ example: 'distribution_center', description: 'Warehouse type', required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: 'istanbul', description: 'Search term', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}
