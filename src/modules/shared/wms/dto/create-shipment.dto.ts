import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ShipmentItemDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ example: 0.5 })
  @IsNumber()
  weight: number;

  @ApiProperty({ example: { length: 10, width: 5, height: 2 } })
  @IsOptional()
  dimensions?: { length: number; width: number; height: number };
}

export class CreateShipmentDto {
  @ApiProperty({ example: 'SH-2024-001' })
  @IsString()
  shipmentNumber: string;

  @ApiProperty({ example: 'ORD-2024-001' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: 'ABC Teknoloji' })
  @IsString()
  customer: string;

  @ApiProperty({ example: 'İstanbul, Kadıköy' })
  @IsString()
  destination: string;

  @ApiProperty({ example: 'high', enum: ['high', 'normal', 'low'] })
  @IsEnum(['high', 'normal', 'low'])
  priority: string;

  @ApiProperty({ example: 'Mehmet Yılmaz' })
  @IsString()
  driver: string;

  @ApiProperty({ example: '34 ABC 123' })
  @IsString()
  vehicle: string;

  @ApiProperty({ example: 'Aras Kargo' })
  @IsString()
  carrier: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  expectedDelivery: string;

  @ApiProperty({ example: 'Fragile items' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ShipmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentItemDto)
  items: ShipmentItemDto[];
}