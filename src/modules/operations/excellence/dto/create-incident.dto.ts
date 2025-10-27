import { IsString, IsEnum, IsDateString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIncidentDto {
  @ApiProperty({ description: 'Incident title', example: 'Database connection timeout' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Incident description', example: 'Users experiencing slow response times due to database connection issues' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Incident severity', example: 'P1', enum: ['P0', 'P1', 'P2', 'P3'] })
  @IsEnum(['P0', 'P1', 'P2', 'P3'])
  severity: 'P0' | 'P1' | 'P2' | 'P3';

  @ApiProperty({ description: 'Incident status', example: 'open', enum: ['open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'] })
  @IsEnum(['open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'])
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'closed';

  @ApiProperty({ description: 'Start time', example: '2025-01-15T10:00:00Z' })
  @IsDateString()
  startTime: string;

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
