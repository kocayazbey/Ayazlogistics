import { PartialType } from '@nestjs/swagger';
import { CreateLeadDto } from './create-lead.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiPropertyOptional({ description: 'Lead status', enum: ['new', 'qualified', 'converted', 'lost'] })
  @IsOptional()
  @IsEnum(['new', 'qualified', 'converted', 'lost'])
  status?: string;

  @ApiPropertyOptional({ description: 'Update notes' })
  @IsOptional()
  @IsString()
  updateNotes?: string;
}
