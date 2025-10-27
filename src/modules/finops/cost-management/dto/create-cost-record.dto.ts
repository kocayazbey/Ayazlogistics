import { IsString, IsEnum, IsNumber, IsObject, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCostRecordDto {
  @ApiProperty({ description: 'Cost category', example: 'infrastructure', enum: ['infrastructure', 'software', 'services', 'personnel', 'other'] })
  @IsEnum(['infrastructure', 'software', 'services', 'personnel', 'other'])
  category: 'infrastructure' | 'software' | 'services' | 'personnel' | 'other';

  @ApiProperty({ description: 'Service name', example: 'AWS EC2' })
  @IsString()
  service: string;

  @ApiProperty({ description: 'Cost amount', example: 1250.50 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Period (YYYY-MM)', example: '2025-01' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Cost tags', example: { environment: 'production', team: 'engineering' } })
  @IsObject()
  tags: Record<string, string>;
}
