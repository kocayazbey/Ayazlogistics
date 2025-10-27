import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum MovementType {
  RECEIPT = 'receipt',
  SHIPMENT = 'shipment',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  COUNT = 'count',
  PUTAWAY = 'putaway',
  PICKING = 'picking',
}

export class CreateMovementDto {
  @ApiProperty({ description: 'Product ID', example: 'PROD-001' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID', example: 'WH-001' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Location ID', example: 'LOC-001' })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ description: 'Movement type', enum: MovementType, example: MovementType.RECEIPT })
  @IsEnum(MovementType)
  movementType: MovementType;

  @ApiProperty({ description: 'Quantity moved', example: 10 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'From location ID', example: 'LOC-001' })
  @IsString()
  @IsOptional()
  fromLocationId?: string;

  @ApiProperty({ description: 'To location ID', example: 'LOC-002' })
  @IsString()
  @IsOptional()
  toLocationId?: string;

  @ApiProperty({ description: 'Reference type', example: 'order' })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiProperty({ description: 'Reference ID', example: 'ORD-001' })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiProperty({ description: 'Movement notes', example: 'Transfer between locations' })
  @IsString()
  @IsOptional()
  notes?: string;
}
