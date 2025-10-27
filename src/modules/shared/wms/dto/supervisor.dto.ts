import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsBoolean, IsArray, IsUUID, IsDateString } from 'class-validator';

export class ChangePickFaceDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  currentLocationId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  newLocationId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;
}

export class ModifyPalletLotDateDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  palletId: string;

  @ApiProperty()
  modifications: {
    lotNumber?: string;
    productionDate?: Date;
    expiryDate?: Date;
    bestBeforeDate?: Date;
  };

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty()
  @IsBoolean()
  requiresQC: boolean;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;
}

export class BlockPalletDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  palletId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  blockReason: string;

  @ApiProperty({ enum: ['quality', 'damage', 'expiry', 'investigation', 'customer_hold', 'custom'] })
  @IsEnum(['quality', 'damage', 'expiry', 'investigation', 'customer_hold', 'custom'])
  @IsNotEmpty()
  blockType: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty()
  @IsBoolean()
  notifyQC: boolean;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;
}

