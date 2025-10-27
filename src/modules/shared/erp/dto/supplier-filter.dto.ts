import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { SupplierType, SupplierStatus, SupplierRating } from './create-supplier.dto';

export class SupplierFilterDto {
  @ApiPropertyOptional({ enum: SupplierType })
  @IsEnum(SupplierType)
  @IsOptional()
  type?: SupplierType;

  @ApiPropertyOptional({ enum: SupplierStatus })
  @IsEnum(SupplierStatus)
  @IsOptional()
  status?: SupplierStatus;

  @ApiPropertyOptional({ enum: SupplierRating })
  @IsEnum(SupplierRating)
  @IsOptional()
  rating?: SupplierRating;

  @ApiPropertyOptional({ example: 'Premium' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'Istanbul' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Turkey' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 'Packaging Materials' })
  @IsString()
  @IsOptional()
  productCategory?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  preferredOnly?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  limit?: number;
}

