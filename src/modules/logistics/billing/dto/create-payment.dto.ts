import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 'PAY-2024-001' })
  @IsString()
  paymentNumber: string;

  @ApiProperty({ example: 'INV-2024-001' })
  @IsString()
  invoiceId: string;

  @ApiProperty({ example: 'ABC Teknoloji' })
  @IsString()
  customer: string;

  @ApiProperty({ example: 15000.00 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'TRY' })
  @IsString()
  currency: string;

  @ApiProperty({ example: 'bank_transfer', enum: ['bank_transfer', 'credit_card', 'cash', 'check'] })
  @IsEnum(['bank_transfer', 'credit_card', 'cash', 'check'])
  method: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ example: 'Fatura ödemesi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'TR1234567890123456789012345' })
  @IsOptional()
  @IsString()
  reference?: string;
}
