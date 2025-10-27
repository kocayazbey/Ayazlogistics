import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKeyManagementDto {
  @ApiProperty({ description: 'Key name', example: 'API Encryption Key' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Key type', example: 'encryption', enum: ['encryption', 'signing', 'api', 'database'] })
  @IsEnum(['encryption', 'signing', 'api', 'database'])
  type: 'encryption' | 'signing' | 'api' | 'database';

  @ApiProperty({ description: 'Encryption algorithm', example: 'AES-256' })
  @IsString()
  algorithm: string;

  @ApiProperty({ description: 'Key size in bits', example: 256 })
  @IsNumber()
  @Min(128)
  keySize: number;

  @ApiProperty({ description: 'Public key', example: '-----BEGIN PUBLIC KEY-----...', required: false })
  @IsOptional()
  @IsString()
  publicKey?: string;

  @ApiProperty({ description: 'Private key', example: '-----BEGIN PRIVATE KEY-----...', required: false })
  @IsOptional()
  @IsString()
  privateKey?: string;

  @ApiProperty({ description: 'Key expiration date', example: '2025-12-31T23:59:59Z', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ description: 'Is key active', example: true })
  @IsBoolean()
  isActive: boolean;
}
