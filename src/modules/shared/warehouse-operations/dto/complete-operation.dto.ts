import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CompleteOperationDto {
  @ApiProperty({ description: 'Completion notes', example: 'Operation completed successfully' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Actual quantity processed', example: 100 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  actualQuantity?: number;

  @ApiProperty({ description: 'Quality issues found', example: 'None' })
  @IsString()
  @IsOptional()
  qualityIssues?: string;
}
