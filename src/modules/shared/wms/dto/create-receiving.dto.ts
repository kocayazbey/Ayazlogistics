import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUUID, IsArray, ValidateNested, IsDate, IsOptional, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceivingItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  expectedQuantity: number;

  @ApiPropertyOptional({ example: 25.50 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  unitCost?: number;
}

export class CreateReceivingDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional({ example: 'PO-2025-001' })
  @IsString()
  @IsOptional()
  purchaseOrderId?: string;

  @ApiProperty({ example: '2025-10-25T10:00:00Z' })
  @Type(() => Date)
  @IsDate()
  expectedDate: Date;

  @ApiProperty({ type: [ReceivingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivingItemDto)
  items: ReceivingItemDto[];

  @ApiPropertyOptional({ example: 'Urgent delivery' })
  @IsString()
  @IsOptional()
  notes?: string;
}

