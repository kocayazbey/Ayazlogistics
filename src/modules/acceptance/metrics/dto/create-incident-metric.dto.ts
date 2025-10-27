import { IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIncidentMetricDto {
  @ApiProperty({ description: 'Incident severity', example: 'P0', enum: ['P0', 'P1', 'P2', 'P3'] })
  @IsEnum(['P0', 'P1', 'P2', 'P3'])
  severity: 'P0' | 'P1' | 'P2' | 'P3';

  @ApiProperty({ description: 'Mean Time To Resolution (minutes)', example: 120 })
  @IsNumber()
  @Min(0)
  mttr: number;

  @ApiProperty({ description: 'Period (YYYY-MM)', example: '2025-01' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Number of incidents', example: 5 })
  @IsNumber()
  @Min(0)
  incidentCount: number;

  @ApiProperty({ description: 'Total downtime (minutes)', example: 300 })
  @IsNumber()
  @Min(0)
  totalDowntime: number;
}
