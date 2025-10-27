import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Payment ID to verify',
    example: 'pay_1234567890_abc123def456',
  })
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @ApiProperty({
    description: '3D Secure authentication ID',
    example: 'auth_1234567890_abc123def456',
  })
  @IsNotEmpty()
  @IsString()
  threeDSecureId: string;

  @ApiProperty({
    description: 'Bank authentication ID',
    example: 'bank_auth_1234567890',
  })
  @IsNotEmpty()
  @IsString()
  authenticationId: string;

  @ApiProperty({
    description: 'Cardholder Authentication Verification Value',
    example: 'ABC123DEF456GHI789',
  })
  @IsNotEmpty()
  @IsString()
  cavv: string;

  @ApiProperty({
    description: 'Electronic Commerce Indicator',
    example: '02',
  })
  @IsNotEmpty()
  @IsString()
  eci: string;

  @ApiProperty({
    description: 'Transaction ID from 3D Secure',
    example: 'xid_1234567890_abc123def456',
  })
  @IsNotEmpty()
  @IsString()
  xid: string;

  @ApiProperty({
    description: 'Payment status from bank',
    example: 'Y',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}
