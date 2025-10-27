import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';

export class PickItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Picking order ID' })
  @IsUUID()
  @IsNotEmpty()
  pickingOrderId: string;

  @ApiProperty({ example: 'TASK-12345', description: 'Task ID' })
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Location ID' })
  @IsUUID()
  @IsNotEmpty()
  locationId: string;

  @ApiProperty({ example: 50, description: 'Quantity picked' })
  @IsNumber()
  @Min(1)
  quantityPicked: number;

  @ApiProperty({ example: 'A1-01-02-03', description: 'Actual location if different', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  actualLocation?: string;

  @ApiProperty({ example: 'Product found in adjacent bin', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}

export class BulkPickDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Picking order ID' })
  @IsUUID()
  @IsNotEmpty()
  pickingOrderId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 'TOTE-123', description: 'Tote or container ID', required: false })
  @IsString()
  @IsOptional()
  containerId?: string;
}
