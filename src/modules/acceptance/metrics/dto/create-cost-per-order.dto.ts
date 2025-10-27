import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCostPerOrderDto {
  @ApiProperty({ description: 'Period (YYYY-MM)', example: '2025-01' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Total costs', example: 50000.00 })
  @IsNumber()
  @Min(0)
  totalCosts: number;

  @ApiProperty({ description: 'Total orders', example: 1000 })
  @IsNumber()
  @Min(0)
  totalOrders: number;

  @ApiProperty({ description: 'Cost per order', example: 50.00 })
  @IsNumber()
  @Min(0)
  costPerOrder: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency: string;
}
