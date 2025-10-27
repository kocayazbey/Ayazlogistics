import { IsString, IsObject, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculatePricingDto {
  @ApiProperty({ description: 'Pricing tier ID', example: 'PT-1234567890' })
  @IsString()
  tierId: string;

  @ApiProperty({ description: 'Usage metrics', example: { api_calls: 15000, storage: 50, users: 25 } })
  @IsObject()
  usage: Record<string, number>;

  @ApiProperty({ description: 'Billing period start', example: '2025-01-01T00:00:00Z' })
  @IsDateString()
  period: {
    start: string;
    end: string;
  };
}
