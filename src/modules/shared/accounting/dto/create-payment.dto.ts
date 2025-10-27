import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CHECK = 'check',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export class CreatePaymentDto {
  @ApiProperty({ description: 'Invoice ID', example: 'INV-001' })
  @IsString()
  invoiceId: string;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod, example: PaymentMethod.CREDIT_CARD })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Payment amount', example: 118.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus, example: PaymentStatus.PENDING })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiProperty({ description: 'Transaction ID', example: 'TXN-123456' })
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiProperty({ description: 'Payment date', example: '2024-01-15T10:30:00Z' })
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiProperty({ description: 'Reference number', example: 'REF-789' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiProperty({ description: 'Payment notes', example: 'Payment received via credit card' })
  @IsString()
  @IsOptional()
  notes?: string;
}
