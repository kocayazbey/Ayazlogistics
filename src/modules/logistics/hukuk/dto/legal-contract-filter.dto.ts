import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { LegalContractType, LegalContractStatus } from './create-legal-contract.dto';

export class LegalContractFilterDto {
  @ApiPropertyOptional({ enum: LegalContractType })
  @IsEnum(LegalContractType)
  @IsOptional()
  type?: LegalContractType;

  @ApiPropertyOptional({ enum: LegalContractStatus })
  @IsEnum(LegalContractStatus)
  @IsOptional()
  status?: LegalContractStatus;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  partyId?: string;

  @ApiPropertyOptional({ example: 'Service Agreement' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter expiring contracts' })
  @IsOptional()
  expiringOnly?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  limit?: number;
}

