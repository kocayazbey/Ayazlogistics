import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateContractDto {
  @ApiProperty({ example: 'CNT-2024-001' })
  @IsString()
  contractNumber: string;

  @ApiProperty({ example: 'ABC Teknoloji' })
  @IsString()
  customer: string;

  @ApiProperty({ example: 'service', enum: ['service', 'maintenance', 'support'] })
  @IsEnum(['service', 'maintenance', 'support'])
  type: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-12-31' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 50000.00 })
  @IsNumber()
  totalValue: number;

  @ApiProperty({ example: 'TRY' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 'monthly', enum: ['monthly', 'quarterly', 'annually'] })
  @IsEnum(['monthly', 'quarterly', 'annually'])
  billingCycle: string;

  @ApiProperty({ example: 'Lojistik hizmetleri sözleşmesi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Özel koşullar ve şartlar' })
  @IsOptional()
  @IsString()
  terms?: string;
}