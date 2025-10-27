import { IsString, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeploymentDto {
  @ApiProperty({ description: 'Environment', example: 'production', enum: ['production', 'staging', 'development'] })
  @IsEnum(['production', 'staging', 'development'])
  environment: 'production' | 'staging' | 'development';

  @ApiProperty({ description: 'Deployment strategy', example: 'canary', enum: ['canary', 'blue_green', 'rolling', 'recreate'] })
  @IsEnum(['canary', 'blue_green', 'rolling', 'recreate'])
  strategy: 'canary' | 'blue_green' | 'rolling' | 'recreate';

  @ApiProperty({ description: 'Version', example: 'v1.2.3' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Deployment status', example: 'pending', enum: ['pending', 'in_progress', 'completed', 'failed', 'rolled_back'] })
  @IsEnum(['pending', 'in_progress', 'completed', 'failed', 'rolled_back'])
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';

  @ApiProperty({ description: 'Start time', example: '2025-01-15T10:00:00Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End time', example: '2025-01-15T10:30:00Z', required: false })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({ description: 'Rollback time', example: '2025-01-15T10:45:00Z', required: false })
  @IsOptional()
  @IsDateString()
  rollbackTime?: string;
}
