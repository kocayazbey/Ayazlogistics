import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsDateString, IsNumber, IsEnum, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

export enum TransactionStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  VOIDED = 'voided',
  REVERSED = 'reversed',
}

export class TransactionLineDto {
  @ApiProperty({ example: '100.01.001', description: 'GL account code' })
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.DEBIT })
  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @ApiProperty({ example: 10000, description: 'Transaction amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'Payment received from customer ABC', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'CC-001', description: 'Cost center code', required: false })
  @IsString()
  @IsOptional()
  costCenter?: string;

  @ApiProperty({ example: 'DEPT-SALES', description: 'Department code', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ example: 'PROJECT-A', description: 'Project code', required: false })
  @IsString()
  @IsOptional()
  project?: string;
}

export class CreateTransactionDto {
  @ApiProperty({ example: 'TXN-2025-10-001' })
  @IsString()
  @IsNotEmpty()
  transactionNumber: string;

  @ApiProperty({ example: '2025-10-24', description: 'Transaction date' })
  @IsDateString()
  @IsNotEmpty()
  transactionDate: string;

  @ApiProperty({ example: 'Payment received from customer', description: 'Transaction description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ type: [TransactionLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionLineDto)
  @IsNotEmpty()
  lines: TransactionLineDto[];

  @ApiProperty({ example: 'TRY', description: 'Transaction currency', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 1.0, description: 'Exchange rate to base currency', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  exchangeRate?: number;

  @ApiProperty({ example: 'INV-2025-001', description: 'Reference document number', required: false })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Related customer/vendor ID', required: false })
  @IsUUID()
  @IsOptional()
  relatedEntityId?: string;

  @ApiProperty({ enum: TransactionStatus, example: TransactionStatus.DRAFT, required: false })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiProperty({ example: 'Imported from bank statement', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

