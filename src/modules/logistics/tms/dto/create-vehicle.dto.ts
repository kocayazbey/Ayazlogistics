import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: '34 ABC 123' })
  @IsString()
  plate: string;

  @ApiProperty({ example: 'Kamyon' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Mercedes Actros' })
  @IsString()
  model: string;

  @ApiProperty({ example: 2022 })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear())
  year: number;

  @ApiProperty({ example: '15 ton' })
  @IsString()
  capacity: string;

  @ApiProperty({ example: 'Diesel' })
  @IsString()
  fuelType: string;

  @ApiProperty({ example: 125000 })
  @IsNumber()
  @Min(0)
  mileage: number;

  @ApiProperty({ example: '2024-01-10' })
  @IsString()
  lastMaintenance: string;

  @ApiProperty({ example: '2024-02-10' })
  @IsString()
  nextMaintenance: string;

  @ApiProperty({ example: 'Active vehicle' })
  @IsOptional()
  @IsString()
  notes?: string;
}