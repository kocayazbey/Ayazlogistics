import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class VehicleLocationDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  vehicleId: string;

  @ApiProperty({ example: '2025-10-24T00:00:00Z', description: 'Start time for location history', required: false })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '2025-10-24T23:59:59Z', description: 'End time for location history', required: false })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ example: 100, description: 'Maximum number of location points to return', required: false })
  @IsOptional()
  limit?: number;
}

