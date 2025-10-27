import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { AccountType, AccountSubType, AccountStatus } from './create-gl-account.dto';

export class AccountFilterDto {
  @ApiPropertyOptional({ enum: AccountType })
  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @ApiPropertyOptional({ enum: AccountSubType })
  @IsEnum(AccountSubType)
  @IsOptional()
  subType?: AccountSubType;

  @ApiPropertyOptional({ enum: AccountStatus })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @ApiPropertyOptional({ example: 'Cash' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: '100' })
  @IsString()
  @IsOptional()
  accountCodePrefix?: string;

  @ApiPropertyOptional({ example: 'TRY' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  bankAccountsOnly?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  postableOnly?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  limit?: number;
}

