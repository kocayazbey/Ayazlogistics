import { IsString, IsArray, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ROICalculatorInputDto {
  @ApiProperty({ description: 'Input name', example: 'monthly_orders' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Input type', example: 'number', enum: ['number', 'percentage', 'currency', 'boolean'] })
  @IsString()
  type: 'number' | 'percentage' | 'currency' | 'boolean';

  @ApiProperty({ description: 'Input label', example: 'Monthly Orders' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Input description', example: 'Number of orders processed per month' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Default value', example: 1000, required: false })
  @IsObject()
  defaultValue?: any;

  @ApiProperty({ description: 'Is input required', example: true })
  @IsBoolean()
  required: boolean;
}

export class ROICalculatorOutputDto {
  @ApiProperty({ description: 'Output name', example: 'annual_savings' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Output type', example: 'currency', enum: ['number', 'percentage', 'currency'] })
  @IsString()
  type: 'number' | 'percentage' | 'currency';

  @ApiProperty({ description: 'Output label', example: 'Annual Savings' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Output description', example: 'Total annual cost savings' })
  @IsString()
  description: string;
}

export class CreateROICalculatorDto {
  @ApiProperty({ description: 'Calculator name', example: 'Logistics Cost Savings Calculator' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Calculator description', example: 'Calculate potential cost savings from logistics optimization' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Calculator inputs' })
  @IsArray()
  @IsObject({ each: true })
  inputs: ROICalculatorInputDto[];

  @ApiProperty({ description: 'Calculator outputs' })
  @IsArray()
  @IsObject({ each: true })
  outputs: ROICalculatorOutputDto[];

  @ApiProperty({ description: 'Calculation formula', example: '{monthly_orders} * 12 * 0.15' })
  @IsString()
  formula: string;

  @ApiProperty({ description: 'Is calculator active', example: true })
  @IsBoolean()
  isActive: boolean;
}
