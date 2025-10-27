import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnomalyDetectionDto {
  @ApiProperty({ description: 'Metric name', example: 'order_volume' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Current value', example: 1500 })
  @IsNumber()
  value: number;

  @ApiProperty({ description: 'Expected value', example: 800 })
  @IsNumber()
  expectedValue: number;

  @ApiProperty({ description: 'Deviation percentage', example: 87.5 })
  @IsNumber()
  @Min(0)
  deviation: number;

  @ApiProperty({ description: 'Anomaly severity', example: 'high', enum: ['low', 'medium', 'high', 'critical'] })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Anomaly type', example: 'spike', enum: ['spike', 'drop', 'pattern', 'outlier'] })
  @IsEnum(['spike', 'drop', 'pattern', 'outlier'])
  type: 'spike' | 'drop' | 'pattern' | 'outlier';

  @ApiProperty({ description: 'Anomaly description', example: 'Unusual spike in order volume detected' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Resolved at date', example: '2025-01-15T16:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  resolvedAt?: string;

  @ApiProperty({ description: 'Anomaly status', example: 'open', enum: ['open', 'investigating', 'resolved', 'false_positive'] })
  @IsEnum(['open', 'investigating', 'resolved', 'false_positive'])
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
}
