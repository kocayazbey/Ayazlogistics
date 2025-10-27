import { PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional({ description: 'Employment status', enum: ['active', 'inactive', 'terminated'] })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'terminated'])
  status?: string;

  @ApiPropertyOptional({ description: 'Termination date' })
  @IsOptional()
  @IsDateString()
  terminationDate?: string;

  @ApiPropertyOptional({ description: 'Update notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
