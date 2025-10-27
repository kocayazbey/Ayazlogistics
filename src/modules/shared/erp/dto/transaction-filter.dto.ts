import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import { TransactionStatus } from './create-transaction.dto';

export class TransactionFilterDto {
  @ApiPropertyOptional({ enum: TransactionStatus })
  @IsEnum(TransactionStatus)
  @IsOptional()
  status?: TransactionStatus;

  @ApiPropertyOptional({ example: '100.01.001' })
  @IsString()
  @IsOptional()
  accountCode?: string;

  @ApiPropertyOptional({ example: '2025-10-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-10-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  relatedEntityId?: string;

  @ApiPropertyOptional({ example: 'TRY' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'Payment' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 'CC-001' })
  @IsString()
  @IsOptional()
  costCenter?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  limit?: number;
}

