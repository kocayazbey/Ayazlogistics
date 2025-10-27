import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, IsUUID, Min } from 'class-validator';

export enum MovementType {
  RECEIPT = 'receipt',
  ISSUE = 'issue',
  TRANSFER = 'transfer',
  ADJUSTMENT = 'adjustment',
  RETURN = 'return',
  PRODUCTION = 'production',
  SCRAP = 'scrap',
  SALE = 'sale',
  PURCHASE = 'purchase',
}

export enum MovementStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
}

export class CreateStockMovementDto {
  @ApiProperty({ example: 'MOV-2025-10-001' })
  @IsString()
  @IsNotEmpty()
  movementNumber: string;

  @ApiProperty({ example: 'SKU-2025-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ enum: MovementType, example: MovementType.RECEIPT })
  @IsEnum(MovementType)
  @IsNotEmpty()
  movementType: MovementType;

  @ApiProperty({ example: 100, description: 'Quantity moved' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'pcs', description: 'Unit of measure' })
  @IsString()
  @IsNotEmpty()
  uom: string;

  @ApiProperty({ example: '2025-10-24T10:00:00Z', description: 'Movement date/time' })
  @IsDateString()
  @IsNotEmpty()
  movementDate: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Source warehouse/location ID', required: false })
  @IsUUID()
  @IsOptional()
  sourceLocationId?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Destination warehouse/location ID', required: false })
  @IsUUID()
  @IsOptional()
  destinationLocationId?: string;

  @ApiProperty({ example: 15.50, description: 'Unit cost at time of movement', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  unitCost?: number;

  @ApiProperty({ example: 1550, description: 'Total movement value', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalValue?: number;

  @ApiProperty({ example: 'LOT-2025-001', description: 'Batch/lot number', required: false })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiProperty({ example: 'SN-001,SN-002', description: 'Serial numbers (comma-separated)', required: false })
  @IsString()
  @IsOptional()
  serialNumbers?: string;

  @ApiProperty({ example: 'PO-2025-001', description: 'Reference document (PO, SO, etc.)', required: false })
  @IsString()
  @IsOptional()
  referenceDocument?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Related customer/supplier ID', required: false })
  @IsUUID()
  @IsOptional()
  relatedEntityId?: string;

  @ApiProperty({ example: 'John Doe', description: 'Person who performed the movement' })
  @IsString()
  @IsNotEmpty()
  performedBy: string;

  @ApiProperty({ enum: MovementStatus, example: MovementStatus.COMPLETED, required: false })
  @IsEnum(MovementStatus)
  @IsOptional()
  status?: MovementStatus;

  @ApiProperty({ example: 'Receipt from supplier delivery', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

