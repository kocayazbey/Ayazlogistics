import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TrackShipmentDto {
  @ApiProperty({ example: 'SHIP-2025-10-001' })
  @IsString()
  @IsNotEmpty()
  trackingNumber: string;

  @ApiProperty({ example: 'customer@example.com', description: 'Email for tracking updates', required: false })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+905551234567', description: 'Phone for SMS updates', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

