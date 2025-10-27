import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDORAMetricsDto {
  @ApiProperty({ description: 'Metrics period', example: '2025-01' })
  @IsString()
  period: string;

  @ApiProperty({ description: 'Deployment frequency (deployments per day)', example: 2.5 })
  @IsNumber()
  @Min(0)
  deploymentFrequency: number;

  @ApiProperty({ description: 'Lead time for changes (hours)', example: 24.5 })
  @IsNumber()
  @Min(0)
  leadTimeForChanges: number;

  @ApiProperty({ description: 'Mean time to recovery (hours)', example: 2.5 })
  @IsNumber()
  @Min(0)
  meanTimeToRecovery: number;

  @ApiProperty({ description: 'Change failure rate (percentage)', example: 5.0 })
  @IsNumber()
  @Min(0)
  changeFailureRate: number;
}
