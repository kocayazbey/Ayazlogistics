import { PartialType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';
import { IsOptional, IsString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiPropertyOptional({ description: 'Vehicle status', enum: ['active', 'inactive', 'maintenance', 'retired'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'maintenance', 'retired'])
  status?: string;

  @ApiPropertyOptional({ description: 'Current latitude' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  currentLatitude?: number;

  @ApiPropertyOptional({ description: 'Current longitude' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  currentLongitude?: number;

  @ApiPropertyOptional({ description: 'Update notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
