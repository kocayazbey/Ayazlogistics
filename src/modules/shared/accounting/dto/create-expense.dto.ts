import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';

export enum ExpenseCategory {
  FUEL = 'fuel',
  MAINTENANCE = 'maintenance',
  INSURANCE = 'insurance',
  OFFICE_SUPPLIES = 'office_supplies',
  UTILITIES = 'utilities',
  RENT = 'rent',
  SALARIES = 'salaries',
  OTHER = 'other',
}

export class CreateExpenseDto {
  @ApiProperty({ description: 'Expense description', example: 'Fuel for delivery vehicles' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Expense category', enum: ExpenseCategory, example: ExpenseCategory.FUEL })
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @ApiProperty({ description: 'Expense amount', example: 250.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Expense date', example: '2024-01-15' })
  @IsDateString()
  expenseDate: string;

  @ApiProperty({ description: 'Vendor name', example: 'Shell Gas Station' })
  @IsString()
  @IsOptional()
  vendor?: string;

  @ApiProperty({ description: 'Receipt number', example: 'RCP-123456' })
  @IsString()
  @IsOptional()
  receiptNumber?: string;

  @ApiProperty({ description: 'Account ID', example: 'ACC-001' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiProperty({ description: 'Expense notes', example: 'Monthly fuel expense' })
  @IsString()
  @IsOptional()
  notes?: string;
}
