import { IsString, IsArray, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HistoricalDataPointDto {
  @ApiProperty({ description: 'Date', example: '2025-01-01T00:00:00Z' })
  date: string;

  @ApiProperty({ description: 'Demand value', example: 1200 })
  demand: number;
}

export class CalculateDemandForecastDto {
  @ApiProperty({ description: 'Product ID', example: 'PROD-123' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Historical demand data' })
  @IsArray()
  @IsObject({ each: true })
  historicalData: HistoricalDataPointDto[];

  @ApiProperty({ description: 'Forecasting factors', example: ['seasonal', 'trend', 'promotion'] })
  @IsArray()
  @IsString({ each: true })
  factors: string[];
}
