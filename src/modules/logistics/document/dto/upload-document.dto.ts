import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum DocumentType {
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  DELIVERY_NOTE = 'delivery_note',
  CUSTOMS = 'customs',
  CMR = 'cmr',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SIGNED = 'signed',
  ARCHIVED = 'archived',
}

export class UploadDocumentDto {
  @ApiProperty({ example: 'Service Contract 2025' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.CONTRACT })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  type: DocumentType;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', required: false })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', required: false })
  @IsUUID()
  @IsOptional()
  contractId?: string;

  @ApiProperty({ example: 'document.pdf', description: 'Original filename' })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ example: 'application/pdf', description: 'MIME type' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiProperty({ example: 102400, description: 'File size in bytes' })
  @IsNotEmpty()
  fileSize: number;

  @ApiProperty({ example: 's3://bucket/path/to/document.pdf', description: 'Storage path' })
  @IsString()
  @IsNotEmpty()
  storagePath: string;

  @ApiProperty({ enum: DocumentStatus, example: DocumentStatus.DRAFT, required: false })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiProperty({ example: 'Important contract document', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'contract, 2025, annual', description: 'Comma-separated tags', required: false })
  @IsString()
  @IsOptional()
  tags?: string;
}

