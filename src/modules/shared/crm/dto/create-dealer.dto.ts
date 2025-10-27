import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsEnum, IsPhoneNumber, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator';

export enum DealerType {
  EXCLUSIVE = 'exclusive',
  NON_EXCLUSIVE = 'non_exclusive',
  REGIONAL = 'regional',
  NATIONAL = 'national',
  INTERNATIONAL = 'international',
}

export enum DealerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_APPROVAL = 'pending_approval',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
}

export class CreateDealerDto {
  @ApiProperty({ example: 'Premium Logistics Partners' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'DEALER-2025-001' })
  @IsString()
  @IsNotEmpty()
  dealerCode: string;

  @ApiProperty({ enum: DealerType, example: DealerType.REGIONAL })
  @IsEnum(DealerType)
  @IsNotEmpty()
  type: DealerType;

  @ApiProperty({ example: '1234567890', description: 'Tax ID / VAT number' })
  @IsString()
  @IsNotEmpty()
  taxId: string;

  @ApiProperty({ example: 'contact@premiumlogistics.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+905551234567' })
  @IsPhoneNumber('TR')
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123 Business Street, Istanbul, Turkey' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Istanbul' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Turkey' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ example: 'Marmara Region', description: 'Territory/region covered', required: false })
  @IsString()
  @IsOptional()
  territory?: string;

  @ApiProperty({ example: '2025-01-01', description: 'Contract start date' })
  @IsDateString()
  @IsNotEmpty()
  contractStartDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'Contract end date', required: false })
  @IsDateString()
  @IsOptional()
  contractEndDate?: string;

  @ApiProperty({ example: 15, description: 'Commission rate percentage' })
  @IsNumber()
  @Min(0)
  commissionRate: number;

  @ApiProperty({ example: 5, description: 'Discount rate percentage', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  discountRate?: number;

  @ApiProperty({ example: 1000000, description: 'Annual sales target', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  salesTarget?: number;

  @ApiProperty({ example: true, description: 'Can access dealer portal', required: false })
  @IsBoolean()
  @IsOptional()
  hasPortalAccess?: boolean;

  @ApiProperty({ enum: DealerStatus, example: DealerStatus.ACTIVE, required: false })
  @IsEnum(DealerStatus)
  @IsOptional()
  status?: DealerStatus;

  @ApiProperty({ example: 'John Doe', description: 'Primary contact person name', required: false })
  @IsString()
  @IsOptional()
  contactPersonName?: string;

  @ApiProperty({ example: 'Sales Director', description: 'Primary contact person title', required: false })
  @IsString()
  @IsOptional()
  contactPersonTitle?: string;

  @ApiProperty({ example: 'https://www.premiumlogistics.com', required: false })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ example: 'Top performing dealer in Istanbul region', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

