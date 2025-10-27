import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';

export class BatchLotFilterDto {
  @ApiPropertyOptional({ example: 'SKU-2025-001' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 'LOT-2025-001' })
  @IsString()
  @IsOptional()
  lotNumber?: string;

  @ApiPropertyOptional({ example: '2025-10-01' })
  @IsDateString()
  @IsOptional()
  manufacturedAfter?: string;

  @ApiPropertyOptional({ example: '2025-10-31' })
  @IsDateString()
  @IsOptional()
  manufacturedBefore?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  expiresAfter?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  expiresBefore?: string;

  @ApiPropertyOptional({ example: true, description: 'Show only expiring lots' })
  @IsBoolean()
  @IsOptional()
  expiringOnly?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Expiring within days' })
  @IsOptional()
  expiringWithinDays?: number;

  @ApiPropertyOptional({ example: true, description: 'Show only available lots' })
  @IsBoolean()
  @IsOptional()
  availableOnly?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  limit?: number;
}

