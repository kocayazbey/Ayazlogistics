import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNRRMetricDto {
  @ApiProperty({ description: 'Period (YYYY-MM)', example: '2025-01' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Starting revenue', example: 100000.00 })
  @IsNumber()
  @Min(0)
  startingRevenue: number;

  @ApiProperty({ description: 'Ending revenue', example: 120000.00 })
  @IsNumber()
  @Min(0)
  endingRevenue: number;

  @ApiProperty({ description: 'New revenue', example: 15000.00 })
  @IsNumber()
  @Min(0)
  newRevenue: number;

  @ApiProperty({ description: 'Expansion revenue', example: 8000.00 })
  @IsNumber()
  @Min(0)
  expansionRevenue: number;

  @ApiProperty({ description: 'Contraction revenue', example: -2000.00 })
  @IsNumber()
  contractionRevenue: number;

  @ApiProperty({ description: 'Churn revenue', example: -1000.00 })
  @IsNumber()
  churnRevenue: number;

  @ApiProperty({ description: 'Net Revenue Retention percentage', example: 120.0 })
  @IsNumber()
  nrr: number;
}
