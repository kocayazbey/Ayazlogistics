import { IsString, IsNumber, IsBoolean, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCurrencyDto {
  @ApiProperty({ description: 'Currency code (ISO 4217)', example: 'TRY' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Currency name', example: 'Turkish Lira' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Currency symbol', example: '₺' })
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'Decimal places', example: 2, minimum: 0, maximum: 4 })
  @IsNumber()
  @Min(0)
  @Max(4)
  decimalPlaces: number;

  @ApiProperty({ description: 'Is currency active', example: true })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Is default currency', example: false })
  @IsBoolean()
  isDefault: boolean;

  @ApiProperty({ description: 'Exchange rate', example: 1.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiProperty({ description: 'Last updated date', example: '2025-01-15T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  lastUpdated?: string;
}
