import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsArray, ValidateNested, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum JournalEntryType {
  STANDARD = 'standard',
  ADJUSTING = 'adjusting',
  CLOSING = 'closing',
  REVERSING = 'reversing',
  OPENING_BALANCE = 'opening_balance',
}

export enum JournalEntryStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  POSTED = 'posted',
  REJECTED = 'rejected',
  REVERSED = 'reversed',
}

export class JournalEntryLineDto {
  @ApiProperty({ example: '100.01.001', description: 'GL account code' })
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @ApiProperty({ example: 25000, description: 'Debit amount' })
  @IsNumber()
  @Min(0)
  debit: number;

  @ApiProperty({ example: 0, description: 'Credit amount' })
  @IsNumber()
  @Min(0)
  credit: number;

  @ApiProperty({ example: 'Depreciation expense for office equipment', description: 'Line description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'CC-ADMIN', description: 'Cost center', required: false })
  @IsString()
  @IsOptional()
  costCenter?: string;

  @ApiProperty({ example: 'DEPT-FIN', description: 'Department', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ example: 'PROJ-2025', description: 'Project code', required: false })
  @IsString()
  @IsOptional()
  project?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty({ example: 'JE-2025-10-001' })
  @IsString()
  @IsNotEmpty()
  entryNumber: string;

  @ApiProperty({ enum: JournalEntryType, example: JournalEntryType.ADJUSTING })
  @IsEnum(JournalEntryType)
  @IsNotEmpty()
  entryType: JournalEntryType;

  @ApiProperty({ example: '2025-10-24', description: 'Entry date' })
  @IsDateString()
  @IsNotEmpty()
  entryDate: string;

  @ApiProperty({ example: 'Monthly depreciation adjustment', description: 'Entry description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ type: [JournalEntryLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  @IsNotEmpty()
  lines: JournalEntryLineDto[];

  @ApiProperty({ example: 'October 2025', description: 'Accounting period', required: false })
  @IsString()
  @IsOptional()
  period?: string;

  @ApiProperty({ example: '10', description: 'Fiscal month (1-12)', required: false })
  @IsString()
  @IsOptional()
  fiscalMonth?: string;

  @ApiProperty({ example: '2025', description: 'Fiscal year', required: false })
  @IsString()
  @IsOptional()
  fiscalYear?: string;

  @ApiProperty({ example: 'REF-2025-001', description: 'External reference number', required: false })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiProperty({ enum: JournalEntryStatus, example: JournalEntryStatus.DRAFT, required: false })
  @IsEnum(JournalEntryStatus)
  @IsOptional()
  status?: JournalEntryStatus;

  @ApiProperty({ example: 'Year-end adjustment entry', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'John Doe', description: 'Prepared by', required: false })
  @IsString()
  @IsOptional()
  preparedBy?: string;

  @ApiProperty({ example: 'Jane Smith', description: 'Reviewed by', required: false })
  @IsString()
  @IsOptional()
  reviewedBy?: string;

  @ApiProperty({ example: 'Michael Johnson', description: 'Approved by', required: false })
  @IsString()
  @IsOptional()
  approvedBy?: string;
}

