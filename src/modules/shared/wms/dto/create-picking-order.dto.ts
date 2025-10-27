import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsUUID,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PickingStrategy {
  FIFO = 'FIFO',
  LIFO = 'LIFO',
  FEFO = 'FEFO',
  ZONE = 'ZONE',
  BATCH = 'BATCH',
}

export enum PickingType {
  SINGLE = 'single',
  BATCH = 'batch',
  WAVE = 'wave',
  CLUSTER = 'cluster',
}

export enum PickingPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class PickingLineItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 50, description: 'Quantity to pick' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 'LOT-2025-001', description: 'Specific lot number', required: false })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiProperty({ example: 'SN-12345', description: 'Specific serial number', required: false })
  @IsString()
  @IsOptional()
  serialNumber?: string;
}

export class CreatePickingOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 'ORD-2025-12345', description: 'Sales order number' })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({ enum: PickingStrategy, example: PickingStrategy.FIFO, required: false })
  @IsEnum(PickingStrategy)
  @IsOptional()
  pickingStrategy?: PickingStrategy;

  @ApiProperty({ enum: PickingType, example: PickingType.SINGLE, required: false })
  @IsEnum(PickingType)
  @IsOptional()
  pickingType?: PickingType;

  @ApiProperty({ enum: PickingPriority, example: PickingPriority.NORMAL, required: false })
  @IsEnum(PickingPriority)
  @IsOptional()
  priority?: PickingPriority;

  @ApiProperty({ type: [PickingLineItemDto], description: 'Items to pick' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickingLineItemDto)
  @ArrayMinSize(1)
  lineItems: PickingLineItemDto[];

  @ApiProperty({ example: 'Pick for urgent customer order', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: '2025-10-24T18:00:00Z', description: 'Must be picked by', required: false })
  @IsOptional()
  requiredByDate?: Date;
}
