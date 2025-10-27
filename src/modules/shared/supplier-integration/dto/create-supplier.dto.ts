import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsEmail, IsPhoneNumber } from 'class-validator';

export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum SupplierCategory {
  LOGISTICS = 'logistics',
  EQUIPMENT = 'equipment',
  MAINTENANCE = 'maintenance',
  OFFICE_SUPPLIES = 'office_supplies',
  OTHER = 'other',
}

export class CreateSupplierDto {
  @ApiProperty({ description: 'Supplier name', example: 'ABC Logistics Ltd.' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Supplier code', example: 'SUP-001' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Supplier status', enum: SupplierStatus, example: SupplierStatus.ACTIVE })
  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;

  @ApiProperty({ description: 'Supplier category', enum: SupplierCategory, example: SupplierCategory.LOGISTICS })
  @IsEnum(SupplierCategory)
  category: SupplierCategory;

  @ApiProperty({ description: 'Contact person', example: 'John Doe' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiProperty({ description: 'Email address', example: 'contact@abclogistics.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: 'Phone number', example: '+90 212 123 4567' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Address', example: '123 Business St, Istanbul' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'City', example: 'Istanbul' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'State', example: 'Istanbul' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'Country', example: 'Turkey' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: 'Postal code', example: '34000' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ description: 'Tax ID', example: '1234567890' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({ description: 'Payment terms', example: 'Net 30' })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty({ description: 'Notes', example: 'Reliable supplier for logistics services' })
  @IsString()
  @IsOptional()
  notes?: string;
}
