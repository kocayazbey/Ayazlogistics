import { IsNumber, IsString, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryAdjustmentDto {
  @ApiProperty({ description: 'Adjustment type', enum: ['in', 'out', 'adjustment'] })
  @IsEnum(['in', 'out', 'adjustment'])
  type: string;

  @ApiProperty({ description: 'Quantity to adjust (positive for increase, negative for decrease)' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Adjustment reason' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Adjustment metadata' })
  @IsOptional()
  metadata?: any;
}
