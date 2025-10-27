import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsUUID, IsNumber, IsBoolean, Min } from 'class-validator';

export class GeneratePayrollDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Employee ID' })
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @ApiProperty({ example: '2025-10-01', description: 'Pay period start date' })
  @IsDateString()
  @IsNotEmpty()
  periodStart: string;

  @ApiProperty({ example: '2025-10-31', description: 'Pay period end date' })
  @IsDateString()
  @IsNotEmpty()
  periodEnd: string;

  @ApiProperty({ example: 168, description: 'Regular hours worked', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  regularHours?: number;

  @ApiProperty({ example: 20, description: 'Overtime hours', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  overtimeHours?: number;

  @ApiProperty({ example: 5000, description: 'Bonus amount', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bonusAmount?: number;

  @ApiProperty({ example: 'Performance bonus for Q3', description: 'Bonus description', required: false })
  @IsString()
  @IsOptional()
  bonusDescription?: string;

  @ApiProperty({ example: 2000, description: 'Commission amount', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  commissionAmount?: number;

  @ApiProperty({ example: 1500, description: 'Allowances (transport, meal, etc.)', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  allowances?: number;

  @ApiProperty({ example: 500, description: 'Deductions (advance payment, loan, etc.)', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  deductions?: number;

  @ApiProperty({ example: 'Advance salary deduction: 500 TRY', description: 'Deduction notes', required: false })
  @IsString()
  @IsOptional()
  deductionNotes?: string;

  @ApiProperty({ example: 3, description: 'Number of paid leave days taken', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  paidLeaveDays?: number;

  @ApiProperty({ example: 2, description: 'Number of unpaid leave days taken', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  unpaidLeaveDays?: number;

  @ApiProperty({ example: true, description: 'Auto-calculate taxes and SGK', required: false })
  @IsBoolean()
  @IsOptional()
  autoCalculateTaxes?: boolean;

  @ApiProperty({ example: 'October 2025 Payroll', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

