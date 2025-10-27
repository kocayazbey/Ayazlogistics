import { IsString, IsOptional, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ description: 'Vehicle name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'License plate number' })
  @IsString()
  licensePlate: string;

  @ApiPropertyOptional({ description: 'Vehicle identification number' })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty({ description: 'Vehicle type', enum: ['truck', 'van', 'car', 'motorcycle', 'bicycle'] })
  @IsEnum(['truck', 'van', 'car', 'motorcycle', 'bicycle'])
  type: string;

  @ApiPropertyOptional({ description: 'Vehicle make' })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional({ description: 'Vehicle model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Manufacturing year' })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear())
  year?: number;

  @ApiPropertyOptional({ description: 'Current mileage in km' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional({ description: 'Fuel efficiency in km/l' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelEfficiency?: number;

  @ApiPropertyOptional({ description: 'Fuel type', enum: ['gasoline', 'diesel', 'electric', 'hybrid'] })
  @IsOptional()
  @IsEnum(['gasoline', 'diesel', 'electric', 'hybrid'])
  fuelType?: string;

  @ApiPropertyOptional({ description: 'Vehicle capacity in kg or m³' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Maximum speed in km/h' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSpeed?: number;

  @ApiPropertyOptional({ description: 'Current driver ID' })
  @IsOptional()
  @IsString()
  currentDriverId?: string;

  @ApiPropertyOptional({ description: 'Next maintenance date' })
  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @ApiPropertyOptional({ description: 'Next maintenance mileage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  nextMaintenanceMileage?: number;

  @ApiPropertyOptional({ description: 'Insurance expiry date' })
  @IsOptional()
  @IsDateString()
  insuranceExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Registration expiry date' })
  @IsOptional()
  @IsDateString()
  registrationExpiryDate?: string;

  @ApiPropertyOptional({ description: 'Vehicle metadata' })
  @IsOptional()
  metadata?: any;
}
