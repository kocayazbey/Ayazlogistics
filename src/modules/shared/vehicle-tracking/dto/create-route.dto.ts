import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum RouteStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class RouteStopDto {
  @ApiProperty({ description: 'Stop sequence', example: 1 })
  @IsNumber()
  stopSequence: number;

  @ApiProperty({ description: 'Customer name', example: 'ABC Company' })
  @IsString()
  customerName: string;

  @ApiProperty({ description: 'Address', example: '123 Main St' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'City', example: 'Istanbul' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State', example: 'Istanbul' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'Postal code', example: '34000' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: 'Country', example: 'Turkey' })
  @IsString()
  country: string;

  @ApiProperty({ description: 'Contact phone', example: '+90 212 123 4567' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ description: 'Contact email', example: 'contact@abc.com' })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({ description: 'Latitude', example: 41.0082 })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ description: 'Longitude', example: 28.9784 })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({ description: 'Estimated arrival time', example: '2024-01-01T10:00:00Z' })
  @IsString()
  @IsOptional()
  estimatedArrival?: string;

  @ApiProperty({ description: 'Delivery notes', example: 'Call before delivery' })
  @IsString()
  @IsOptional()
  deliveryNotes?: string;
}

export class CreateRouteDto {
  @ApiProperty({ description: 'Route name', example: 'Morning Delivery Route' })
  @IsString()
  routeName: string;

  @ApiProperty({ description: 'Driver ID', example: 'DRV-001' })
  @IsString()
  @IsOptional()
  driverId?: string;

  @ApiProperty({ description: 'Vehicle ID', example: 'VEH-001' })
  @IsString()
  @IsOptional()
  vehicleId?: string;

  @ApiProperty({ description: 'Route status', enum: RouteStatus, example: RouteStatus.PLANNED })
  @IsEnum(RouteStatus)
  @IsOptional()
  status?: RouteStatus;

  @ApiProperty({ description: 'Start location', example: 'Warehouse A' })
  @IsString()
  @IsOptional()
  startLocation?: string;

  @ApiProperty({ description: 'End location', example: 'Warehouse A' })
  @IsString()
  @IsOptional()
  endLocation?: string;

  @ApiProperty({ description: 'Total distance in km', example: 150.5 })
  @IsNumber()
  @IsOptional()
  totalDistanceKm?: number;

  @ApiProperty({ description: 'Estimated duration in hours', example: 4.5 })
  @IsNumber()
  @IsOptional()
  estimatedDurationHours?: number;

  @ApiProperty({ description: 'Route stops', type: [RouteStopDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  @IsOptional()
  stops?: RouteStopDto[];
}
