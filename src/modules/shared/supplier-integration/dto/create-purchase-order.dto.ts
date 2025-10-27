import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

export class PurchaseOrderItemDto {
  @ApiProperty({ description: 'Product ID', example: 'PROD-001' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Product name', example: 'Logistics Equipment' })
  @IsString()
  productName: string;

  @ApiProperty({ description: 'Quantity', example: 10 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price', example: 50.00 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Total price', example: 500.00 })
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiProperty({ description: 'Expected delivery date', example: '2024-01-30' })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiProperty({ description: 'Notes', example: 'High priority item' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ description: 'Supplier ID', example: 'SUP-001' })
  @IsString()
  supplierId: string;

  @ApiProperty({ description: 'Purchase order number', example: 'PO-2024-001' })
  @IsString()
  poNumber: string;

  @ApiProperty({ description: 'Purchase order status', enum: PurchaseOrderStatus, example: PurchaseOrderStatus.DRAFT })
  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @ApiProperty({ description: 'Order date', example: '2024-01-15' })
  @IsDateString()
  orderDate: string;

  @ApiProperty({ description: 'Expected delivery date', example: '2024-01-30' })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiProperty({ description: 'Subtotal', example: 1000.00 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ description: 'Tax amount', example: 180.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  taxAmount?: number;

  @ApiProperty({ description: 'Total amount', example: 1180.00 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ description: 'Payment terms', example: 'Net 30' })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty({ description: 'Shipping address', example: 'Warehouse A, 123 Industrial St' })
  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @ApiProperty({ description: 'Billing address', example: 'Company HQ, 456 Business Ave' })
  @IsString()
  @IsOptional()
  billingAddress?: string;

  @ApiProperty({ description: 'Notes', example: 'Urgent delivery required' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Purchase order items', type: [PurchaseOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
