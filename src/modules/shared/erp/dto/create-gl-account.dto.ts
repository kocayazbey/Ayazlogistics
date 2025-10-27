import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum AccountSubType {
  CURRENT_ASSET = 'current_asset',
  FIXED_ASSET = 'fixed_asset',
  CURRENT_LIABILITY = 'current_liability',
  LONG_TERM_LIABILITY = 'long_term_liability',
  OPERATING_EXPENSE = 'operating_expense',
  COST_OF_GOODS_SOLD = 'cost_of_goods_sold',
  SALES_REVENUE = 'sales_revenue',
  OTHER_INCOME = 'other_income',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CLOSED = 'closed',
}

export class CreateGLAccountDto {
  @ApiProperty({ example: '100.01.001', description: 'Account code/number' })
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @ApiProperty({ example: 'Cash - Turkish Lira' })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({ enum: AccountType, example: AccountType.ASSET })
  @IsEnum(AccountType)
  @IsNotEmpty()
  type: AccountType;

  @ApiProperty({ enum: AccountSubType, example: AccountSubType.CURRENT_ASSET })
  @IsEnum(AccountSubType)
  @IsNotEmpty()
  subType: AccountSubType;

  @ApiProperty({ example: 'TRY', description: 'Currency code', required: false })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: '100.01', description: 'Parent account code', required: false })
  @IsString()
  @IsOptional()
  parentAccountCode?: string;

  @ApiProperty({ example: 1, description: 'Account level in hierarchy', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  level?: number;

  @ApiProperty({ example: true, description: 'Allow manual posting', required: false })
  @IsBoolean()
  @IsOptional()
  allowPosting?: boolean;

  @ApiProperty({ example: true, description: 'Require cost center', required: false })
  @IsBoolean()
  @IsOptional()
  requireCostCenter?: boolean;

  @ApiProperty({ example: true, description: 'Is bank account', required: false })
  @IsBoolean()
  @IsOptional()
  isBankAccount?: boolean;

  @ApiProperty({ example: 'TR330006100519786457841326', description: 'Bank account IBAN', required: false })
  @IsString()
  @IsOptional()
  iban?: string;

  @ApiProperty({ example: 'Ziraat Bankasi', description: 'Bank name', required: false })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiProperty({ example: 'Taksim Branch', description: 'Bank branch', required: false })
  @IsString()
  @IsOptional()
  bankBranch?: string;

  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE, required: false })
  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @ApiProperty({ example: 'Main cash account for daily operations', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'cash, liquid_asset', description: 'Tags for categorization', required: false })
  @IsString()
  @IsOptional()
  tags?: string;

  @ApiProperty({ example: 'Used for petty cash and daily expenses', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

