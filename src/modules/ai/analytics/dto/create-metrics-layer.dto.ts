import { IsString, IsEnum, IsNumber, IsObject, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMetricsLayerDto {
  @ApiProperty({ description: 'Metric name', example: 'order_fulfillment_rate' })
  @IsString()
  metricName: string;

  @ApiProperty({ description: 'Metric category', example: 'operational', enum: ['operational', 'financial', 'customer', 'sustainability'] })
  @IsEnum(['operational', 'financial', 'customer', 'sustainability'])
  category: 'operational' | 'financial' | 'customer' | 'sustainability';

  @ApiProperty({ description: 'Metric value', example: 95.5 })
  @IsNumber()
  value: number;

  @ApiProperty({ description: 'Metric unit', example: 'percentage' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Metric dimensions', example: { region: 'EU', product_type: 'electronics' } })
  @IsObject()
  dimensions: Record<string, any>;

  @ApiProperty({ description: 'Data source', example: 'wms_system' })
  @IsString()
  source: string;

  @ApiProperty({ description: 'Data quality score', example: 0.92, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  quality: number;
}
