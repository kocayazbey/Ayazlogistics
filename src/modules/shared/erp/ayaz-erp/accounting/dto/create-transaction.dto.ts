import { IsString, IsNumber, IsDateString, IsEnum, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Account ID' })
  @IsUUID()
  accountId: string;

  @ApiProperty({ description: 'Transaction type', enum: ['debit', 'credit'] })
  @IsEnum(['debit', 'credit'])
  type: string;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Transaction description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Transaction reference' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ description: 'Transaction date' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Transaction category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Transaction subcategory' })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ description: 'Transaction metadata' })
  @IsOptional()
  metadata?: any;
}
