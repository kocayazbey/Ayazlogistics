import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsBoolean, ValidateNested, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum WarehouseType {
  DISTRIBUTION_CENTER = 'distribution_center',
  FULFILLMENT_CENTER = 'fulfillment_center',
  COLD_STORAGE = 'cold_storage',
  BONDED_WAREHOUSE = 'bonded_warehouse',
  CROSS_DOCK = 'cross_dock',
  GENERAL = 'general',
}

export enum WarehouseStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  CONSTRUCTION = 'construction',
}

export class OperatingHoursDto {
  @ApiProperty({ example: 'Monday' })
  @IsString()
  @IsNotEmpty()
  day: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  openTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @IsNotEmpty()
  closeTime: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;
}

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Istanbul Main Warehouse' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'WH-IST-001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: WarehouseType, example: WarehouseType.DISTRIBUTION_CENTER })
  @IsEnum(WarehouseType)
  @IsNotEmpty()
  type: WarehouseType;

  @ApiProperty({ example: 'Tuzla, Istanbul, Turkey' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Tuzla' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Turkey' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: '34940', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ example: '41.0082,28.9784', description: 'Latitude,Longitude', required: false })
  @IsString()
  @IsOptional()
  coordinates?: string;

  @ApiProperty({ example: 50000, description: 'Total area in square meters' })
  @IsNumber()
  @Min(0)
  totalArea: number;

  @ApiProperty({ example: 40000, description: 'Storage area in square meters', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  storageArea?: number;

  @ApiProperty({ example: 100000, description: 'Storage capacity in pallets', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  capacity?: number;

  @ApiProperty({ example: 20, description: 'Number of loading docks', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  loadingDocks?: number;

  @ApiProperty({ example: true, description: 'Has temperature control', required: false })
  @IsBoolean()
  @IsOptional()
  hasTemperatureControl?: boolean;

  @ApiProperty({ example: true, description: 'Has security system', required: false })
  @IsBoolean()
  @IsOptional()
  hasSecuritySystem?: boolean;

  @ApiProperty({ example: true, description: 'Has fire suppression', required: false })
  @IsBoolean()
  @IsOptional()
  hasFireSuppression?: boolean;

  @ApiProperty({ type: [OperatingHoursDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperatingHoursDto)
  @IsOptional()
  operatingHours?: OperatingHoursDto[];

  @ApiProperty({ enum: WarehouseStatus, example: WarehouseStatus.ACTIVE, required: false })
  @IsEnum(WarehouseStatus)
  @IsOptional()
  status?: WarehouseStatus;

  @ApiProperty({ example: 'Main distribution center for Istanbul region', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'John Doe', description: 'Warehouse manager name', required: false })
  @IsString()
  @IsOptional()
  managerName?: string;

  @ApiProperty({ example: '+905551234567', description: 'Contact phone', required: false })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ example: 'warehouse@example.com', description: 'Contact email', required: false })
  @IsString()
  @IsOptional()
  contactEmail?: string;
}

