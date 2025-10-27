import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, Min } from 'class-validator';

export enum LotStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  DEPLETED = 'depleted',
}

export class CreateLotDto {
  @ApiProperty({ description: 'Lot number', example: 'LOT-001' })
  @IsString()
  lotNumber: string;

  @ApiProperty({ description: 'Product ID', example: 'PROD-001' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Warehouse ID', example: 'WH-001' })
  @IsString()
  warehouseId: string;

  @ApiProperty({ description: 'Location ID', example: 'LOC-001' })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ description: 'Total quantity', example: 100 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Available quantity', example: 100 })
  @IsNumber()
  @Min(0)
  availableQuantity: number;

  @ApiProperty({ description: 'Allocated quantity', example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  allocatedQuantity?: number;

  @ApiProperty({ description: 'Lot status', enum: LotStatus, example: LotStatus.ACTIVE })
  @IsEnum(LotStatus)
  @IsOptional()
  status?: LotStatus;

  @ApiProperty({ description: 'Expiry date', example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({ description: 'Manufacturing date', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  manufacturingDate?: string;

  @ApiProperty({ description: 'Batch number', example: 'BATCH-001' })
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiProperty({ description: 'Supplier ID', example: 'SUP-001' })
  @IsString()
  @IsOptional()
  supplierId?: string;

  @ApiProperty({ description: 'Cost per unit', example: 10.50 })
  @IsNumber()
  @IsOptional()
  costPerUnit?: number;

  @ApiProperty({ description: 'Notes', example: 'High quality batch' })
  @IsString()
  @IsOptional()
  notes?: string;
}
