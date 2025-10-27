import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsPhoneNumber, IsNumber, IsBoolean, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SupplierType {
  MANUFACTURER = 'manufacturer',
  WHOLESALER = 'wholesaler',
  DISTRIBUTOR = 'distributor',
  SERVICE_PROVIDER = 'service_provider',
  CONTRACTOR = 'contractor',
  CONSULTANT = 'consultant',
}

export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PROSPECTIVE = 'prospective',
  SUSPENDED = 'suspended',
  BLACKLISTED = 'blacklisted',
}

export enum SupplierRating {
  POOR = 'poor',
  FAIR = 'fair',
  GOOD = 'good',
  VERY_GOOD = 'very_good',
  EXCELLENT = 'excellent',
}

export class SupplierContactDto {
  @ApiProperty({ example: 'Jane Smith' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Sales Manager' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'jane@supplier.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+905551234567' })
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class CreateSupplierDto {
  @ApiProperty({ example: 'Premium Packaging Suppliers Ltd.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SUP-2025-001' })
  @IsString()
  @IsNotEmpty()
  supplierCode: string;

  @ApiProperty({ enum: SupplierType, example: SupplierType.MANUFACTURER })
  @IsEnum(SupplierType)
  @IsNotEmpty()
  type: SupplierType;

  @ApiProperty({ example: '1234567890', description: 'Tax ID / VAT number' })
  @IsString()
  @IsNotEmpty()
  taxId: string;

  @ApiProperty({ example: 'contact@premiumpackaging.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+905551234567' })
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '456 Industrial Zone, Gebze, Turkey' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Kocaeli' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Turkey' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: '41400', required: false })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ example: 'https://www.premiumpackaging.com', required: false })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ type: [SupplierContactDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierContactDto)
  @IsOptional()
  contacts?: SupplierContactDto[];

  @ApiProperty({ example: 30, description: 'Payment terms in days' })
  @IsNumber()
  @Min(0)
  paymentTerms: number;

  @ApiProperty({ example: 'TRY', description: 'Preferred currency', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 500000, description: 'Credit limit', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  creditLimit?: number;

  @ApiProperty({ example: 10, description: 'Default discount percentage', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountRate?: number;

  @ApiProperty({ example: 7, description: 'Average lead time in days', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  leadTimeDays?: number;

  @ApiProperty({ example: 5000, description: 'Minimum order value', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumOrderValue?: number;

  @ApiProperty({ enum: SupplierRating, example: SupplierRating.EXCELLENT, required: false })
  @IsEnum(SupplierRating)
  @IsOptional()
  rating?: SupplierRating;

  @ApiProperty({ example: 'Packaging Materials, Industrial Supplies', description: 'Product categories supplied', required: false })
  @IsString()
  @IsOptional()
  productCategories?: string;

  @ApiProperty({ example: 'ISO 9001 certified', description: 'Certifications', required: false })
  @IsString()
  @IsOptional()
  certifications?: string;

  @ApiProperty({ example: true, description: 'Is preferred supplier', required: false })
  @IsBoolean()
  @IsOptional()
  isPreferred?: boolean;

  @ApiProperty({ enum: SupplierStatus, example: SupplierStatus.ACTIVE, required: false })
  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;

  @ApiProperty({ example: 'packaging, reliable, quick_delivery', description: 'Tags', required: false })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ example: 'Excellent service, fast delivery, competitive pricing', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

