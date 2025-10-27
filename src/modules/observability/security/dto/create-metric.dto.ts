import { IsString, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMetricDto {
  @ApiProperty({ description: 'Metric name', example: 'response_time' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Metric value', example: 150.5 })
  @IsNumber()
  value: number;

  @ApiProperty({ description: 'Metric unit', example: 'ms' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Metric tags', example: { service: 'api', endpoint: '/users' } })
  @IsObject()
  tags: Record<string, string>;
}
