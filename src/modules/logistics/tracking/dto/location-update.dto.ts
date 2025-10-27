import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsUUID, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class LocationUpdateDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ example: 41.0082, description: 'Latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 28.9784, description: 'Longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ example: 65.5, description: 'Speed in km/h', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  speed?: number;

  @ApiProperty({ example: 180, description: 'Heading/bearing in degrees', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiProperty({ example: 10, description: 'GPS accuracy in meters', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  accuracy?: number;

  @ApiProperty({ example: '2025-10-24T10:30:00Z' })
  @IsDateString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({ example: 125.5, description: 'Odometer reading in km', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  odometer?: number;

  @ApiProperty({ example: 45.2, description: 'Fuel level percentage', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  fuelLevel?: number;
}

