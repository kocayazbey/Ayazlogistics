import { IsString, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSLODto {
  @ApiProperty({ description: 'SLA ID', example: 'SLA-1234567890' })
  @IsString()
  slaId: string;

  @ApiProperty({ description: 'Metric name', example: 'api_response_time' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Target value', example: 200 })
  @IsNumber()
  @Min(0)
  target: number;

  @ApiProperty({ description: 'Measurement type', example: 'duration', enum: ['percentage', 'count', 'duration', 'rate'] })
  @IsEnum(['percentage', 'count', 'duration', 'rate'])
  measurement: 'percentage' | 'count' | 'duration' | 'rate';

  @ApiProperty({ description: 'Measurement window in minutes', example: 60 })
  @IsNumber()
  @Min(1)
  window: number;

  @ApiProperty({ description: 'Is SLO active', example: true })
  @IsBoolean()
  isActive: boolean;
}
