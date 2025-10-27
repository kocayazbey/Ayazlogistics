import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsArray, ValidateNested, IsEnum, IsOptional, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PickingItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'A-01-01' })
  @IsString()
  @IsOptional()
  preferredLocation?: string;
}

export enum PickingPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum PickingStrategy {
  FIFO = 'fifo',
  FEFO = 'fefo',
  ZONE = 'zone',
  BATCH = 'batch',
}

export class CreatePickingDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'ORD-2025-001' })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({ enum: PickingPriority, example: PickingPriority.NORMAL })
  @IsEnum(PickingPriority)
  priority: PickingPriority;

  @ApiProperty({ enum: PickingStrategy, example: PickingStrategy.FIFO })
  @IsEnum(PickingStrategy)
  pickingStrategy: PickingStrategy;

  @ApiProperty({ type: [PickingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickingItemDto)
  items: PickingItemDto[];
}

