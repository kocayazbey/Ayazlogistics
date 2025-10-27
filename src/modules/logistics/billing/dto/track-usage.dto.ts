import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsUUID, IsDateString, IsOptional, Min } from 'class-validator';

export class TrackUsageDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({ example: 'storage' })
  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @ApiProperty({ example: 100, description: 'Quantity used' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'pallet/day' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: '2025-10-24T10:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  usageDate: string;

  @ApiProperty({ example: 'Warehouse A - Zone 1', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 'SKU-12345', required: false })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty({ example: 'Additional usage notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

