import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export class InvoiceItemDto {
  @ApiProperty({ description: 'Item description', example: 'Logistics Service' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Quantity', example: 1 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ description: 'Unit price', example: 100.00 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Total price', example: 100.00 })
  @IsNumber()
  @Min(0)
  totalPrice: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Customer ID', example: 'CUST-001' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: 'Order ID', example: 'ORD-001' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Invoice status', enum: InvoiceStatus, example: InvoiceStatus.DRAFT })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiProperty({ description: 'Issue date', example: '2024-01-01' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ description: 'Due date', example: '2024-01-31' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ description: 'Subtotal', example: 100.00 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ description: 'Tax amount', example: 18.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxAmount?: number;

  @ApiProperty({ description: 'Total amount', example: 118.00 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ description: 'Payment terms', example: 'Net 30' })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty({ description: 'Notes', example: 'Thank you for your business' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Invoice items', type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}
