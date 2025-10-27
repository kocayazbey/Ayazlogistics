import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWorkOrderDto {
  @ApiProperty({ example: 'WO-2025-001' })
  @IsString()
  @IsNotEmpty()
  workOrderNumber: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 'SKU-12345' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(1)
  plannedQuantity: number;

  @ApiProperty({ example: 'Line-01' })
  @IsString()
  @IsNotEmpty()
  productionLine: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;
}

export class ProductionHandoverDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  workOrderId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  palletId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  productionDate: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lotNumber: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiProperty()
  @IsBoolean()
  qualityChecked: boolean;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;
}

