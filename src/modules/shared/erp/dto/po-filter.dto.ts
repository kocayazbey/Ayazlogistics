import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import { PurchaseOrderStatus, PurchaseOrderPriority } from './create-purchase-order.dto';

export class POFilterDto {
  @ApiPropertyOptional({ enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ enum: PurchaseOrderPriority })
  @IsEnum(PurchaseOrderPriority)
  @IsOptional()
  priority?: PurchaseOrderPriority;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  deliveryWarehouseId?: string;

  @ApiPropertyOptional({ example: 'PO-2025' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: '2025-10-01' })
  @IsDateString()
  @IsOptional()
  orderDateFrom?: string;

  @ApiPropertyOptional({ example: '2025-10-31' })
  @IsDateString()
  @IsOptional()
  orderDateTo?: string;

  @ApiPropertyOptional({ example: '2025-11-01' })
  @IsDateString()
  @IsOptional()
  expectedDeliveryFrom?: string;

  @ApiPropertyOptional({ example: '2025-11-30' })
  @IsDateString()
  @IsOptional()
  expectedDeliveryTo?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  limit?: number;
}

