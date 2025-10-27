import { IsString, IsEnum, IsObject, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ description: 'Latitude', example: 41.0082 })
  latitude: number;

  @ApiProperty({ description: 'Longitude', example: 28.9784 })
  longitude: number;

  @ApiProperty({ description: 'Accuracy in meters', example: 5.0 })
  accuracy: number;

  @ApiProperty({ description: 'Location timestamp', example: '2025-01-15T10:00:00Z' })
  @IsDateString()
  timestamp: string;
}

export class CreateOfflineOperationDto {
  @ApiProperty({ description: 'Driver ID', example: 'DRIVER-123' })
  @IsString()
  driverId: string;

  @ApiProperty({ description: 'Operation type', example: 'pickup', enum: ['pickup', 'delivery', 'inventory', 'maintenance'] })
  @IsEnum(['pickup', 'delivery', 'inventory', 'maintenance'])
  operationType: 'pickup' | 'delivery' | 'inventory' | 'maintenance';

  @ApiProperty({ description: 'Operation status', example: 'pending', enum: ['pending', 'in_progress', 'completed', 'failed', 'synced'] })
  @IsEnum(['pending', 'in_progress', 'completed', 'failed', 'synced'])
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'synced';

  @ApiProperty({ description: 'Operation data', example: { orderId: 'ORD-123', items: ['item1', 'item2'] } })
  @IsObject()
  data: Record<string, any>;

  @ApiProperty({ description: 'Location information' })
  @IsObject()
  location: LocationDto;

  @ApiProperty({ description: 'Offline since date', example: '2025-01-15T09:00:00Z' })
  @IsDateString()
  offlineSince: string;

  @ApiProperty({ description: 'Synced at date', example: '2025-01-15T11:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  syncedAt?: string;
}
