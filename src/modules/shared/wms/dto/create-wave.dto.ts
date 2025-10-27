import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';

export enum WaveType {
  DISCRETE = 'discrete',
  BATCH = 'batch',
  ZONE = 'zone',
  CLUSTER = 'cluster',
}

export class CreateWaveDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 'Wave 2025-10-24 Morning', description: 'Wave name' })
  @IsString()
  @IsNotEmpty()
  waveName: string;

  @ApiProperty({ 
    type: [String],
    example: ['ORD-001', 'ORD-002', 'ORD-003'],
    description: 'Order IDs to include in wave' 
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderIds: string[];

  @ApiProperty({ enum: WaveType, example: WaveType.BATCH, required: false })
  @IsEnum(WaveType)
  @IsOptional()
  waveType?: WaveType;

  @ApiProperty({ example: 50, description: 'Maximum orders in wave', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(500)
  maxOrders?: number;

  @ApiProperty({ example: 1000, description: 'Maximum items in wave', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10000)
  maxItems?: number;

  @ApiProperty({ 
    type: [String],
    example: ['A', 'B', 'C'],
    description: 'Zone priority order',
    required: false 
  })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  zonePriority?: string[];

  @ApiProperty({ example: '14:00', description: 'Wave cutoff time (HH:mm)', required: false })
  @IsString()
  @IsOptional()
  cutoffTime?: string;
}
