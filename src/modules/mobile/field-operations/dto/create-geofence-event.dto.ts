import { IsString, IsEnum, IsObject, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GeofenceEventLocationDto {
  @ApiProperty({ description: 'Latitude', example: 41.0082 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 28.9784 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ description: 'Accuracy in meters', example: 5.0 })
  @IsNumber()
  accuracy: number;
}

export class CreateGeofenceEventDto {
  @ApiProperty({ description: 'Geofence ID', example: 'GF-123' })
  @IsString()
  geofenceId: string;

  @ApiProperty({ description: 'Driver ID', example: 'DRIVER-123' })
  @IsString()
  driverId: string;

  @ApiProperty({ description: 'Vehicle ID', example: 'VEHICLE-456', required: false })
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @ApiProperty({ description: 'Event type', example: 'enter', enum: ['enter', 'exit', 'dwell'] })
  @IsEnum(['enter', 'exit', 'dwell'])
  eventType: 'enter' | 'exit' | 'dwell';

  @ApiProperty({ description: 'Event location' })
  @IsObject()
  location: GeofenceEventLocationDto;

  @ApiProperty({ description: 'Event duration in seconds', example: 300, required: false })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiProperty({ description: 'Is event processed', example: false })
  @IsBoolean()
  isProcessed: boolean;
}
