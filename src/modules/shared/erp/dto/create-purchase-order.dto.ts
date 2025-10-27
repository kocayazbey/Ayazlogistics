import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDateString, IsUUID, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  SENT_TO_SUPPLIER = 'sent_to_supplier',
  CONFIRMED = 'confirmed',
  PARTIALLY_RECEIVED = 'partially_received',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
  CLOSED = 'closed',
}

export enum PurchaseOrderPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class PurchaseOrderLineDto {
  @ApiProperty({ example: 'SKU-2025-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Industrial Packaging Tape' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ example: 500, description: 'Ordered quantity' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'pcs', description: 'Unit of measure' })
  @IsString()
  @IsNotEmpty()
  uom: string;

  @ApiProperty({ example: 12.50, description: 'Unit price' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 10, description: 'Discount percentage', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountPercent?: number;

  @ApiProperty({ example: 18, description: 'Tax/VAT rate percentage', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxRate?: number;

  @ApiProperty({ example: 6250, description: 'Line total amount' })
  @IsNumber()
  @Min(0)
  lineTotal: number;

  @ApiProperty({ example: '2025-11-15', description: 'Expected delivery date', required: false })
  @IsDateString()
  @IsOptional()
  expectedDeliveryDate?: string;

  @ApiProperty({ example: 'Pack in boxes of 50', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: 'PO-2025-10-001' })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Supplier ID' })
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @ApiProperty({ example: '2025-10-24', description: 'Order date' })
  @IsDateString()
  @IsNotEmpty()
  orderDate: string;

  @ApiProperty({ example: '2025-11-15', description: 'Expected delivery date' })
  @IsDateString()
  @IsNotEmpty()
  expectedDeliveryDate: string;

  @ApiProperty({ type: [PurchaseOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  @IsNotEmpty()
  lines: PurchaseOrderLineDto[];

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Delivery warehouse ID' })
  @IsUUID()
  @IsNotEmpty()
  deliveryWarehouseId: string;

  @ApiProperty({ example: 'Istanbul Main Warehouse, Gate 3' })
  @IsString()
  @IsNotEmpty()
  deliveryAddress: string;

  @ApiProperty({ example: 50000, description: 'Subtotal amount' })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ example: 5000, description: 'Discount amount', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ example: 8100, description: 'Total tax amount' })
  @IsNumber()
  @Min(0)
  taxAmount: number;

  @ApiProperty({ example: 53100, description: 'Total amount' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ example: 'TRY', description: 'Currency', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 30, description: 'Payment terms in days', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  paymentTerms?: number;

  @ApiProperty({ enum: PurchaseOrderPriority, example: PurchaseOrderPriority.NORMAL, required: false })
  @IsEnum(PurchaseOrderPriority)
  @IsOptional()
  priority?: PurchaseOrderPriority;

  @ApiProperty({ enum: PurchaseOrderStatus, example: PurchaseOrderStatus.DRAFT, required: false })
  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @ApiProperty({ example: 'REQ-2025-001', description: 'Purchase requisition reference', required: false })
  @IsString()
  @IsOptional()
  requisitionNumber?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002', description: 'Requested by user ID', required: false })
  @IsUUID()
  @IsOptional()
  requestedBy?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003', description: 'Approved by user ID', required: false })
  @IsUUID()
  @IsOptional()
  approvedBy?: string;

  @ApiProperty({ example: 'Deliver during business hours 9-17', description: 'Delivery instructions', required: false })
  @IsString()
  @IsOptional()
  deliveryInstructions?: string;

  @ApiProperty({ example: 'Urgent order - stock depletion', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

