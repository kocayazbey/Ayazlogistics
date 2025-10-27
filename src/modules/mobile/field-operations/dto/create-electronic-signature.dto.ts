import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateElectronicSignatureDto {
  @ApiProperty({ description: 'Document ID', example: 'DOC-123' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Signer ID', example: 'SIGNER-123' })
  @IsString()
  signerId: string;

  @ApiProperty({ description: 'Base64 encoded signature', example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...' })
  @IsString()
  signature: string;

  @ApiProperty({ description: 'Digital certificate', example: '-----BEGIN CERTIFICATE-----...', required: false })
  @IsOptional()
  @IsString()
  certificate?: string;

  @ApiProperty({ description: 'Signature timestamp', example: '2025-01-15T10:00:00Z' })
  @IsDateString()
  timestamp: string;

  @ApiProperty({ description: 'IP address', example: '192.168.1.100', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'Device information', example: 'iPhone 13 Pro, iOS 15.0', required: false })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiProperty({ description: 'Is legally binding', example: true })
  @IsBoolean()
  isLegallyBinding: boolean;
}