import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class StartOperationDto {
  @ApiProperty({ description: 'Start notes', example: 'Starting operation' })
  @IsString()
  @IsOptional()
  notes?: string;
}
