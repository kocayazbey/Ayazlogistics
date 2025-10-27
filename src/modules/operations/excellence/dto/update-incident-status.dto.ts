import { IsEnum, IsDateString, IsOptional, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIncidentStatusDto {
  @ApiProperty({ description: 'Incident status', example: 'resolved', enum: ['open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'] })
  @IsEnum(['open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'])
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'closed';

  @ApiProperty({ description: 'End time', example: '2025-01-15T11:30:00Z', required: false })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({ description: 'Mean time to recovery (minutes)', example: 90, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mttr?: number;

  @ApiProperty({ description: 'Root cause', example: 'Database connection pool exhausted', required: false })
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiProperty({ description: 'Resolution', example: 'Increased connection pool size and added monitoring', required: false })
  @IsOptional()
  @IsString()
  resolution?: string;
}
