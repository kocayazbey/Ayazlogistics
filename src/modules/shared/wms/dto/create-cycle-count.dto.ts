import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export enum CycleCountStrategy {
  ABC = 'ABC',
  RANDOM = 'RANDOM',
  ZONE = 'ZONE',
  ALL = 'ALL',
}

export class CreateCycleCountDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ enum: CycleCountStrategy, example: CycleCountStrategy.ABC, description: 'Count strategy' })
  @IsEnum(CycleCountStrategy)
  @IsNotEmpty()
  strategy: CycleCountStrategy;

  @ApiProperty({ example: 10, description: 'Number of items to count', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(1000)
  count?: number;

  @ApiProperty({ example: 'A', description: 'Specific zone to count', required: false })
  @IsString()
  @IsOptional()
  zone?: string;

  @ApiProperty({ example: '5', description: 'Specific aisle', required: false })
  @IsString()
  @IsOptional()
  aisle?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Assigned counter user ID', required: false })
  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @ApiProperty({ example: 'Monthly cycle count - Week 1', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordCountDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Cycle count task ID' })
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ example: 95, description: 'Counted quantity' })
  @IsNumber()
  @Min(0)
  countedQuantity: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 'Recount performed, confirmed quantity', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'photo_base64_data', description: 'Photo evidence', required: false })
  @IsString()
  @IsOptional()
  photo?: string;
}
