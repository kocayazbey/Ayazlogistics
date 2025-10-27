import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiptItemDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ example: 12000 })
  @IsNumber()
  unitCost: number;

  @ApiProperty({ example: 'A-1-15' })
  @IsString()
  location: string;
}

export class CreateReceiptDto {
  @ApiProperty({ example: 'RC-2024-001' })
  @IsString()
  receiptNumber: string;

  @ApiProperty({ example: 'ABC Tedarik' })
  @IsString()
  supplier: string;

  @ApiProperty({ example: 'PO-2024-001' })
  @IsString()
  poNumber: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  expectedDate: string;

  @ApiProperty({ example: 750000 })
  @IsNumber()
  totalValue: number;

  @ApiProperty({ example: 'High priority delivery' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ReceiptItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiptItemDto)
  items: ReceiptItemDto[];
}
