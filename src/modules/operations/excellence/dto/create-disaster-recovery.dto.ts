import { IsString, IsNumber, IsEnum, IsDateString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDisasterRecoveryDto {
  @ApiProperty({ description: 'Plan name', example: 'Primary Database DR' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Plan description', example: 'Disaster recovery plan for primary database' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Recovery Point Objective (minutes)', example: 15 })
  @IsNumber()
  @Min(0)
  rpo: number;

  @ApiProperty({ description: 'Recovery Time Objective (minutes)', example: 60 })
  @IsNumber()
  @Min(0)
  rto: number;

  @ApiProperty({ description: 'Last tested date', example: '2025-01-01T00:00:00Z', required: false })
  @IsOptional()
  @IsDateString()
  lastTested?: string;

  @ApiProperty({ description: 'Plan status', example: 'active', enum: ['active', 'inactive', 'testing'] })
  @IsEnum(['active', 'inactive', 'testing'])
  status: 'active' | 'inactive' | 'testing';
}
