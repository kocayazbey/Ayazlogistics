import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OperationStatusDto {
  @ApiProperty({ description: 'Operation duration in minutes' })
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiProperty({ description: 'Operation efficiency percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  efficiency: number;

  @ApiPropertyOptional({ description: 'Completion notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Completion metadata' })
  @IsOptional()
  metadata?: any;
}
