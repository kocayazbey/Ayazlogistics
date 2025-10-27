import { IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateDeploymentStatusDto {
  @ApiProperty({ description: 'Deployment status', example: 'completed', enum: ['pending', 'in_progress', 'completed', 'failed', 'rolled_back'] })
  @IsEnum(['pending', 'in_progress', 'completed', 'failed', 'rolled_back'])
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';

  @ApiProperty({ description: 'End time', example: '2025-01-15T10:30:00Z', required: false })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({ description: 'Rollback time', example: '2025-01-15T10:45:00Z', required: false })
  @IsOptional()
  @IsDateString()
  rollbackTime?: string;
}
