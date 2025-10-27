import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum SignatureMethod {
  E_SIGNATURE = 'e_signature',
  DIGITAL_SIGNATURE = 'digital_signature',
  WET_SIGNATURE = 'wet_signature',
}

export class SignDocumentDto {
  @ApiProperty({ enum: SignatureMethod, example: SignatureMethod.E_SIGNATURE })
  @IsEnum(SignatureMethod)
  @IsNotEmpty()
  signatureMethod: SignatureMethod;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  signerName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsString()
  @IsNotEmpty()
  signerEmail: string;

  @ApiProperty({ example: 'Manager' })
  @IsString()
  @IsNotEmpty()
  signerTitle: string;

  @ApiProperty({ example: 'base64_signature_data', description: 'Signature data (base64)', required: false })
  @IsString()
  @IsOptional()
  signatureData?: string;

  @ApiProperty({ example: '192.168.1.1', description: 'IP address of signer', required: false })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiProperty({ example: '2025-10-24T10:30:00Z', required: false })
  @IsDateString()
  @IsOptional()
  signedAt?: string;

  @ApiProperty({ example: 'Agreed to all terms', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

