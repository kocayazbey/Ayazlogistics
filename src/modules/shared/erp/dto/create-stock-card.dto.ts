import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, Min } from 'class-validator';

export enum StockCardType {
  RAW_MATERIAL = 'raw_material',
  FINISHED_GOOD = 'finished_good',
  SEMI_FINISHED = 'semi_finished',
  CONSUMABLE = 'consumable',
  SPARE_PART = 'spare_part',
  PACKAGING = 'packaging',
  TRADING_GOOD = 'trading_good',
}

export enum StockCardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
  OBSOLETE = 'obsolete',
}

export enum ValuationMethod {
  FIFO = 'fifo',
  LIFO = 'lifo',
  WEIGHTED_AVERAGE = 'weighted_average',
  STANDARD_COST = 'standard_cost',
}

export enum UnitOfMeasure {
  PCS = 'pcs',
  KG = 'kg',
  G = 'g',
  L = 'l',
  ML = 'ml',
  M = 'm',
  CM = 'cm',
  M2 = 'm2',
  M3 = 'm3',
  BOX = 'box',
  PALLET = 'pallet',
  CARTON = 'carton',
  PACKAGE = 'package',
}

export class CreateStockCardDto {
  @ApiProperty({ example: 'SKU-2025-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Industrial Packaging Tape' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ example: 'Strong adhesive tape for industrial packaging', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: StockCardType, example: StockCardType.CONSUMABLE })
  @IsEnum(StockCardType)
  @IsNotEmpty()
  type: StockCardType;

  @ApiProperty({ example: 'TAPE-001', description: 'Internal product code', required: false })
  @IsString()
  @IsOptional()
  internalCode?: string;

  @ApiProperty({ example: '1234567890123', description: 'Barcode/EAN', required: false })
  @IsString()
  @IsOptional()
  barcode?: string;

  @ApiProperty({ enum: UnitOfMeasure, example: UnitOfMeasure.PCS })
  @IsEnum(UnitOfMeasure)
  @IsNotEmpty()
  baseUom: UnitOfMeasure;

  @ApiProperty({ example: 'Packaging Materials', description: 'Product category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Adhesive Tapes', description: 'Product subcategory', required: false })
  @IsString()
  @IsOptional()
  subcategory?: string;

  @ApiProperty({ example: 'Premium Brand', description: 'Brand name', required: false })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiProperty({ example: 'Acme Corp', description: 'Manufacturer name', required: false })
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @ApiProperty({ example: 'ACME-TAPE-50MM', description: 'Manufacturer part number', required: false })
  @IsString()
  @IsOptional()
  manufacturerPartNumber?: string;

  @ApiProperty({ example: 15.50, description: 'Unit cost price' })
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiProperty({ example: 25.00, description: 'Unit selling price', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ example: 'TRY', description: 'Currency', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ enum: ValuationMethod, example: ValuationMethod.WEIGHTED_AVERAGE, required: false })
  @IsEnum(ValuationMethod)
  @IsOptional()
  valuationMethod?: ValuationMethod;

  @ApiProperty({ example: 100, description: 'Minimum stock level', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minStockLevel?: number;

  @ApiProperty({ example: 500, description: 'Maximum stock level', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxStockLevel?: number;

  @ApiProperty({ example: 150, description: 'Reorder point', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  reorderPoint?: number;

  @ApiProperty({ example: 300, description: 'Economic order quantity', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  economicOrderQuantity?: number;

  @ApiProperty({ example: 7, description: 'Lead time in days', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  leadTimeDays?: number;

  @ApiProperty({ example: 0.5, description: 'Weight in kg', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  weight?: number;

  @ApiProperty({ example: 10, description: 'Length in cm', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  length?: number;

  @ApiProperty({ example: 5, description: 'Width in cm', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  width?: number;

  @ApiProperty({ example: 5, description: 'Height in cm', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  height?: number;

  @ApiProperty({ example: true, description: 'Track by batch/lot', required: false })
  @IsBoolean()
  @IsOptional()
  trackByBatch?: boolean;

  @ApiProperty({ example: true, description: 'Track by serial number', required: false })
  @IsBoolean()
  @IsOptional()
  trackBySerial?: boolean;

  @ApiProperty({ example: true, description: 'Has expiry date', required: false })
  @IsBoolean()
  @IsOptional()
  hasExpiryDate?: boolean;

  @ApiProperty({ example: 365, description: 'Shelf life in days', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  shelfLifeDays?: number;

  @ApiProperty({ example: true, description: 'Is hazardous material', required: false })
  @IsBoolean()
  @IsOptional()
  isHazmat?: boolean;

  @ApiProperty({ example: 'UN1234', description: 'Hazmat UN number', required: false })
  @IsString()
  @IsOptional()
  hazmatUnNumber?: string;

  @ApiProperty({ example: 'Flammable liquid', description: 'Hazmat class', required: false })
  @IsString()
  @IsOptional()
  hazmatClass?: string;

  @ApiProperty({ example: 18, description: 'Tax/VAT rate percentage', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  taxRate?: number;

  @ApiProperty({ enum: StockCardStatus, example: StockCardStatus.ACTIVE, required: false })
  @IsEnum(StockCardStatus)
  @IsOptional()
  status?: StockCardStatus;

  @ApiProperty({ example: 'packaging, tape, consumable', description: 'Tags', required: false })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ example: 'High-quality industrial tape', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [String], description: 'Image URLs', required: false })
  @IsArray()
  @IsOptional()
  imageUrls?: string[];
}

