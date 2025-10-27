import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { StockCardType, StockCardStatus } from './create-stock-card.dto';

export class StockCardFilterDto {
  @ApiPropertyOptional({ enum: StockCardType })
  @IsEnum(StockCardType)
  @IsOptional()
  type?: StockCardType;

  @ApiPropertyOptional({ enum: StockCardStatus })
  @IsEnum(StockCardStatus)
  @IsOptional()
  status?: StockCardStatus;

  @ApiPropertyOptional({ example: 'Packaging' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'Tape' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'Premium Brand' })
  @IsString()
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  lowStockOnly?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  trackByBatch?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  hazmatOnly?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  limit?: number;
}

