import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateROIDto {
  @ApiProperty({ description: 'Input values for ROI calculation', example: { monthly_orders: 1000, average_order_value: 50 } })
  @IsObject()
  inputs: Record<string, any>;
}
