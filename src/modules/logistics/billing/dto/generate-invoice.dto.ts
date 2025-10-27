import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class GenerateInvoiceDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  contractId: string;

  @ApiProperty({ example: '2025-10-01', description: 'Period start date' })
  @IsDateString()
  @IsNotEmpty()
  periodStart: string;

  @ApiProperty({ example: '2025-10-31', description: 'Period end date' })
  @IsDateString()
  @IsNotEmpty()
  periodEnd: string;

  @ApiProperty({ example: false, description: 'Send to customer immediately', required: false })
  @IsBoolean()
  @IsOptional()
  sendImmediately?: boolean;

  @ApiProperty({ example: 'October 2025 invoice', required: false })
  @IsOptional()
  notes?: string;
}

