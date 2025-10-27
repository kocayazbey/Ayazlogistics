import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnitEconomicsDto {
  @ApiProperty({ description: 'Metric name', example: 'orders_per_month' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Metric value', example: 1000 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Metric unit', example: 'orders' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Period (YYYY-MM)', example: '2025-01' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Cost per unit', example: 15.50 })
  @IsNumber()
  @Min(0)
  costPerUnit: number;

  @ApiProperty({ description: 'Revenue per unit', example: 25.00 })
  @IsNumber()
  @Min(0)
  revenuePerUnit: number;

  @ApiProperty({ description: 'Margin percentage', example: 38.0 })
  @IsNumber()
  margin: number;
}
