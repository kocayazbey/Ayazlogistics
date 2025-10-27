import { IsString, IsNumber, IsArray, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOverageRuleDto {
  @ApiProperty({ description: 'Metric name', example: 'api_calls' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Usage threshold', example: 10000 })
  @IsNumber()
  @Min(0)
  threshold: number;

  @ApiProperty({ description: 'Overage price per unit', example: 0.02 })
  @IsNumber()
  @Min(0)
  overagePrice: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Grace period in days', example: 7 })
  @IsNumber()
  @Min(0)
  gracePeriod: number;

  @ApiProperty({ description: 'Notification thresholds', example: [80, 90, 95] })
  @IsArray()
  @IsNumber({}, { each: true })
  notificationThresholds: number[];

  @ApiProperty({ description: 'Is rule active', example: true })
  @IsBoolean()
  isActive: boolean;
}
