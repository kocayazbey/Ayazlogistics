import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsString, IsOptional, IsEnum, Min, Max, IsDateString } from 'class-validator';

export class DemandForecastingRequestDto {
  @ApiProperty({ description: 'Product SKU', example: 'PROD-001' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Historical demand data', type: [Number] })
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  historicalData: number[];

  @ApiProperty({ description: 'Forecast horizon in days', example: 30 })
  @IsNumber()
  @Min(1)
  @Max(365)
  horizon: number;

  @ApiProperty({ description: 'Forecasting model type', enum: ['lstm', 'arima', 'exponential_smoothing', 'ensemble'], required: false })
  @IsOptional()
  @IsEnum(['lstm', 'arima', 'exponential_smoothing', 'ensemble'])
  modelType?: string;

  @ApiProperty({ description: 'Include confidence intervals', required: false })
  @IsOptional()
  @IsNumber()
  includeConfidence?: boolean;

  @ApiProperty({ description: 'Include seasonal analysis', required: false })
  @IsOptional()
  @IsNumber()
  includeSeasonal?: boolean;

  @ApiProperty({ description: 'Include external factors', required: false })
  @IsOptional()
  @IsNumber()
  includeExternalFactors?: boolean;
}

export class DemandForecastingResponseDto {
  @ApiProperty({ description: 'Product SKU' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Forecasted demand values' })
  @IsArray()
  @IsNumber({}, { each: true })
  forecast: number[];

  @ApiProperty({ description: 'Confidence intervals' })
  confidence: {
    lower: number[];
    upper: number[];
    level: number;
  };

  @ApiProperty({ description: 'Model accuracy metrics' })
  accuracy: {
    mae: number;
    rmse: number;
    mape: number;
    r2: number;
  };

  @ApiProperty({ description: 'Seasonal patterns detected' })
  seasonal: {
    hasSeasonality: boolean;
    period: number;
    strength: number;
  };

  @ApiProperty({ description: 'Forecasting recommendations' })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiProperty({ description: 'Risk assessment' })
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigation: string[];
  };

  @ApiProperty({ description: 'Model metadata' })
  metadata: {
    modelId: string;
    modelType: string;
    trainingDataPoints: number;
    confidence: number;
    timestamp: string;
  };
}
