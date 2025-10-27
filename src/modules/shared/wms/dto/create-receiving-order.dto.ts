import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivingLineItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Product ID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 100, description: 'Expected quantity' })
  @IsNumber()
  @Min(1)
  expectedQuantity: number;

  @ApiProperty({ example: 0, description: 'Received quantity', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  receivedQuantity?: number;

  @ApiProperty({ example: 'LOT-2025-001', description: 'Lot number', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lotNumber?: string;

  @ApiProperty({ example: 'SN-12345', description: 'Serial number', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  serialNumber?: string;

  @ApiProperty({ example: '2026-12-31', description: 'Expiry date', required: false })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ example: 'good', enum: ['good', 'damaged', 'expired'], required: false })
  @IsString()
  @IsOptional()
  condition?: string;

  @ApiProperty({ example: 'Minor scratches on packaging', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  damageNotes?: string;
}

export class CreateReceivingOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiProperty({ example: 'PO-2025-12345', description: 'Purchase order number', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  poNumber?: string;

  @ApiProperty({ example: 'ABC Suppliers Ltd.', description: 'Supplier name', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  supplier?: string;

  @ApiProperty({ example: '2025-10-25T10:00:00Z', description: 'Expected arrival date/time', required: false })
  @IsDateString()
  @IsOptional()
  expectedDate?: string;

  @ApiProperty({ type: [ReceivingLineItemDto], description: 'Items to receive' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivingLineItemDto)
  @ArrayMinSize(1)
  lineItems: ReceivingLineItemDto[];

  @ApiProperty({ example: 'DOCK-3', description: 'Receiving dock location', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  dockLocation?: string;

  @ApiProperty({ example: 'Handle with care - fragile items', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}
