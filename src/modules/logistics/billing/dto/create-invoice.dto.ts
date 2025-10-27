import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @ApiProperty({ example: 'Lojistik Hizmeti' })
  @IsString()
  description: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 150.00 })
  @IsNumber()
  unitPrice: number;

  @ApiProperty({ example: 15000.00 })
  @IsNumber()
  totalPrice: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'INV-2024-001' })
  @IsString()
  invoiceNumber: string;

  @ApiProperty({ example: 'ABC Teknoloji' })
  @IsString()
  customer: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsString()
  customerEmail: string;

  @ApiProperty({ example: 'İstanbul, Kadıköy' })
  @IsString()
  customerAddress: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  invoiceDate: string;

  @ApiProperty({ example: '2024-02-15' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 'TRY' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 18 })
  @IsNumber()
  taxRate: number;

  @ApiProperty({ example: 'Lojistik hizmetleri için fatura' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}