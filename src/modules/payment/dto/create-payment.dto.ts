import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsEnum, IsObject, IsOptional, Min, MaxLength } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Unique order identifier',
    example: 'ORD_2025_001',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  orderId: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 1000.50,
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description: 'Payment currency (3-letter code)',
    example: 'TRY',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(3)
  currency: string;

  @ApiProperty({
    description: 'Payment method',
    enum: ['credit_card', 'debit_card', 'bank_transfer'],
    example: 'credit_card',
  })
  @IsNotEmpty()
  @IsEnum(['credit_card', 'debit_card', 'bank_transfer'])
  paymentMethod: 'credit_card' | 'debit_card' | 'bank_transfer';

  @ApiPropertyOptional({
    description: 'Credit/Debit card details',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  cardDetails?: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
  };

  @ApiProperty({
    description: 'Customer details',
    type: 'object',
  })
  @IsNotEmpty()
  @IsObject()
  customerDetails: {
    name: string;
    email: string;
    phone?: string;
  };

  @ApiPropertyOptional({
    description: 'Billing address',
    type: 'object',
  })
  @IsOptional()
  @IsObject()
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}
