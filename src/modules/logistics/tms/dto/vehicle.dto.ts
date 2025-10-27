import { IsString, IsOptional, IsNumber, IsEnum, IsUUID, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ description: 'Vehicle number' })
  @IsString()
  vehicleNumber: string;

  @ApiProperty({ description: 'License plate' })
  @IsString()
  licensePlate: string;

  @ApiProperty({ description: 'Vehicle type', enum: ['truck', 'van', 'car', 'motorcycle'] })
  @IsEnum(['truck', 'van', 'car', 'motorcycle'])
  vehicleType: string;

  @ApiProperty({ description: 'Vehicle make' })
  @IsString()
  make: string;

  @ApiProperty({ description: 'Vehicle model' })
  @IsString()
  model: string;

  @ApiProperty({ description: 'Manufacturing year' })
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @ApiProperty({ description: 'Vehicle capacity in cubic meters' })
  @IsNumber()
  @Min(0)
  capacity: number;

  @ApiProperty({ description: 'Maximum weight in kg' })
  @IsNumber()
  @Min(0)
  maxWeight: number;

  @ApiProperty({ description: 'Fuel type', enum: ['diesel', 'gasoline', 'electric', 'hybrid', 'lpg'] })
  @IsEnum(['diesel', 'gasoline', 'electric', 'hybrid', 'lpg'])
  fuelType: string;

  @ApiProperty({ description: 'Current odometer reading', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentOdometer?: number;

  @ApiProperty({ description: 'GPS device ID', required: false })
  @IsOptional()
  @IsString()
  gpsDevice?: string;

  @ApiProperty({ description: 'Vehicle status', enum: ['available', 'in_use', 'maintenance', 'out_of_service'], required: false })
  @IsOptional()
  @IsEnum(['available', 'in_use', 'maintenance', 'out_of_service'])
  status?: string;

  @ApiProperty({ description: 'Vehicle metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateVehicleDto {
  @ApiProperty({ description: 'License plate', required: false })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiProperty({ description: 'Vehicle type', enum: ['truck', 'van', 'car', 'motorcycle'], required: false })
  @IsOptional()
  @IsEnum(['truck', 'van', 'car', 'motorcycle'])
  vehicleType?: string;

  @ApiProperty({ description: 'Vehicle make', required: false })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiProperty({ description: 'Vehicle model', required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ description: 'Manufacturing year', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @ApiProperty({ description: 'Vehicle capacity in cubic meters', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiProperty({ description: 'Maximum weight in kg', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeight?: number;

  @ApiProperty({ description: 'Fuel type', enum: ['diesel', 'gasoline', 'electric', 'hybrid', 'lpg'], required: false })
  @IsOptional()
  @IsEnum(['diesel', 'gasoline', 'electric', 'hybrid', 'lpg'])
  fuelType?: string;

  @ApiProperty({ description: 'Current odometer reading', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentOdometer?: number;

  @ApiProperty({ description: 'GPS device ID', required: false })
  @IsOptional()
  @IsString()
  gpsDevice?: string;

  @ApiProperty({ description: 'Vehicle status', enum: ['available', 'in_use', 'maintenance', 'out_of_service'], required: false })
  @IsOptional()
  @IsEnum(['available', 'in_use', 'maintenance', 'out_of_service'])
  status?: string;

  @ApiProperty({ description: 'Vehicle metadata', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class VehicleResponseDto {
  @ApiProperty({ description: 'Vehicle ID' })
  id: string;

  @ApiProperty({ description: 'Vehicle number' })
  vehicleNumber: string;

  @ApiProperty({ description: 'License plate' })
  licensePlate: string;

  @ApiProperty({ description: 'Vehicle type' })
  vehicleType: string;

  @ApiProperty({ description: 'Vehicle make' })
  make: string;

  @ApiProperty({ description: 'Vehicle model' })
  model: string;

  @ApiProperty({ description: 'Manufacturing year' })
  year: number;

  @ApiProperty({ description: 'Vehicle capacity in cubic meters' })
  capacity: number;

  @ApiProperty({ description: 'Maximum weight in kg' })
  maxWeight: number;

  @ApiProperty({ description: 'Fuel type' })
  fuelType: string;

  @ApiProperty({ description: 'Current odometer reading' })
  currentOdometer: number;

  @ApiProperty({ description: 'GPS device ID' })
  gpsDevice: string;

  @ApiProperty({ description: 'Vehicle status' })
  status: string;

  @ApiProperty({ description: 'Vehicle metadata' })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}
