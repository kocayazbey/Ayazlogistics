import { IsString, IsEnum, IsObject, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEDIDocumentDto {
  @ApiProperty({ description: 'Connection ID', example: 'EDI-1234567890' })
  @IsString()
  connectionId: string;

  @ApiProperty({ description: 'Document type', example: '850' })
  @IsString()
  documentType: string;

  @ApiProperty({ description: 'EDI standard', example: 'X12' })
  @IsString()
  standard: string;

  @ApiProperty({ description: 'Standard version', example: '4010' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Document direction', example: 'inbound', enum: ['inbound', 'outbound'] })
  @IsEnum(['inbound', 'outbound'])
  direction: 'inbound' | 'outbound';

  @ApiProperty({ description: 'Document status', example: 'pending', enum: ['pending', 'processing', 'completed', 'failed', 'acknowledged'] })
  @IsEnum(['pending', 'processing', 'completed', 'failed', 'acknowledged'])
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'acknowledged';

  @ApiProperty({ description: 'Document content', example: 'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210101*1200*^*00501*000000001*0*P*:~' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Document metadata', example: { sender: 'PARTNER-A', receiver: 'COMPANY-B' } })
  @IsObject()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Processed at date', example: '2025-01-15T10:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  processedAt?: string;

  @ApiProperty({ description: 'Acknowledged at date', example: '2025-01-15T10:05:00Z', required: false })
  @IsOptional()
  @IsDateString()
  acknowledgedAt?: string;

  @ApiProperty({ description: 'Error message', example: 'Invalid document format', required: false })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
