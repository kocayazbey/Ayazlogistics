import { IsString, IsEnum, IsDateString, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDemandForecastDto {
  @ApiProperty({ description: 'Product ID', example: 'PROD-123' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Forecast type', example: 'daily', enum: ['daily', 'weekly', 'monthly', 'quarterly'] })
  @IsEnum(['daily', 'weekly', 'monthly', 'quarterly'])
  forecastType: 'daily' | 'weekly' | 'monthly' | 'quarterly';

  @ApiProperty({ description: 'Forecast period', example: '2025-01-15T00:00:00Z' })
  @IsDateString()
  period: string;

  @ApiProperty({ description: 'Predicted demand', example: 1500 })
  @IsNumber()
  @Min(0)
  predictedDemand: number;

  @ApiProperty({ description: 'Confidence level', example: 0.85, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @ApiProperty({ description: 'Forecasting factors', example: ['seasonal', 'trend', 'promotion'] })
  @IsArray()
  @IsString({ each: true })
  factors: string[];

  @ApiProperty({ description: 'Forecast accuracy', example: 0.92, minimum: 0, maximum: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  accuracy?: number;
}
