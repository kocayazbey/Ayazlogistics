import { PartialType } from '@nestjs/swagger';
import { CreateOperationDto } from './create-operation.dto';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOperationDto extends PartialType(CreateOperationDto) {
  @ApiPropertyOptional({ description: 'Operation status', enum: ['pending', 'in_progress', 'paused', 'completed', 'cancelled'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Operation notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Operation duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ description: 'Operation efficiency percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  efficiency?: number;
}
