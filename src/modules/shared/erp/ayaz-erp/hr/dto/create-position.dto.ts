import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({ description: 'Position name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Position description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Minimum salary' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalary?: number;

  @ApiPropertyOptional({ description: 'Maximum salary' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSalary?: number;

  @ApiPropertyOptional({ description: 'Position metadata' })
  @IsOptional()
  metadata?: any;
}
